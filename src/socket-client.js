// @ts-check
'use strict';

/**
 * Lightweight WebSocket client — drop-in replacement for the socket.io-client
 * `io()` function used by QueueBit Node.js clients.
 *
 * Works in:
 *   - Node.js 22+ (native globalThis.WebSocket)
 *   - Node.js < 22 with the `ws` package installed
 *   - Modern browsers (native window.WebSocket)
 *
 * Supported API surface:
 *   io(url, options) → socket
 *   socket.on(event, handler)
 *   socket.emit(event, data [, callback])
 *   socket.disconnect()
 *
 * Wire protocol (JSON over WebSocket):
 *   Client → Server event:           { type:'event', name, data [, ackId] }
 *   Server → Client event:           { type:'event', name, data }
 *   Server → Client acknowledgement: { type:'ack', ackId, data }
 *
 * Options (subset of socket.io-client options):
 *   reconnection         {boolean}  default true
 *   reconnectionDelay    {number}   ms, default 1000
 *   reconnectionDelayMax {number}   ms, default 5000
 *   reconnectionAttempts {number}   default Infinity
 */

// Resolve the WebSocket constructor once (native > ws package)
/** @type {typeof WebSocket | any} */
let _WS;
if (typeof globalThis !== 'undefined' && typeof globalThis.WebSocket === 'function') {
  _WS = globalThis.WebSocket;
} else if (typeof WebSocket === 'function') {
  // older browser global
  _WS = WebSocket; // eslint-disable-line no-undef
} else {
  try {
    _WS = require('ws');
  } catch (_) {
    throw new Error(
      'WebSocket is not available. Use Node.js 22+ or install the "ws" package.'
    );
  }
}

const WS_OPEN = 1; // WebSocket.OPEN

class ClientSocket {
  /**
   * @param {string} url   WebSocket server URL (ws:// or wss://)
   * @param {{reconnection?: boolean, reconnectionDelay?: number, reconnectionDelayMax?: number, reconnectionAttempts?: number, [key: string]: any}} opts
   */
  constructor(url, opts = {}) {
    // Normalise http → ws scheme
    this._url = url.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://');

    this._reconnect        = opts.reconnection !== false;
    this._reconnectDelay   = opts.reconnectionDelay    || 1000;
    this._reconnectDelayMax= opts.reconnectionDelayMax || 5000;
    this._reconnectMax     = opts.reconnectionAttempts != null ? opts.reconnectionAttempts : Infinity;

    /** @type {Map<string, Function[]>} */
    this._handlers = new Map();
    /** @type {Map<number, Function>} */
    this._ackCallbacks = new Map();
    this._ackCounter = 0;
    this._reconnectAttempts = 0;
    this._reconnectTimer = null;
    this._closed = false;
    this._ws = null;

    this._connect();
  }

  _connect() {
    let ws;
    try {
      ws = new _WS(this._url);
    } catch (err) {
      this._scheduleReconnect();
      return;
    }
    this._ws = ws;

    ws.addEventListener('open', () => {
      this._reconnectAttempts = 0;
      this._fireEvent('connect');
    });

    ws.addEventListener('close', () => {
      if (!this._closed) {
        this._fireEvent('disconnect');
        if (this._reconnect) this._scheduleReconnect();
      }
    });

    ws.addEventListener('error', /** @param {Event} event */ (event) => {
      this._fireEvent('connect_error', event);
    });

    ws.addEventListener('message', /** @param {MessageEvent} event */ (event) => {
      const raw = typeof event.data === 'string' ? event.data : event.data.toString();
      this._handleMessage(raw);
    });
  }

  _scheduleReconnect() {
    if (this._reconnectAttempts >= this._reconnectMax) return;
    this._reconnectAttempts++;

    const delay = Math.min(
      this._reconnectDelay * this._reconnectAttempts,
      this._reconnectDelayMax
    );

    this._reconnectTimer = setTimeout(() => {
      if (!this._closed) this._connect();
    }, delay);
  }

  /**
   * @param {string} raw - Raw message data from WebSocket
   */
  _handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (_) {
      return;
    }

    if (msg.type === 'event') {
      this._fireEvent(msg.name, msg.data);
    } else if (msg.type === 'ack') {
      const cb = this._ackCallbacks.get(msg.ackId);
      if (cb) {
        this._ackCallbacks.delete(msg.ackId);
        cb(msg.data);
      }
    }
  }

  /**
   * Fire an event to all registered handlers.
   * @param {string} event
   * @param {*} [data]
   */
  _fireEvent(event, data) {
    const handlers = this._handlers.get(event);
    if (handlers) {
      for (const h of handlers) h(data);
    }
  }

  /**
   * Register an event listener.
   * @param {string} event
   * @param {Function} handler
   */
  on(event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, []);
    const eventHandlers = this._handlers.get(event);
    if (eventHandlers) eventHandlers.push(handler);
    return this;
  }

  /**
   * Send an event to the server, optionally with an acknowledgement callback.
   * @param {string} event
   * @param {*} data
   * @param {Function} [callback]
   */
  emit(event, data, callback) {
    if (!this._ws || this._ws.readyState !== WS_OPEN) {
      // Queue-or-fail: call callback with null so callers don't hang
      if (callback) callback(null);
      return this;
    }

    if (callback) {
      const ackId = ++this._ackCounter;
      this._ackCallbacks.set(ackId, callback);
      this._ws.send(JSON.stringify({ type: 'event', name: event, data, ackId }));
    } else {
      this._ws.send(JSON.stringify({ type: 'event', name: event, data }));
    }
    return this;
  }

  /** Permanently close the connection (no reconnect). */
  disconnect() {
    this._closed = true;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._ws) {
      this._ws.close();
    }
  }
}

/**
 * Create a new client socket connected to the given URL.
 * @param {string} url
 * @param {{reconnection?: boolean, reconnectionDelay?: number, reconnectionDelayMax?: number, reconnectionAttempts?: number, [key: string]: any}} [options]
 * @returns {ClientSocket}
 */
function io(url, options = {}) {
  return new ClientSocket(url, options);
}

module.exports = { io, ClientSocket };
