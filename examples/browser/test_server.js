// simple server wrapper
// Run: first compile with `npx tsc`, then `node examples/browser/server.js`
const { QueueBitServer } = require('../../src/server');
const PORT = 3333;

new QueueBitServer({
    port: PORT,
    maxQueueSize: 1000,
    monitorInterval: 5000,
    monitorCallback: (data) => {
        process.stdout.write('\x1Bc');
        console.log(data);
    }
});

console.log(`QueueBit browser example server running on http://localhost:${PORT}`);
console.log('Open examples/browser/index.html in a browser to test.');