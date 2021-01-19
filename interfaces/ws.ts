import WebSocket from 'ws';
import { setBrightness } from '../commands/setBrightness';
import { setColor } from '../commands/setColor';
import { setPower } from '../commands/setPower';
import { setWhite } from '../commands/setWhite';
import {
    disableLightingEffect,
    enableLightingEffect,
    getLoadedEffects,
    loadLightingEffects,
    sendLoadedEffects
} from '../effects';
import { bulbs, status, updateStatus } from '../main';

let ws: WebSocket.Server;

interface WebSocketClient extends WebSocket {
    alive: boolean;
}

export const startWebSocketServer = () => {
    ws = new WebSocket.Server({ port: 1728 });

    ws.on('connection', (client: WebSocketClient) => {
        client.send(JSON.stringify({ effects: getLoadedEffects() }));

        client.alive = true;
        client.on('message', onMessage);
        client.on('pong', () => (client.alive = true));
    });

    sendLoadedEffects();
};

interface wsData {
    setColor?: number;
    setWhite?: number | boolean;
    setPower?: boolean;
    setEffect?: string;
    setBrightness?: number;
    adjust?: boolean;
    reloadLightingEffects?: number;
}

const onMessage = async (message: string) => {
    let data: wsData;
    try {
        data = JSON.parse(message);
    } catch {
        return 'ERROR: Invalid JSON!';
    }

    const actions: Promise<void>[] = [];

    if (data?.setColor != null) actions.push(setColor(data.setColor));
    if (data?.setWhite != null) actions.push(setWhite(data.setWhite));
    if (data?.setPower != null) actions.push(setPower(data.setPower));
    if (data?.setEffect != null) enableLightingEffect(data.setEffect);
    if (data?.setEffect === null) disableLightingEffect();
    if (data?.setBrightness != null)
        actions.push(setBrightness(data.setBrightness, data.adjust));

    if (data.reloadLightingEffects) {
        loadLightingEffects();
    }

    await Promise.all(actions);

    updateStatus();
};

export const sendToClients = (data: string | any) => {
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

    sendToClients({ status: status.lighting });
};
