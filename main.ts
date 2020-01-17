import express from 'express';
import { Client } from 'tplink-smarthome-api';
import bodyParser from 'body-parser';
import cors from 'cors';
import WebSocket from 'ws';

let cycle = false;

let brightnessQueue: number[] = [];
let processingQueue = false;

const setColor = (color: number): void => {
    cycle = false;
    bulbs.forEach(async Bulb => {
        Bulb.lighting.setLightState({
            transition_period: 1000,
            hue: color,
            saturation: 100,
            color_temp: 0,
            on_off: true
        });
    });
};

const setWhite = (cold?: boolean | number): void => {
    cycle = false;
    if (cold === true) cold = 9000;
    if (cold === false) cold = 2500;

    if (cold < 2500) cold = 2500;
    if (cold > 9000) cold = 9000;

    bulbs.forEach(Bulb => {
        Bulb.lighting.setLightState({
            transition_period: 1000,
            color_temp: cold,
            on_off: true
        });
    });
};

const setPower = (power: boolean): void => {
    bulbs.forEach(Bulb => {
        Bulb.lighting.setLightState({
            on_off: power
        });
    });
};

const setCycle = (goCycle: boolean): void => {
    if (goCycle) {
        bulbs.forEach(Bulb => {
            Bulb.lighting.setLightState({
                color_temp: 0,
                on_off: true
            });
        });
        cycle = true;
    } else {
        cycle = false;
    }
};

const setBrightness = async (brightness: number, adjust: boolean = false): Promise<void> => {
    if (adjust) {
        brightnessQueue.push(brightness);
        if (!processingQueue) processBrightnessQueue();
        return;
    }

    if (brightness < 0) brightness = 0;
    if (brightness > 100) brightness = 100;

    bulbs.forEach(Bulb => {
        Bulb.lighting.setLightState({
            brightness,
            on_off: true
        });
    });
};

const processBrightnessQueue = async (): Promise<void> => {
    processingQueue = true;
    while (brightnessQueue.length > 0) {
        let adjustment = brightnessQueue[0];

        let { brightness: currentBrightness } = await bulbs[0].lighting.getLightState();
        let brightness = adjustment + currentBrightness;

        if (brightness < 0) brightness = 0;
        if (brightness > 100) brightness = 100;

        await Promise.all(bulbs.map(Bulb => Bulb.lighting.setLightState({ on_off: true, brightness })));
        brightnessQueue.shift();
    }
    processingQueue = false;
};

const client = new Client();
let bulbs = [];

client.on('bulb-new', Bulb => {
    if (!Bulb.alias.includes('Bulb ')) return;
    bulbs.push(Bulb);
    console.log('Found Bulb: ' + Bulb.alias);
});

client.on('bulb-online', Bulb => {
    if (!Bulb.alias.includes('Bulb ')) return;
    if (!bulbs.some(cachedBulb => cachedBulb.id === Bulb.id)) {
        console.log('Found Bulb Again: ' + Bulb.alias);
        bulbs.push(Bulb);
    }
});

console.log('Connecting to Bulbs');
client.startDiscovery();

interface status {
    hue: number;
    cycle: boolean;
    on_off: boolean;
}

let status: status;

const ws = new WebSocket.Server({ port: 1728 });

ws.on('connection', async Client => {
    Client.alive = true;
    Client.on('message', async message => {
        let data = JSON.parse(message);

        if (data?.color != null) setColor(data.color);
        if (data?.white != null) setWhite(data.white);
        if (data?.power != null) setPower(data.power);
        if (data?.cycle != null) setCycle(data.cycle);
        if (data?.brightness != null) setBrightness(data.brightness, data.adjust);
    });
    Client.on('pong', () => (Client.alive = true));
});

setInterval(() => {
    ws.clients.forEach(Client => {
        if (!Client.alive) return Client.terminate();

        Client.alive = false;
        Client.ping();
    });
}, 10000);

const app = express();

app.use(bodyParser.json());
app.use(
    cors({
        origin: (origin, callback) => {
            if (['http://localhost:8080', 'http://192.168.1.203:8080', 'http://127.0.0.1'].includes(origin))
                return callback(null, true);
            if (!origin) return callback(null, true);
            console.log(origin + ' failed CORS!');
            return callback(new Error('Not allowed by CORS'));
        }
    })
);

app.get('/status', async (req, res, next) => {
    if (!bulbs[0]) return res.status(425).send('Bulbs Initializing...');
    res.json(status);
});

app.post('/color', async (req, res, next) => {
    if (req.body?.color == null) return res.status(400).send('Color not specified!');
    setColor(req.body.color);
    return res.status(200).send('Success');
});

app.post('/white', async (req, res, next) => {
    setWhite(req?.body?.cold);
    return res.status(200).send('Success');
});

app.post('/power', async (req, res, next) => {
    if (req.body?.power == null) return res.status(400).send('Power status not specified!');
    setPower(req.body.power);
    return res.status(200).send('Success');
});

app.post('/cycle', async (req, res, next) => {
    if (req.body?.cycle == null) return res.status(400).send('Cycle status not specified!');
    setCycle(req.body.cycle);
    return res.status(200).send('Success');
});

app.post('/brightness', async (req, res, next) => {
    if (req.body?.brightness == null) return res.status(400).send('Brightness not specified!');
    setBrightness(req.body.brightness, req.body.adjust);
    return res.status(200).send('Success');
});

let color = 0;

setInterval(() => {
    if (!cycle) return;
    color += 60;
    bulbs.forEach(async Bulb => {
        Bulb.lighting.setLightState({
            transition_period: 1800,
            hue: color,
            saturation: 100,
            color_temp: 0
        });
    });
    if (color >= 360) color = 0;
}, 3000);

setInterval(async () => {
    if (!bulbs[0]) return;
    status = (await new Promise(async (resolve, reject) => {
        let resolved = false;
        setTimeout(() => {
            if (resolved) return;
            console.log('Reloading Bulbs');
            bulbs.length = 0;
        }, 10000);

        const [data] = await Promise.all(bulbs.map(Bulb => Bulb.lighting.getLightState()));

        resolved = true;
        resolve(data);
    })) as status;

    status.cycle = status.on_off ? cycle : false;
    if (status.cycle) status.hue += 50;
    ws.clients.forEach(Client => Client.send(JSON.stringify(status)));
}, 1000);

app.listen(1729, '0.0.0.0');
