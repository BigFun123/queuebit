// @ts-check
const { QueueBitServer } = require('./server');

/**
 * @typedef {import('./types').QueueBitServerOptions} QueueBitServerOptions
 */

// Parse command line arguments
const args = process.argv.slice(2);

// Check for help flag
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
QueueBit Server - High performance message queue server

Usage: queuebit-server [options]

Options:
  --port=<number>       Server port (default: 3333)
  --max-queue=<number>  Maximum queue size (default: 1000000)
  --debug               Enable debug logging
  --help, -h            Show this help message
  --version, -v         Show version information

Examples:
  queuebit-server
  queuebit-server --port=8080
  queuebit-server --port=8080 --max-queue=500000 --debug

For more information, visit: https://github.com/bigfun123/queuebit
`);
  process.exit(0);
}

// Check for version flag
if (args.includes('--version') || args.includes('-v')) {
  const packageJson = require('../package.json');
  console.log(`QueueBit Server v${packageJson.version}`);
  process.exit(0);
}

const portArg = args.find(arg => arg.startsWith('--port='));
const maxQueueArg = args.find(arg => arg.startsWith('--max-queue='));
const debugArg = args.includes('--debug');

/** @type {QueueBitServerOptions} */
const options = {
  port: portArg ? parseInt(portArg.split('=')[1]) : 3333,
  maxQueueSize: maxQueueArg ? parseInt(maxQueueArg.split('=')[1]) : 1000000
};

console.log('Starting QueueBit Server...');
console.log('Options:', options);
if (debugArg) {
  console.log('Debug mode: ENABLED. Messages will be logged to the console.');
}
console.log('');

const server = new QueueBitServer(options);

if (debugArg) {
  // Wrap the handlePublish method to add logging
  const originalHandlePublish = server.handlePublish.bind(server);
  // @ts-ignore
  server.handlePublish = function(socket, message, opts, callback) {
    console.log('[DEBUG] Publishing message:', {
      subject: (opts && opts.subject) || 'default',
      message: message,
      socketId: socket.id
    });
    const result = originalHandlePublish(socket, message, opts, callback);
    return result;
  };

  // Wrap the handleSubscribe method to add logging
  const originalHandleSubscribe = server.handleSubscribe.bind(server);
  // @ts-ignore
  server.handleSubscribe = function(socket, opts, callback) {
    console.log('[DEBUG] Client subscribing:', {
      socketId: socket.id,
      subject: (opts && opts.subject) || 'default',
      queue: (opts && opts.queue) || null
    });
    const result = originalHandleSubscribe(socket, opts, callback);
    return result;
  };
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down server...');
  server.close();
  process.exit(0);
});
