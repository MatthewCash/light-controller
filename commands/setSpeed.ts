import { bulbProperties, bulbs } from '../main';

export const setSpeed = async (speed: number): Promise<void> => {
    if (speed < 6000) speed = 6000;
    if (speed > 24900) speed = 24900;

    bulbProperties.cycleSpeed = speed;
    clearInterval(bulbProperties.cycleTimer);

    bulbProperties.cycleTimer = setInterval(() => {
        if (!bulbProperties.cycle) return;
        bulbProperties.color += 60;
        bulbs.forEach(bulb => {
            bulb.setLighting({
                transition_period:
                    bulbProperties.cycleSpeed / 6 -
                    bulbProperties.cycleSpeed / 60,
                hue: bulbProperties.color,
                saturation: 100,
                color_temp: 0
            });
        });
        if (bulbProperties.color >= 360) bulbProperties.color = 0;
    }, speed / 6);
};
