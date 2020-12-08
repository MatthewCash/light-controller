import { bulbProperties, bulbs } from '../main';

export const setPower = async (power: boolean): Promise<void> => {
    await Promise.all(
        bulbs.map(bulb =>
            bulb.setLighting({
                on_off: power
            })
        )
    );
};
