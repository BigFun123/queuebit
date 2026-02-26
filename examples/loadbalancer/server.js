// simple server wrapper
// you can start the server with node src/server-runner.js or create your own wrapper like this:
const { QueueBitServer } = require('../../src/server');
const PORT = 3333;
new QueueBitServer({ port: PORT, 
    monitorInterval: 1000, 
    monitorCallback: (data) => {
    console.log(data);
} });
console.log(`QueueBit server running on port ${PORT}`);