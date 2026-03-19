/**
 * QueueBit React Chat Application
 * 
 * A real-time chat interface demonstrating QueueBit's pub/sub capabilities
 */

import { useState, useEffect, useRef } from 'react';
import { useQueueBit } from './useQueueBit';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [isUsernameSet, setIsUsernameSet] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [serverUrl] = useState('http://localhost:3333');
  const [subject] = useState('chat');
  const messagesEndRef = useRef(null);

  const { connected, messages, serverVersion, error, publish } = useQueueBit(
    serverUrl,
    subject,
    { maxMessages: 100 }
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load username from localStorage
  useEffect(() => {
    const savedUsername = localStorage.getItem('queuebit-chat-username');
    if (savedUsername) {
      setUsername(savedUsername);
      setIsUsernameSet(true);
    }
  }, []);

  const handleSetUsername = (e) => {
    e.preventDefault();
    if (username.trim()) {
      localStorage.setItem('queuebit-chat-username', username.trim());
      setIsUsernameSet(true);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageText.trim() || !connected) {
      return;
    }

    const message = {
      username: username,
      text: messageText.trim(),
      timestamp: Date.now()
    };

    const result = await publish(message);
    
    if (result.success) {
      setMessageText('');
    } else {
      console.error('Failed to send message:', result.error);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getConnectionStatus = () => {
    if (error) return { text: 'Error', color: '#e74c3c', icon: '⚠️' };
    if (connected) return { text: 'Connected', color: '#27ae60', icon: '🟢' };
    return { text: 'Connecting...', color: '#f39c12', icon: '🟡' };
  };

  const status = getConnectionStatus();

  // Username setup screen
  if (!isUsernameSet) {
    return (
      <div className="app">
        <div className="username-setup">
          <div className="username-card">
            <h1>🚀 QueueBit Chat</h1>
            <p>Enter your username to join the chat</p>
            <form onSubmit={handleSetUsername}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                maxLength={20}
                autoFocus
                className="username-input"
              />
              <button type="submit" disabled={!username.trim()}>
                Join Chat
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main chat interface
  return (
    <div className="app">
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <div className="header-left">
            <h1>💬 QueueBit Chat</h1>
            <span className="username-badge">@{username}</span>
          </div>
          <div className="header-right">
            <div className="status" style={{ color: status.color }}>
              <span className="status-icon">{status.icon}</span>
              <span className="status-text">{status.text}</span>
            </div>
            {serverVersion && (
              <div className="server-version">
                Server v{serverVersion}
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <p>No messages yet. Start the conversation! 👋</p>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg, index) => {
                const isOwnMessage = msg.data.username === username;
                return (
                  <div
                    key={msg.id || index}
                    className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}
                  >
                    <div className="message-header">
                      <span className="message-username">
                        {msg.data.username}
                      </span>
                      <span className="message-time">
                        {formatTime(msg.data.timestamp)}
                      </span>
                    </div>
                    <div className="message-text">
                      {msg.data.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="input-container">
          <form onSubmit={handleSendMessage} className="message-form">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={connected ? "Type a message..." : "Connecting..."}
              disabled={!connected}
              className="message-input"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!connected || !messageText.trim()}
              className="send-button"
            >
              Send 📤
            </button>
          </form>
          <div className="input-footer">
            <span className="message-count">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => {
                setIsUsernameSet(false);
                localStorage.removeItem('queuebit-chat-username');
              }}
              className="change-username-btn"
            >
              Change Username
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
