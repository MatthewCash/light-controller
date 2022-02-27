import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { bulbs, status } from '../main';
import {
    disableLightingEffect,
    enableLightingEffect,
    loadLightingEffects
} from '../effects';
import { updateAllBulbs } from '../commands/updateAllBulbs';

const app = express();

export const startHttpServer = () => {
    app.listen(1729, '0.0.0.0');
};

app.use(bodyParser.json());
app.use(cors());

app.get('/status', (req: Request, res: Response) => {
    if (!bulbs[0]) return res.status(425).send('Bulbs Initializing...');
    res.json(status.lighting);
});

app.post('/update', (req: Request, res: Response) => {
    if (req.body?.update == null)
        return res.status(400).send('No update data provided!');
    updateAllBulbs(req?.body?.update);
    return res.status(200).send('Success');
});

app.post('/effect', async (req: Request, res: Response) => {
    if (req.body?.reload === true) {
        loadLightingEffects();
        return res.status(200).send('Success');
    }
    if (req.body?.effect == null) {
        disableLightingEffect();
        return res.status(200).send('Success');
    }
    try {
        enableLightingEffect(req.body.effect);
        return res.status(200).send('Success');
    } catch (error) {
        return res.status(400).send(error.message);
    }
});
