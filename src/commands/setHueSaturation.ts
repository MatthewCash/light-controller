import { disableLightingEffect } from '../effects';
import { bulbs } from '../main';

export const setHueSaturation = async (
    hue: number,
    saturation: number,
    transitionSpeed = 1000
): Promise<void> => {
    disableLightingEffect();

    while (hue > 360) hue -= 360;
    while (hue < 0) hue += 360;

    saturation = Math.round(saturation);

    if (saturation > 100) saturation = 100;
    if (saturation < 0) saturation = 0;

    await Promise.all(
        bulbs.map(bulb =>
            bulb.setLighting({
                transition_period: transitionSpeed,
                hue,
                saturation,
                on_off: true
            })
        )
    );
};
