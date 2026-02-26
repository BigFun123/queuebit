/**
 * Express + QueueBit in-process demo.
 * QueueBit runs inside the same process as Express.
 * The REST API allows publishing and retrieving messages.
 * CORS is enabled so the API can be called from any website.
 *
 * Deploy to Azure App Service:
 *   az webapp up --name <your-app-name> --runtime "NODE:20-lts"
 *
 * Azure sets process.env.PORT automatically - this app respects that.
 */

const express = require('express');
const cors = require('cors');
const { QueueBitServer } = require('../../src/server');
const { QueueBitClient } = require('../../src/client-node');

const PORT = process.env.PORT || 3000;
const QUEUE_PORT = process.env.QUEUE_PORT || 3333;

// Start QueueBit in-process
const queueServer = new QueueBitServer({
  port: QUEUE_PORT,
  monitorInterval: 10000,
  monitorCallback: (stats) => {
    console.log('[monitor]', JSON.stringify(stats));
  }
});

const app = express();

// Allow requests from any origin (required for cross-site access)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Connect an internal client to the in-process QueueBit server
const queueClient = new QueueBitClient(`http://localhost:${QUEUE_PORT}`);

// Log all incoming messages server-side
queueClient.subscribe((msg) => {
  console.log(`[queue] subject="${msg.subject}" data=`, msg.data);
}, { subject: 'default' });

// Health check - useful for Azure health probes
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'QueueBit Express Demo. Try /messages for messages' });
});

// Publish a message
// POST /messages  { "subject": "events", "data": { ... }, "removeAfterRead": false }
app.post('/messages', async (req, res) => {
  const { subject = 'default', data, expiry, removeAfterRead = false } = req.body;

  if (data === undefined) {
    return res.status(400).json({ error: '"data" field is required' });
  }

  try {
    const result = await queueClient.publish(data, { subject, expiry, removeAfterRead });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all stored messages for a subject
// GET /messages?subject=events
app.get('/messages', async (req, res) => {
  const subject = req.query.subject || 'default';
  try {
    const result = await queueClient.getMessages({ subject });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Express - listen on 0.0.0.0 so Azure can route traffic to it
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Express server listening on port ${PORT}`);
  console.log(`QueueBit server listening on port ${QUEUE_PORT}`);
  console.log('Endpoints:');
  console.log('  GET  /            - Health check');
  console.log('  POST /messages    - Publish a message');
  console.log('  GET  /messages    - Get messages (?subject=default)');
});
