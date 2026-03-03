/**
 * Test TypeScript imports and type checking
 * This file should compile without errors if TS exports are configured properly
 */

import { QueueBitClient } from '../src/client-react.js';
import type { 
  PublishOptions, 
  SubscribeOptions, 
  QueueMessage,
  MessageHandler 
} from '../src/client-react.js';

// Test 1: Create client with proper typing
const client = new QueueBitClient('http://localhost:3333');

// Test 2: Use typed options
const publishOptions: PublishOptions = {
  subject: 'test',
  expiry: new Date(),
  removeAfterRead: true
};

const subscribeOptions: SubscribeOptions = {
  subject: 'test',
  queue: 'myQueue'
};

// Test 3: Typed message handler
const handler: MessageHandler<{ text: string }> = (message: QueueMessage<{ text: string }>) => {
  console.log('Received:', message.data.text);
};

// Test 4: Method calls with proper types
async function testMethods() {
  // Publish with typed data
  const publishResult = await client.publish({ text: 'Hello' }, publishOptions);
  console.log('Published:', publishResult.success);

  // Subscribe with typed handler
  const subscribeResult = await client.subscribe(handler, subscribeOptions);
  console.log('Subscribed:', subscribeResult.success);

  // Get messages with typed response
  const messagesResult = await client.getMessages<{ text: string }>({ subject: 'test' });
  if (messagesResult.messages) {
    messagesResult.messages.forEach(msg => {
      console.log('Message:', msg.data.text);
    });
  }

  // Unsubscribe
  await client.unsubscribe({ subject: 'test' });

  // Disconnect
  client.disconnect();
}

console.log('✅ TypeScript compilation successful - all types are properly exported!');
