import { bulbProperties, bulbs, status } from '../main';

export const setColor = async (
    color: number,
    keepCycle = false
): Promise<void> => {
    bulbProperties.cycle = keepCycle;
    await Promise.all(
        bulbs.map(bulb =>
            bulb.setLighting({
                transition_period: keepCycle
                    ? bulbProperties.cycleSpeed / 6
                    : 1000,
                hue: color,
                saturation: 100,
                color_temp: 0,
                on_off: keepCycle ? status.lighting.on_off : true
            })
        )
    );
};
