# QueueBit

A high performance socket-based message queue server with guaranteed delivery, compatible with NATS queue patterns.

It can run in-process in an existing nodejs app, separately as a nodejs server, and has clients 
for the backend and frontend.

## Features

- WebSocket-based message queue
- Subject-based message routing
- Queue groups for load-balanced message delivery
- Message expiry support
- Remove after read (ephemeral messages)
- Guaranteed delivery to all subscribers
- NATS-compatible API patterns

## Installation

```bash
npm install queuebit
```

## Documentation

- **[Quick Start Guide](./docs/QUICKSTART.md)** - Get started in 5 minutes
- **[API Reference](./docs/API.md)** - Complete API documentation
- **[Examples](./docs/EXAMPLES.md)** - Practical examples for common use cases

## Usage

### Running the Server

```bash
npm run server
```

Or with custom options:
```bash
node src/server-runner.js --port=4000 --max-queue=5000
```

On Windows:
```cmd
start-server.cmd
```

### Node.js Client

```javascript
const { QueueBitClient } = require('queuebit');

const client = new QueueBitClient('http://localhost:3000');

// Subscribe to messages
await client.subscribe((message) => {
  console.log('Received:', message.data);
});

// Publish a message
await client.publish({ hello: 'world' });
```

### Browser Client

Include Socket.IO and QueueBit client in your HTML:

```html
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script src="node_modules/queuebit/src/client-browser.js"></script>

<script>
  const client = new QueueBitClient('http://localhost:3000');
  
  // Subscribe to messages
  client.subscribe((message) => {
    console.log('Received:', message.data);
  });
  
  // Publish a message
  client.publish({ hello: 'world from browser!' });
</script>
```

See `examples/browser-example.html` for a complete browser example.

### Server

```javascript
const { QueueBitServer } = require('queuebit');

const server = new QueueBitServer({ 
  port: 3000,
  maxQueueSize: 10000 
});
```

### Client

```javascript
const { QueueBitClient } = require('queuebit');

const client = new QueueBitClient('http://localhost:3000');

// Subscribe to messages
await client.subscribe((message) => {
  console.log('Received:', message.data);
});

// Publish a message
await client.publish({ hello: 'world' });

// Subject-based routing
await client.subscribe((message) => {
  console.log('Order:', message.data);
}, { subject: 'orders' });

await client.publish({ orderId: 123 }, { subject: 'orders' });

// Queue groups (load balanced)
await client.subscribe((message) => {
  console.log('Worker received:', message.data);
}, { subject: 'tasks', queue: 'workers' });

// Message with expiry
const expiryDate = new Date(Date.now() + 60000); // 1 minute
await client.publish({ data: 'expires soon' }, { 
  expiry: expiryDate 
});

// One-time read message
await client.publish({ data: 'read once' }, { 
  removeAfterRead: true 
});
```

## Performance

QueueBit is optimized for high throughput:

- **WebSocket-only transport** for reduced overhead
- **Batch message processing** on the server
- **Async delivery** to prevent blocking
- **No compression** for maximum speed
- **Typical throughput**: 20,000-50,000+ messages/second (depends on hardware and message size)

### Performance Tips

1. Use WebSocket transport only (default)
2. Send messages in batches when possible
3. Avoid very large message payloads
4. Use queue groups for load balancing across multiple consumers
5. Monitor queue sizes to prevent memory issues

## API

### QueueBitServer

#### Constructor Options
- `port` (number): Server port (default: 3000)
- `maxQueueSize` (number): Maximum messages per subject (default: 10000)

### QueueBitClient

#### Methods

##### `publish(message, options)`
Publish a message to the queue.

Options:
- `subject` (string): Message subject/topic
- `expiry` (Date): Message expiration date
- `removeAfterRead` (boolean): Remove message after first delivery

##### `subscribe(callback, options)`
Subscribe to messages.

Options:
- `subject` (string): Subscribe to specific subject
- `queue` (string): Join a queue group for load-balanced delivery

##### `unsubscribe(options)`
Unsubscribe from messages.

##### `disconnect()`
Disconnect from the server.

## Development

### Install Dependencies
```bash
npm install
```
Or on Windows:
```cmd
install-deps.cmd
```

### Run Tests
```bash
npm test
```

### Publishing

#### Update Version
```cmd
update-version.cmd
```

#### Dry Run (test without publishing)
```cmd
publish-dry-run.cmd
```

#### Publish to NPM
```cmd
publish.cmd
```

Or manually:
```bash
npm login
npm test
npm publish
```

## Testing

```bash
npm test
```

## License

MIT License - See [LICENSE](LICENSE) file for details.

This software is free to use with attribution. You must include the copyright notice and license text in all copies or substantial portions of the software.
