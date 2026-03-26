// @ts-check
const { Server } = require('./socket.js');
const { QueuePersistence } = require('./queue-persistence');
const packageJson = require('../package.json');

/**
 * Local GUID generator (RFC 4122 v4 compliant)
 * @returns {string} A UUID v4 string
 */
function generateGuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * @typedef {import('./types').QueueBitServerOptions} QueueBitServerOptions
 * @typedef {import('./types').QueueMessage} QueueMessage
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
 * @typedef {import('./types').LoadBalancer} LoadBalancer
 * @typedef {import('./types').MonitorStats} MonitorStats
 */

/**
 * @typedef {Object} Socket
 * @property {string} id - Unique socket identifier
 * @property {(event: string, handler: Function) => Socket} on - Register event handler
 * @property {(event: string, data: any) => Socket} emit - Emit event to client
 */

class QueueBitServer {
  /**
   * Create a new QueueBit server
   * @param {QueueBitServerOptions} [options={}] - Server configuration options
   */
  constructor(options = {}) {
    const port = options.port || 3000;
    this.maxQueueSize = options.maxQueueSize || 10000;
    this.version = packageJson.version;
    this.monitorInterval = options.monitorInterval || null;
    this.monitorCallback = options.monitorCallback || null;
    this.persistence = options.persistentQueue
      ? new QueuePersistence({
        directory: options.queueDirectory,
        fileName: options.queueFileName
      })
      : null;
    
    this.messages = new Map();
    this.subscribers = new Map();
    this.loadBalancers = new Map();
    this.loadBalancerIdCounter = 0;
    /** @type {QueueMessage[]} */
    this.deliveryQueue = [];
    this.deliveryBatchSize = 100;
    this.isDelivering = false;
    this._messageSequence = 0;
    /** @type {Record<string, number>} */
    this._lbRoundRobinIndex = {};

    this.loadPersistedMessages();
    
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
    if (this.monitorInterval) {
      this.startMonitor(this.monitorInterval);
    }
    
    console.log(`QueueBit server v${this.version} listening on port ${port}`);
  }

  loadPersistedMessages() {
    if (!this.persistence) {
      return;
    }

    const persistedMessages = this.persistence.loadQueue();
    if (persistedMessages.length === 0) {
      return;
    }

    for (const persistedMessage of persistedMessages) {
      const subject = persistedMessage.subject || 'default';
      const sequence = Number.isFinite(persistedMessage.sequence)
        ? persistedMessage.sequence
        : this._messageSequence++;
      const queueMessage = {
        id: persistedMessage.id || generateGuid(),
        data: persistedMessage.data,
        expiry: persistedMessage.expiry ? new Date(persistedMessage.expiry) : undefined,
        removeAfterRead: !!persistedMessage.removeAfterRead,
        timestamp: persistedMessage.timestamp ? new Date(persistedMessage.timestamp) : new Date(),
        subject,
        priority: Number.isFinite(persistedMessage.priority) ? persistedMessage.priority : 0,
        sequence
      };

      if (!this.messages.has(subject)) {
        this.messages.set(subject, []);
      }

      this.messages.get(subject).push(queueMessage);
      this._messageSequence = Math.max(this._messageSequence, sequence + 1);
    }

    for (const queue of this.messages.values()) {
      queue.sort((/** @type {QueueMessage} */ a, /** @type {QueueMessage} */ b) => this.compareByPriorityAndSequence(a, b));
    }

    console.log(`Loaded ${persistedMessages.length} persisted messages from disk`);
  }

  /**
   * @param {QueueMessage} a - First message
   * @param {QueueMessage} b - Second message
   * @returns {number} Sort order for priority queue
   */
  compareByPriorityAndSequence(a, b) {
    const priorityDelta = (b.priority || 0) - (a.priority || 0);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return (a.sequence || 0) - (b.sequence || 0);
  }

