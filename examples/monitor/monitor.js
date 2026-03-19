/**
 * QueueBit Server and Monitor Example
 * 
 * This example demonstrates how to use the QueueBit server's built-in monitoring capabilities.
 * The monitor provides real-time statistics about the server's operation, including:
 * - Message queue status
 * - Subscription information
 * - Load balancing statistics
 * - Subject-specific metrics
 *
 * To run this example:
 * 1. Start the QueueBit server with /start_server.cmd
 * 2. Run this example with /examples/start_node_client.cmd
 */

const { QueueBitServer } = require('../../src/server');
const { QueueBitClient } = require('../../src/client-node');

const PORT = 3333;

const server = new QueueBitServer({
  port: PORT,
  monitorInterval: 2000,
  monitorCallback: (stats) => {
    console.log('\n--- QueueBit Monitor ---');
    console.log(`Timestamp:         ${stats.timestamp}`);
    console.log(`Pending delivery:  ${stats.deliveryQueuePending}`);
    console.log(`Total messages:    ${stats.totalMessages}`);
    console.log(`Total subscribers: ${stats.totalSubscribers}`);
    console.log(`Total LB workers:  ${stats.totalLBWorkers}`);

    for (const [subject, info] of Object.entries(stats.subjects)) {
      console.log(`  Subject "${subject}": ${info.messages ?? 0} messages, ${info.subscribers ?? 0} subscribers`);
    }

    for (const [key, workers] of Object.entries(stats.loadBalancers)) {
      console.log(`  LB "${key}": ${workers} workers`);
    }
    console.log('------------------------');
  }
});

const client = new QueueBitClient(`http://localhost:${PORT}`);

setTimeout(async () => {
  await client.subscribe((msg) => {
    console.log('Received:', msg.data);
  }, { subject: 'events' });

  // Publish some messages to see monitor output
  let count = 0;
  setInterval(async () => {
    await client.publish({ hello: 'world', count: ++count }, { subject: 'events' });
  }, 500);
}, 500);
