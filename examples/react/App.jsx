import { useEffect, useState } from 'react';
import { QueueBitClient } from '@usermetrics/queuebit';

/**
 * Example React component using QueueBit
 */
function App() {
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [subject, setSubject] = useState('react-demo');
  const [serverInfo, setServerInfo] = useState(null);

  useEffect(() => {
    // Initialize QueueBit client
    const queueClient = new QueueBitClient('http://localhost:3333');
    
    // Connection event handlers
    queueClient.socket.on('connect', () => {
      console.log('Connected to QueueBit server');
      setConnected(true);
    });

    queueClient.socket.on('disconnect', () => {
      console.log('Disconnected from QueueBit server');
      setConnected(false);
    });

    queueClient.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    queueClient.socket.on('serverInfo', (info) => {
      console.log('Server info:', info);
      setServerInfo(info);
    });

    // Subscribe to messages
    queueClient.subscribe((message) => {
      console.log('Received message:', message);
      setMessages(prev => [...prev, message]);
    }, { subject });

    setClient(queueClient);

    // Cleanup on unmount
    return () => {
      console.log('Disconnecting from QueueBit server');
      queueClient.disconnect();
    };
  }, [subject]);

  const handlePublish = async () => {
    if (!client || !inputText.trim()) return;
    
    try {
      const response = await client.publish(
        { 
          text: inputText,
          timestamp: new Date().toISOString(),
          from: 'React App'
        },
        { subject }
      );
      
      if (response.success) {
        console.log('Message published successfully:', response.messageId);
        setInputText('');
      } else {
        console.error('Failed to publish message:', response.error);
        alert('Failed to publish: ' + response.error);
      }
    } catch (error) {
      console.error('Error publishing message:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleGetMessages = async () => {
    if (!client) return;
    
    try {
      const response = await client.getMessages({ subject });
      if (response.success) {
        console.log('Retrieved messages:', response.messages);
        alert(`Found ${response.count} message(s) in queue`);
      } else {
        console.error('Failed to get messages:', response.error);
      }
    } catch (error) {
      console.error('Error getting messages:', error);
    }
  };

  const handleClearMessages = async () => {
    if (!client) return;
    
    try {
      const response = await client.clearMessages({ subject });
      if (response.success) {
        console.log('Cleared messages:', response.cleared);
        setMessages([]);
        alert(`Cleared ${response.cleared} message(s)`);
      } else {
        console.error('Failed to clear messages:', response.error);
      }
    } catch (error) {
      console.error('Error clearing messages:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePublish();
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>QueueBit React Example</h1>
        <div style={styles.status}>
          <span style={{
            ...styles.statusDot,
            backgroundColor: connected ? '#4caf50' : '#f44336'
          }} />
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
          {serverInfo && (
            <span style={styles.serverInfo}>
              {' '}(Server v{serverInfo.version})
            </span>
          )}
        </div>
      </header>

      <div style={styles.controls}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Subject:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={styles.input}
            placeholder="Enter subject name"
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Message:</label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            style={styles.textarea}
            placeholder="Type your message here..."
            disabled={!connected}
          />
        </div>

        <div style={styles.buttonGroup}>
          <button
            onClick={handlePublish}
            disabled={!connected || !inputText.trim()}
            style={styles.button}
          >
            📤 Publish Message
          </button>
          <button
            onClick={handleGetMessages}
            disabled={!connected}
            style={styles.button}
          >
            📥 Get Messages
          </button>
          <button
            onClick={handleClearMessages}
            disabled={!connected}
            style={styles.button}
          >
            🗑️ Clear Messages
          </button>
        </div>
      </div>

      <div style={styles.messagesContainer}>
        <h2>Received Messages ({messages.length})</h2>
        <div style={styles.messagesList}>
          {messages.length === 0 ? (
            <p style={styles.emptyState}>No messages yet. Publish a message to get started!</p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} style={styles.message}>
                <div style={styles.messageHeader}>
                  <span style={styles.messageId}>ID: {msg.id}</span>
                  <span style={styles.messageTime}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={styles.messageBody}>
                  <pre style={styles.messageData}>
                    {JSON.stringify(msg.data, null, 2)}
                  </pre>
                </div>
                <div style={styles.messageFooter}>
                  Subject: <strong>{msg.subject}</strong>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    borderBottom: '2px solid #e0e0e0',
    paddingBottom: '20px',
    marginBottom: '30px',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '10px',
    fontSize: '14px',
  },
  statusDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  serverInfo: {
    color: '#666',
    fontSize: '12px',
  },
  controls: {
    backgroundColor: '#f5f5f5',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
  },
  inputGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: '600',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    minHeight: '80px',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  button: {
    padding: '10px 20px',
    fontSize: '14px',
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  messagesContainer: {
    marginTop: '30px',
  },
  messagesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  emptyState: {
    textAlign: 'center',
    color: '#999',
    padding: '40px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
  },
  message: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '15px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontSize: '12px',
    color: '#666',
  },
  messageId: {
    fontFamily: 'monospace',
  },
  messageTime: {
    fontWeight: '600',
  },
  messageBody: {
    marginBottom: '10px',
  },
  messageData: {
    backgroundColor: '#f5f5f5',
    padding: '10px',
    borderRadius: '4px',
    fontSize: '13px',
    overflow: 'auto',
    margin: 0,
  },
  messageFooter: {
    fontSize: '12px',
    color: '#666',
  },
};

export default App;
