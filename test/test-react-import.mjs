/**
 * Test that the React/ES6 client can be imported properly
 * Run with: node test/test-react-import.mjs
 */

import { QueueBitClient } from '../src/client-react.js';

console.log('Testing ES6 module import...');

// Test 1: Check if QueueBitClient is defined
if (typeof QueueBitClient !== 'function') {
  console.error('❌ FAIL: QueueBitClient is not a function');
  process.exit(1);
}
console.log('✓ QueueBitClient is a function');

// Test 2: Check if we can instantiate the client
let client;
try {
  client = new QueueBitClient('http://localhost:3333');
  console.log('✓ QueueBitClient can be instantiated');
} catch (error) {
  console.error('❌ FAIL: Cannot instantiate QueueBitClient:', error.message);
  process.exit(1);
}

// Test 3: Check if client has required methods
const requiredMethods = ['publish', 'subscribe', 'unsubscribe', 'getMessages', 'clearMessages', 'disconnect'];
for (const method of requiredMethods) {
  if (typeof client[method] !== 'function') {
    console.error(`❌ FAIL: Client missing method: ${method}`);
    process.exit(1);
  }
}
console.log('✓ All required methods exist');

// Test 4: Check if client has required properties
const requiredProperties = ['socket', 'messageHandlers', 'connected'];
for (const prop of requiredProperties) {
  if (!(prop in client)) {
    console.error(`❌ FAIL: Client missing property: ${prop}`);
    process.exit(1);
  }
}
console.log('✓ All required properties exist');

// Test 5: Check helper methods
if (typeof client.isConnected !== 'function') {
  console.error('❌ FAIL: Missing isConnected method');
  process.exit(1);
}
console.log('✓ Helper methods exist');

// Cleanup
client.disconnect();

console.log('\n✅ All tests passed! The React client can be imported and used properly.');
console.log('\nUsage in React:');
console.log('  import { QueueBitClient } from \'@usermetrics/queuebit\';');
console.log('  const client = new QueueBitClient(\'http://localhost:3333\');');
