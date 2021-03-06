import { LightingEffect } from '../effects';

export const effect: LightingEffect = {
    interval: 10,
    id: 'strobe',
    name: 'Strobe',
    async run(bulbs) {
        const randomHue = Math.floor(Math.random() * 360);
        await Promise.all(
            bulbs.map(bulb => bulb.setColor(randomHue, 100, 100, 0, false, 0))
        ).catch(() => null);
    }
};
