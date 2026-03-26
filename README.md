# QueueBit

A tiny high performance socket-based message queue server with guaranteed delivery, compatible with NATS queue patterns.  

Optional Load Balancer with round-robin delivery. (see examples).  

If you need a pubsub between client and server, or server to server, this is a good choice.

```
supports: 
server exe (binary executable)
Standalone nodejs server
In-process nodejs server
Node.js clients
Browser clients
React clients
```

A frontend in examples (qpanel.html) will help test the server.

## Installation
```
npm install @usermetrics/queuebit
```


## Features

- WebSocket-based message queue
- Subject-based message routing
- Optional Load balancer with round-robin delivery (each message goes to exactly one worker)
- Optional persistent queue storage on disk (JSONL)
- Message expiry support
- Ephemeral messages (remove after read)
- Guaranteed delivery to all regular subscribers
- Existing messages replayed to new regular subscribers
- NATS-compatible API patterns
- Browser client support

## Documentation

- **[Quick Start Guide](./docs/QUICKSTART.md)** - Get started in 5 minutes
- **[React Integration Guide](./docs/REACT.md)** - Complete guide for React applications
- **[API Reference](./docs/API.md)** - Complete API documentation
- **[Examples](./docs/EXAMPLES.md)** - Practical examples for common use cases

## Quick Start

### Start the Server in-process with a node app
#### QueueBit runs with the main app. This can reduce costs for simple apps running the cloud.

```javascript
const { QueueBitServer } = require('./src/server');
const server = new QueueBitServer({ port: 3333 });
```

### Start the Server with monitoring
```javascript
const { QueueBitServer } = require('../../src/server');
const PORT = 3333;
new QueueBitServer({ port: PORT, 
    monitorInterval: 1000, 
    monitorCallback: (data) => {
    console.log(data);
} });
```

### Start the Server as a standalone process
#### The server runs standalone
On Windows:
```cmd
start_server.cmd
```

Or with npm:
```bash
npm start
```

#### Debug Mode
Start the server with debug logging to see all message publishing and subscription activity:
```bash
npm run start:debug
```

Or directly:
```bash
node src/server-runner.js --debug
```

Debug mode logs:
- `[DEBUG] Publishing message:` - Shows when messages are published with subject and data
- `[DEBUG] Client subscribing:` - Shows when clients subscribe to subjects

### Building Standalone Executables

QueueBit can be packaged as a standalone executable that doesn't require Node.js to be installed on the target machine.

#### Prerequisites
```bash
npm install
```

#### Build Commands

**Windows executable:**
```bash
npm run build
```
Creates: `dist/queuebit-server.exe`

**All platforms (Windows, Linux, macOS):**
```bash
npm run build:all
```
Creates:
- `dist/queuebit-server-win.exe`
- `dist/queuebit-server-linux`
- `dist/queuebit-server-macos`

#### Running the Executable

**Show help:**
```bash
./dist/queuebit-server.exe --help
```

**Show version:**
```bash
./dist/queuebit-server.exe --version
```

**Basic usage:**
```bash
./dist/queuebit-server.exe
```

**With custom port:**
```bash
./dist/queuebit-server.exe --port=8080
```

**With custom queue size:**
```bash
./dist/queuebit-server.exe --max-queue=500000
```

**With debug logging:**
```bash
./dist/queuebit-server.exe --debug
```

**With persistent queue:**
```bash
./dist/queuebit-server.exe --persistent-queue --queue-dir=./data
```

**Combined options:**
```bash
./dist/queuebit-server.exe --port=8080 --max-queue=500000 --persistent-queue --queue-dir=./data --debug
```

#### Command-Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--port=<number>` | Server port | 3333 |
| `--max-queue=<number>` | Maximum queue size | 1000000 |
| `--persistent-queue` | Enable queue persistence to disk | disabled |
| `--queue-dir=<path>` | Directory for persistent queue file | current directory |
| `--queue-file=<name>` | Persistent queue filename | queue.jsonl |
| `--debug` | Enable debug logging | disabled |
| `--help`, `-h` | Show help message | - |
| `--version`, `-v` | Show version information | - |

#### Distribution

The generated executable is completely standalone and can be distributed without Node.js. Simply copy the `.exe` file to any Windows machine and run it.

## Persistent Queue

When `persistentQueue` is enabled (or `--persistent-queue` is passed to the server runner), QueueBit stores queued messages on disk and restores them on restart.

- Storage format: JSON Lines (`.jsonl`), one message object per line
- Default filename: `queue.jsonl`
- Default location: current working directory (or set with `queueDirectory` / `--queue-dir`)
- Custom filename: `queueFileName` / `--queue-file`

Persistence behavior:

- On startup: the queue is loaded from disk if the file exists; otherwise starts empty
- On queue changes: the persistence file is updated when messages are added, removed, expired, or cleared
- On shutdown: queue state is flushed to disk

Implementation note: writes are batched and committed via a temporary file + rename to reduce corruption risk and improve write performance.

### Node.js Client

```javascript
const { QueueBitClient } = require('./src/client-node');

const client = new QueueBitClient('http://localhost:3333');

// Subscribe to messages
await client.subscribe((message) => {
  console.log('Received:', message.data);
}, { subject: 'events' });

// Publish a message
await client.publish({ hello: 'world' }, { subject: 'events' });
```

### React Client

```javascript
import { QueueBitClient } from '@usermetrics/queuebit';
import { useEffect, useState } from 'react';

function App() {
  const [client, setClient] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const queueClient = new QueueBitClient('http://localhost:3333');
    
    queueClient.subscribe((msg) => {
      setMessages(prev => [...prev, msg]);
    }, { subject: 'events' });

    setClient(queueClient);
    return () => queueClient.disconnect();
  }, []);

  const sendMessage = async () => {
    await client?.publish({ hello: 'from React!' }, { subject: 'events' });
  };

  return <div>{/* Your UI */}</div>;
}
```

