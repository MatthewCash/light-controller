import { LightState, TpLinkDevice } from './TpLinkDevice';
import { startHttpServer } from './interfaces/http';
import { sendStatus, startWebSocketServer } from './interfaces/ws';
import { startSwitchMonitoring } from './switch';
import { loadLightingEffects, runningEffect } from './effects';
import config from '../config.json';

export const bulbProperties = {
    color: 1,
    cycleTimer: null
};

export const bulbs: TpLinkDevice[] = [];

const bulbIps: string[] = config.mainBulbIps;

const scanBulbs = async () => {
    const scanner = TpLinkDevice.scan();

    scanner.on('new', async bulb => {
        const info = await bulb.getStatus().catch(() => null);
        if (!info?.alias?.includes('Bulb ')) return;
        if (bulbs.find(lightBulb => lightBulb.ip === bulb.ip)) return;
        console.log(`Discovered Bulb: ${info.alias} (${bulb.ip})`);

        bulbs.push(bulb);
    });
};

const connectToBulb = async (ip: string): Promise<boolean> => {
    const bulb = new TpLinkDevice(ip);
    const info = await bulb.getStatus().catch(() => null);

    if (!info?.alias?.includes('Bulb ')) return false;
    if (bulbs.find(lightBulb => lightBulb.ip === bulb.ip)) return;
    console.log(`Connected to Bulb: ${info.alias} (${bulb.ip})`);

    bulbs.push(bulb);
    return true;
};

const connectToAllBulbs = () => {
    bulbIps.forEach(async ip => {
        let success = false;
        while (!success) {
            if (bulbs.find(bulb => bulb.ip === ip)) return;
            console.log('Connecting to Bulb: ' + ip);
            success = await connectToBulb(ip);
            if (success) return;

            console.warn(`Unable to connect to Bulb: ${ip} Retrying in 5s`);
            await new Promise(r => setTimeout(r, 5000));
        }
    });
    startSwitchMonitoring();
};

interface BulbStatus {
    lighting: LightState & {
        effect: string | null;
        updateSpeed?: number;
        mode: 'color' | 'white' | 'effect';
    };
    bulbCount: number;
}

export const status: BulbStatus = { lighting: null, bulbCount: bulbs.length };

export const updateStatus = async (updateTime = 1000) => {
    if (!bulbs[0]) return;
    let lightState: LightState;
    lightState = await bulbs[0].getLightingState().catch(() => null);
    if (!lightState) return;

    status.bulbCount = bulbs.length;

    const effect = runningEffect();

    const mode = effect
        ? 'effect'
        : lightState.colorTemp === 0
        ? 'color'
        : 'white';

    status.lighting = {
        ...lightState,
        effect: lightState.power && effect ? effect.id : null,
        updateSpeed: effect ? effect.interval : updateTime,
        mode
    };
    sendStatus();
};

// Reload Signal
process.on('SIGUSR2', () => {
    console.log('Reloading lighting effects...');
    loadLightingEffects();
});

const main = async () => {
    startHttpServer();
    startWebSocketServer();

    setInterval(updateStatus, 100);
    scanBulbs();

    loadLightingEffects();

    console.log('Connecting to Bulbs');
    setTimeout(connectToAllBulbs, 1000);
};

if (require.main === module) main();
