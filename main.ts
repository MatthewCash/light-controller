import express, { Request, Response } from 'express';
import { Client } from 'tplink-smarthome-api';
import bodyParser from 'body-parser';
import cors from 'cors';
import WebSocket from 'ws';

let cycle = false;
let cycleSpeed = 18000;

const brightnessQueue: number[] = [];
let processingQueue = false;

let color = 0;

let cycleTimer = setInterval(() => {
    if (!cycle) return;
    color += 60;
    setColor(color, true);
    if (color >= 360) color = 0;
}, cycleSpeed / 6);

const setColor = async (color: number, keepCycle = false): Promise<void> => {
    cycle = keepCycle;
    await Promise.all(
        bulbs.map(bulb =>
            bulb.lighting.setLightState({
                transition_period: keepCycle ? cycleSpeed / 6 : 1000,
                hue: color,
                saturation: 100,
                color_temp: 0,
                on_off: true
            })
        )
    );
};

const setWhite = async (cold?: boolean | number): Promise<void> => {
    cycle = false;
    if (cold === true) cold = 9000;
    if (cold === false) cold = 2500;

    if (cold < 2500) cold = 2500;
    if (cold > 9000) cold = 9000;

    await Promise.all(
        bulbs.map(bulb =>
            bulb.lighting.setLightState({
                transition_period: 1000,
                color_temp: cold,
                on_off: true
            })
        )
    );
};

const setPower = async (power: boolean): Promise<void> => {
    await Promise.all(
        bulbs.map(bulb =>
            bulb.lighting.setLightState({
                on_off: power
            })
        )
    );
};

const setCycle = async (shouldCycle: boolean): Promise<void> => {
    if (shouldCycle) {
        await Promise.all(
            bulbs.map(bulb =>
                bulb.lighting.setLightState({
                    color_temp: 0,
                    on_off: true
                })
            )
        );
        cycle = true;
    } else {
        cycle = false;
    }
};

const setBrightness = async (
    brightness: number,
    adjust: boolean = false
): Promise<void> => {
    if (adjust) {
        brightnessQueue.push(brightness);
        if (!processingQueue) processBrightnessQueue();
        return;
    }

    if (brightness < 0) brightness = 0;
    if (brightness > 100) brightness = 100;

    await Promise.all(
        bulbs.map(bulb =>
            bulb.lighting.setLightState({
                brightness,
                on_off: true
            })
        )
    );
};

const processBrightnessQueue = async (): Promise<void> => {
    processingQueue = true;
    while (brightnessQueue.length > 0) {
        const adjustment = brightnessQueue[0];

        let {
            brightness: currentBrightness
        } = await bulbs[0].lighting.getLightState();
        let brightness = adjustment + currentBrightness;

        if (brightness < 0) brightness = 0;
        if (brightness > 100) brightness = 100;

        // await Promise.all(
        //     bulbs.map(bulb =>
        //         bulb.lighting.setLightState({ on_off: true, brightness })
        //     )
        // );
        await setBrightness(brightness);
        brightnessQueue.shift();
    }
    processingQueue = false;
};

const setSpeed = async (speed: number): Promise<void> => {
    if (speed < 6000) speed = 6000;
    if (speed > 24900) speed = 24900;

    cycleSpeed = speed;
    clearInterval(cycleTimer);

    cycleTimer = setInterval(() => {
        if (!cycle) return;
        color += 60;
        bulbs.forEach(bulb => {
            bulb.lighting.setLightState({
                transition_period: cycleSpeed / 6 - cycleSpeed / 60,
                hue: color,
                saturation: 100,
                color_temp: 0
            });
        });
        if (color >= 360) color = 0;
    }, speed / 6);
};

const client = new Client();
let bulbs = [];

client.on('bulb-new', bulb => {
    if (!bulb.alias.includes('Bulb ')) return;
    bulbs.push(bulb);
    console.log('Found Bulb: ' + bulb.alias);
});

