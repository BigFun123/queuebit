# QueueBit Examples

Practical examples for common use cases.

## Table of Contents

- [Chat Application](#chat-application)
- [Task Queue System](#task-queue-system)
- [Real-time Analytics](#real-time-analytics)
- [Microservices Communication](#microservices-communication)
- [Event Sourcing](#event-sourcing)

---

## Chat Application

Simple chat room using QueueBit.

```javascript
const { QueueBitServer, QueueBitClient } = require('queuebit');

// Server
const server = new QueueBitServer({ port: 3000 });

// Client
const username = process.argv[2] || 'Anonymous';
const client = new QueueBitClient('http://localhost:3000');

// Receive messages
await client.subscribe((message) => {
  const { user, text, timestamp } = message.data;
  const time = new Date(timestamp).toLocaleTimeString();
  console.log(`[${time}] ${user}: ${text}`);
}, { subject: 'chat' });

// Send messages
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', async (text) => {
  await client.publish(
    { user: username, text, timestamp: new Date() },
    { subject: 'chat' }
  );
});

console.log(`Joined chat as ${username}`);
```

---

## Task Queue System

Distribute tasks across multiple workers.

```javascript
// producer.js
const { QueueBitClient } = require('queuebit');
const client = new QueueBitClient('http://localhost:3000');

async function produceTasks() {
  for (let i = 1; i <= 100; i++) {
    await client.publish(
      {
        taskId: i,
        type: 'process-image',
        imageUrl: `https://example.com/img${i}.jpg`,
        priority: i % 10 === 0 ? 'high' : 'normal'
      },
      { subject: 'tasks' }
    );
    console.log(`Task ${i} queued`);
  }
}

produceTasks();

// worker.js
const { QueueBitClient } = require('queuebit');
const workerId = process.argv[2] || '1';
const client = new QueueBitClient('http://localhost:3000');

await client.subscribe(async (message) => {
  const { taskId, type, imageUrl, priority } = message.data;
  
  console.log(`Worker ${workerId} processing task ${taskId} (${priority})`);
  
  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Publish result
  await client.publish(
    { taskId, workerId, status: 'completed', timestamp: new Date() },
    { subject: 'results' }
  );
  
  console.log(`Worker ${workerId} completed task ${taskId}`);
}, { subject: 'tasks', queue: 'workers' });

console.log(`Worker ${workerId} ready`);
```

---

## Real-time Analytics

Collect and aggregate analytics events.

```javascript
// event-collector.js
const { QueueBitServer, QueueBitClient } = require('queuebit');

const server = new QueueBitServer({ port: 3000 });
const collector = new QueueBitClient('http://localhost:3000');

const stats = {
  pageViews: 0,
  clicks: 0,
  purchases: 0
};

await collector.subscribe((message) => {
  const { eventType, data } = message.data;
  
  switch(eventType) {
    case 'pageview':
      stats.pageViews++;
      break;
    case 'click':
      stats.clicks++;
      break;
    case 'purchase':
      stats.purchases++;
      break;
  }
  
  console.log('Stats:', stats);
}, { subject: 'analytics' });

// Display stats every 5 seconds
setInterval(() => {
  console.log('\n=== Analytics Dashboard ===');
  console.log(`Page Views: ${stats.pageViews}`);
  console.log(`Clicks: ${stats.clicks}`);
  console.log(`Purchases: ${stats.purchases}`);
  console.log('===========================\n');
}, 5000);

// event-generator.js (simulate events)
const client = new QueueBitClient('http://localhost:3000');

setInterval(async () => {
  const events = ['pageview', 'click', 'purchase'];
  const eventType = events[Math.floor(Math.random() * events.length)];
  
  await client.publish(
    {
      eventType,
      data: { userId: Math.floor(Math.random() * 1000) },
      timestamp: new Date()
    },
    { subject: 'analytics' }
  );
}, 100);
```

---

## Microservices Communication

Services communicate through QueueBit.

```javascript
// user-service.js
const { QueueBitClient } = require('queuebit');
const client = new QueueBitClient('http://localhost:3000');

// Listen for user creation requests
await client.subscribe(async (message) => {
  const { requestId, username, email } = message.data;
  
  // Create user in database
  const userId = await createUser(username, email);
  
  // Publish user created event
  await client.publish(
    { userId, username, email },
    { subject: 'user.created' }
  );
  
  // Send response
  await client.publish(
    { requestId, success: true, userId },
    { subject: 'responses' }
  );
}, { subject: 'user.create' });

// order-service.js
const client = new QueueBitClient('http://localhost:3000');

// Listen for user created events
await client.subscribe(async (message) => {
  const { userId, username } = message.data;
  
  console.log(`New user ${username} (${userId}) - initializing order history`);
  await initializeOrderHistory(userId);
}, { subject: 'user.created' });

// api-gateway.js
const client = new QueueBitClient('http://localhost:3000');

async function createUser(username, email) {
  const requestId = generateId();
  
  // Listen for response
  const responsePromise = new Promise((resolve) => {
    client.subscribe((message) => {
      if (message.data.requestId === requestId) {
        resolve(message.data);
      }
    }, { subject: 'responses' });
  });
  
  // Send request
  await client.publish(
    { requestId, username, email },
    { subject: 'user.create' }
  );
  
  return responsePromise;
}
```

---

## Event Sourcing

Store all events and rebuild state.

```javascript
// event-store.js
const { QueueBitClient } = require('queuebit');
const client = new QueueBitClient('http://localhost:3000');

const events = [];

// Store all events
await client.subscribe((message) => {
  events.push(message.data);
  console.log(`Event stored: ${message.data.type}`);
}, { subject: 'events' });

// Rebuild state from events
function rebuildState() {
  const state = { balance: 0, transactions: [] };
  
  for (const event of events) {
    switch(event.type) {
      case 'deposit':
        state.balance += event.amount;
        state.transactions.push(event);
        break;
      case 'withdraw':
        state.balance -= event.amount;
        state.transactions.push(event);
        break;
    }
  }
  
  return state;
}

// bank-account.js
const client = new QueueBitClient('http://localhost:3000');

async function deposit(amount) {
  await client.publish(
    {
      type: 'deposit',
      amount,
      timestamp: new Date(),
      accountId: 'ACC123'
    },
    { subject: 'events' }
  );
}

async function withdraw(amount) {
  await client.publish(
    {
      type: 'withdraw',
      amount,
      timestamp: new Date(),
      accountId: 'ACC123'
    },
    { subject: 'events' }
  );
}

// Usage
await deposit(100);
await withdraw(50);
await deposit(75);

// Rebuild state at any time
const state = rebuildState();
console.log('Current balance:', state.balance); // 125
```

---

## More Examples

See the [examples folder](../examples/) for:
- Browser-based example with UI
- Performance testing
- Advanced patterns

---

## Tips

1. **Use subjects** to organize message types
2. **Queue groups** for scalable processing
3. **Store event IDs** to prevent duplicate processing
4. **Set expiry** for temporary messages
5. **Monitor performance** with the test harness
