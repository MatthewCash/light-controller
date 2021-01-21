import { SmartDevice } from './Device';

const throttle = (callback: () => void, limit: number): (() => void) => {
    let waiting = false; // Initially, we're not waiting
    return function () {
        // We return a throttled function
        if (!waiting) {
            // If we're not waiting
            callback.apply(this, arguments); // Execute users function
            waiting = true; // Prevent future invocations
            setTimeout(() => {
                // After a period of time
                waiting = false; // And allow future invocations
            }, limit);
        }
    };
};

export class SwitchController {
    switchIps: string[];
    bulbIps: string[];
    switches: SmartDevice[];
    bulbs: SmartDevice[];
    toggleLights: () => void;
    pollInterval?: NodeJS.Timeout;
    constructor(switchIps: string | string[], bulbIps: string | string[]) {
        this.switches = [];
        this.bulbs = [];

        this.switchIps = [switchIps].flat();
        this.bulbIps = [bulbIps].flat();
        this.toggleLights = throttle(this.togglePower, 100);
    }
    async connect() {
        const switchPromises = this.switchIps.map(
            ip =>
                new Promise<SmartDevice>(async resolve => {
                    const smartSwitch = new SmartDevice(ip);
                    const status = await smartSwitch
                        .getStatus()
                        .catch(() => null);
                    if (!status)
                        throw new Error('Could not connect to switch ' + ip);
                    resolve(smartSwitch);
                })
        );

        const bulbPromises = this.bulbIps.map(
            ip =>
                new Promise<SmartDevice>(async resolve => {
                    const smartBulb = new SmartDevice(ip);
                    const status = await smartBulb
                        .getStatus()
                        .catch(() => null);
                    if (!status)
                        throw new Error('Could not connect to bulb ' + ip);
                    resolve(smartBulb);
                })
        );

        await Promise.all([
            new Promise<void>(async resolve => {
                const smartSwitches = await Promise.all(switchPromises);
                this.switches.push(...smartSwitches);
                resolve();
            }),
            new Promise<void>(async resolve => {
                const smartBulbs = await Promise.all(bulbPromises);
                this.bulbs.push(...smartBulbs);
                resolve();
            })
        ]);
    }
    startPolling() {
        clearInterval(this.pollInterval);
        this.pollInterval = setInterval(this.pollSwitches.bind(this), 10);
    }
    async pollSwitches() {
        this.switches.forEach(async smartSwitch => {
            const data = await smartSwitch.getStatus().catch(() => null);

            if (data?.relay_state !== 0) return;
            smartSwitch.setRelayPower(true).catch(() => null);
            this.toggleLights();
        });
    }
    async togglePower() {
        const currentPower = !!(
            await this.bulbs[0].getLightingState().catch(() => null)
        )?.power;

        this.bulbs.forEach(bulb => bulb.setLightingPower(!currentPower));
    }
}
