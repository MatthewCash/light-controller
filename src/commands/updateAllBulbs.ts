import { disableLightingEffect } from '../effects';
import { bulbs } from '../main';
import { UpdateData } from '../TpLinkDevice';

export const updateAllBulbs = async (
    updateData: UpdateData,
    disableLightingEffects = true
): Promise<void> => {
    if (disableLightingEffects) disableLightingEffect();

    await Promise.all(bulbs.map(bulb => bulb.updateState(updateData)));
};
