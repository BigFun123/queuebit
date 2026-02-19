/**
 * In-process QueueBit demo.
 * Starts the QueueBit server and an HTTP server in the same process.
 * Use the qpanel.html dashboard to publish messages to the queue and see them received by the HTTP server.
 * Run this example with /examples/start_node_inprocess.cmd
 * No need to run a separate QueueBit server.
 */
const http = require('http');
const { QueueBitServer } = require('../src/server');
const { QueueBitClient } = require('../src/client-node');

const webserverPORT = 3000;
const queuebitPORT = 3333;

// Start the QueueBit server in-process (constructor starts listening immediately)
const queuebitServer = new QueueBitServer({ port: queuebitPORT });

// Connect a client to the in-process QueueBit server
// this is just for testing. typically you would connect from another process/frontend/server
const messageQueue = new QueueBitClient(`http://localhost:${queuebitPORT}`);

messageQueue.subscribe((msg) => {
  console.log('Received message from queue:', msg);
}, { subject: 'default' });

// Create an HTTP server
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST' && req.url === '/enqueue') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const message = JSON.parse(body);
        const result = await messageQueue.publish(message);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, result }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/messages') {
    messageQueue.getMessages({ subject: 'default' }).then((result) => {
      res.writeHead(200);
      res.end(JSON.stringify(result));
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(webserverPORT, () => {
  console.log(`HTTP server running at http://localhost:${webserverPORT}`);
  console.log('Endpoints:');
  console.log('  POST /enqueue - Publish message to QueueBit');
  console.log('  GET /messages - Get messages from QueueBit');
});