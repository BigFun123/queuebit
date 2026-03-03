/**
 * QueueBit React/ES6 Client
 * 
 * Usage in React:
 * import { QueueBitClient } from '@usermetrics/queuebit/src/client-react';
 * 
 * const client = new QueueBitClient('http://localhost:3333');
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

import { io } from 'socket.io-client';

export class QueueBitClient {
  /**
   * Create a new QueueBit client
   * @param {string} [url='http://localhost:3333'] - Server URL
   * @param {object} [socketOptions={}] - Additional socket.io options
   */
  constructor(url = 'http://localhost:3333', socketOptions = {}) {
    this.socket = io(url, {
      transports: ['websocket'],
      upgrade: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      perMessageDeflate: false,
      ...socketOptions
    });
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
      const timeout = setTimeout(() => {
        reject(new Error('Publish timeout - no response from server'));
      }, 5000);
      
      this.socket.emit('publish', { message, options }, (response) => {
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

  /**
   * Check if client is connected
   * @returns {boolean} Connection status
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Get server version
   * @returns {string|null} Server version
   */
  getServerVersion() {
    return this.serverVersion;
  }

  /**
   * Get count of received messages
   * @returns {number} Number of messages received
   */
  getReceivedMessageCount() {
    return this.receivedMessages;
  }
}

// Default export for convenience
export default QueueBitClient;
