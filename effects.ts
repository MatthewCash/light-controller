import { TpLinkDevice } from './TpLinkDevice';
import { readDirRecursive } from './util/readDirRecursive';
import path from 'path';
import { bulbs } from './main';
import { sendToClients } from './interfaces/ws';

export interface LightingEffect {
    interval: number;
    id: string;
    name: string;
    run: (lights: TpLinkDevice[]) => void | Promise<void>;
}

const effectsDir = './effects/';
const effectsFileExtension = '.ts';

export const lightingEffects = new Map<string, LightingEffect>();

export const loadLightingEffects = async (): Promise<number> => {
    const files = await readDirRecursive(effectsDir);
    const effectFiles = files.filter(
        file => path.extname(file) === effectsFileExtension
    );

    if (!files.length) {
        console.warn('No valid effects in ' + effectsDir);
        return 0;
    }

    lightingEffects.clear();

    const loadPromises = effectFiles.map(async file => {
        delete require.cache[require.resolve(file)];

        const effect = (await import(file)).effect as LightingEffect;
        const id = path.basename(file, effectsFileExtension);

        lightingEffects.set(id, effect);
    });

    await Promise.all(loadPromises);

    console.log(
        `[+] ${lightingEffects.size}/${loadPromises.length} effects loaded!`
    );

    sendLoadedEffects();

    return lightingEffects.size;
};

export const getLoadedEffects = () => {
    return [...lightingEffects.values()].map(effect => ({
        id: effect.id,
        name: effect.name,
        interval: effect.interval
    }));
};

export const sendLoadedEffects = () => {
    const effects = [...lightingEffects.values()].map(effect => ({
        id: effect.id,
        name: effect.name,
        interval: effect.interval
    }));
    sendToClients({ effects });
};

loadLightingEffects();

let enabledLightingEffect: string;

let lightingEffectInterval: NodeJS.Timeout;

export const runningEffect = () =>
    lightingEffectInterval ? lightingEffects.get(enabledLightingEffect) : false;

export const enableLightingEffect = (id?: string) => {
    id ||= enabledLightingEffect;
    if (!id) throw new Error('No Effect chosen!');

    const effect = lightingEffects.get(id);

    if (!effect) throw new Error(`Could not find effect ${id}!`);

    disableLightingEffect();
    enabledLightingEffect = id;
    lightingEffectInterval = setInterval(
        () => effect.run(bulbs),
        effect.interval
    );
};

export const disableLightingEffect = () => {
    clearInterval(lightingEffectInterval);
    lightingEffectInterval = null;
};
