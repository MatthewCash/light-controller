import { bulbProperties, bulbs } from '../main';

export const setCycle = async (shouldCycle: boolean): Promise<void> => {
    if (shouldCycle) {
        await Promise.all(
            bulbs.map(bulb =>
                bulb.setLighting({
                    color_temp: 0,
                    on_off: true
                })
            )
        );
        bulbProperties.cycle = true;
    } else {
        bulbProperties.cycle = false;
    }
};
