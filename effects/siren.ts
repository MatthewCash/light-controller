import { LightingEffect } from '../effects';

let evenRed = false;

export const effect: LightingEffect = {
    interval: 500,
    id: 'siren',
    name: 'Siren',
    async run(bulbs) {
        bulbs
            .filter((bulb, index) => index % 2 === 0)
            .forEach(bulb =>
                bulb
                    .setColor(
                        evenRed ? 0 : 240,
                        100,
                        null,
                        evenRed ? 400 : 0,
                        false,
                        0
                    )
                    .catch(() => null)
            );
        bulbs
            .filter((bulb, index) => index % 2 !== 0)
            .forEach(bulb =>
                bulb
                    .setColor(
                        !evenRed ? 0 : 240,
                        100,
                        null,
                        !evenRed ? 400 : 0,
                        false,
                        0
                    )
                    .catch(() => null)
            );
        evenRed = !evenRed;
    }
};
