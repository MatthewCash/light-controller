import WebSocket from 'ws';
import { setBrightness } from '../commands/setBrightness';
import { setColor } from '../commands/setColor';
import { setCycle } from '../commands/setCycle';
import { setPower } from '../commands/setPower';
import { setSpeed } from '../commands/setSpeed';
import { setWhite } from '../commands/setWhite';
import { bulbs, status, updateStatus } from '../main';

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

interface wsData {
    color?: number;
    white?: number | boolean;
    power?: boolean;
    cycle?: boolean;
    brightness?: number;
    adjust?: boolean;
    speed?: number;
}

const onMessage = async (message: string) => {
    let data: wsData;
    try {
        data = JSON.parse(message);
    } catch {
        return 'ERROR: Invalid JSON!';
    }

    const actions: Promise<void>[] = [];

    if (data?.color != null) actions.push(setColor(data.color));
    if (data?.white != null) actions.push(setWhite(data.white));
    if (data?.power != null) actions.push(setPower(data.power));
    if (data?.cycle != null) actions.push(setCycle(data.cycle));
    if (data?.brightness != null)
        actions.push(setBrightness(data.brightness, data.adjust));
    if (data?.speed != null) actions.push(setSpeed(data.speed));

    await Promise.all(actions);

    updateStatus();
};

const sendToClients = (data: string | any) => {
    if (typeof data === 'string') {
        ws.clients.forEach(client => client.send(data));
    } else {
        const jsonString = JSON.stringify(data);
        ws.clients.forEach(client => client.send(jsonString));
    }
};

setInterval(() => {
    ws.clients.forEach((client: WebSocketClient) => {
        if (!client.alive) return client.terminate();

        client.alive = false;
        client.ping();
    });
}, 10000);

export const sendStatus = () => {
    if (!bulbs[0] || !status.lighting) {
        return sendToClients('No Bulbs Detected!');
    }

    sendToClients(status.lighting);
};
