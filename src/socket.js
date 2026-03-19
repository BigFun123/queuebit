// @ts-check
'use strict';

/**
 * Lightweight WebSocket server — drop-in replacement for the socket.io Server API
 * used by QueueBit. Uses the `ws` package instead of socket.io.
 *
 * Supported API surface:
 *   new Server(port, options)
 *   server.on('connection', socket => { … })
 *   server.close()
 *   socket.id          — unique string per connection
 *   socket.emit(event, data)
 *   socket.on(event, handler)   — 'disconnect' is a special built-in event
 *
 * Wire protocol (JSON over WebSocket):
 *   Client → Server event:          { type:'event', name, data [, ackId] }
 *   Server → Client event:          { type:'event', name, data }
 *   Server → Client acknowledgement: { type:'ack', ackId, data }
 */

const { WebSocketServer, WebSocket } = require('ws');

let _idCounter = 0;

function _generateId() {
  return (++_idCounter).toString(36) + Math.random().toString(36).slice(2);
}

/** Wraps a single ws WebSocket connection with a socket.io-compatible API */
class ServerSocket {
  /**
   * @param {import('ws').WebSocket} ws
   */
  constructor(ws) {
    /** @type {string} */
    this.id = _generateId();
    this._ws = ws;
    /** @type {Map<string, Array<Function>>} */
    this._handlers = new Map();
  }

  /**
   * Register an event listener on this socket.
   * @param {string} event
   * @param {Function} handler
   */
  on(event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, []);
    this._handlers.get(event)?.push(handler);
    return this;
  }

  /**
   * Send an event to this client.
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    if (this._ws.readyState === WebSocket.OPEN) {
      try {
        this._ws.send(JSON.stringify({ type: 'event', name: event, data }));
      } catch (_) {
        // ignore send errors on a closing connection
      }
    }
    return this;
  }

  /**
   * @internal Called when a raw message arrives from the client
   * @param {string} raw
   */
  _handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (_) {
      return;
    }

    if (msg.type !== 'event') return;

    const handlers = this._handlers.get(msg.name);
    if (!handlers || handlers.length === 0) return;

    // Build an acknowledgement callback if the client supplied an ackId
    const { ackId } = msg;
    const callback =
      ackId !== undefined
        ? /** @param {any} response */ (response) => {
            if (this._ws.readyState === WebSocket.OPEN) {
              try {
                this._ws.send(JSON.stringify({ type: 'ack', ackId, data: response }));
              } catch (_) {}
            }
          }
        : undefined;

    for (const handler of handlers) {
      handler(msg.data, callback);
    }
  }

  /** @internal Called when the underlying WebSocket closes */
  _handleClose() {
    const handlers = this._handlers.get('disconnect');
    if (handlers) {
      for (const handler of handlers) handler();
    }
  }
}

/** WebSocket server with a socket.io-compatible API */
class Server {
  /**
   * @param {number} port
   * @param {object} [options]
   */
  constructor(port, options = {}) {
    /** @type {Map<string, Array<Function>>} */
    this._handlers = new Map();

    this._wss = new WebSocketServer({ port });

    this._wss.on('connection', (ws) => {
      const socket = new ServerSocket(ws);

      ws.on('message', (data) => {
        socket._handleMessage(typeof data === 'string' ? data : data.toString());
      });

      ws.on('close', () => {
        socket._handleClose();
      });

      // Prevent unhandled errors from crashing the process
      ws.on('error', () => {});

      const handlers = this._handlers.get('connection');
      if (handlers) {
        for (const handler of handlers) handler(socket);
      }
    });
  }

  /**
   * @param {string} event
   * @param {Function} handler
   */
  on(event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, []);
    this._handlers.get(event)?.push(handler);
    return this;
  }

  /**
   * Close the server.
   * @param {(err?: Error) => void} [callback]
   */
  close(callback) {
    this._wss.close(callback);
  }
}

module.exports = { Server };
