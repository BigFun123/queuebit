// @ts-check
const { QueueBitServer } = require('./server');

/**
 * @typedef {import('./types').QueueBitServerOptions} QueueBitServerOptions
 */

// Parse command line arguments
const args = process.argv.slice(2);
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
