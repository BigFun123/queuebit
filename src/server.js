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
    this.loadBalancers = new Map();
    this.loadBalancerIdCounter = 0;
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

    const loadBalancers = this.loadBalancers.get(subject);
    if (loadBalancers && loadBalancers.size > 0) {
      const activeLBs = [];
      for (const [lbName, lb] of loadBalancers.entries()) {
        if (lb.sockets.length > 0) {
          activeLBs.push(lb);
        }
      }

      if (activeLBs.length > 0) {
        if (!this._lbRoundRobinIndex) this._lbRoundRobinIndex = {};
        if (this._lbRoundRobinIndex[subject] === undefined) this._lbRoundRobinIndex[subject] = 0;

        const idx = this._lbRoundRobinIndex[subject] % activeLBs.length;
        this._lbRoundRobinIndex[subject]++;

        const lb = activeLBs[idx];
        const socket = lb.sockets[0];
        lb.sockets.push(lb.sockets.shift()); // rotate within LB

        socket.emit('message', { ...message, loadBalancerId: lb.id, queueName: lb.name });

        // Always remove from store after LB delivery - LB messages are consumed, not persistent
        this.removeMessage(message.id, subject);
        return;
      }
    }

    // Only deliver to regular subscribers if no load balancer handled it
    const subscribers = this.subscribers.get(subject);
    if (subscribers) {
      for (const socket of subscribers) {
        socket.emit('message', message);
      }
      if (message.removeAfterRead) {
        this.removeMessage(message.id, subject);
      }
    }
  }

  handleSubscribe(socket, options, callback) {
    const subject = options.subject || 'default';
    const lbName = options.queue;

    if (lbName) {
      if (!this.loadBalancers.has(subject)) {
        this.loadBalancers.set(subject, new Map());
      }
      
      const lbs = this.loadBalancers.get(subject);
      if (!lbs.has(lbName)) {
        lbs.set(lbName, { id: ++this.loadBalancerIdCounter, name: lbName, sockets: [] });
      }
      
      lbs.get(lbName).sockets.push(socket);
      // Do NOT replay existing messages to load balancer subscribers
    } else {
      // Regular subscription (all subscribers get messages)
      if (!this.subscribers.has(subject)) {
        this.subscribers.set(subject, new Set());
      }
      
      this.subscribers.get(subject).add(socket);

      // Replay existing messages only for regular subscribers
      const messages = this.messages.get(subject) || [];
      for (const message of messages) {
        if (!message.removeAfterRead) {
          socket.emit('message', message);
        }
      }
    }

    if (callback) {
      callback({ 
        success: true, 
        subject, 
        loadBalancer: lbName,
        loadBalancerId: lbName ? this.loadBalancers.get(subject)?.get(lbName)?.id : undefined
      });
    }
  }

  handleUnsubscribe(socket, options, callback) {
    const subject = options.subject || 'default';
    const lbName = options.queue;

    if (lbName) {
      const lbs = this.loadBalancers.get(subject);
      if (lbs) {
        const lb = lbs.get(lbName);
        if (lb) {
          const index = lb.sockets.indexOf(socket);
          if (index > -1) {
            lb.sockets.splice(index, 1);
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

    // Remove from all load balancers
    for (const lbs of this.loadBalancers.values()) {
      for (const lb of lbs.values()) {
        const index = lb.sockets.indexOf(socket);
        if (index > -1) {
          lb.sockets.splice(index, 1);
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
