import { bulbProperties, bulbs, status, transitionPeriod } from '../main';

export const setColor = async (
    color: number,
    keepCycle = false
): Promise<void> => {
    bulbProperties.cycle = keepCycle;
    await Promise.all(
        bulbs.map(bulb =>
            bulb.setLighting({
                transition_period: keepCycle ? transitionPeriod() : 1000,
                hue: color,
                saturation: 100,
                color_temp: 0,
                on_off: keepCycle ? status.lighting.on_off : true
            })
        )
    );
};
