import { LightState, SmartDevice } from './Device';
import { setColor } from './commands/setColor';
import { setCycle } from './commands/setCycle';
import { startHttpServer } from './interfaces/http';
import { sendStatus, startWebSocketServer } from './interfaces/ws';
import { startSwitchMonitoring } from './switch';

startHttpServer();
startWebSocketServer();

startSwitchMonitoring();

export const bulbProperties = {
    cycle: false,
    cycleSpeed: 12000,
    color: 1,
    cycleTimer: null
};

const cycleSteps = 3;

bulbProperties.cycleTimer = setInterval(() => {
    if (!bulbProperties.cycle) return;
    bulbProperties.color += 360 / cycleSteps;
    if (bulbProperties.color >= 360) bulbProperties.color = 1;
    setColor(bulbProperties.color, true);
}, bulbProperties.cycleSpeed / cycleSteps);

const validCycles = new Array(cycleSteps)
    .fill(null)
    .map((x, i) => (360 / cycleSteps) * i + 1);

export const transitionPeriod = () => bulbProperties.cycleSpeed / cycleSteps;

export const bulbs: SmartDevice[] = [];

const expectedBulbCount = 2;
const bulbIps = ['192.168.1.209', '192.168.1.151'];

console.log('Connecting to Bulbs');

const connectToBulb = async (ip: string): Promise<boolean> => {
    const bulb = new SmartDevice(ip);
    const info = await bulb.getStatus().catch(() => null);
    if (!info?.alias?.includes('Bulb ')) return false;
    console.log('Connected to Bulb: ' + info.alias);

    bulbs.push(bulb);
    return true;
};

bulbIps.forEach(async ip => {
    let success = false;
    while (!success) {
        console.log('Connecting to Bulb ' + ip);
        success = await connectToBulb(ip);
        if (success) return;

        console.warn('Unable to connect to ' + ip + ' Retrying in 1s');
        await new Promise(r => setTimeout(r, 1000));
    }
});

interface BulbStatus {
    lighting: LightState & {
        cycle: boolean;
        cycleSpeed: number;
    };
    bulbCount: number;
}

export const status: BulbStatus = { lighting: null, bulbCount: bulbs.length };

export const updateStatus = async () => {
    if (!bulbs[0]) return;
    let lightState: LightState;
    lightState = await bulbs[0].getLightingState().catch(() => null);
    if (!lightState) return;

    // Check for external update
    if (bulbProperties.cycle && !validCycles.includes(lightState.hue)) {
        setCycle(false);
    }

    status.bulbCount = bulbs.length;

    status.lighting = {
        ...lightState,
        cycle: lightState.on_off ? bulbProperties.cycle : false,
        cycleSpeed: bulbProperties.cycleSpeed
    };
    sendStatus();
};

setInterval(updateStatus, 100);
