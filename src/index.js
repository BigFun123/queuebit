// @ts-check
const { QueueBitServer } = require('./server');
const { QueueBitClient } = require('./client-node');

/**
 * @module @usermetrics/queuebit
 * @description QueueBit - A high performance queue with guaranteed delivery and built-in load balancer
 */

// Allow both: require('@usermetrics/queuebit') and const { QueueBitClient } = require('@usermetrics/queuebit')
module.exports = QueueBitClient;
module.exports.QueueBitClient = QueueBitClient;
module.exports.QueueBitServer = QueueBitServer;