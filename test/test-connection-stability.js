const { QueueBitServer } = require('../src/server');
const { QueueBitClient } = require('../src/client-node');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const testPort = 3467;
  const subject = 'connection-stability';
  const server = new QueueBitServer({ port: testPort });
  const client = new QueueBitClient(`http://localhost:${testPort}`);

  try {
    await sleep(400);

    await client.subscribe(() => {
      // Intentionally empty: the client should stay connected after receiving its own publish.
    }, { subject });

    const publishResult = await client.publish({ text: 'stay-connected' }, { subject });
    assert(publishResult.success, 'Expected publish to succeed');

    await sleep(400);

    assert(client.connected, 'Expected client to remain connected after publish');

    console.log('PASS: client remains connected after publish');
  } finally {
    client.disconnect();
    await sleep(150);
    server.close();
  }
}

run()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('FAIL:', error.message);
    process.exit(1);
  });
