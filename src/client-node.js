const { io } = require('socket.io-client');

class QueueBitClient {
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

  publish(message, options = {}) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Publish timeout - no response from server'));
      }, 5000); // 5 second timeout
      
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

  getMessages(options = {}) {
    return new Promise((resolve) => {
      this.socket.emit('getMessages', options, (response) => {
        resolve(response);
      });
    });
  }

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

  disconnect() {
    this.socket.disconnect();
  }
}

module.exports = { QueueBitClient, Queue: QueueBitClient };
