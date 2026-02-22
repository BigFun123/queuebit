# QueueBit Quick Start Guide

Get started with QueueBit in 5 minutes!

## Start the Server

```javascript
// server.js
const { QueueBitServer } = require('./src/server');

const server = new QueueBitServer({ port: 3333 });
// Starts listening immediately
```

```bash
node server.js
```

## Publisher

```javascript
const { QueueBitClient } = require('./src/client-node');

const client = new QueueBitClient('http://localhost:3333');

setTimeout(async () => {
  await client.publish({ message: 'Hello, QueueBit!', timestamp: new Date() });
  console.log('Message published!');
}, 1000);
```

## Subscriber

```javascript
const { QueueBitClient } = require('./src/client-node');

const client = new QueueBitClient('http://localhost:3333');

client.subscribe((message) => {
  console.log('Received:', message.data);
});
```

## In-Process (Server + Client Together)

```javascript
const { QueueBitServer } = require('./src/server');
const { QueueBitClient } = require('./src/client-node');

const server = new QueueBitServer({ port: 3333 });
const client = new QueueBitClient('http://localhost:3333');

setTimeout(async () => {
  await client.subscribe((msg) => console.log('Got:', msg.data));
  await client.publish({ hello: 'world' });
}, 500);
```

See [`examples/inprocessserver.js`](../examples/inprocessserver.js) for a full example.

## Common Patterns

### Regular Subscription (all subscribers receive every message)

```javascript
await client.subscribe((message) => {
  console.log('Event:', message.data);
}, { subject: 'events' });
```

### Load Balancer (round-robin, one subscriber per message)

```javascript
// Each worker gets a unique queue name → unique LB ID
await worker1.subscribe((msg) => {
  console.log(`LB#${msg.loadBalancerId}:`, msg.data);
}, { subject: 'tasks', queue: 'worker-1' });

await worker2.subscribe((msg) => {
  console.log(`LB#${msg.loadBalancerId}:`, msg.data);
}, { subject: 'tasks', queue: 'worker-2' });
```

### Ephemeral Messages (removed after first read)

```javascript
await client.publish(
  { notification: 'One-time alert' },
  { removeAfterRead: true, subject: 'alerts' }
);
```

### Message Expiry

```javascript
await client.publish(
  { code: 'ABC123' },
  { expiry: new Date(Date.now() + 300000) } // expires in 5 minutes
);
```

## Browser

```html
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script src="src/client-browser.js"></script>
<script>
  const client = new QueueBitClient('http://localhost:3333');
  client.subscribe((msg) => console.log(msg.data));
  client.publish({ text: 'Hello!' });
</script>
```

Open [`examples/qpanel.html`](../examples/qpanel.html) for the browser dashboard.

## Next Steps

- [API Documentation](./API.md) - Full API reference
- [Examples](./EXAMPLES.md) - More use case examples
- [`examples/`](../examples/) folder - Runnable examples
- [`test/test-harness.js`](../test/test-harness.js) - Run all tests
