import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { bulbs, status } from '../main';
import { setColor } from '../commands/setColor';
import { setCycle } from '../commands/setCycle';
import { setPower } from '../commands/setPower';
import { setSpeed } from '../commands/setSpeed';
import { setWhite } from '../commands/setWhite';
import { setBrightness } from '../commands/setBrightness';

const app = express();

export const startHttpServer = () => {
    app.listen(1729, '0.0.0.0');
};

app.use(bodyParser.json());
app.use(
    cors({
        origin: (origin, callback) => {
            if (
                [
                    'http://localhost:8080',
                    'http://192.168.1.203:8080',
                    'http://127.0.0.1',
                    'https://matthewcash.github.io'
                ].includes(origin)
            )
                return callback(null, true);
            if (!origin) return callback(null, true);
            console.log(origin + ' failed CORS!');
            return callback(new Error('Not allowed by CORS'));
        }
    })
);

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

app.post('/cycle', (req: Request, res: Response) => {
    if (req.body?.cycle == null)
        return res.status(400).send('Cycle status not specified!');
    setCycle(req.body.cycle);
    return res.status(200).send('Success');
});

app.post('/brightness', (req: Request, res: Response) => {
    if (req.body?.brightness == null)
        return res.status(400).send('Brightness not specified!');
    setBrightness(req.body.brightness, req.body.adjust);
    return res.status(200).send('Success');
});

app.post('/speed', (req: Request, res: Response) => {
    if (req.body?.speed == null)
        return res.status(400).send('Speed not specified!');
    setSpeed(req.body.speed);
    return res.status(200).send('Success');
});
