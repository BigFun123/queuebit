import { useEffect, useState, useCallback, useRef } from 'react';
import { QueueBitClient } from '@usermetrics/queuebit';

/**
 * Custom React hook for QueueBit client
 * 
 * @param {string} url - QueueBit server URL
 * @param {string} subject - Default subject for messages
 * @param {object} options - Additional options
 * @returns {object} QueueBit client interface
 * 
 * @example
 * const { connected, messages, publish, clearMessages } = useQueueBit(
 *   'http://localhost:3333',
 *   'my-subject'
 * );
 */
export function useQueueBit(url = 'http://localhost:3333', subject = 'default', options = {}) {
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [serverVersion, setServerVersion] = useState(null);
  const [error, setError] = useState(null);
  const clientRef = useRef(null);

  useEffect(() => {
    // Create QueueBit client
    const queueClient = new QueueBitClient(url, options.socketOptions);
    clientRef.current = queueClient;
    
    // Connection handlers
    queueClient.socket.on('connect', () => {
      console.log('[useQueueBit] Connected to server');
      setConnected(true);
      setError(null);
    });

    queueClient.socket.on('disconnect', () => {
      console.log('[useQueueBit] Disconnected from server');
      setConnected(false);
    });

    queueClient.socket.on('connect_error', (err) => {
      console.error('[useQueueBit] Connection error:', err);
      setError(err.message);
    });

    queueClient.socket.on('serverInfo', (info) => {
      console.log('[useQueueBit] Server info:', info);
      setServerVersion(info.version);
    });

    // Subscribe to messages
    queueClient.subscribe((message) => {
      console.log('[useQueueBit] Received message:', message);
      setMessages(prev => [...prev, message]);
      
      // Call custom message handler if provided
      if (options.onMessage) {
        options.onMessage(message);
      }
    }, { subject });

    setClient(queueClient);

    // Cleanup on unmount
    return () => {
      console.log('[useQueueBit] Cleaning up');
      queueClient.disconnect();
      clientRef.current = null;
    };
  }, [url, subject]); // Re-create client if URL or subject changes

  /**
   * Publish a message to the queue
   */
  const publish = useCallback(async (data, publishOptions = {}) => {
    if (!clientRef.current) {
      return { success: false, error: 'Client not initialized' };
    }
    
    try {
      const response = await clientRef.current.publish(data, {
        subject,
        ...publishOptions
      });
      return response;
    } catch (err) {
      console.error('[useQueueBit] Publish error:', err);
      return { success: false, error: err.message };
    }
  }, [subject]);

  /**
   * Get messages from the queue
   */
  const getMessages = useCallback(async (getOptions = {}) => {
    if (!clientRef.current) {
      return { success: false, error: 'Client not initialized' };
    }
    
    try {
      const response = await clientRef.current.getMessages({
        subject,
        ...getOptions
      });
      return response;
    } catch (err) {
      console.error('[useQueueBit] Get messages error:', err);
      return { success: false, error: err.message };
    }
  }, [subject]);

  /**
   * Clear messages from the queue
   */
  const clearMessages = useCallback(async (clearOptions = {}) => {
    if (!clientRef.current) {
      return { success: false, error: 'Client not initialized' };
    }
    
    try {
      const response = await clientRef.current.clearMessages({
        subject,
        ...clearOptions
      });
      
      if (response.success) {
        setMessages([]);
      }
      
      return response;
    } catch (err) {
      console.error('[useQueueBit] Clear messages error:', err);
      return { success: false, error: err.message };
    }
  }, [subject]);

  /**
   * Clear local messages state without clearing server queue
   */
  const clearLocalMessages = useCallback(() => {
    setMessages([]);
  }, []);

  /**
   * Unsubscribe from current subject
   */
  const unsubscribe = useCallback(async () => {
    if (!clientRef.current) {
      return { success: false, error: 'Client not initialized' };
    }
    
    try {
      const response = await clientRef.current.unsubscribe({ subject });
      return response;
    } catch (err) {
      console.error('[useQueueBit] Unsubscribe error:', err);
      return { success: false, error: err.message };
    }
  }, [subject]);

  /**
   * Subscribe to a different subject
   */
  const subscribe = useCallback(async (callback, subscribeOptions = {}) => {
    if (!clientRef.current) {
      return { success: false, error: 'Client not initialized' };
    }
    
    try {
      const response = await clientRef.current.subscribe(callback, {
        subject,
        ...subscribeOptions
      });
      return response;
    } catch (err) {
      console.error('[useQueueBit] Subscribe error:', err);
      return { success: false, error: err.message };
    }
  }, [subject]);

  return {
    client: clientRef.current,
    connected,
    messages,
    serverVersion,
    error,
    publish,
    getMessages,
    clearMessages,
    clearLocalMessages,
    subscribe,
    unsubscribe,
  };
}

/**
 * Hook for managing multiple subjects
 * 
 * @param {string} url - QueueBit server URL
 * @param {string[]} subjects - Array of subjects to subscribe to
 * @returns {object} Multi-subject interface
 * 
 * @example
 * const { connected, messagesBySubject, publishTo } = useQueueBitMulti(
 *   'http://localhost:3333',
 *   ['notifications', 'updates', 'alerts']
 * );
 */
export function useQueueBitMulti(url = 'http://localhost:3333', subjects = ['default']) {
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messagesBySubject, setMessagesBySubject] = useState({});
  const clientRef = useRef(null);

  useEffect(() => {
    const queueClient = new QueueBitClient(url);
    clientRef.current = queueClient;
    
    queueClient.socket.on('connect', () => {
      setConnected(true);
    });

    queueClient.socket.on('disconnect', () => {
      setConnected(false);
    });

    // Subscribe to all subjects
    subjects.forEach(subject => {
      queueClient.subscribe((message) => {
        setMessagesBySubject(prev => ({
          ...prev,
          [subject]: [...(prev[subject] || []), message]
        }));
      }, { subject });
    });

    setClient(queueClient);

    return () => {
      queueClient.disconnect();
      clientRef.current = null;
    };
  }, [url, subjects.join(',')]);

  const publishTo = useCallback(async (subject, data, options = {}) => {
    if (!clientRef.current) {
      return { success: false, error: 'Client not initialized' };
    }
    
    return await clientRef.current.publish(data, { subject, ...options });
  }, []);

  const clearSubject = useCallback((subject) => {
    setMessagesBySubject(prev => ({
      ...prev,
      [subject]: []
    }));
  }, []);

  return {
    client: clientRef.current,
    connected,
    messagesBySubject,
    publishTo,
    clearSubject,
  };
}
