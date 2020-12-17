import { bulbProperties, bulbs, status, transitionPeriod } from '../main';

export const setColor = async (color: number, cycle = false): Promise<void> => {
    bulbProperties.cycle = cycle;
    await Promise.all(
        bulbs.map(bulb =>
            bulb.setLighting({
                transition_period: cycle ? transitionPeriod() : 1000,
                hue: color,
                saturation: 100,
                color_temp: 0,
                on_off: cycle ? status.lighting.on_off : true
            })
        )
    );
};
