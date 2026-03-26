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
 */

class QueueBitClient {
  /**
   * Create a new QueueBit client
   * @param {string} [url='http://localhost:3333'] - Server URL
   */
  constructor(url = 'http://localhost:3333') {
    this.socket = io(url);
    this.messageHandlers = new Map();

    this.socket.on('connect', () => {
      console.log('Connected to QueueBit server');
    });

    this.socket.on('message', (/** @type {QueueMessage} */ message) => {
      this.handleMessage(message);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from QueueBit server');
    });
  }

  /**
   * Publish a message
   * @param {any} message - Message data to publish
   * @param {PublishOptions} [options={}] - Publish options
   * @returns {Promise<PublishResponse>} Promise resolving to publish response
   */
  publish(message, options = {}) {
    return new Promise((resolve) => {
      this.socket.emit('publish', { message, options }, (/** @type {PublishResponse} */ response) => {
        resolve(response);
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
    
    if (!this.messageHandlers.has(subject)) {
      this.messageHandlers.set(subject, new Set());
    }
    
    this.messageHandlers.get(subject).add(callback);

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
    this.messageHandlers.delete(subject);

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
    const handlers = this.messageHandlers.get(subject);
    
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
