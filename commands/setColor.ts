import { disableLightingEffect, runningEffect } from '../effects';
import { bulbs, status } from '../main';

export const setColor = async (
    color: number,
    transitionSpeed = 1000
): Promise<void> => {
    disableLightingEffect();

    await Promise.all(
        bulbs.map(bulb =>
            bulb.setLighting({
                transition_period: transitionSpeed,
                hue: color,
                saturation: 100,
                color_temp: 0,
                on_off: true
            })
        )
    );
};