See [`examples/react/`](./examples/react/) for complete React examples with hooks.

### Browser Client (Vanilla JS)

```html
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script src="src/client-browser.js"></script>
<script>
  const client = new QueueBitClient('http://localhost:3333');
  client.subscribe((msg) => console.log('Received:', msg.data), { subject: 'events' });
  client.publish({ hello: 'world from browser!' }, { subject: 'events' });
</script>
```

See [`examples/qpanel.html`](./examples/qpanel.html) for a complete browser dashboard.
Open it with Live Server in VS Code to test.

### In-Process (Server + Client in Same Process)

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

## Testing Control Panel
#### run qpanel.html with live server in vscode
![QueueBit Control Panel](./docs/screen.jpg)

If you run qpanel with persistence enabled, Live Server must ignore the queue data folder. Otherwise each publish updates `data/queue.jsonl`, Live Server reloads the page, and the browser client disconnects. The workspace settings in `.vscode/settings.json` now exclude the persistence folders used by the examples.

## API Overview

### Server Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | number | 3333 | Server port |
| `maxQueueSize` | number | 10000 | Max messages per subject |
| `persistentQueue` | boolean | false | Persist queue to disk as JSONL |
| `queueDirectory` | string | process cwd | Directory where queue file is stored |
| `queueFileName` | string | queue.jsonl | Name of persistence file |
| `monitorInterval` | number | null | Interval in ms to emit monitor stats. Disabled if not set |
| `monitorCallback` | function | null | Callback receiving stats object when monitor fires |


### Client Methods

#### `publish(message, options)`
Publish a message to the queue.

| Option | Type | Description |
|--------|------|-------------|
| `subject` | string | Message subject/topic (default: `'default'`) |
| `expiry` | Date | Message expiration date |
| `removeAfterRead` | boolean | Ephemeral. Remove after first delivery |

#### `subscribe(callback, options)`
Subscribe to messages. Existing messages are replayed to new regular subscribers.

| Option | Type | Description |
|--------|------|-------------|
| `subject` | string | Subscribe to specific subject (default: `'default'`) |
| `queue` | string | Unique name to join the load balancer with round-robin delivery |

#### `clearMessages(options)`
Remove all stored messages for a subject from the server.

| Option | Type | Description |
|--------|------|-------------|
| `subject` | string | Subject to clear (default: `'default'`) |

Returns `{ success: true, subject, cleared: number }` where `cleared` is the number of messages removed.

```javascript
const res = await client.clearMessages({ subject: 'events' });
console.log(`Cleared ${res.cleared} messages from "${res.subject}"`);
```

> Note: `clearMessages` only removes messages stored on the server. Subscribers that have already received messages are not affected.

#### `unsubscribe(options)` · `getMessages(options)` · `disconnect()`

See [API Reference](./docs/API.md) for full details.

## Load Balancer

Each worker subscribes with a **unique `queue` name** and gets its own load balancer ID.  
Messages are distributed round-robin. Each message goes to exactly **one** worker.

```javascript
// Worker 1 → LB#1
await worker1.subscribe((msg) => {
  console.log(`LB#${msg.loadBalancerId}:`, msg.data);
}, { subject: 'tasks', queue: 'worker-1' });

// Worker 2 → LB#2
await worker2.subscribe((msg) => {
  console.log(`LB#${msg.loadBalancerId}:`, msg.data);
}, { subject: 'tasks', queue: 'worker-2' });

// Publishes cycle: LB#1 → LB#2 → LB#1 → LB#2 ...
```

## Examples

| File | Description |
|------|-------------|
| [`examples/standalone/server.js`](./examples/standalone/server.js) | Standalone QueueBit server with monitoring |
| [`examples/standalone/start.cmd`](./examples/standalone/start.cmd) | Start the standalone server |
| [`examples/client/server2server.js`](./examples/client/server2server.js) | HTTP server using an external QueueBit server |
| [`examples/client/start.cmd`](./examples/client/start.cmd) | Start the client example |
| [`examples/inprocess/inprocessserver.js`](./examples/inprocess/inprocessserver.js) | HTTP server with QueueBit running in-process |
| [`examples/inprocess/start.cmd`](./examples/inprocess/start.cmd) | Start the in-process example |
| [`examples/express/app.js`](./examples/express/app.js) | Express REST API with QueueBit in-process, Azure-ready |
| [`examples/express/start.cmd`](./examples/express/start.cmd) | Start the Express example |
| [`examples/loadbalancer/loadbalancer.js`](./examples/loadbalancer/loadbalancer.js) | Load balancer demo with 3 workers |
| [`examples/loadbalancer/server.js`](./examples/loadbalancer/server.js) | Server for load balancer demo |
| [`examples/loadbalancer/start.cmd`](./examples/loadbalancer/start.cmd) | Start the load balancer demo |
| [`examples/logger/logger.js`](./examples/logger/logger.js) | Log all messages from the default subject |
| [`examples/logger/start.cmd`](./examples/logger/start.cmd) | Start the logger example |
| [`examples/qpanel.html`](./examples/qpanel.html) | Browser dashboard |
| [`test/test-harness.js`](./test/test-harness.js) | Full test suite |

## Performance

- **WebSocket-only transport** for reduced overhead
- **Batch message processing** (100 messages per batch)
- **Async delivery** via `setImmediate` to prevent blocking
- **No compression** for maximum speed
- **Typical throughput**: 20,000–50,000+ messages/second

## License

MIT License - See [LICENSE](LICENSE) file for details.
