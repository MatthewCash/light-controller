import WebSocket from 'ws';
import { setBrightness } from '../commands/setBrightness';
import { setColor } from '../commands/setColor';
import { setCycle } from '../commands/setCycle';
import { setPower } from '../commands/setPower';
import { setSpeed } from '../commands/setSpeed';
import { setWhite } from '../commands/setWhite';
import { bulbs, status } from '../main';

let ws: WebSocket.Server;

interface WebSocketClient extends WebSocket {
    alive: boolean;
}

export const startWebSocketServer = () => {
    ws = new WebSocket.Server({ port: 1728 });

    ws.on('connection', (client: WebSocketClient) => {
        client.alive = true;
        client.on('message', onMessage);
        client.on('pong', () => (client.alive = true));
    });
};

const onMessage = (message: string) => {
    let data;
    try {
        data = JSON.parse(message);
    } catch {
        return 'ERROR: Invalid JSON!';
    }

    if (data?.color != null) setColor(data.color);
    if (data?.white != null) setWhite(data.white);
    if (data?.power != null) setPower(data.power);
    if (data?.cycle != null) setCycle(data.cycle);
    if (data?.brightness != null) setBrightness(data.brightness, data.adjust);
    if (data?.speed != null) setSpeed(data.speed);
};

const sendToClients = (data: string | any) => {
    if (typeof data === 'string') {
        ws.clients.forEach(client => client.send(data));
    } else {
        ws.clients.forEach(client => client.send(JSON.stringify(data)));
    }
};

setInterval(() => {
    ws.clients.forEach((client: WebSocketClient) => {
        if (!client.alive) return client.terminate();

        client.alive = false;
        client.ping();
    });
}, 10000);

setInterval(() => {
    if (!bulbs[0] || !status.lighting) {
        return sendToClients('No Bulbs Detected!');
    }

    sendToClients(status.lighting);
}, 1000);
