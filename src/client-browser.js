/**
 * QueueBit Browser Client
 * 
 * Usage:
 * Include socket.io-client in your HTML:
 * <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
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

class QueueBitClient {
  /**
   * Create a new QueueBit client
   * @param {string} [url='http://localhost:3000'] - Server URL
   */
  constructor(url = 'http://localhost:3000') {
    if (typeof io === 'undefined') {
      throw new Error('Socket.IO client library not loaded. Please include: <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>');
    }
    
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
