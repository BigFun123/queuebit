const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const packageJson = require('../package.json');

class QueueBitServer {
  constructor(options = {}) {
    const port = options.port || 3000;
    this.maxQueueSize = options.maxQueueSize || 10000;
    this.version = packageJson.version;
    
    this.messages = new Map();
    this.subscribers = new Map();
    this.queueGroups = new Map();
    this.deliveryQueue = [];
    this.deliveryBatchSize = 100;
    this.isDelivering = false;
    
    this.io = new Server(port, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e8,
      transports: ['websocket'],
      allowUpgrades: false,
      perMessageDeflate: false,
      httpCompression: false
    });

    this.setupHandlers();
    this.startExpiryCheck();
    this.startDeliveryProcessor();
    
    console.log(`QueueBit server v${this.version} listening on port ${port}`);
  }

  setupHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      socket.emit('serverInfo', { 
        version: this.version,
        name: 'QueueBit',
        timestamp: new Date()
      });

      socket.on('publish', (data, callback) => {
        this.handlePublish(socket, data.message, data.options || {}, callback);
      });

      socket.on('subscribe', (options, callback) => {
        this.handleSubscribe(socket, options, callback);
      });

      socket.on('unsubscribe', (options, callback) => {
        this.handleUnsubscribe(socket, options, callback);
      });

      socket.on('getMessages', (options, callback) => {
        this.handleGetMessages(socket, options, callback);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  handlePublish(socket, message, options = {}, callback) {
    const subject = options.subject || 'default';
    const queueMessage = {
      id: uuidv4(),
      data: message,
      expiry: options.expiry ? new Date(options.expiry) : undefined,
      removeAfterRead: options.removeAfterRead || false,
      timestamp: new Date(),
      subject
    };

    if (!this.messages.has(subject)) {
      this.messages.set(subject, []);
    }

    const queue = this.messages.get(subject);
    
    if (queue.length >= this.maxQueueSize) {
      if (callback) {
        callback({ success: false, error: 'Queue is full' });
      }
      return;
    }

    queue.push(queueMessage);
    
    // Add to delivery queue for batch processing
    this.deliveryQueue.push(queueMessage);
    
    // Immediately respond to client
    if (callback) {
      callback({ success: true, messageId: queueMessage.id });
    }
  }

  startDeliveryProcessor() {
    // Process deliveries continuously
    setImmediate(() => this.processDeliveries());
  }

  processDeliveries() {
    if (this.deliveryQueue.length > 0) {
      const batch = this.deliveryQueue.splice(0, this.deliveryBatchSize);
      
      for (const message of batch) {
        this.deliverMessage(message);
      }
    }
    
    // Continue processing
    setImmediate(() => this.processDeliveries());
  }

  deliverMessage(message) {
    const subject = message.subject || 'default';
    let delivered = false;

    // Deliver to queue groups (load balanced)
    const queueGroups = this.queueGroups.get(subject);
    if (queueGroups) {
      for (const [queueName, sockets] of queueGroups.entries()) {
        if (sockets.length > 0) {
          const socket = sockets[0];
          sockets.push(sockets.shift());
          
          socket.emit('message', message);
          delivered = true;
          
          if (message.removeAfterRead) {
            this.removeMessage(message.id, subject);
            return;
          }
        }
      }
    }

    // Deliver to regular subscribers (all receive)
    const subscribers = this.subscribers.get(subject);
    if (subscribers) {
      for (const socket of subscribers) {
        socket.emit('message', message);
        delivered = true;
      }
      
      if (message.removeAfterRead && !queueGroups) {
        this.removeMessage(message.id, subject);
      }
    }
  }

  handleSubscribe(socket, options, callback) {
    const subject = options.subject || 'default';
    const queueName = options.queue;

    if (queueName) {
      // Queue group subscription (load balanced)
      if (!this.queueGroups.has(subject)) {
        this.queueGroups.set(subject, new Map());
      }
      
      const queues = this.queueGroups.get(subject);
      if (!queues.has(queueName)) {
        queues.set(queueName, []);
      }
      
      queues.get(queueName).push(socket);
    } else {
      // Regular subscription (all subscribers get messages)
      if (!this.subscribers.has(subject)) {
        this.subscribers.set(subject, new Set());
      }
      
      this.subscribers.get(subject).add(socket);
    }

    // Deliver any existing messages
    const messages = this.messages.get(subject) || [];
    for (const message of messages) {
      if (!message.removeAfterRead) {
        socket.emit('message', message);
      }
    }

    if (callback) {
      callback({ success: true, subject, queue: queueName });
    }
  }

  handleUnsubscribe(socket, options, callback) {
    const subject = options.subject || 'default';
    const queueName = options.queue;

    if (queueName) {
      const queues = this.queueGroups.get(subject);
      if (queues) {
        const sockets = queues.get(queueName);
        if (sockets) {
          const index = sockets.indexOf(socket);
          if (index > -1) {
            sockets.splice(index, 1);
          }
        }
      }
    } else {
      const subscribers = this.subscribers.get(subject);
      if (subscribers) {
        subscribers.delete(socket);
      }
    }

    if (callback) {
      callback({ success: true });
    }
  }

  handleDisconnect(socket) {
    // Remove from all subscriptions
    for (const subscribers of this.subscribers.values()) {
      subscribers.delete(socket);
    }

    // Remove from all queue groups
    for (const queues of this.queueGroups.values()) {
      for (const sockets of queues.values()) {
        const index = sockets.indexOf(socket);
        if (index > -1) {
          sockets.splice(index, 1);
        }
      }
    }
  }

  handleGetMessages(socket, options, callback) {
    const subject = options.subject || 'default';
    const messages = this.messages.get(subject) || [];
    
    if (callback) {
      callback({ 
        success: true, 
        messages: messages.map(msg => ({
          id: msg.id,
          data: msg.data,
          subject: msg.subject,
          timestamp: msg.timestamp,
          expiry: msg.expiry,
          removeAfterRead: msg.removeAfterRead
        })),
        count: messages.length
      });
    }
  }

  removeMessage(messageId, subject) {
    const queue = this.messages.get(subject);
    if (queue) {
      const index = queue.findIndex(m => m.id === messageId);
      if (index > -1) {
        queue.splice(index, 1);
      }
    }
  }

  startExpiryCheck() {
    setInterval(() => {
      const now = new Date();
      
      for (const [subject, queue] of this.messages.entries()) {
        this.messages.set(
          subject,
          queue.filter(msg => !msg.expiry || msg.expiry > now)
        );
      }
    }, 1000); // Check every second
  }

  close() {
    this.io.close();
  }
}

module.exports = { QueueBitServer };
