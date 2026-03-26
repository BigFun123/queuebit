/**
 * QueueBit React/ES6 Client TypeScript Definitions
 */

import { Socket as ClientSocket } from 'socket.io-client';

/**
 * Options for publishing a message
 */
export interface PublishOptions {
  /** Subject/topic to publish to */
  subject?: string;
  /** Message expiry date */
  expiry?: Date | string;
  /** Whether to remove message after it's read once */
  removeAfterRead?: boolean;
}

/**
 * Options for subscribing to messages
 */
export interface SubscribeOptions {
  /** Subject/topic to subscribe to */
  subject?: string;
  /** Queue name for load balancing (if specified, acts as load balancer) */
  queue?: string;
}

/**
 * Options for unsubscribing from messages
 */
export interface UnsubscribeOptions {
  /** Subject/topic to unsubscribe from */
  subject?: string;
  /** Queue name for load balancing */
  queue?: string;
}

/**
 * Options for getting messages
 */
export interface GetMessagesOptions {
  /** Subject/topic to get messages from */
  subject?: string;
}

/**
 * Options for clearing messages
 */
export interface ClearMessagesOptions {
  /** Subject/topic to clear messages from */
  subject?: string;
  /** Clear all subjects and empty the persisted queue file */
  all?: boolean;
}

/**
 * A queued message
 */
export interface QueueMessage<T = any> {
  /** Unique message ID */
  id: string;
  /** Message data/payload */
  data: T;
  /** Message subject/topic */
  subject: string;
  /** Message timestamp */
  timestamp: Date;
  /** Message expiry date (optional) */
  expiry?: Date;
  /** Whether to remove after read */
  removeAfterRead: boolean;
  /** Load balancer ID (if delivered via load balancer) */
  loadBalancerId?: number;
  /** Queue name (if delivered via load balancer) */
  queueName?: string;
}

/**
 * Response from publish operation
 */
export interface PublishResponse {
  /** Whether the publish was successful */
  success: boolean;
  /** Message ID if successful */
  messageId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Response from subscribe operation
 */
export interface SubscribeResponse {
  /** Whether the subscription was successful */
  success: boolean;
  /** Subject subscribed to */
  subject?: string;
  /** Load balancer name if applicable */
  loadBalancer?: string;
  /** Load balancer ID if applicable */
  loadBalancerId?: number;
}

/**
 * Response from unsubscribe operation
 */
export interface UnsubscribeResponse {
  /** Whether the unsubscribe was successful */
  success: boolean;
}

/**
 * Response from getMessages operation
 */
export interface GetMessagesResponse<T = any> {
  /** Whether the operation was successful */
  success: boolean;
  /** Array of messages */
  messages?: QueueMessage<T>[];
  /** Number of messages */
  count?: number;
}

/**
 * Response from clearMessages operation
 */
export interface ClearMessagesResponse {
  /** Whether the operation was successful */
  success: boolean;
  /** Subject that was cleared */
  subject?: string;
  /** Whether all subjects were cleared */
  all?: boolean;
  /** Number of messages cleared */
  cleared?: number;
}

/**
 * Message handler callback
 */
export type MessageHandler<T = any> = (message: QueueMessage<T>) => void;

/**
 * QueueBit Client class for React/ES6
 */
export class QueueBitClient {
  /** Socket.IO client instance */
  socket: ClientSocket;
  /** Message handlers map */
  messageHandlers: Map<string, Set<MessageHandler>>;
  /** Whether connected to server */
  connected: boolean;
  /** Server version */
  serverVersion: string | null;
  /** Number of received messages */
  receivedMessages: number;

  /**
   * Create a new QueueBit client
   * @param url - Server URL (default: 'http://localhost:3333')
   * @param socketOptions - Additional socket.io options
   */
  constructor(url?: string, socketOptions?: object);

  /**
   * Publish a message
   * @param message - Message data to publish
   * @param options - Publish options
   * @returns Promise resolving to publish response
   */
  publish<T = any>(message: T, options?: PublishOptions): Promise<PublishResponse>;

  /**
   * Subscribe to messages
   * @param callback - Message handler callback
   * @param options - Subscribe options
   * @returns Promise resolving to subscribe response
   */
  subscribe<T = any>(
    callback: MessageHandler<T>,
    options?: SubscribeOptions
  ): Promise<SubscribeResponse>;

  /**
   * Unsubscribe from messages
   * @param options - Unsubscribe options
   * @returns Promise resolving to unsubscribe response
   */
  unsubscribe(options?: UnsubscribeOptions): Promise<UnsubscribeResponse>;

  /**
   * Get messages from queue
   * @param options - Get messages options
   * @returns Promise resolving to messages response
   */
  getMessages<T = any>(options?: GetMessagesOptions): Promise<GetMessagesResponse<T>>;

  /**
   * Clear messages from queue
   * @param options - Clear messages options
   * @returns Promise resolving to clear response
   */
  clearMessages(options?: ClearMessagesOptions): Promise<ClearMessagesResponse>;

  /**
   * Handle incoming message
   * @param message - Received message
   */
  handleMessage(message: QueueMessage): void;

  /**
   * Disconnect from server
   */
  disconnect(): void;

  /**
   * Check if client is connected
   * @returns Connection status
   */
  isConnected(): boolean;

  /**
   * Get server version
   * @returns Server version
   */
  getServerVersion(): string | null;

  /**
   * Get count of received messages
   * @returns Number of messages received
   */
  getReceivedMessageCount(): number;
}

/**
 * Default export
 */
export default QueueBitClient;
