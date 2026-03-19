/**
 * QueueBit Browser Client
 *
 * No external dependencies — uses the browser's native WebSocket API.
 *
 * Usage:
 * <script src="client-browser.js"></script>
 *
 * Then use:
 * const client = new QueueBitClient('http://localhost:3000');
 * 
 * @typedef {import('./types').PublishOptions} PublishOptions
 * @typedef {import('./types').SubscribeOptions} SubscribeOptions
 * @typedef {import('./types').UnsubscribeOptions} UnsubscribeOptions
 * @typedef {import('./types').GetMessagesOptions} GetMessagesOptions
 * @typedef {import('./types').ClearMessagesOptions} ClearMessagesOptions
 * @typedef {import('./types').PublishResponse} PublishResponse
 * @typedef {import('./types').SubscribeResponse} SubscribeResponse
 * @typedef {import('./types').UnsubscribeResponse} UnsubscribeResponse
 * @typedef {import('./types').GetMessagesResponse} GetMessagesResponse
 * @typedef {import('./types').ClearMessagesResponse} ClearMessagesResponse
 * @typedef {import('./types').QueueMessage} QueueMessage
 * @typedef {import('./types').MessageHandler} MessageHandler
 */

// ---------------------------------------------------------------------------
// Minimal WebSocket wrapper (same JSON protocol as src/socket.js server)
// ---------------------------------------------------------------------------
const WS_OPEN = 1;

class _BrowserSocket {
  constructor(url) {
    this._url = url.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://');
    this._handlers = new Map();
    this._ackCallbacks = new Map();
    this._ackCounter = 0;
    this._reconnectAttempts = 0;
    this._reconnectTimer = null;
    this._closed = false;
    this._reconnectDelay = 1000;
    this._reconnectDelayMax = 5000;
    this._ws = null;
    this._connect();
  }

  _connect() {
    const ws = new WebSocket(this._url);
    this._ws = ws;
    ws.addEventListener('open', () => {
      this._reconnectAttempts = 0;
      this._fire('connect');
    });
    ws.addEventListener('close', () => {
      if (!this._closed) {
        this._fire('disconnect');
        this._scheduleReconnect();
      }
    });
    ws.addEventListener('error', (e) => { this._fire('connect_error', e); });
    ws.addEventListener('message', (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch (_) { return; }
      if (msg.type === 'event') {
        this._fire(msg.name, msg.data);
      } else if (msg.type === 'ack') {
        const cb = this._ackCallbacks.get(msg.ackId);
        if (cb) { this._ackCallbacks.delete(msg.ackId); cb(msg.data); }
      }
    });
  }

  _scheduleReconnect() {
    this._reconnectAttempts++;
    const delay = Math.min(this._reconnectDelay * this._reconnectAttempts, this._reconnectDelayMax);
    this._reconnectTimer = setTimeout(() => { if (!this._closed) this._connect(); }, delay);
  }

  _fire(event, data) {
    const hs = this._handlers.get(event);
    if (hs) for (const h of hs) h(data);
  }

  on(event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, []);
    this._handlers.get(event).push(handler);
    return this;
  }

  emit(event, data, callback) {
    if (!this._ws || this._ws.readyState !== WS_OPEN) {
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

  disconnect() {
    this._closed = true;
    if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
    if (this._ws) this._ws.close();
  }
}
// ---------------------------------------------------------------------------

class QueueBitClient {
  /**
   * Create a new QueueBit client
   * @param {string} [url='http://localhost:3000'] - Server URL
   */
  constructor(url = 'http://localhost:3000') {
    this.socket = new _BrowserSocket(url);
    this.messageHandlers = new Map();
    this.connected = false;
    this.serverVersion = null;
    this.receivedMessages = 0;

    this.socket.on('connect', () => {
      console.log('Connected to QueueBit server');
      this.connected = true;
    });

    this.socket.on('serverInfo', (info) => {
      this.serverVersion = info.version;
      console.log(`QueueBit Server v${info.version} - Connected at ${new Date(info.timestamp).toLocaleString()}`);
    });

    this.socket.on('message', (message) => {
      this.receivedMessages++;
      this.handleMessage(message);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from QueueBit server');
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });
  }

  /**
   * Publish a message
   * @param {any} message - Message data to publish
   * @param {PublishOptions} [options={}] - Publish options
   * @returns {Promise<PublishResponse>} Promise resolving to publish response
   */
  publish(message, options = {}) {
    return new Promise((resolve, reject) => {
      console.log('Publishing message...');
      
      const timeout = setTimeout(() => {
        console.error('Publish timeout - no response from server');
        reject(new Error('Publish timeout - no response from server'));
      }, 5000);
      
      this.socket.emit('publish', { message, options }, (response) => {
        clearTimeout(timeout);
        console.log('Received publish response:', response);
        if (!response) {
          console.warn('No response from server');
          resolve({ success: false, error: 'No response from server' });
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Subscribe to messages
   * @param {MessageHandler} callback - Message handler callback
   * @param {SubscribeOptions} [options={}] - Subscribe options
   * @returns {Promise<SubscribeResponse>} Promise resolving to subscribe response
   */
  subscribe(callback, options = {}) {
    const subject = options.subject || 'default';
    const queueName = options.queue || null;
    const handlerKey = queueName ? `${subject}:${queueName}` : subject;
    
    if (!this.messageHandlers.has(handlerKey)) {
      this.messageHandlers.set(handlerKey, new Set());
    }
    
    this.messageHandlers.get(handlerKey).add(callback);

    return new Promise((resolve) => {
      this.socket.emit('subscribe', options, (response) => {
        resolve(response);
      });
    });
  }

  /**
   * Unsubscribe from messages
   * @param {UnsubscribeOptions} [options={}] - Unsubscribe options
   * @returns {Promise<UnsubscribeResponse>} Promise resolving to unsubscribe response
   */
  unsubscribe(options = {}) {
    const subject = options.subject || 'default';
    const queueName = options.queue || null;
    const handlerKey = queueName ? `${subject}:${queueName}` : subject;
    this.messageHandlers.delete(handlerKey);

    return new Promise((resolve) => {
      this.socket.emit('unsubscribe', options, (response) => {
        resolve(response);
      });
    });
  }

  /**
   * Get messages from queue
   * @param {GetMessagesOptions} [options={}] - Get messages options
   * @returns {Promise<GetMessagesResponse>} Promise resolving to messages response
   */
  getMessages(options = {}) {
    return new Promise((resolve) => {
      this.socket.emit('getMessages', options, (response) => {
        resolve(response);
      });
    });
  }

  /**
   * Clear messages from queue
   * @param {ClearMessagesOptions} [options={}] - Clear messages options
   * @returns {Promise<ClearMessagesResponse>} Promise resolving to clear response
   */
  clearMessages(options = {}) {
    return new Promise((resolve) => {
      this.socket.emit('clearMessages', options, (response) => {
        resolve(response);
      });
    });
  }

  /**
   * Handle incoming message
   * @param {QueueMessage} message - Received message
   */
  handleMessage(message) {
    const subject = message.subject || 'default';
    const queueName = message.queueName || null;
    const handlerKey = queueName ? `${subject}:${queueName}` : subject;

    const handlers = this.messageHandlers.get(handlerKey);
    if (handlers) {
      for (const handler of handlers) {
        handler(message);
      }
    }
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    this.socket.disconnect();
  }
}

// Export for browsers
if (typeof window !== 'undefined') {
  window.QueueBitClient = QueueBitClient;
}
