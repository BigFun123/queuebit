const fs = require('fs');
const path = require('path');
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

async function createClient(port) {
  const client = new QueueBitClient(`http://localhost:${port}`);
  await sleep(350);
  return client;
}

async function run() {
  const testPort = 3466;
  const subject = 'persist-test';
  const extraSubject = 'persist-test-extra';
  const queueDir = path.join(__dirname, '.tmp-persistence');
  const queueFilePath = path.join(queueDir, 'queue.jsonl');

  fs.rmSync(queueDir, { recursive: true, force: true });

  let server = null;
  let client = null;

  try {
    server = new QueueBitServer({
      port: testPort,
      persistentQueue: true,
      queueDirectory: queueDir
    });

    assert(fs.existsSync(queueDir), `Expected queue directory to be created at startup: ${queueDir}`);

    client = await createClient(testPort);

    const publish1 = await client.publish({ name: 'low-1' }, { subject, priority: 1 });
    const publish2 = await client.publish({ name: 'high-1' }, { subject, priority: 10 });
    const publish3 = await client.publish({ name: 'high-2' }, { subject, priority: 10 });
    const publish4 = await client.publish({ name: 'other-subject' }, { subject: extraSubject, priority: 2 });

    assert(publish1.success, 'Expected low priority publish to succeed');
    assert(publish2.success, 'Expected high-1 publish to succeed');
    assert(publish3.success, 'Expected high-2 publish to succeed');
    assert(publish4.success, 'Expected extra subject publish to succeed');

    await sleep(500);

    assert(fs.existsSync(queueFilePath), `Expected persistence file at ${queueFilePath}`);

    const lines = fs.readFileSync(queueFilePath, 'utf8').trim().split(/\r?\n/).filter(Boolean);
    assert(lines.length === 4, `Expected 4 persisted lines, got ${lines.length}`);

    for (const line of lines) {
      const obj = JSON.parse(line);
      assert(typeof obj === 'object' && obj !== null, 'Each persisted line should be a JSON object');
      assert(typeof obj.id === 'string', 'Persisted object should include id');
      assert(typeof obj.subject === 'string', 'Persisted object should include subject');
      assert(typeof obj.priority === 'number', 'Persisted object should include numeric priority');
      assert(typeof obj.sequence === 'number', 'Persisted object should include numeric sequence');
    }

    client.disconnect();
    client = null;
    await sleep(250);

    server.close();
    server = null;
    await sleep(350);

    server = new QueueBitServer({
      port: testPort,
      persistentQueue: true,
      queueDirectory: queueDir
    });

    client = await createClient(testPort);

    const result = await client.getMessages({ subject });
    assert(result.success, 'Expected getMessages after restart to succeed');
    assert(result.count === 3, `Expected 3 messages after restart, got ${result.count}`);

    const extraResult = await client.getMessages({ subject: extraSubject });
    assert(extraResult.success, 'Expected extra subject getMessages after restart to succeed');
    assert(extraResult.count === 1, `Expected 1 extra subject message after restart, got ${extraResult.count}`);

    const ordered = result.messages.map(m => m.data.name);
    const expected = ['high-1', 'high-2', 'low-1'];

    assert(
      ordered.length === expected.length && ordered.every((item, i) => item === expected[i]),
      `Expected order ${expected.join(', ')}, got ${ordered.join(', ')}`
    );

    const clearResult = await client.clearMessages({ all: true });
    assert(clearResult.success, 'Expected clear all to succeed');
    assert(clearResult.all === true, 'Expected clear all response to indicate all subjects were cleared');
    assert(clearResult.cleared === 4, `Expected 4 cleared messages, got ${clearResult.cleared}`);

    await sleep(500);

    const clearedPayload = fs.readFileSync(queueFilePath, 'utf8');
    assert(clearedPayload.trim() === '', 'Expected persistence file to be empty after clear all');

    console.log('PASS: persistence and priority ordering validated');
  } finally {
    if (client) {
      client.disconnect();
    }
    if (server) {
      server.close();
    }
    fs.rmSync(queueDir, { recursive: true, force: true });
  }
}

run()
  .then(() => {
    // QueueBit server internals keep background handles alive; force test termination.
    process.exit(0);
  })
  .catch(error => {
    console.error('FAIL:', error.message);
    process.exit(1);
  });
