# QueueBit React Chat Example

A real-time chat application demonstrating QueueBit's pub/sub capabilities with React.

![QueueBit React Chat](../../screenshots/react-chat-preview.png)

## Features

- 🚀 **Real-time messaging** - Messages appear instantly for all connected users
- 💬 **Chat interface** - Clean, modern chat UI with message bubbles
- 👤 **Username support** - Set your username and see who's talking
- 🟢 **Connection status** - Visual indicator showing connection state
- 📊 **Server version display** - Shows the QueueBit server version
- 💾 **Persistent username** - Username saved in localStorage
- 📱 **Responsive design** - Works on desktop and mobile devices
- ⚡ **Custom React Hook** - `useQueueBit` hook for easy integration

## Prerequisites

- Node.js 16+ installed
- QueueBit server running (see below)

## Quick Start

### 1. Start the QueueBit Server

First, start the QueueBit server from the project root:

```bash
# From the QueueBit root directory
npm start
```

The server will start on `http://localhost:3333`

### 2. Install Dependencies

```bash
cd examples/react
npm install
```

### 3. Start the React App

```bash
npm run dev
```

The app will open automatically at `http://localhost:5173`

### 4. Test the Chat

1. Open the app in your browser
2. Enter a username
3. Start chatting!
4. Open another browser window/tab to see real-time messaging in action

## Project Structure

```
examples/react/
├── src/
│   ├── App.jsx           # Main chat component
│   ├── App.css           # Styles
│   ├── main.jsx          # React entry point
│   └── useQueueBit.js    # Custom QueueBit hook
├── index.html            # HTML template
├── vite.config.js        # Vite configuration
├── package.json          # Dependencies
└── README.md             # This file
```

## Using the useQueueBit Hook

The `useQueueBit` hook provides a simple interface for QueueBit:

```jsx
import { useQueueBit } from './useQueueBit';

function MyComponent() {
  const { 
    connected,      // Connection status (boolean)
    messages,       // Array of received messages
    serverVersion,  // Server version string
    error,          // Error message (if any)
    publish,        // Function to publish messages
    clearMessages,  // Function to clear messages
    getMessages     // Function to get all messages
  } = useQueueBit('http://localhost:3333', 'my-subject');

  const sendMessage = async () => {
    const result = await publish({ 
      text: 'Hello!',
      timestamp: Date.now() 
    });
    
    if (result.success) {
      console.log('Message sent:', result.messageId);
    }
  };

  return (
    <div>
      <p>Status: {connected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={sendMessage}>Send</button>
      {messages.map((msg, idx) => (
        <div key={idx}>{JSON.stringify(msg.data)}</div>
      ))}
    </div>
  );
}
```

## Hook Options

The `useQueueBit` hook accepts three parameters:

```javascript
useQueueBit(serverUrl, subject, options)
```

- **serverUrl** (string): QueueBit server URL (default: `'http://localhost:3333'`)
- **subject** (string): Subject/topic to subscribe to (default: `'default'`)
- **options** (object): Additional options
  - **maxMessages** (number): Maximum messages to keep in memory (default: `100`)

## API Reference

### Hook Return Values

#### `connected` (boolean)
Connection status to the QueueBit server.

#### `messages` (array)
Array of received messages. Each message has:
- `id` - Unique message ID
- `data` - Message payload
- `subject` - Message subject
- `timestamp` - Message timestamp
- `queueName` - Queue name (if applicable)

#### `serverVersion` (string|null)
QueueBit server version string.

#### `error` (string|null)
Error message if connection fails.

#### `publish(message, options)` (async function)
Publish a message to the current subject.

```javascript
const result = await publish(
  { text: 'Hello!' },
  { removeAfterRead: true }  // Optional
);
```

Returns: `{ success: boolean, messageId?: string, error?: string }`

#### `clearMessages()` (async function)
Clear all messages from the current subject.

```javascript
const result = await clearMessages();
```

Returns: `{ success: boolean, cleared?: number }`

#### `getMessages()` (async function)
Get all messages from the current subject.

```javascript
const result = await getMessages();
// result.messages contains the messages array
```

Returns: `{ success: boolean, messages?: array, count?: number }`

## Customization

### Change Server URL

Edit the `serverUrl` state in [`App.jsx`](src/App.jsx:19):

```javascript
const [serverUrl] = useState('http://your-server:3333');
```

### Change Subject/Topic

Edit the `subject` state in [`App.jsx`](src/App.jsx:20):

```javascript
const [subject] = useState('your-topic');
```

### Modify Styles

Edit [`App.css`](src/App.css:1) to customize the appearance.

### Adjust Message Limit

Change the `maxMessages` option in [`App.jsx`](src/App.jsx:23):

```javascript
const { ... } = useQueueBit(serverUrl, subject, { maxMessages: 200 });
```

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

To preview the production build:

```bash
npm run preview
```

## Troubleshooting

### Connection Issues

**Problem**: App shows "Connecting..." or "Error"

**Solutions**:
1. Ensure QueueBit server is running on port 3333
2. Check the server URL in the app matches your server
3. Check browser console for error messages
4. Verify no firewall is blocking the connection

### Messages Not Appearing

**Problem**: Messages sent but not received

**Solutions**:
1. Verify both clients are using the same subject/topic
2. Check browser console for errors
3. Ensure server is running and connected
4. Try refreshing the page

### Build Errors

**Problem**: `npm install` or `npm run dev` fails

**Solutions**:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Ensure Node.js version is 16 or higher
4. Check for any conflicting global packages

## Advanced Usage

### Multiple Subjects

To subscribe to multiple subjects, create multiple hook instances:

```jsx
const chat = useQueueBit(serverUrl, 'chat');
const notifications = useQueueBit(serverUrl, 'notifications');
const alerts = useQueueBit(serverUrl, 'alerts');
```

### Custom Message Handler

For more control, access the client directly:

```jsx
const { client } = useQueueBit(serverUrl, subject);

useEffect(() => {
  if (client) {
    client.subscribe((message) => {
      // Custom handling
      console.log('Received:', message);
    }, { subject: 'custom-subject' });
  }
}, [client]);
```

### Message Expiry

Send messages that expire after a certain time:

```javascript
await publish(
  { text: 'This message expires in 1 hour' },
  { expiry: new Date(Date.now() + 3600000) }
);
```

### Remove After Read

Send messages that are removed after being read once:

```javascript
await publish(
  { text: 'Read once and disappear' },
  { removeAfterRead: true }
);
```

## Integration with Existing React Apps

To integrate QueueBit into your existing React app:

1. **Copy the hook**: Copy [`useQueueBit.js`](src/useQueueBit.js:1) to your project
2. **Install dependencies**: Ensure React is installed
3. **Import and use**:

```jsx
import { useQueueBit } from './hooks/useQueueBit';

function MyComponent() {
  const { connected, messages, publish } = useQueueBit(
    'http://localhost:3333',
    'my-topic'
  );
  
  // Use the hook...
}
```

## Learn More

- [QueueBit Documentation](../../README.md)
- [QueueBit API Reference](../../docs/API.md)
- [React Integration Guide](../../docs/REACT.md)
- [QueueBit Examples](../../docs/EXAMPLES.md)

## License

MIT - See [LICENSE](../../LICENSE) for details.

## Support

For issues and questions:
- GitHub Issues: [QueueBit Issues](https://github.com/usermetrics/queuebit/issues)
- Documentation: [QueueBit Docs](../../docs/)

---

**Built with ❤️ using QueueBit and React**
