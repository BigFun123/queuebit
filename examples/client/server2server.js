/**
 * Server to server queue.
 * This adds queue functionality to a simple http server (the queue server is running elsewhere)
 * Use the qpanel.html dashboard to publish messages to the queue and see them received by the HTTP server.
 * run the server with /start_server.cmd and then run this example with /examples/start_node_client.cmd
 */
const http = require('http');
const { QueueBitClient } = require('../../src/client-node');

const webserverPORT = 3000;
const queuebitPORT = 3333;

// Initialize a queuebit message queue. It will connect to the server running on port 3333
const messageQueue = new QueueBitClient(`http://localhost:${queuebitPORT}`);

// Subscribe to messages on startup (messages will be logged to console)
messageQueue.subscribe((msg) => {
  console.log('Received message from queue:', msg);
}, { subject: 'default' });

// Create an HTTP server
const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>QueueBit Server-to-Server Example</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    .endpoint { margin: 20px 0; }
    .method { display: inline-block; padding: 4px 8px; border-radius: 3px; font-weight: bold; color: white; }
    .post { background: #49cc90; }
  </style>
</head>
<body>
  <h1>QueueBit Server-to-Server Example</h1>
  <p>This HTTP server demonstrates how to use QueueBit client in a Node.js server environment.</p>
  
  <h2>Available Endpoints</h2>
  
  <div class="endpoint">
    <h3><span class="method post">POST</span> /publish</h3>
    <p>Publish a message to the queue</p>
    <pre>curl -X POST http://localhost:${webserverPORT}/publish \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello World", "subject": "default"}'</pre>
  </div>
  
  <div class="endpoint">
    <h3><span class="method post">POST</span> /getMessages</h3>
    <p>Get messages from the queue</p>
    <pre>curl -X POST http://localhost:${webserverPORT}/getMessages \\
  -H "Content-Type: application/json" \\
  -d '{"subject": "default", "count": 5}'</pre>
  </div>
  
  <h2>Subscription</h2>
  <p>This server automatically subscribes to the 'default' subject on startup. Any messages published to that subject will be logged to the console.</p>
  
  <h2>Requirements</h2>
  <p>Make sure the QueueBit server is running on port ${queuebitPORT} before using these endpoints.</p>
  <p>Start the server with: <code>npm start</code> or <code>node src/server-runner.js</code></p>
</body>
</html>
    `);
    return;
  }

  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST' && req.url === '/publish') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const response = await messageQueue.publish(data.message, { subject: data.subject || 'default' });
        res.writeHead(200);
        res.end(JSON.stringify(response));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: error.message || 'Invalid request' }));
      }
    });
  } else if (req.method === 'POST' && req.url === '/getMessages') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const response = await messageQueue.getMessages({ 
          subject: data.subject || 'default',
          count: data.count || 1
        });
        res.writeHead(200);
        res.end(JSON.stringify(response));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: error.message || 'Invalid request' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(webserverPORT, () => {
  console.log(`Server running at http://localhost:${webserverPORT}`);
  console.log('Endpoints:');
  console.log('  GET  / - View API documentation');
  console.log('  POST /publish - Publish message to queue (body: { message, subject? })');
  console.log('  POST /getMessages - Get messages from queue (body: { subject?, count? })');
  console.log('');
  console.log('Subscribed to "default" subject - messages will be logged to console');
});