import { bulbProperties, bulbs } from '../main';

export const setBrightness = async (
    brightness: number,
    adjust: boolean = false
): Promise<void> => {
    if (adjust) {
        brightnessQueue.push(brightness);
        if (!processingQueue) processBrightnessQueue();
        return;
    }

    if (brightness < 0) brightness = 0;
    if (brightness > 100) brightness = 100;

    await Promise.all(
        bulbs.map(bulb =>
            bulb.setLighting({
                brightness,
                on_off: true
            })
        )
    );
};

const brightnessQueue: number[] = [];
let processingQueue = false;

const processBrightnessQueue = async (): Promise<void> => {
    processingQueue = true;
    while (brightnessQueue.length > 0) {
        const adjustment = brightnessQueue[0];

        let {
            brightness: currentBrightness
        } = await bulbs[0].lighting.getLightState();
        let brightness = adjustment + currentBrightness;

        if (brightness < 0) brightness = 0;
        if (brightness > 100) brightness = 100;

        // await Promise.all(
        //     bulbs.map(bulb =>
        //         bulb.lighting.setLightState({ on_off: true, brightness })
        //     )
        // );
        await setBrightness(brightness);
        brightnessQueue.shift();
    }
    processingQueue = false;
};
