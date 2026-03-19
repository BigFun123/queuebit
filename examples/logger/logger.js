/**
 * Server to server queue.
 * This adds queue functionality to a simple http server (the queue server is running elsewhere)
 * 1. Run the queuebit server with /start_server.cmd
 * 2. Run this example with /examples/start_node_client.cmd
 * Use the qpanel.html dashboard to publish messages to the queue and see them received by the HTTP server.
 * run the server with /start_server.cmd and then run this example with /examples/start_node_client.cmd
 */

const { QueueBitClient } = require('../../src/client-node');


const queuebitPORT = 3333;

// Initialize a queuebit message queue. It will connect to the server running on port 3333
const messageQueue = new QueueBitClient(`http://localhost:${queuebitPORT}`);

// Wait for connection before subscribing
messageQueue.socket.on('connect', async () => {
  try {
    const response = await messageQueue.subscribe((msg) => {
      console.log('Received message from queue:', msg);
      // write to log here or do something with the message
    }, { subject: 'default' });
    
    console.log('Subscription response:', response);
    console.log('Listening for messages on subject "default"...');
  } catch (error) {
    console.error('Failed to subscribe:', error);
  }
});

