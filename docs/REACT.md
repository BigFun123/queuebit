# QueueBit React Integration Guide

This guide shows you how to integrate QueueBit into your React applications.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Using Custom Hooks](#using-custom-hooks)
- [TypeScript Support](#typescript-support)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Installation

Install QueueBit and its peer dependency:

```bash
npm install @usermetrics/queuebit socket.io-client
```

## Basic Usage

### Simple Component Example

```jsx
import { useEffect, useState } from 'react';
import { QueueBitClient } from '@usermetrics/queuebit';

function MessageComponent() {
  const [client, setClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Create client
    const queueClient = new QueueBitClient('http://localhost:3333');
    
    // Setup event handlers
    queueClient.socket.on('connect', () => {
      console.log('Connected!');
      setConnected(true);
    });

    queueClient.socket.on('disconnect', () => {
      console.log('Disconnected');
      setConnected(false);
    });

    // Subscribe to messages
    queueClient.subscribe((message) => {
      setMessages(prev => [...prev, message]);
    }, { subject: 'notifications' });

    setClient(queueClient);

    // Cleanup
    return () => {
      queueClient.disconnect();
    };
  }, []);

  const sendMessage = async () => {
    if (!client) return;
    
    const result = await client.publish(
      { text: 'Hello!', timestamp: Date.now() },
      { subject: 'notifications' }
    );
    
    console.log('Published:', result);
  };

  return (
    <div>
      <h2>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</h2>
      <button onClick={sendMessage} disabled={!connected}>
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

export default MessageComponent;
```

## Using Custom Hooks

For better code organization and reusability, use the provided custom hook:

### useQueueBit Hook

```jsx
import { useQueueBit } from '@usermetrics/queuebit/examples/react/useQueueBit';

function App() {
  const { 
    connected, 
    messages, 
    publish, 
    clearMessages 
  } = useQueueBit('http://localhost:3333', 'my-subject');

  const handleSend = async () => {
    const result = await publish({ 
      text: 'Hello from hook!',
      timestamp: Date.now() 
    });
    
    if (result.success) {
      console.log('Message sent:', result.messageId);
    }
  };

  return (
    <div>
      <h1>QueueBit Demo</h1>
      <p>Status: {connected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={handleSend}>Send</button>
      <button onClick={clearMessages}>Clear</button>
      <div>
        {messages.map((msg, idx) => (
          <div key={idx}>{JSON.stringify(msg.data)}</div>
        ))}
      </div>
    </div>
  );
}
```

### Multiple Subjects Hook

For applications that need to handle multiple message subjects:

```jsx
import { useQueueBitMulti } from '@usermetrics/queuebit/examples/react/useQueueBit';

function MultiSubjectApp() {
  const { 
    connected, 
    messagesBySubject, 
    publishTo 
  } = useQueueBitMulti('http://localhost:3333', [
    'notifications',
    'updates',
    'alerts'
  ]);

  const sendNotification = async () => {
    await publishTo('notifications', { 
      type: 'info',
      message: 'New notification!' 
    });
  };

  return (
    <div>
      <h2>Notifications ({messagesBySubject.notifications?.length || 0})</h2>
      {messagesBySubject.notifications?.map((msg, idx) => (
        <div key={idx}>{JSON.stringify(msg.data)}</div>
      ))}
      
      <h2>Updates ({messagesBySubject.updates?.length || 0})</h2>
      {messagesBySubject.updates?.map((msg, idx) => (
        <div key={idx}>{JSON.stringify(msg.data)}</div>
      ))}
    </div>
  );
}
```

## TypeScript Support

QueueBit includes full TypeScript definitions:

```tsx
import { QueueBitClient } from '@usermetrics/queuebit';
import type { 
  QueueMessage, 
  PublishResponse,
  SubscribeOptions 
} from '@usermetrics/queuebit/src/types';

interface MyMessageData {
  text: string;
  userId: number;
  timestamp: number;
}

function TypedComponent() {
  const [messages, setMessages] = useState<QueueMessage[]>([]);

  useEffect(() => {
    const client = new QueueBitClient('http://localhost:3333');
    
    client.subscribe((message: QueueMessage) => {
      const data = message.data as MyMessageData;
      console.log('User', data.userId, 'said:', data.text);
      setMessages(prev => [...prev, message]);
    }, { subject: 'chat' } as SubscribeOptions);

    return () => client.disconnect();
  }, []);

  const sendTypedMessage = async (client: QueueBitClient) => {
    const response: PublishResponse = await client.publish(
      {
        text: 'Hello',
        userId: 123,
        timestamp: Date.now()
      } as MyMessageData,
      { subject: 'chat' }
    );
    
    if (response.success) {
      console.log('Sent:', response.messageId);
    }
  };

  return <div>{/* Your UI */}</div>;
}
```

## Best Practices

### 1. Connection Management

Always disconnect when component unmounts:

```jsx
useEffect(() => {
  const client = new QueueBitClient(url);
  setClient(client);
  
  return () => {
    client.disconnect(); // Important!
  };
}, [url]);
```

### 2. Error Handling

Handle connection errors gracefully:

```jsx
useEffect(() => {
  const client = new QueueBitClient(url);
  
  client.socket.on('connect_error', (error) => {
    console.error('Connection failed:', error);
    setError(error.message);
  });
  
  client.socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') {
      // Server disconnected, try to reconnect
      client.socket.connect();
    }
  });
  
  return () => client.disconnect();
}, [url]);
```

### 3. Message Limits

Prevent memory leaks by limiting stored messages:

```jsx
const MAX_MESSAGES = 100;

client.subscribe((message) => {
  setMessages(prev => {
    const updated = [...prev, message];
    return updated.slice(-MAX_MESSAGES); // Keep only last 100
  });
}, { subject: 'events' });
```

### 4. Conditional Publishing

Only publish when connected:

```jsx
const sendMessage = async (data) => {
  if (!client || !connected) {
    console.warn('Not connected');
    return;
  }
  
  try {
    const result = await client.publish(data, { subject: 'events' });
    if (!result.success) {
      console.error('Publish failed:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## Common Patterns

### Real-time Notifications

```jsx
function NotificationSystem() {
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    const client = new QueueBitClient('http://localhost:3333');
    
    client.subscribe((message) => {
      const notification = {
        id: message.id,
        ...message.data,
        timestamp: message.timestamp
      };
      
      setNotifications(prev => [notification, ...prev]);
      
      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message
        });
      }
    }, { subject: 'notifications' });
    
    return () => client.disconnect();
  }, []);
  
  return (
    <div>
      {notifications.map(notif => (
        <div key={notif.id}>{notif.message}</div>
      ))}
    </div>
  );
}
```

### Chat Application

```jsx
function ChatRoom({ roomId }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const { connected, publish } = useQueueBit(
    'http://localhost:3333',
    `chat:${roomId}`
  );
  
  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    await publish({
      text: inputText,
      user: currentUser.name,
      timestamp: Date.now()
    });
    
    setInputText('');
  };
  
  return (
    <div>
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx}>
            <strong>{msg.data.user}:</strong> {msg.data.text}
          </div>
        ))}
      </div>
      <input 
        value={inputText}
        onChange={e => setInputText(e.target.value)}
        onKeyPress={e => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage} disabled={!connected}>
        Send
      </button>
    </div>
  );
}
```

### Live Dashboard

```jsx
function Dashboard() {
  const { messagesBySubject } = useQueueBitMulti(
    'http://localhost:3333',
    ['metrics', 'alerts', 'logs']
  );
  
  const latestMetrics = messagesBySubject.metrics?.[0]?.data;
  const activeAlerts = messagesBySubject.alerts?.filter(
    msg => msg.data.status === 'active'
  );
  
  return (
    <div>
      <div className="metrics">
        <h2>System Metrics</h2>
        {latestMetrics && (
          <div>
            <p>CPU: {latestMetrics.cpu}%</p>
            <p>Memory: {latestMetrics.memory}%</p>
          </div>
        )}
      </div>
      
      <div className="alerts">
        <h2>Active Alerts ({activeAlerts?.length || 0})</h2>
        {activeAlerts?.map((alert, idx) => (
          <div key={idx} className="alert">
            {alert.data.message}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Troubleshooting

### Client Not Connecting

1. **Check server is running:**
   ```bash
   npm run server
   ```

2. **Verify URL is correct:**
   ```jsx
   const client = new QueueBitClient('http://localhost:3333');
   ```

3. **Check CORS settings** if server and client are on different domains

### Messages Not Received

1. **Verify subscription:**
   ```jsx
   const response = await client.subscribe(callback, { subject: 'test' });
   console.log('Subscribed:', response);
   ```

2. **Check subject names match:**
   ```jsx
   // Publishing
   await client.publish(data, { subject: 'events' });
   
   // Subscribing - must match!
   await client.subscribe(callback, { subject: 'events' });
   ```

### Memory Leaks

1. **Always cleanup:**
   ```jsx
   useEffect(() => {
     const client = new QueueBitClient(url);
     return () => client.disconnect(); // Essential!
   }, []);
   ```

2. **Limit message storage:**
   ```jsx
   setMessages(prev => prev.slice(-100)); // Keep last 100
   ```

### Build Errors

If you get import errors, ensure your bundler supports ES modules:

**Vite** (recommended):
```js
// vite.config.js
export default {
  optimizeDeps: {
    include: ['@usermetrics/queuebit']
  }
}
```

**Webpack**:
```js
// webpack.config.js
module.exports = {
  resolve: {
    extensions: ['.js', '.jsx']
  }
}
```

## Additional Resources

- [API Reference](./API.md)
- [Examples](./EXAMPLES.md)
- [Quick Start](./QUICKSTART.md)
- [React Examples](../examples/react/)

## Support

For issues or questions:
- GitHub Issues: https://github.com/bigfun123/queuebit/issues
- Documentation: https://github.com/bigfun123/queuebit
