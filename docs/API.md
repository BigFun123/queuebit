# QueueBit API Documentation

QueueBit is a high-performance, socket-based message queue system with guaranteed delivery.

## Table of Contents

- [Server API](#server-api)
- [Client API](#client-api)
- [Message Format](#message-format)
- [Examples](#examples)

---

## Server API

### QueueBitServer

The server class that handles message queuing and delivery.

#### Constructor

Creates a new QueueBit server instance.

```javascript
const { QueueBitServer } = require('queuebit');

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
  port: 3000,
  maxQueueSize: 50000 
});
```

#### close()

Shuts down the server and closes all connections.

```javascript
server.close();
```

**Example:**

```javascript
// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  server.close();
  process.exit(0);
});
```

---

## Client API

### QueueBitClient

The client class for connecting to a QueueBit server.

#### Constructor

Creates a new client connection to the server.

```javascript
const { QueueBitClient } = require('queuebit');

const client = new QueueBitClient(url);
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | 'http://localhost:3000' | Server URL |

**Example:**

```javascript
// Node.js
const { QueueBitClient } = require('queuebit');
const client = new QueueBitClient('http://localhost:3000');

// Browser
const client = new QueueBitClient('http://localhost:3000');
```

---

### publish(message, options)

Publishes a message to the queue.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | object | Yes | The message data (must be a JSON object) |
| `options` | object | No | Publishing options |

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `subject` | string | Subject/topic for routing (default: 'default') |
| `expiry` | Date | Expiration date for the message |
| `removeAfterRead` | boolean | Remove message after first delivery (default: false) |

**Returns:** Promise<{ success: boolean, messageId?: string, error?: string }>

**Examples:**

```javascript
// Basic publish
const result = await client.publish({ 
  text: 'Hello, World!' 
});
console.log(result); // { success: true, messageId: 'uuid-here' }

// Publish to specific subject
await client.publish(
  { orderId: 12345, status: 'pending' },
  { subject: 'orders' }
);

// Ephemeral message (removed after first read)
await client.publish(
  { notification: 'System update' },
  { removeAfterRead: true }
);

// Message with expiry (expires in 1 hour)
const expiryDate = new Date(Date.now() + 3600000);
await client.publish(
  { tempData: 'expires soon' },
  { 
    subject: 'temp',
    expiry: expiryDate 
  }
);
```

---

### subscribe(callback, options)

Subscribes to messages from the queue.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callback` | function | Yes | Function called when message is received |
| `options` | object | No | Subscription options |

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `subject` | string | Subscribe to specific subject (default: 'default') |
| `queue` | string | Join a queue group for load-balanced delivery |

**Callback Signature:**

```javascript
(message: QueueMessage) => void
```

**Returns:** Promise<{ success: boolean, subject?: string, queue?: string }>

**Examples:**

```javascript
// Basic subscription
await client.subscribe((message) => {
  console.log('Received:', message.data);
});

// Subscribe to specific subject
await client.subscribe(
  (message) => {
    console.log('Order received:', message.data);
  },
  { subject: 'orders' }
);

// Queue group (load-balanced across multiple subscribers)
await client.subscribe(
  (message) => {
    console.log('Processing task:', message.data);
    // Only one subscriber in the group receives this message
  },
  { 
    subject: 'tasks',
    queue: 'workers' 
  }
);

// Multiple subjects
await client.subscribe(
  (message) => console.log('High priority:', message.data),
  { subject: 'priority.high' }
);

await client.subscribe(
  (message) => console.log('Low priority:', message.data),
  { subject: 'priority.low' }
);
```

---

### unsubscribe(options)

Unsubscribes from messages.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options` | object | No | Unsubscription options |

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `subject` | string | Subject to unsubscribe from (default: 'default') |
| `queue` | string | Queue group to leave |

**Returns:** Promise<{ success: boolean }>

**Examples:**

```javascript
// Unsubscribe from default subject
await client.unsubscribe();

// Unsubscribe from specific subject
await client.unsubscribe({ subject: 'orders' });

// Leave queue group
await client.unsubscribe({ 
  subject: 'tasks',
  queue: 'workers' 
});
```

---

### getMessages(options)

Retrieves all messages currently in the queue for a subject.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options` | object | No | Query options |

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `subject` | string | Subject to query (default: 'default') |

**Returns:** Promise<{ success: boolean, messages: QueueMessage[], count: number }>

**Examples:**

```javascript
// Get all messages from default subject
const result = await client.getMessages();
console.log(`Found ${result.count} messages`);
result.messages.forEach(msg => {
  console.log(msg.data);
});

// Get messages from specific subject
const orders = await client.getMessages({ subject: 'orders' });
console.log(`${orders.count} pending orders`);
```

---

### disconnect()

Disconnects from the server.

```javascript
client.disconnect();
```

**Example:**

```javascript
// Clean disconnect
await client.unsubscribe();
client.disconnect();
```

---

## Message Format

### QueueMessage

Every message in QueueBit has the following structure:

```typescript
{
  id: string,              // Unique message identifier (UUID)
  data: object,            // Your message payload
  subject: string,         // Message subject/topic
  timestamp: Date,         // When message was published
  expiry?: Date,           // Optional expiration date
  removeAfterRead: boolean // Whether to remove after first read
}
```

**Example:**

```javascript
{
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  data: { orderId: 12345, amount: 99.99 },
  subject: 'orders',
  timestamp: '2024-01-15T10:30:00.000Z',
  expiry: null,
  removeAfterRead: false
}
```

---

## Examples

### Basic Pub/Sub

```javascript
const { QueueBitServer, QueueBitClient } = require('queuebit');

// Start server
const server = new QueueBitServer({ port: 3000 });

// Create clients
const publisher = new QueueBitClient('http://localhost:3000');
const subscriber = new QueueBitClient('http://localhost:3000');

// Subscribe
await subscriber.subscribe((message) => {
  console.log('Received:', message.data);
});

// Publish
await publisher.publish({ text: 'Hello, World!' });
```

### Request-Response Pattern

```javascript
// Responder
await responder.subscribe(async (message) => {
  const { requestId, question } = message.data;
  
  // Process request
  const answer = processQuestion(question);
  
  // Send response
  await responder.publish(
    { requestId, answer },
    { subject: 'responses' }
  );
}, { subject: 'requests' });

// Requester
const requestId = generateId();

// Listen for response
await requester.subscribe((message) => {
  if (message.data.requestId === requestId) {
    console.log('Answer:', message.data.answer);
  }
}, { subject: 'responses' });

// Send request
await requester.publish(
  { requestId, question: 'What is 2+2?' },
  { subject: 'requests' }
);
```

### Work Queue Pattern

```javascript
// Producer
for (let i = 0; i < 100; i++) {
  await producer.publish(
    { taskId: i, work: `Task ${i}` },
    { subject: 'tasks' }
  );
}

// Worker 1
await worker1.subscribe((message) => {
  console.log('Worker 1 processing:', message.data.taskId);
}, { subject: 'tasks', queue: 'workers' });

// Worker 2
await worker2.subscribe((message) => {
  console.log('Worker 2 processing:', message.data.taskId);
}, { subject: 'tasks', queue: 'workers' });

// Tasks are distributed between Worker 1 and Worker 2
```

### Expiring Messages

```javascript
// Publish message that expires in 5 minutes
const expiryDate = new Date(Date.now() + 300000);

await client.publish(
  { 
    code: 'ABC123',
    description: 'Temporary access code' 
  },
  { 
    subject: 'temp-codes',
    expiry: expiryDate 
  }
);

// Message is automatically removed after expiry
```

### One-Time Notifications

```javascript
// Publisher sends ephemeral notification
await publisher.publish(
  { alert: 'Server restarting in 5 minutes' },
  { 
    subject: 'alerts',
    removeAfterRead: true 
  }
);

// First subscriber gets the message
await subscriber1.subscribe((message) => {
  console.log('Alert:', message.data.alert); // Receives message
}, { subject: 'alerts' });

// Second subscriber connects later
await subscriber2.subscribe((message) => {
  console.log('Alert:', message.data.alert); // Won't receive it
}, { subject: 'alerts' });
```

### Multi-Topic Subscription

```javascript
const client = new QueueBitClient('http://localhost:3000');

// Subscribe to multiple topics
await client.subscribe((msg) => {
  console.log('User event:', msg.data);
}, { subject: 'users' });

await client.subscribe((msg) => {
  console.log('Order event:', msg.data);
}, { subject: 'orders' });

await client.subscribe((msg) => {
  console.log('Payment event:', msg.data);
}, { subject: 'payments' });

// Publish to different topics
await client.publish({ action: 'login' }, { subject: 'users' });
await client.publish({ orderId: 123 }, { subject: 'orders' });
await client.publish({ amount: 50 }, { subject: 'payments' });
```

---

## Performance Tips

1. **Use subjects** for routing instead of filtering in callbacks
2. **Queue groups** for load balancing across multiple consumers
3. **Batch publishing** when sending many messages
4. **Remove old messages** using expiry to prevent memory issues
5. **WebSocket transport** is faster than long-polling (default)

---

## Error Handling

```javascript
try {
  const result = await client.publish({ data: 'test' });
  if (!result.success) {
    console.error('Publish failed:', result.error);
  }
} catch (error) {
  console.error('Connection error:', error);
}

// Handle disconnection
client.socket.on('disconnect', () => {
  console.log('Disconnected from server');
  // Implement reconnection logic
});

client.socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

---

## Browser Usage

Include Socket.IO and QueueBit client in your HTML:

```html
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script src="node_modules/queuebit/src/client-browser.js"></script>

<script>
  const client = new QueueBitClient('http://localhost:3000');
  
  client.subscribe((message) => {
    console.log('Received:', message.data);
  });
  
  client.publish({ text: 'Hello from browser!' });
</script>
```

---

## NATS Compatibility

QueueBit implements NATS-like patterns:

- **Subjects**: Topic-based routing
- **Queue Groups**: Load-balanced delivery
- **At-least-once delivery**: Messages persisted until delivered
- **Wildcards**: Not currently supported (planned)

---

## Best Practices

1. **Use meaningful subject names**: `orders.created`, `users.login`, etc.
2. **Set appropriate expiry times** for temporary data
3. **Clean up subscriptions** when no longer needed
4. **Monitor queue sizes** to prevent memory issues
5. **Use queue groups** for scalable message processing
6. **Handle reconnection** in production applications

---

## License

MIT License - See LICENSE file for details
