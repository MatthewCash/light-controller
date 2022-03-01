import WebSocket from 'ws';
import { updateAllBulbs, UpdateCommandData } from '../commands/updateAllBulbs';
import {
    disableLightingEffect,
    enableLightingEffect,
    getLoadedEffects,
    loadLightingEffects
} from '../effects';
import { bulbs, status, updateStatus } from '../main';

let wsServer: WebSocket.Server;

interface WebSocketClient extends WebSocket {
    alive: boolean;
}

let lastMessage: string;

export const startWebSocketServer = () => {
    wsServer = new WebSocket.Server({ port: 1728 });

    wsServer.on('connection', (client: WebSocketClient) => {
        client.send(JSON.stringify({ effects: getLoadedEffects() }));

        if (lastMessage) client.send(lastMessage);

        client.alive = true;
        client.on('message', onMessage);
        client.on('pong', () => (client.alive = true));
    });
};

interface wsData {
    setHueSaturation: {
        hue: number;
        saturation: number;
    };
    setEffect?: string;
    reloadLightingEffects?: number;
    update?: UpdateCommandData;
}

const onMessage = async (message: string) => {
    let data: wsData;
    try {
        data = JSON.parse(message);
    } catch {
        return 'ERROR: Invalid JSON!';
    }

    const actions: Promise<void>[] = [];

    if (data?.setEffect != null) enableLightingEffect(data.setEffect);
    if (data?.setEffect === null) disableLightingEffect();
    if (data?.update != null) {
        actions.push(updateAllBulbs(data.update));
    }

    if (data.reloadLightingEffects) {
        loadLightingEffects();
    }

    await Promise.all(actions);

    updateStatus();
};

export const sendToClients = (data: string | any) => {
    if (typeof data !== 'string') data = JSON.stringify(data);

    if (lastMessage === data) return;

    wsServer.clients.forEach(client => client.send(data));
    lastMessage = data;
};

setInterval(() => {
    (wsServer.clients as Set<WebSocketClient>).forEach(client => {
        if (!client.alive) return client.terminate();

        client.alive = false;
        client.ping();
        client.send('ping');
    });
}, 3000);

export const sendStatus = () => {
    if (!bulbs[0] || !status.lighting) {
        return sendToClients('No Bulbs Detected!');
    }

    sendToClients({ status: status.lighting });
};
