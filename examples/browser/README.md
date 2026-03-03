# QueueBit Browser Example

This example demonstrates how to use QueueBit with a browser client using modern ES modules and Vite bundler.

## Features

- Browser-based client using Socket.IO
- Real-time message queue operations
- Interactive UI for testing queue operations
- Standalone demo with npm package dependencies
- Modern ES module imports with Vite bundler
- Hot module replacement for development

## Quick Start

### Windows

Simply run:
```bash
start.cmd
```

This will:
1. Install dependencies
2. Start the QueueBit server on port 3333
3. Start Vite dev server on port 5173
4. Open the demo page in your browser

### Linux/Mac

```bash
npm install
npm run dev
```

This starts both the QueueBit server and Vite dev server concurrently.

## Manual Setup

### Development Mode

1. Install dependencies:
```bash
npm install
```

2. Start development servers:
```bash
npm run dev
```

This runs both the QueueBit server (port 3333) and Vite dev server (port 5173) concurrently.

### Production Build

1. Build the application:
```bash
npm run build
```

2. Start the QueueBit server:
```bash
npm start
```

3. Serve the built files from the `dist` folder using any static file server

## Usage

The demo page provides buttons to:

- **Enqueue Item**: Add a new message to the queue
- **Dequeue Item**: Add a message with `removeAfterRead` flag
- **Peek**: View the first message without removing it
- **Clear**: Remove all messages from the queue
- **Show Size**: Display the current queue size

All operations are performed on the `browser-demo` subject.

## Files

- [`server.js`](server.js) - QueueBit server configuration
- [`index.html`](index.html) - Demo page HTML
- [`main.js`](main.js) - Browser client logic with ES module imports
- [`package.json`](package.json) - Dependencies and scripts
- [`vite.config.js`](vite.config.js) - Vite bundler configuration

## How It Works

1. The server runs a QueueBit instance on port 3333
2. The browser client connects via Socket.IO
3. Messages are published and subscribed using the QueueBit client API
4. Real-time updates are displayed in the output panel

## Configuration

You can modify the server configuration in [`server.js`](server.js:4):

```javascript
new QueueBitServer({
    port: 3333,              // Server port
    maxQueueSize: 1000,      // Maximum queue size
    monitorInterval: 1000,   // Monitor update interval (ms)
    monitorCallback: (data) => {
        // Custom monitoring logic
    }
});
```
