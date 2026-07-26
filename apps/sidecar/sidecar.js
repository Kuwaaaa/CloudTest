const WebSocket = require('ws');
const net = require('net');

const WEB_PORT = Number(process.env.SIDECAR_WS_PORT || 8888);
const PCG_HOST = process.env.PCG_HOST || '127.0.0.1';
const PCG_PORT = Number(process.env.PCG_PORT || 9999);
const RECONNECT_DELAY_MS = Number(process.env.PCG_RECONNECT_DELAY_MS || 3000);

const wss = new WebSocket.Server({ port: WEB_PORT, host: process.env.SIDECAR_WS_HOST || '127.0.0.1' });

let pcgSocket = null;
let reconnectTimer = null;
let isConnecting = false;

function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectToPcg();
    }, RECONNECT_DELAY_MS);
}

function broadcastToWebClients(message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function connectToPcg() {
    if (isConnecting || (pcgSocket && !pcgSocket.destroyed)) return;
    isConnecting = true;

    const socket = new net.Socket();
    pcgSocket = socket;

    socket.connect(PCG_PORT, PCG_HOST, () => {
        isConnecting = false;
        console.log(`[Sidecar] Connected to p_cg at ${PCG_HOST}:${PCG_PORT}`);
    });

    socket.on('data', (data) => {
        broadcastToWebClients(data.toString());
    });

    socket.on('close', () => {
        if (pcgSocket === socket) pcgSocket = null;
        isConnecting = false;
        console.log('[Sidecar] p_cg disconnected. Retrying...');
        scheduleReconnect();
    });

    socket.on('error', (err) => {
        isConnecting = false;
        console.error(`[Sidecar] p_cg error: ${err.message}`);
        socket.destroy();
    });
}

function sendToPcg(command) {
    if (!pcgSocket || pcgSocket.destroyed || !pcgSocket.writable) {
        return false;
    }

    return pcgSocket.write(`${JSON.stringify(command)}\n`);
}

connectToPcg();

wss.on('connection', ws => {
    console.log('[Sidecar] Web client connected');

    ws.on('message', message => {
        try {
            const command = JSON.parse(message.toString());
            const accepted = sendToPcg(command);

            if (!accepted && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'error', message: 'p_cg is not connected' }));
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => console.log('[Sidecar] Web client disconnected'));
});

function shutdown() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    pcgSocket?.destroy();
    wss.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`[Sidecar] Running on ws://127.0.0.1:${WEB_PORT}`);
