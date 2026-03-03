# QueueBit React Example

This example demonstrates how to use QueueBit client in a React application.

## Installation

```bash
npm install @usermetrics/queuebit socket.io-client
```

## Usage

### Basic Setup

```jsx
import { QueueBitClient } from '@usermetrics/queuebit';
import { useEffect, useState } from 'react';

function App() {
  const [client, setClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Create client instance
    const queueClient = new QueueBitClient('http://localhost:3333');
    
    // Set up connection handlers
    queueClient.socket.on('connect', () => {
      console.log('Connected to QueueBit server');
      setConnected(true);
    });

    queueClient.socket.on('disconnect', () => {
      console.log('Disconnected from QueueBit server');
      setConnected(false);
    });

    // Subscribe to messages
    queueClient.subscribe((message) => {
      setMessages(prev => [...prev, message]);
    }, { subject: 'my-subject' });

    setClient(queueClient);

    // Cleanup on unmount
    return () => {
      queueClient.disconnect();
    };
  }, []);

  const publishMessage = async () => {
    if (!client) return;
    
    const response = await client.publish(
      { text: 'Hello from React!', timestamp: Date.now() },
      { subject: 'my-subject' }
    );
    
    if (response.success) {
      console.log('Message published:', response.messageId);
    }
  };

  return (
    <div>
      <h1>QueueBit React Example</h1>
      <p>Status: {connected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={publishMessage}>Send Message</button>
      <div>
        <h2>Messages:</h2>
        {messages.map((msg, idx) => (
          <div key={idx}>{JSON.stringify(msg.data)}</div>
        ))}
      </div>
    </div>
  );
}

export default App;
```

### Using a Custom Hook

For better code organization, create a custom hook:

```jsx
// hooks/useQueueBit.js
import { useEffect, useState, useCallback } from 'react';
import { QueueBitClient } from '@usermetrics/queuebit';

export function useQueueBit(url = 'http://localhost:3333', subject = 'default') {
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const queueClient = new QueueBitClient(url);
    
    queueClient.socket.on('connect', () => setConnected(true));
    queueClient.socket.on('disconnect', () => setConnected(false));

    queueClient.subscribe((message) => {
      setMessages(prev => [...prev, message]);
    }, { subject });

    setClient(queueClient);

    return () => queueClient.disconnect();
  }, [url, subject]);

  const publish = useCallback(async (data, options = {}) => {
    if (!client) return { success: false, error: 'Client not initialized' };
    return await client.publish(data, { subject, ...options });
  }, [client, subject]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    client,
    connected,
    messages,
    publish,
    clearMessages
  };
}
```

Then use it in your component:

```jsx
import { useQueueBit } from './hooks/useQueueBit';

function App() {
  const { connected, messages, publish } = useQueueBit(
    'http://localhost:3333',
    'my-subject'
  );

  const handleSend = async () => {
    const result = await publish({ 
      text: 'Hello!', 
      timestamp: Date.now() 
    });
    console.log('Published:', result);
  };

  return (
    <div>
      <h1>QueueBit React App</h1>
      <p>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</p>
      <button onClick={handleSend} disabled={!connected}>
        Send Message
      </button>
      <ul>
        {messages.map((msg, idx) => (
          <li key={idx}>{JSON.stringify(msg.data)}</li>
        ))}
      </ul>
    </div>
  );
}
```

### TypeScript Support

QueueBit includes TypeScript definitions. For TypeScript projects:

```tsx
import { QueueBitClient } from '@usermetrics/queuebit';
import type { QueueMessage, PublishResponse } from '@usermetrics/queuebit/src/types';

const client = new QueueBitClient('http://localhost:3333');

// Type-safe message handling
client.subscribe((message: QueueMessage) => {
  console.log('Received:', message.data);
}, { subject: 'typed-subject' });

// Type-safe publishing
const response: PublishResponse = await client.publish(
  { myData: 'value' },
  { subject: 'typed-subject' }
);
```

## API Methods

### `publish(message, options)`
Publish a message to the queue.

```jsx
const response = await client.publish(
  { text: 'My message' },
  { 
    subject: 'my-subject',
    removeAfterRead: false 
  }
);
```

### `subscribe(callback, options)`
Subscribe to messages from a subject.

```jsx
await client.subscribe(
  (message) => console.log(message),
  { subject: 'my-subject' }
);
```

### `unsubscribe(options)`
Unsubscribe from a subject.

```jsx
await client.unsubscribe({ subject: 'my-subject' });
```

### `getMessages(options)`
Get all messages from a subject without subscribing.

```jsx
const response = await client.getMessages({ subject: 'my-subject' });
console.log('Messages:', response.messages);
```

### `clearMessages(options)`
Clear all messages from a subject.

```jsx
const response = await client.clearMessages({ subject: 'my-subject' });
console.log('Cleared:', response.cleared);
```

### `disconnect()`
Disconnect from the server.

```jsx
client.disconnect();
```

## Running the Example

1. Start the QueueBit server:
```bash
npm run server
```

2. In your React app, install dependencies:
```bash
npm install @usermetrics/queuebit socket.io-client
```

3. Import and use the client as shown above.

## Notes

- The client automatically reconnects if the connection is lost
- Messages are queued on the server until delivered
- Multiple clients can subscribe to the same subject
- Use different subjects to organize different message types