  /**
   * @param {QueueMessage[]} queue - Priority queue array
   * @param {QueueMessage} message - Message to insert
   */
  insertPriority(queue, message) {
    let low = 0;
    let high = queue.length;

    while (low < high) {
      const mid = (low + high) >> 1;
      if (this.compareByPriorityAndSequence(message, queue[mid]) < 0) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    queue.splice(low, 0, message);
  }

  persistQueue() {
    if (!this.persistence) {
      return;
    }

    this.persistence.requestSave(this.messages);
  }

  setupHandlers() {
    this.io.on('connection', /** @param {Socket} socket */ (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      socket.emit('serverInfo', { 
        version: this.version,
        name: 'QueueBit',
        timestamp: new Date()
      });

      socket.on('publish', (/** @type {{ message: any, options?: PublishOptions }} */ data, /** @type {(response: PublishResponse) => void} */ callback) => {
        this.handlePublish(socket, data.message, data.options || {}, callback);
      });

      socket.on('subscribe', (/** @type {SubscribeOptions} */ options, /** @type {(response: SubscribeResponse) => void} */ callback) => {
        this.handleSubscribe(socket, options, callback);
      });

      socket.on('unsubscribe', (/** @type {UnsubscribeOptions} */ options, /** @type {(response: UnsubscribeResponse) => void} */ callback) => {
        this.handleUnsubscribe(socket, options, callback);
      });

      socket.on('getMessages', (/** @type {GetMessagesOptions} */ options, /** @type {(response: GetMessagesResponse) => void} */ callback) => {
        this.handleGetMessages(socket, options, callback);
      });

      socket.on('clearMessages', (/** @type {ClearMessagesOptions} */ options, /** @type {(response: ClearMessagesResponse) => void} */ callback) => {
        this.handleClearMessages(socket, options, callback);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Handle publish event
   * @param {Socket} socket - The socket that published the message
   * @param {any} message - The message data
   * @param {PublishOptions} [options={}] - Publish options
   * @param {(response: PublishResponse) => void} [callback] - Callback function
   */
  handlePublish(socket, message, options = {}, callback) {
    const subject = options.subject || 'default';
    const priority = typeof options.priority === 'number' && Number.isFinite(options.priority)
      ? options.priority
      : 0;
    const queueMessage = {
      id: generateGuid(),
      data: message,
      expiry: options.expiry ? new Date(options.expiry) : undefined,
      removeAfterRead: options.removeAfterRead || false,
      timestamp: new Date(),
      subject,
      priority,
      sequence: this._messageSequence++
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

    this.insertPriority(queue, queueMessage);
    
    // Add to delivery queue for batch processing
    this.insertPriority(this.deliveryQueue, queueMessage);

    this.persistQueue();
    
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

  /**
   * Deliver a message to subscribers or load balancers
   * @param {QueueMessage} message - The message to deliver
   */
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

  /**
   * Handle subscribe event
   * @param {Socket} socket - The socket subscribing
   * @param {SubscribeOptions} options - Subscribe options
   * @param {(response: SubscribeResponse) => void} [callback] - Callback function
   */
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

  /**
   * Handle unsubscribe event
   * @param {Socket} socket - The socket unsubscribing
   * @param {UnsubscribeOptions} options - Unsubscribe options
   * @param {(response: UnsubscribeResponse) => void} [callback] - Callback function
   */
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

  /**
   * Handle disconnect event
   * @param {Socket} socket - The socket that disconnected
   */
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

  /**
   * Handle getMessages event
   * @param {Socket} socket - The socket requesting messages
   * @param {GetMessagesOptions} options - Get messages options
   * @param {(response: GetMessagesResponse) => void} [callback] - Callback function
   */
  handleGetMessages(socket, options, callback) {
    const subject = options.subject || 'default';
    const messages = this.messages.get(subject) || [];
    
    if (callback) {
      callback({
        success: true,
        messages: messages.map((/** @type {QueueMessage} */ msg) => ({
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

  /**
   * Handle clearMessages event
   * @param {Socket} socket - The socket requesting to clear messages
   * @param {ClearMessagesOptions} options - Clear messages options
   * @param {(response: ClearMessagesResponse) => void} [callback] - Callback function
   */
  handleClearMessages(socket, options, callback) {
    const clearAll = !!options.all;
    let count = 0;

    if (clearAll) {
      for (const queue of this.messages.values()) {
        count += queue.length;
      }

      this.messages.clear();
      this.deliveryQueue = [];
      this.persistQueue();

      if (callback) {
        callback({ success: true, all: true, cleared: count });
      }
      return;
    }

    const subject = options.subject || 'default';
    count = (this.messages.get(subject) || []).length;
    this.messages.set(subject, []);
    this.deliveryQueue = this.deliveryQueue.filter((/** @type {QueueMessage} */ message) => message.subject !== subject);
    this.persistQueue();
    if (callback) {
      callback({ success: true, subject, all: false, cleared: count });
    }
  }

  /**
   * Remove a message from the queue
   * @param {string} messageId - The message ID to remove
   * @param {string} subject - The subject/topic
   */
  removeMessage(messageId, subject) {
    const queue = this.messages.get(subject);
    if (queue) {
      const index = queue.findIndex((/** @type {QueueMessage} */ m) => m.id === messageId);
      if (index > -1) {
        queue.splice(index, 1);
        this.persistQueue();
      }
    }
  }

  /**
   * Start expiry check interval
   */
  startExpiryCheck() {
    setInterval(() => {
      const now = new Date();
      let changed = false;
      
      for (const [subject, queue] of this.messages.entries()) {
        const filteredQueue = queue.filter((/** @type {QueueMessage} */ msg) => !msg.expiry || msg.expiry > now);
        if (filteredQueue.length !== queue.length) {
          changed = true;
          this.messages.set(subject, filteredQueue);
        }
      }

      if (changed) {
        this.persistQueue();
      }
    }, 1000); // Check every second
  }

  /**
   * Start monitor interval
   * @param {number} [interval=5000] - Monitor interval in milliseconds
   */
  startMonitor(interval = 5000) {
    setInterval(() => {
      /** @type {MonitorStats} */
      const stats = {
        timestamp: new Date().toISOString(),
        deliveryQueuePending: this.deliveryQueue.length,
        subjects: {},
        totalMessages: 0,
        totalSubscribers: 0,
        totalLBWorkers: 0,
        loadBalancers: {}
      };

      for (const [subject, queue] of this.messages.entries()) {
        stats.subjects[subject] = stats.subjects[subject] || {};
        stats.subjects[subject].messages = queue.length;
        stats.totalMessages += queue.length;
      }

      for (const [subject, subs] of this.subscribers.entries()) {
        stats.subjects[subject] = stats.subjects[subject] || {};
        stats.subjects[subject].subscribers = subs.size;
        stats.totalSubscribers += subs.size;
      }

      for (const [subject, lbs] of this.loadBalancers.entries()) {
        for (const [lbName, lb] of lbs.entries()) {
          const key = `${subject} | ${lbName}`;
          stats.loadBalancers[key] = lb.sockets.length;
          stats.totalLBWorkers += lb.sockets.length;          
        }
      }

      if (this.monitorCallback) {
        this.monitorCallback(stats);
      }
    }, interval);
  }

  close() {
    if (this.persistence) {
      this.persistence.forceSaveSync(this.messages);
    }
    this.io.close();
  }
}

module.exports = { QueueBitServer };
