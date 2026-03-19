/**
 * useQueueBit - Custom React Hook for QueueBit
 * 
 * Provides a simple interface for connecting to QueueBit server,
 * subscribing to messages, and publishing messages.
 * 
 * @example
 * const { connected, messages, publish, serverVersion } = useQueueBit(
 *   'http://localhost:3333',
 *   'chat'
 * );
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for QueueBit client
 * @param {string} serverUrl - QueueBit server URL
 * @param {string} subject - Subject/topic to subscribe to
 * @param {object} options - Additional options
 * @returns {object} Hook state and methods
 */
export function useQueueBit(serverUrl = 'http://localhost:3333', subject = 'default', options = {}) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [serverVersion, setServerVersion] = useState(null);
  const [error, setError] = useState(null);
  const clientRef = useRef(null);
  const { maxMessages = 100 } = options;

  useEffect(() => {
    let client = null;
    let mounted = true;

    // Dynamically import the QueueBit client
    const initClient = async () => {
      try {
        // Import from the parent package - client-browser.js for browser environments
        await import('../../../src/client-browser.js');
        
        if (!mounted) return;

        // QueueBitClient is now available on window
        if (!window.QueueBitClient) {
          throw new Error('QueueBitClient not found on window');
        }

        client = new window.QueueBitClient(serverUrl);
        clientRef.current = client;

        // Connection event handlers
        client.socket.on('connect', () => {
          if (mounted) {
            console.log('[useQueueBit] Connected to QueueBit server');
            setConnected(true);
            setError(null);
          }
        });

        client.socket.on('disconnect', () => {
          if (mounted) {
            console.log('[useQueueBit] Disconnected from QueueBit server');
            setConnected(false);
          }
        });

        client.socket.on('connect_error', (err) => {
          if (mounted) {
            console.error('[useQueueBit] Connection error:', err);
            setError(err.message || 'Connection error');
          }
        });

        // Subscribe to messages AFTER serverInfo is received
        client.socket.on('serverInfo', async (info) => {
          if (!mounted) return;
          
          console.log(`[useQueueBit] Server v${info.version}`);
          setServerVersion(info.version);

          // Now subscribe to messages
          try {
            const subscribeResponse = await client.subscribe((message) => {
              console.log('[useQueueBit] Received message:', message);
              if (mounted) {
                setMessages(prev => {
                  const updated = [...prev, message];
                  console.log('[useQueueBit] Updated messages:', updated.length);
                  // Limit stored messages to prevent memory leaks
                  return updated.slice(-maxMessages);
                });
              }
            }, { subject });

            console.log(`[useQueueBit] Subscribed to subject: ${subject}`, subscribeResponse);
          } catch (err) {
            console.error('[useQueueBit] Subscription error:', err);
          }
        });

        // Add direct message listener for debugging
        client.socket.on('message', (message) => {
          console.log('[useQueueBit] Direct socket message received:', message);
        });

      } catch (err) {
        console.error('[useQueueBit] Failed to initialize client:', err);
        if (mounted) {
          setError(err.message || 'Failed to initialize client');
        }
      }
    };

    initClient();

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (client) {
        console.log('[useQueueBit] Disconnecting client');
        client.disconnect();
      }
    };
  }, [serverUrl, subject, maxMessages]);

  /**
   * Publish a message to the current subject
   * @param {any} message - Message data to publish
   * @param {object} publishOptions - Additional publish options
   * @returns {Promise<object>} Publish response
   */
  const publish = useCallback(async (message, publishOptions = {}) => {
    if (!clientRef.current) {
      console.warn('[useQueueBit] Client not initialized');
      return { success: false, error: 'Client not initialized' };
    }

    if (!connected) {
      console.warn('[useQueueBit] Not connected to server');
      return { success: false, error: 'Not connected' };
    }

    try {
      const result = await clientRef.current.publish(message, {
        subject,
        ...publishOptions
      });
      return result;
    } catch (err) {
      console.error('[useQueueBit] Publish error:', err);
      return { success: false, error: err.message };
    }
  }, [connected, subject]);

  /**
   * Clear all messages from the current subject
   * @returns {Promise<object>} Clear response
   */
  const clearMessages = useCallback(async () => {
    if (!clientRef.current) {
      return { success: false, error: 'Client not initialized' };
    }

    try {
      const result = await clientRef.current.clearMessages({ subject });
      if (result.success) {
        setMessages([]);
      }
      return result;
    } catch (err) {
      console.error('[useQueueBit] Clear error:', err);
      return { success: false, error: err.message };
    }
  }, [subject]);

  /**
   * Get all messages from the current subject
   * @returns {Promise<object>} Messages response
   */
  const getMessages = useCallback(async () => {
    if (!clientRef.current) {
      return { success: false, error: 'Client not initialized' };
    }

    try {
      const result = await clientRef.current.getMessages({ subject });
      return result;
    } catch (err) {
      console.error('[useQueueBit] Get messages error:', err);
      return { success: false, error: err.message };
    }
  }, [subject]);

  return {
    connected,
    messages,
    serverVersion,
    error,
    publish,
    clearMessages,
    getMessages,
    client: clientRef.current
  };
}

export default useQueueBit;
