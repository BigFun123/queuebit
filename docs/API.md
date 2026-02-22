# QueueBit API Documentation

QueueBit is a high-performance, socket-based message queue system with guaranteed delivery.

## Table of Contents

- [Server API](#server-api)
- [Client API](#client-api)
- [Message Format](#message-format)
- [Load Balancer](#load-balancer)
- [Examples](#examples)

---

## Server API

### QueueBitServer

```javascript
const { QueueBitServer } = require('queuebit/src/server');
const server = new QueueBitServer(options);
```

**Options:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `port` | number | 3000 | Port number for the server |
| `maxQueueSize` | number | 10000 | Maximum messages per subject |

**Example:**

```javascript
const server = new QueueBitServer({ 
  port: 3333,
  maxQueueSize: 50000 
});
```

#### close()

Shuts down the server and closes all connections.

```javascript
server.close();
```

---

## Client API

### QueueBitClient

```javascript
// Node.js
const { QueueBitClient } = require('queuebit/src/client-node');
const client = new QueueBitClient('http://localhost:3333');

// Browser - include socket.io first
// <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
// <script src="src/client-browser.js"></script>
const client = new QueueBitClient('http://localhost:3333');
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | 'http://localhost:3333' | Server URL |

---

### publish(message, options)

Publishes a message to the queue.

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `subject` | string | Subject/topic for routing (default: 'default') |
| `expiry` | Date | Expiration date for the message |
| `removeAfterRead` | boolean | Remove message after first delivery (default: false) |

**Returns:** `Promise<{ success: boolean, messageId?: string, error?: string }>`

```javascript
// Basic publish
await client.publish({ text: 'Hello, World!' });

// Publish to subject
await client.publish({ orderId: 123 }, { subject: 'orders' });

// Ephemeral (removed after first read)
await client.publish({ code: 'ABC' }, { removeAfterRead: true });

// With expiry
await client.publish(
  { data: 'temp' },
  { expiry: new Date(Date.now() + 3600000) }
);
```

---

### subscribe(callback, options)

Subscribes to messages. All existing non-ephemeral messages are replayed to new regular subscribers.

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `subject` | string | Subscribe to specific subject (default: 'default') |
| `queue` | string | Join a load balancer group for round-robin delivery |

**Returns:** `Promise<{ success: boolean, subject: string, loadBalancer?: string, loadBalancerId?: number }>`

```javascript
// Regular subscription (all subscribers receive every message)
await client.subscribe((message) => {
  console.log('Received:', message.data);
}, { subject: 'events' });

// Load balancer (only one subscriber receives each message, round-robin)
await client.subscribe((message) => {
  console.log('Processing:', message.data);
}, { subject: 'tasks', queue: 'my-workers' });
```

> **Note:** Load balancer subscriptions do **not** receive existing messages on subscribe, only new ones.

---

### unsubscribe(options)

Unsubscribes from messages.

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `subject` | string | Subject to unsubscribe from (default: 'default') |
| `queue` | string | Load balancer group to leave |

**Returns:** `Promise<{ success: boolean }>`

```javascript
await client.unsubscribe({ subject: 'orders' });
await client.unsubscribe({ subject: 'tasks', queue: 'my-workers' });
```

---

### getMessages(options)

Retrieves all messages currently stored for a subject.

**Returns:** `Promise<{ success: boolean, messages: QueueMessage[], count: number }>`

```javascript
const result = await client.getMessages({ subject: 'orders' });
console.log(`${result.count} messages`);
result.messages.forEach(msg => console.log(msg.data));
```

---

### disconnect()

Disconnects the client from the server.

```javascript
client.disconnect();
```

---

## Message Format

```typescript
{
  id: string,              // Unique UUID
  data: object,            // Your message payload
  subject: string,         // Message subject/topic
  timestamp: Date,         // When published
  expiry?: Date,           // Optional expiration
  removeAfterRead: boolean,// Ephemeral flag
  loadBalancerId?: number, // Set when delivered via load balancer
  queueName?: string       // Load balancer group name (internal routing)
}
```

---

## Load Balancer

Load balancers provide round-robin delivery across multiple subscribers. Each message is delivered to exactly one subscriber.

- Each call to `subscribe` with a unique `queue` name creates a new load balancer with a unique numeric ID
- Messages are distributed round-robin across all registered load balancers for a subject
- Load balancer messages are **consumed** (not stored) after delivery
- The `loadBalancerId` is included in delivered messages for identification

```javascript
// Worker 1 - gets its own load balancer (e.g. LB#1)
await worker1.subscribe((msg) => {
  console.log(`LB#${msg.loadBalancerId} got:`, msg.data);
}, { subject: 'jobs', queue: 'worker-1' });

// Worker 2 - gets its own load balancer (e.g. LB#2)
await worker2.subscribe((msg) => {
  console.log(`LB#${msg.loadBalancerId} got:`, msg.data);
}, { subject: 'jobs', queue: 'worker-2' });

// Messages alternate: LB#1, LB#2, LB#1, LB#2, ...
await publisher.publish({ job: 1 }, { subject: 'jobs' }); // → LB#1
await publisher.publish({ job: 2 }, { subject: 'jobs' }); // → LB#2
await publisher.publish({ job: 3 }, { subject: 'jobs' }); // → LB#1
```

---

## Examples

### Basic Pub/Sub

```javascript
const { QueueBitServer } = require('./src/server');
const { QueueBitClient } = require('./src/client-node');

const server = new QueueBitServer({ port: 3333 });
const publisher = new QueueBitClient('http://localhost:3333');
const subscriber = new QueueBitClient('http://localhost:3333');

await subscriber.subscribe((message) => {
  console.log('Received:', message.data);
});

await publisher.publish({ text: 'Hello, World!' });
```

### In-Process Server

```javascript
const { QueueBitServer } = require('./src/server');
const { QueueBitClient } = require('./src/client-node');

// Start server and client in the same process
const server = new QueueBitServer({ port: 3333 });
const client = new QueueBitClient('http://localhost:3333');

await client.subscribe((msg) => {
  console.log('Got:', msg.data);
});

await client.publish({ hello: 'world' });
```

### Work Queue

```javascript
// Producer
for (let i = 0; i < 10; i++) {
  await producer.publish({ taskId: i }, { subject: 'tasks' });
}

// Worker 1
await worker1.subscribe((msg) => {
  console.log('Worker 1:', msg.data.taskId);
}, { subject: 'tasks', queue: 'worker-1' });

// Worker 2
await worker2.subscribe((msg) => {
  console.log('Worker 2:', msg.data.taskId);
}, { subject: 'tasks', queue: 'worker-2' });
// Tasks alternate between workers
```

---

## Browser Usage

```html
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script src="src/client-browser.js"></script>
<script>
  const client = new QueueBitClient('http://localhost:3333');
  
  client.subscribe((message) => {
    console.log('Received:', message.data);
  }, { subject: 'events' });
  
  client.publish({ text: 'Hello from browser!' }, { subject: 'events' });
</script>
```

See [`examples/qpanel.html`](../examples/qpanel.html) for a full browser dashboard with publish, subscribe, load balancer, and performance testing.

---

## Error Handling

```javascript
try {
  const result = await client.publish({ data: 'test' });
  if (!result.success) {
    console.error('Publish failed:', result.error);
  }
} catch (error) {
  // Thrown on timeout (5 second default)
  console.error('Publish error:', error.message);
}

client.socket.on('disconnect', () => console.log('Disconnected'));
client.socket.on('connect_error', (err) => console.error('Connection error:', err));
```
