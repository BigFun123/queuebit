const { QueueBitServer, QueueBitClient } = require('../src/index');

// Start server
const server = new QueueBitServer({ port: 3000 });

// Wait for server to start
setTimeout(async () => {
  console.log('\n=== Starting Tests ===\n');
  
  // Test 0: Basic connectivity
  console.log('Test 0: Basic connectivity and publish');
  const testClient = new QueueBitClient('http://localhost:3000');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    const result = await testClient.publish({ test: 'connectivity' });
    console.log('Publish result:', result);
    if (result && result.success) {
      console.log('✓ Publish is working!');
    } else {
      console.log('✗ Publish failed:', result);
    }
  } catch (error) {
    console.log('✗ Publish error:', error.message);
  }
  
  testClient.disconnect();
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 1: Basic publish/subscribe
  console.log('Test 1: Basic publish/subscribe');
  const client1 = new QueueBitClient('http://localhost:3000');
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await client1.subscribe((message) => {
    console.log('Client 1 received:', message.data);
  });
  
  await client1.publish({ text: 'Hello World!' });
  
  // Test 2: Multiple subscribers
  console.log('\nTest 2: Multiple subscribers (all receive)');
  const client2 = new QueueBitClient('http://localhost:3000');
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await client2.subscribe((message) => {
    console.log('Client 2 received:', message.data);
  });
  
  await client1.publish({ text: 'Message to all subscribers' });
  
  // Test 3: Subject-based routing
  console.log('\nTest 3: Subject-based routing');
  const client3 = new QueueBitClient('http://localhost:3000');
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await client3.subscribe((message) => {
    console.log('Client 3 (orders) received:', message.data);
  }, { subject: 'orders' });
  
  await client1.publish({ orderId: 123 }, { subject: 'orders' });
  await client1.publish({ text: 'Default subject message' });
  
  // Test 4: Queue groups (load balanced)
  console.log('\nTest 4: Queue groups (load balanced delivery)');
  const client4 = new QueueBitClient('http://localhost:3000');
  const client5 = new QueueBitClient('http://localhost:3000');
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await client4.subscribe((message) => {
    console.log('Worker 1 received:', message.data);
  }, { subject: 'tasks', queue: 'workers' });
  
  await client5.subscribe((message) => {
    console.log('Worker 2 received:', message.data);
  }, { subject: 'tasks', queue: 'workers' });
  
  // Publish multiple messages - should be distributed
  for (let i = 1; i <= 4; i++) {
    await client1.publish({ task: `Task ${i}` }, { subject: 'tasks' });
  }
  
  // Test 5: Remove after read
  console.log('\nTest 5: Remove after read');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const client6 = new QueueBitClient('http://localhost:3000');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await client1.publish({ text: 'One-time message' }, { 
    subject: 'ephemeral',
    removeAfterRead: true 
  });
  
  await client6.subscribe((message) => {
    console.log('Client 6 received ephemeral:', message.data);
  }, { subject: 'ephemeral' });
  
  // Test 6: Message expiry
  console.log('\nTest 6: Message expiry (5 seconds)');
  const expiryDate = new Date(Date.now() + 5000);
  await client1.publish({ text: 'Message expires in 5 seconds' }, {
    subject: 'expiring',
    expiry: expiryDate
  });
  
  console.log('Published message with expiry:', expiryDate.toISOString());
  
  // Cleanup after tests
  setTimeout(() => {
    console.log('\n=== Tests Complete ===\n');
    client1.disconnect();
    client2.disconnect();
    client3.disconnect();
    client4.disconnect();
    client5.disconnect();
    client6.disconnect();
    
    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 1000);
  }, 7000);
  
}, 1000);