client.on('bulb-online', bulb => {
    if (!bulb.alias.includes('Bulb ')) return;
    if (!bulbs.some(cachedBulb => cachedBulb.id === bulb.id)) {
        console.log('Found Bulb Again: ' + bulb.alias);
        bulbs.push(bulb);
    }
});

console.log('Connecting to Bulbs');
client.startDiscovery({
    discoveryInterval: 1000,
    broadcast: '192.168.1.255'
});

interface status {
    hue: number;
    cycle: boolean;
    on_off: boolean;
    speed: number;
}

let status: status;

const ws = new WebSocket.Server({ port: 1728 });

ws.on('connection', client => {
    client.alive = true;
    client.on('message', async message => {
        let data;
        try {
            data = JSON.parse(message);
        } catch {
            client.send('ERROR: Invalid JSON!');
        }

        if (data?.color != null) setColor(data.color);
        if (data?.white != null) setWhite(data.white);
        if (data?.power != null) setPower(data.power);
        if (data?.cycle != null) setCycle(data.cycle);
        if (data?.brightness != null)
            setBrightness(data.brightness, data.adjust);
        if (data?.speed != null) setSpeed(data.speed);
    });
    client.on('pong', () => (client.alive = true));
});

setInterval(() => {
    ws.clients.forEach(client => {
        if (!client.alive) return client.terminate();

        client.alive = false;
        client.ping();
    });
}, 10000);

const app = express();

app.use(bodyParser.json());
app.use(
    cors({
        origin: (origin, callback) => {
            if (
                [
                    'http://localhost:8080',
                    'http://192.168.1.203:8080',
                    'http://127.0.0.1',
                    'https://matthewcash.github.io'
                ].includes(origin)
            )
                return callback(null, true);
            if (!origin) return callback(null, true);
            console.log(origin + ' failed CORS!');
            return callback(new Error('Not allowed by CORS'));
        }
    })
);

app.get('/status', (req: Request, res: Response) => {
    if (!bulbs[0]) return res.status(425).send('Bulbs Initializing...');
    res.json(status);
});

app.post('/color', (req: Request, res: Response) => {
    if (req.body?.color == null)
        return res.status(400).send('Color not specified!');
    setColor(req.body.color);
    return res.status(200).send('Success');
});

app.post('/white', (req: Request, res: Response) => {
    setWhite(req?.body?.cold);
    return res.status(200).send('Success');
});

app.post('/power', (req: Request, res: Response) => {
    if (req.body?.power == null)
        return res.status(400).send('Power status not specified!');
    setPower(req.body.power);
    return res.status(200).send('Success');
});

app.post('/cycle', (req: Request, res: Response) => {
    if (req.body?.cycle == null)
        return res.status(400).send('Cycle status not specified!');
    setCycle(req.body.cycle);
    return res.status(200).send('Success');
});

app.post('/brightness', (req: Request, res: Response) => {
    if (req.body?.brightness == null)
        return res.status(400).send('Brightness not specified!');
    setBrightness(req.body.brightness, req.body.adjust);
    return res.status(200).send('Success');
});

app.post('/speed', (req: Request, res: Response) => {
    if (req.body?.speed == null)
        return res.status(400).send('Speed not specified!');
    setSpeed(req.body.speed);
    return res.status(200).send('Success');
});

// Read Bulb Status
setInterval(async () => {
    if (!bulbs[0]) return;
    status = await bulbs[0].lighting.getLightState().catch(e => {
        console.log('ERROR READING STATUS!');
        bulbs?.shift()?.closeConnection();

        client.startDiscovery({
            discoveryInterval: 1000,
            broadcast: '192.168.1.255'
        });
    });
}, 1000);

// Send Status to WS Clients
setInterval(() => {
    if (!bulbs[0] || !status) {
        return ws.clients.forEach(client => client.send('No Bulbs Detected!'));
    }

    status.cycle = status.on_off ? cycle : false;
    status.speed = cycleSpeed;
    if (status.cycle) status.hue += 50;
    ws.clients.forEach(client => client.send(JSON.stringify(status)));
}, 1000);

app.listen(1729, '0.0.0.0');
