import TPLSmartDevice from 'tplink-lightbulb';
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

bulbProperties.cycleTimer = setInterval(() => {
    if (!bulbProperties.cycle) return;
    bulbProperties.color += 60;
    if (bulbProperties.color >= 360) bulbProperties.color = 1;
    setColor(bulbProperties.color, true);
}, bulbProperties.cycleSpeed / 6);

const validCycles = new Array(6).fill(null).map((x, i) => 60 * i + 1);

export const bulbs = [];

const bulbIps = ['192.168.1.209', '192.168.1.151'];

console.log('Connecting to Bulbs');

TPLSmartDevice.scan().on('light', bulb => {
    if (!bulb.name.includes('Bulb ')) return;
    if (bulbIps.includes(bulb.host)) return;
    console.log('Found Bulb: ' + bulb.name);
    bulbs.push(bulb);
});

bulbIps.forEach(async ip => {
    const bulb = new TPLSmartDevice(ip);
    const info = await bulb.info();
    if (!info.alias.includes('Bulb ')) return;
    console.log('Connected to Bulb: ' + info.alias);

    bulbs.push(bulb);
    bulb.setLighting = lightingData =>
        bulb.send({
            'smartlife.iot.smartbulb.lightingservice': {
                transition_light_state: lightingData
            }
        });
});

interface BulbStatus {
    lighting: {
        hue: number;
        cycle: boolean;
        on_off: boolean;
        speed: number;
        cycleSpeed: number;
    };
}

export const status: BulbStatus = { lighting: null };

export const updateStatus = async () => {
    if (!bulbs[0]) return;
    const data = await bulbs[0].info();

    // Check for external update
    if (bulbProperties.cycle && !validCycles.includes(data.light_state.hue)) {
        setCycle(false);
    }

    status.lighting = {
        ...data.light_state,
        cycle: data.light_state.on_off ? bulbProperties.cycle : false,
        speeed: bulbProperties.cycleSpeed
    };
    sendStatus();
};

setInterval(updateStatus, 100);
