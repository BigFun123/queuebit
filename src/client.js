const { io } = require('socket.io-client');

class QueueBitClient {
  constructor(url = 'http://localhost:3333') {
    this.socket = io(url);
    this.messageHandlers = new Map();

    this.socket.on('connect', () => {
      console.log('Connected to QueueBit server');
    });

    this.socket.on('message', (message) => {
      this.handleMessage(message);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from QueueBit server');
    });
  }

  publish(message, options = {}) {
    return new Promise((resolve) => {
      this.socket.emit('publish', { message, options }, (response) => {
        resolve(response);
      });
    });
  }

  subscribe(callback, options = {}) {
    const subject = options.subject || 'default';
    
    if (!this.messageHandlers.has(subject)) {
      this.messageHandlers.set(subject, new Set());
    }
    
    this.messageHandlers.get(subject).add(callback);

    return new Promise((resolve) => {
      this.socket.emit('subscribe', options, (response) => {
        resolve(response);
      });
    });
  }

  unsubscribe(options = {}) {
    const subject = options.subject || 'default';
    this.messageHandlers.delete(subject);

    return new Promise((resolve) => {
      this.socket.emit('unsubscribe', options, (response) => {
        resolve(response);
      });
    });
  }

  handleMessage(message) {
    const subject = message.subject || 'default';
    const handlers = this.messageHandlers.get(subject);
    
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

// Node.js client (default export for npm package)
module.exports = require('./client-node');
