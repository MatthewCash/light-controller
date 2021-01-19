import { disableLightingEffect } from '../effects';
import { bulbs } from '../main';

export const setWhite = async (cold?: boolean | number): Promise<void> => {
    disableLightingEffect();
    if (cold === true) cold = 9000;
    if (cold === false) cold = 2500;

    if (cold < 2500) cold = 2500;
    if (cold > 9000) cold = 9000;

    if (!cold) cold = 4500;

    await Promise.all(
        bulbs.map(bulb =>
            bulb.setLighting({
                transition_period: 1000,
                color_temp: cold,
                on_off: true
            })
        )
    );
};
