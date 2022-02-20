import { disableLightingEffect } from '../effects';
import { bulbs } from '../main';

export const setWhite = async (
    cold?: boolean | number,
    brightness?: number
): Promise<void> => {
    disableLightingEffect();

    let temperature = 4500;

    if (cold === true) temperature = 9000;
    if (cold === false) temperature = 2500;

    if (typeof cold === 'number') {
        temperature = Math.max(Math.min(cold, 9000), 2500);
    }

    await Promise.all(
        bulbs.map(bulb => bulb.setWhite(temperature, true, brightness))
    );
};
