/**
 * QueueBit TypeScript Type Definitions
 */

import { Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';

// ============================================================================
// Common Types
// ============================================================================

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
  /** Number of messages cleared */
  cleared?: number;
}

/**
 * Server info sent on connection
 */
export interface ServerInfo {
  /** Server version */
  version: string;
  /** Server name */
  name: string;
  /** Connection timestamp */
  timestamp: Date;
}

/**
 * Message handler callback
 */
export type MessageHandler<T = any> = (message: QueueMessage<T>) => void;

// ============================================================================
// Server Types
// ============================================================================

/**
 * Options for creating a QueueBit server
 */
export interface QueueBitServerOptions {
  /** Port to listen on */
  port?: number;
  /** Maximum queue size per subject */
  maxQueueSize?: number;
  /** Monitor interval in milliseconds */
  monitorInterval?: number;
  /** Monitor callback function */
  monitorCallback?: (stats: MonitorStats) => void;
}

/**
 * Load balancer configuration
 */
export interface LoadBalancer {
  /** Load balancer ID */
  id: number;
  /** Load balancer name */
  name: string;
  /** Connected sockets */
  sockets: ServerSocket[];
}

/**
 * Monitor statistics
 */
export interface MonitorStats {
  /** Timestamp of stats */
  timestamp: string;
  /** Number of pending messages in delivery queue */
  deliveryQueuePending: number;
  /** Stats per subject */
  subjects: {
    [subject: string]: {
      /** Number of messages in queue */
      messages?: number;
      /** Number of subscribers */
      subscribers?: number;
    };
  };
  /** Total messages across all subjects */
  totalMessages: number;
  /** Total subscribers across all subjects */
  totalSubscribers: number;
  /** Total load balancer workers */
  totalLBWorkers: number;
  /** Load balancer details */
  loadBalancers: {
    [key: string]: number;
  };
}

/**
 * QueueBit Server class
 */
export class QueueBitServer {
  /** Socket.IO server instance */
  io: any;
  /** Maximum queue size */
  maxQueueSize: number;
  /** Server version */
  version: string;
  /** Monitor interval */
  monitorInterval: number | null;
  /** Monitor callback */
  monitorCallback: ((stats: MonitorStats) => void) | null;
  /** Messages map (subject -> messages) */
  messages: Map<string, QueueMessage[]>;
  /** Subscribers map (subject -> sockets) */
  subscribers: Map<string, Set<ServerSocket>>;
  /** Load balancers map (subject -> name -> load balancer) */
  loadBalancers: Map<string, Map<string, LoadBalancer>>;
  /** Load balancer ID counter */
  loadBalancerIdCounter: number;
  /** Delivery queue */
  deliveryQueue: QueueMessage[];
  /** Delivery batch size */
  deliveryBatchSize: number;
  /** Whether currently delivering */
  isDelivering: boolean;
  /** Round-robin index for load balancers per subject */
  _lbRoundRobinIndex: Record<string, number>;

  /**
   * Create a new QueueBit server
   */
  constructor(options?: QueueBitServerOptions);

  /**
   * Setup socket handlers
   */
  setupHandlers(): void;

  /**
   * Handle publish event
   */
  handlePublish(
    socket: ServerSocket,
    message: any,
    options: PublishOptions,
    callback?: (response: PublishResponse) => void
  ): void;

  /**
   * Start delivery processor
   */
  startDeliveryProcessor(): void;

  /**
   * Process deliveries
   */
  processDeliveries(): void;

  /**
   * Deliver a message
   */
  deliverMessage(message: QueueMessage): void;

  /**
   * Handle subscribe event
   */
  handleSubscribe(
    socket: ServerSocket,
    options: SubscribeOptions,
    callback?: (response: SubscribeResponse) => void
  ): void;

  /**
   * Handle unsubscribe event
   */
  handleUnsubscribe(
    socket: ServerSocket,
    options: UnsubscribeOptions,
    callback?: (response: UnsubscribeResponse) => void
  ): void;

  /**
   * Handle disconnect event
   */
  handleDisconnect(socket: ServerSocket): void;

  /**
   * Handle getMessages event
   */
  handleGetMessages(
    socket: ServerSocket,
    options: GetMessagesOptions,
    callback?: (response: GetMessagesResponse) => void
  ): void;

  /**
   * Handle clearMessages event
   */
  handleClearMessages(
    socket: ServerSocket,
    options: ClearMessagesOptions,
    callback?: (response: ClearMessagesResponse) => void
  ): void;

  /**
   * Remove a message from the queue
   */
  removeMessage(messageId: string, subject: string): void;

  /**
   * Start expiry check interval
   */
  startExpiryCheck(): void;

  /**
   * Start monitor interval
   */
  startMonitor(interval?: number): void;

  /**
   * Close the server
   */
  close(): void;
}

// ============================================================================
// Client Types
// ============================================================================

/**
 * QueueBit Client class (Node.js)
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
   */
  constructor(url?: string);

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
   * Clear messages from queue (browser client only)
   * @param options - Clear messages options
   * @returns Promise resolving to clear response
   */
  clearMessages?(options?: ClearMessagesOptions): Promise<ClearMessagesResponse>;

  /**
   * Handle incoming message
   * @param message - Received message
   */
  handleMessage(message: QueueMessage): void;

  /**
   * Disconnect from server
   */
  disconnect(): void;
}

/**
 * Alias for QueueBitClient
 */
export class Queue extends QueueBitClient {}

// ============================================================================
// Module Exports
// ============================================================================

declare module '@usermetrics/queuebit' {
  export { QueueBitServer, QueueBitClient, Queue };
  export type {
    PublishOptions,
    SubscribeOptions,
    UnsubscribeOptions,
    GetMessagesOptions,
    ClearMessagesOptions,
    QueueMessage,
    PublishResponse,
    SubscribeResponse,
    UnsubscribeResponse,
    GetMessagesResponse,
    ClearMessagesResponse,
    ServerInfo,
    MessageHandler,
    QueueBitServerOptions,
    LoadBalancer,
    MonitorStats,
  };
}
