import { bulbs, status } from '../main';

export const setBrightness = async (
    brightness: number,
    adjust = false
): Promise<void> => {
    if (adjust) brightness += status.lighting.brightness;

    if (brightness < 0) brightness = 0;
    if (brightness > 100) brightness = 100;

    await Promise.all(
        bulbs.map(bulb => bulb.setBrightness(brightness, 100, true))
    );
};
