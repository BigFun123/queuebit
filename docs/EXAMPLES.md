# QueueBit Examples

Practical examples for common use cases.

## Table of Contents

- [Runnable Examples](#runnable-examples)
- [Chat Application](#chat-application)
- [Task Queue with Load Balancer](#task-queue-with-load-balancer)
- [Real-time Analytics](#real-time-analytics)
- [Microservices Communication](#microservices-communication)
- [Event Sourcing](#event-sourcing)

---

## Runnable Examples

| File | Description |
|------|-------------|
| [`examples/server2server.js`](../examples/server2server.js) | HTTP server using an external QueueBit server |
| [`examples/inprocessserver.js`](../examples/inprocessserver.js) | HTTP server with QueueBit running in-process |
| [`examples/queuegroup.js`](../examples/queuegroup.js) | Load balancer demo with 3 workers |
| [`examples/qpanel.html`](../examples/qpanel.html) | Browser dashboard with publish, subscribe, load balancer, and perf testing |
| [`test/test-harness.js`](../test/test-harness.js) | Full test suite |

---

## Chat Application

```javascript
const { QueueBitServer } = require('./src/server');
const { QueueBitClient } = require('./src/client-node');

const server = new QueueBitServer({ port: 3333 });
const username = process.argv[2] || 'Anonymous';
const client = new QueueBitClient('http://localhost:3333');

await client.subscribe((message) => {
  const { user, text, timestamp } = message.data;
  console.log(`[${new Date(timestamp).toLocaleTimeString()}] ${user}: ${text}`);
}, { subject: 'chat' });

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.on('line', async (text) => {
  await client.publish({ user: username, text, timestamp: new Date() }, { subject: 'chat' });
});
```

---

## Task Queue with Load Balancer

Messages are distributed round-robin — each message goes to exactly one worker.

```javascript
const { QueueBitServer } = require('./src/server');
const { QueueBitClient } = require('./src/client-node');

const server = new QueueBitServer({ port: 3333 });

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

await sleep(500);

const worker1 = new QueueBitClient('http://localhost:3333');
const worker2 = new QueueBitClient('http://localhost:3333');
const worker3 = new QueueBitClient('http://localhost:3333');

await sleep(500);

// Each worker has a unique queue name → unique load balancer ID
await worker1.subscribe((msg) => {
  console.log(`LB#${msg.loadBalancerId} Worker1:`, msg.data);
}, { subject: 'tasks', queue: 'worker-1' });

await worker2.subscribe((msg) => {
  console.log(`LB#${msg.loadBalancerId} Worker2:`, msg.data);
}, { subject: 'tasks', queue: 'worker-2' });

await worker3.subscribe((msg) => {
  console.log(`LB#${msg.loadBalancerId} Worker3:`, msg.data);
}, { subject: 'tasks', queue: 'worker-3' });

const publisher = new QueueBitClient('http://localhost:3333');
await sleep(500);

// Messages cycle: LB#1 → LB#2 → LB#3 → LB#1 → ...
for (let i = 1; i <= 9; i++) {
  await publisher.publish({ taskId: i }, { subject: 'tasks' });
  await sleep(100);
}
```

See [`examples/queuegroup.js`](../examples/queuegroup.js) for the runnable version.

---

## Real-time Analytics

```javascript
const stats = { pageViews: 0, clicks: 0, purchases: 0 };

await collector.subscribe((message) => {
  const { eventType } = message.data;
  if (eventType === 'pageview') stats.pageViews++;
  if (eventType === 'click') stats.clicks++;
  if (eventType === 'purchase') stats.purchases++;
}, { subject: 'analytics' });

setInterval(() => {
  console.log('Stats:', stats);
}, 5000);

// Simulate events
setInterval(async () => {
  const events = ['pageview', 'click', 'purchase'];
  await client.publish(
    { eventType: events[Math.floor(Math.random() * 3)] },
    { subject: 'analytics' }
  );
}, 100);
```

---

## Microservices Communication

```javascript
// user-service.js
await client.subscribe(async (message) => {
  const { requestId, username, email } = message.data;
  const userId = await createUser(username, email);

  await client.publish({ requestId, success: true, userId }, { subject: 'responses' });
  await client.publish({ userId, username, email }, { subject: 'user.created' });
}, { subject: 'user.create' });

// order-service.js - reacts to user creation events
await client.subscribe(async (message) => {
  const { userId } = message.data;
  await initializeOrderHistory(userId);
}, { subject: 'user.created' });

// api-gateway.js
async function createUser(username, email) {
  const requestId = crypto.randomUUID();

  const responsePromise = new Promise((resolve) => {
    client.subscribe((msg) => {
      if (msg.data.requestId === requestId) resolve(msg.data);
    }, { subject: 'responses' });
  });

  await client.publish({ requestId, username, email }, { subject: 'user.create' });
  return responsePromise;
}
```

---

## Event Sourcing

```javascript
const events = [];

// Store all events
await client.subscribe((message) => {
  events.push(message.data);
}, { subject: 'account.events' });

// Rebuild state from events
function getBalance() {
  return events.reduce((bal, e) => {
    if (e.type === 'deposit') return bal + e.amount;
    if (e.type === 'withdraw') return bal - e.amount;
    return bal;
  }, 0);
}

// Publish events
await client.publish({ type: 'deposit', amount: 100 }, { subject: 'account.events' });
await client.publish({ type: 'withdraw', amount: 30 }, { subject: 'account.events' });
await client.publish({ type: 'deposit', amount: 50 }, { subject: 'account.events' });

console.log('Balance:', getBalance()); // 120
```

---

## Tips

1. Use **subjects** to organize message types (e.g. `orders.created`, `users.login`)
2. Use **load balancers** with unique queue names per worker for scalable processing
3. Use **`removeAfterRead: true`** for one-time notifications
4. Use **`expiry`** to auto-clean temporary messages
5. The **`loadBalancerId`** in received messages identifies which load balancer delivered it
6. Load balancer messages are **consumed** — not replayed to late subscribers
