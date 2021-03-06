import { LightingEffect } from '../effects';

let currentColor = 0;

export const effect: LightingEffect = {
    interval: 500,
    id: 'cycle',
    name: 'Cycle',
    async run(bulbs) {
        bulbs.forEach(bulb =>
            bulb
                .setColor(currentColor, 100, 100, 500, false, 0)
                .catch(() => null)
        );
        currentColor += 30;
        if (currentColor >= 360) currentColor = 0;
    }
};
