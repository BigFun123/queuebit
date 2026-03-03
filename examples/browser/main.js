// Socket.IO is loaded via CDN, window.io is available

// Import QueueBitClient as side-effect only - it registers itself on window
import '@usermetrics/queuebit/src/client-browser.js';

// Now QueueBitClient is available on window
const output = document.getElementById('output');
let counter = 1;
const SUBJECT = 'browser-demo';

function log(message) {
    output.textContent += message + '\n';
    output.scrollTop = output.scrollHeight;
}

// Log the frontend port
log(`[frontend] Running on ${window.location.origin}`);

// Check if QueueBitClient is available
if (!window.QueueBitClient) {
    log('[error] QueueBitClient not found. Make sure the package is built (npm run build).');
    throw new Error('QueueBitClient not available');
}

const client = new window.QueueBitClient('http://localhost:3333');

client.socket.on('connect', () => log(`[connected] id: ${client.socket.id}`));
client.socket.on('disconnect', () => log('[disconnected]'));
client.socket.on('connect_error', (err) => log(`[error] ${err.message}`));
client.socket.on('serverInfo', (info) => {
    log(`[server] ${info.name} v${info.version}`);
    client.subscribe((msg) => {
        log(`[message received] ${JSON.stringify(msg.data)} (id: ${msg.id})`);
    }, { subject: SUBJECT }).then((res) => {
        log(`[subscribed] subject: "${SUBJECT}" → ${res.success ? 'OK' : res.error}`);
    });
});

window.enqueueItem = async function() {
    const item = { text: `Item ${counter++}`, timestamp: new Date().toISOString() };
    const res = await client.publish(item, { subject: SUBJECT });
    if (res.success) log(`[published] ${JSON.stringify(item)} (id: ${res.messageId})`);
    else log(`[publish error] ${res.error}`);
}

window.dequeueItem = async function() {
    const item = { text: `Item ${counter++}`, timestamp: new Date().toISOString() };
    const res = await client.publish(item, { subject: SUBJECT, removeAfterRead: true });
    if (res.success) log(`[published removeAfterRead] (id: ${res.messageId})`);
    else log(`[error] ${res.error}`);
}

window.peekItem = async function() {
    const res = await client.getMessages({ subject: SUBJECT });
    if (!res.success) { log(`[error] ${res.error}`); return; }
    const first = res.messages[0];
    log(`[peek] ${res.count} message(s). First: ${first ? JSON.stringify(first.data) : 'none'}`);
}

window.clearQueue = async function() {
    const res = await client.clearMessages({ subject: SUBJECT });
    if (!res.success) { log(`[error] ${res.error}`); return; }
    log(`[cleared] Removed ${res.cleared} message(s) from subject "${SUBJECT}"`);
}

window.showSize = async function() {
    const res = await client.getMessages({ subject: SUBJECT });
    if (!res.success) { log(`[error] ${res.error}`); return; }
    log(`[size] ${res.count} message(s) in subject "${SUBJECT}"`);
}
