import { disableLightingEffect } from '../effects';
import { bulbs } from '../main';

export const setColor = async (
    color: number,
    transitionSpeed = 1000
): Promise<void> => {
    disableLightingEffect();

    while (color > 360) color -= 360;
    while (color < 0) color += 360;

    await Promise.all(
        bulbs.map(bulb =>
            bulb.setColor(color, 100, null, transitionSpeed, true)
        )
    );
};
