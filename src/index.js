const { QueueBitServer } = require('./server');
const { QueueBitClient } = require('./client-node');

// Allow both: require('@usermetrics/queuebit') and const { QueueBitClient } = require('@usermetrics/queuebit')
module.exports = QueueBitClient;
module.exports.QueueBitClient = QueueBitClient;
module.exports.QueueBitServer = QueueBitServer;