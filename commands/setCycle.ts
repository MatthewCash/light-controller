import { bulbProperties, bulbs } from '../main';
import { setColor } from './setColor';

export const setCycle = async (shouldCycle: boolean): Promise<void> => {
    if (shouldCycle) {
        await setColor(bulbProperties.color, true);
        bulbProperties.cycle = true;
    } else {
        bulbProperties.cycle = false;
    }
};
