/**
 * Server to server queue.
 * This adds queue functionality to a simple http server (the queue server is running elsewhere)
 * Use the qpanel.html dashboard to publish messages to the queue and see them received by the HTTP server.
 * run the server with /start_server.cmd and then run this example with /examples/start_node_client.cmd
 */
const http = require('http');
const { QueueBitClient } = require('../src/client-node');

const webserverPORT = 3000;
const queuebitPORT = 3333;

// Initialize a queuebit message queue. It will connect to the server running on port 3333
const messageQueue = new QueueBitClient(`http://localhost:${queuebitPORT}`);

// Create an HTTP server
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST' && req.url === '/enqueue') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const message = JSON.parse(body);
        messageQueue.enqueue(message);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: 'Message enqueued' }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/dequeue') {
    const message = messageQueue.dequeue();
    res.writeHead(200);
    res.end(JSON.stringify({ message: message || 'Queue is empty' }));
  } else if (req.method === 'GET' && req.url === '/size') {
    res.writeHead(200);
    res.end(JSON.stringify({ size: messageQueue.size() }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(webserverPORT, () => {
  console.log(`Server running at http://localhost:${webserverPORT}`);
  console.log('Endpoints:');
  console.log('  POST /enqueue - Add message to queue');
  console.log('  GET /dequeue - Remove and return message from queue');
  console.log('  GET /size - Get current queue size');
});