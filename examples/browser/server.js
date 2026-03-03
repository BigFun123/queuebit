// simple server wrapper
// Run: npm run server (or npm start for both server and frontend)
import { QueueBitServer } from '@usermetrics/queuebit';
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

console.log(`QueueBit server running on http://localhost:${PORT}`);
console.log('Frontend should be running on http://localhost:5173');