const { QueueBitServer } = require('./server');

// Parse command line arguments
const args = process.argv.slice(2);
const portArg = args.find(arg => arg.startsWith('--port='));
const maxQueueArg = args.find(arg => arg.startsWith('--max-queue='));

const options = {
  port: portArg ? parseInt(portArg.split('=')[1]) : 3333,
  maxQueueSize: maxQueueArg ? parseInt(maxQueueArg.split('=')[1]) : 1000000
};

console.log('Starting QueueBit Server...');
console.log('Options:', options);
console.log('');

const server = new QueueBitServer(options);

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
