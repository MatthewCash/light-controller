import { status } from '../main';
import { setPower } from './setPower';

export const togglePower = async (): Promise<void> => {
    return setPower(!status.lighting.on_off);
};
