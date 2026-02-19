/**
 * Load Balancer demo - load balanced message delivery.
 * Messages are distributed round-robin across workers in the same load balancer.
 * Only ONE worker receives each message (unlike regular subscribe where ALL receive).
 * 
 * Run this example with: node examples/queuegroup.js
 */
const { QueueBitServer } = require('../src/server');
const { QueueBitClient } = require('../src/client-node');

const PORT = 3333;

// Start QueueBit server in-process
new QueueBitServer({ port: PORT });

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  await sleep(500); // wait for server to start

  // Create 3 worker clients - all in the same load balancer 'workers' on subject 'jobs'
  const worker1 = new QueueBitClient(`http://localhost:${PORT}`);
  const worker2 = new QueueBitClient(`http://localhost:${PORT}`);
  const worker3 = new QueueBitClient(`http://localhost:${PORT}`);

  await sleep(500); // wait for clients to connect

  await worker1.subscribe((msg) => {
    console.log(`Worker 1 received:`, msg.data);
  }, { subject: 'jobs', queue: 'workers' });

  await worker2.subscribe((msg) => {
    console.log(`Worker 2 received:`, msg.data);
  }, { subject: 'jobs', queue: 'workers' });

  await worker3.subscribe((msg) => {
    console.log(`Worker 3 received:`, msg.data);
  }, { subject: 'jobs', queue: 'workers' });

  // Publisher client
  const publisher = new QueueBitClient(`http://localhost:${PORT}`);
  await sleep(500);

  console.log('\nPublishing 6 jobs - each worker should receive 2 (round-robin):\n');

  for (let i = 1; i <= 6; i++) {
    await publisher.publish({ job: `task-${i}`, payload: `data-${i}` }, { subject: 'jobs' });
    await sleep(100);
  }

  await sleep(500);
  console.log('\nDone. Each worker received ~2 messages.');
  process.exit(0);
}

main();
