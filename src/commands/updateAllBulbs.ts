import { disableLightingEffect } from '../effects';
import { bulbs, status } from '../main';
import { UpdateData } from '../TpLinkDevice';

export interface UpdateCommandData extends UpdateData {
    adjustBrightness?: number;
}

export const updateAllBulbs = async (
    updateData: UpdateCommandData,
    disableLightingEffects = true
): Promise<void> => {
    if (disableLightingEffects) disableLightingEffect();

    if (updateData?.adjustBrightness) {
        updateData.brightness =
            status.lighting.brightness + updateData.adjustBrightness;
    }

    await Promise.all(bulbs.map(bulb => bulb.updateState(updateData)));
};
