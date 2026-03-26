// @ts-check
const { io } = require('./socket-client.js');

/**
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
 * @typedef {import('./types').ServerInfo} ServerInfo
 */

class QueueBitClient {
  /**
   * Create a new QueueBit client
   * @param {string} [url='http://localhost:3333'] - Server URL
   */
  constructor(url = 'http://localhost:3333') {
    this.socket = io(url, {
      transports: ['websocket'],
      upgrade: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      perMessageDeflate: false
    });
    this.messageHandlers = new Map();
    this.connected = false;
    this.serverVersion = null;
    this.receivedMessages = 0;

    this.socket.on('connect', () => {
      console.log('Connected to QueueBit server');
      this.connected = true;
    });

    this.socket.on('serverInfo', (/** @type {ServerInfo} */ info) => {
      this.serverVersion = info.version;
      console.log(`QueueBit Server v${info.version} - Connected at ${new Date(info.timestamp).toLocaleString()}`);
    });

    this.socket.on('message', (/** @type {QueueMessage} */ message) => {
      this.receivedMessages++;
      this.handleMessage(message);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from QueueBit server');
      this.connected = false;
    });

    this.socket.on('connect_error', (/** @type {Error} */ error) => {
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
      const timeout = setTimeout(() => {
        reject(new Error('Publish timeout - no response from server'));
      }, 5000); // 5 second timeout
      
      this.socket.emit('publish', { message, options }, (/** @type {PublishResponse} */ response) => {
        clearTimeout(timeout);
        if (!response) {
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
      this.socket.emit('subscribe', options, (/** @type {SubscribeResponse} */ response) => {
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
      this.socket.emit('unsubscribe', options, (/** @type {UnsubscribeResponse} */ response) => {
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
      this.socket.emit('getMessages', options, (/** @type {GetMessagesResponse} */ response) => {
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
      this.socket.emit('clearMessages', options, (/** @type {ClearMessagesResponse} */ response) => {
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
        try {
          handler(message);
        } catch (error) {
          console.error(`QueueBit message handler error for subject "${subject}":`, error);
        }
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

module.exports = { QueueBitClient, Queue: QueueBitClient };
