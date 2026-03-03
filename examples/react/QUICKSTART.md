# QueueBit React Quick Start

Get started with QueueBit in your React app in under 5 minutes!

## 1. Install

```bash
npm install @usermetrics/queuebit socket.io-client
```

## 2. Start the Server

In a separate terminal:

```bash
npx @usermetrics/queuebit
# or if installed locally:
npm run server
```

Server will start on `http://localhost:3333`

## 3. Use in React

### Option A: Direct Usage

```jsx
import { useEffect, useState } from 'react';
import { QueueBitClient } from '@usermetrics/queuebit';

function App() {
  const [client, setClient] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const queueClient = new QueueBitClient('http://localhost:3333');
    
    queueClient.subscribe((msg) => {
      setMessages(prev => [...prev, msg]);
    }, { subject: 'demo' });

    setClient(queueClient);
    return () => queueClient.disconnect();
  }, []);

  const send = async () => {
    await client?.publish({ text: 'Hello!' }, { subject: 'demo' });
  };

  return (
    <div>
      <button onClick={send}>Send</button>
      {messages.map((msg, i) => (
        <div key={i}>{JSON.stringify(msg.data)}</div>
      ))}
    </div>
  );
}
```

### Option B: Using Custom Hook (Recommended)

Copy [`useQueueBit.js`](./useQueueBit.js) to your project, then:

```jsx
import { useQueueBit } from './hooks/useQueueBit';

function App() {
  const { connected, messages, publish } = useQueueBit(
    'http://localhost:3333',
    'demo'
  );

  return (
    <div>
      <p>Status: {connected ? '🟢' : '🔴'}</p>
      <button onClick={() => publish({ text: 'Hello!' })}>
        Send
      </button>
      {messages.map((msg, i) => (
        <div key={i}>{JSON.stringify(msg.data)}</div>
      ))}
    </div>
  );
}
```

## 4. API Cheat Sheet

```jsx
// Publish a message
await client.publish(data, { subject: 'my-subject' });

// Subscribe to messages
await client.subscribe(callback, { subject: 'my-subject' });

// Get all messages
const result = await client.getMessages({ subject: 'my-subject' });

// Clear messages
await client.clearMessages({ subject: 'my-subject' });

// Disconnect
client.disconnect();
```

## 5. Common Patterns

### Real-time Notifications

```jsx
useEffect(() => {
  const client = new QueueBitClient('http://localhost:3333');
  
  client.subscribe((msg) => {
    toast.success(msg.data.message); // Using react-toastify
  }, { subject: 'notifications' });
  
  return () => client.disconnect();
}, []);
```

### Chat Messages

```jsx
const { messages, publish } = useQueueBit(
  'http://localhost:3333',
  `chat:${roomId}`
);

const sendMessage = async (text) => {
  await publish({
    text,
    user: currentUser.name,
    timestamp: Date.now()
  });
};
```

### Live Updates

```jsx
const { messages } = useQueueBit(
  'http://localhost:3333',
  'live-updates'
);

const latestData = messages[messages.length - 1]?.data;
```

## Next Steps

- 📖 Read the [full React guide](../../docs/REACT.md)
- 🎯 Check out [complete examples](./App.jsx)
- 📚 Review the [API documentation](../../docs/API.md)

## Troubleshooting

**Not connecting?**
- Ensure server is running on port 3333
- Check browser console for errors
- Verify URL matches server address

**Messages not received?**
- Subject names must match exactly
- Check you're subscribed before publishing
- Look for errors in console

**Need help?**
- [GitHub Issues](https://github.com/bigfun123/queuebit/issues)
- [Full Documentation](../../docs/REACT.md)
