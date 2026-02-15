# QueueBit Quick Start Guide

Get started with QueueBit in 5 minutes!

## Installation

```bash
npm install queuebit
```

## Start the Server

```javascript
// server.js
const { QueueBitServer } = require('queuebit');

const server = new QueueBitServer({ port: 3000 });
console.log('QueueBit server running on port 3000');
```

Run it:

```bash
node server.js
```

## Publisher Example

```javascript
// publisher.js
const { QueueBitClient } = require('queuebit');

const client = new QueueBitClient('http://localhost:3000');

// Wait for connection
setTimeout(async () => {
  // Publish a message
  await client.publish({ 
    message: 'Hello, QueueBit!',
    timestamp: new Date()
  });
  
  console.log('Message published!');
}, 1000);
```

## Subscriber Example

```javascript
// subscriber.js
const { QueueBitClient } = require('queuebit');

const client = new QueueBitClient('http://localhost:3000');

// Subscribe to messages
client.subscribe((message) => {
  console.log('Received:', message.data);
});

console.log('Waiting for messages...');
```

## Run the Examples

Open three terminals:

```bash
# Terminal 1: Start server
node server.js

# Terminal 2: Start subscriber
node subscriber.js

# Terminal 3: Publish messages
node publisher.js
```

## Next Steps

- Read the [API Documentation](./API.md)
- Check out [Examples](./EXAMPLES.md)
- See the [browser example](../examples/browser-example.html)

## Common Patterns

### Work Queue

```javascript
// Multiple workers process tasks in parallel
await worker.subscribe((message) => {
  processTask(message.data);
}, { subject: 'tasks', queue: 'workers' });
```

### Pub/Sub

```javascript
// All subscribers receive every message
await subscriber.subscribe((message) => {
  handleEvent(message.data);
}, { subject: 'events' });
```

### Request/Response

```javascript
// Send request and wait for response
const requestId = generateId();

await client.subscribe((msg) => {
  if (msg.data.requestId === requestId) {
    console.log('Response:', msg.data);
  }
}, { subject: 'responses' });

await client.publish(
  { requestId, data: 'request' },
  { subject: 'requests' }
);
```

Happy queuing! 🚀
