import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { bulbs, status } from '../main';
import { setColor } from '../commands/setColor';
import { setPower } from '../commands/setPower';
import { setWhite } from '../commands/setWhite';
import { setBrightness } from '../commands/setBrightness';
import { disableLightingEffect, enableLightingEffect } from '../effects';

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

app.post('/color', (req: Request, res: Response) => {
    if (req.body?.color == null)
        return res.status(400).send('Color not specified!');
    setColor(req.body.color);
    return res.status(200).send('Success');
});

app.post('/white', (req: Request, res: Response) => {
    setWhite(req?.body?.cold);
    return res.status(200).send('Success');
});

app.post('/power', (req: Request, res: Response) => {
    if (req.body?.power == null)
        return res.status(400).send('Power status not specified!');
    setPower(req.body.power);
    return res.status(200).send('Success');
});

app.post('/brightness', (req: Request, res: Response) => {
    if (req.body?.brightness == null)
        return res.status(400).send('Brightness not specified!');
    setBrightness(req.body.brightness, req.body.adjust);
    return res.status(200).send('Success');
});

app.post('/effect', async (req: Request, res: Response) => {
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
