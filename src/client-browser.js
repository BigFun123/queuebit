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
 */

class QueueBitClient {
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

  getMessages(options = {}) {
    return new Promise((resolve) => {
      this.socket.emit('getMessages', options, (response) => {
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

// Export for browsers
if (typeof window !== 'undefined') {
  window.QueueBitClient = QueueBitClient;
}
