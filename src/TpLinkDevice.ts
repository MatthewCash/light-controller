import dgram from 'dgram';
import { EventEmitter } from 'events';

export interface LightState {
    hue?: number;
    saturation?: number;
    brightness: number;
    colorTemp?: number;
    power: boolean;
}

export interface UpdateData {
    colorTemp?: number | 'cold' | 'warm' | 'neutral';
    hue?: number;
    saturation?: number;
    brightness?: number;
    power?: boolean;
    transitionSpeed?: number;
    retry?: number;
}

export class TpLinkDevice extends EventEmitter {
    readonly ip: string;
    constructor(ip: string) {
        super();
        this.ip = ip;
    }
    public static scan(broadcastAddr = '255.255.255.255') {
        const emitter = new EventEmitter();
        const client = dgram.createSocket({
            type: 'udp4',
            reuseAddr: true
        });
        client.bind(9998, undefined, () => {
            client.setBroadcast(true);
            const message = TpLinkDevice.encrypt(
                '{"system":{"get_sysinfo":{}}}'
            );
            client.send(message, 0, message.length, 9999, broadcastAddr);
        });
        client.on('message', (msg, rinfo) => {
            const device = new TpLinkDevice(rinfo.address);

            emitter.emit('new', device);
        });
        return emitter;
    }
    public static convertToLightState(data: any): LightState {
        return {
            hue: data.hue,
            saturation: data.saturation,
            brightness: data.brightness,
            colorTemp: data.color_temp,
            power: Boolean(data.on_off)
        };
    }
    public static encrypt(buffer: Buffer | string, key = 0xab) {
        if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
        for (let i = 0; i < buffer.length; i++) {
            const c = buffer[i];
            buffer[i] = c ^ key;
            key = buffer[i];
        }
        return buffer;
    }
    public static decrypt(buffer: Buffer, key = 0xab) {
        for (let i = 0; i < buffer.length; i++) {
            const c = buffer[i];
            buffer[i] = c ^ key;
            key = c;
        }
        return buffer;
    }
    private async sendData(data): Promise<any> {
        const client = dgram.createSocket({
            type: 'udp4',
            reuseAddr: true
        });

        const message = TpLinkDevice.encrypt(JSON.stringify(data));

        const decodedData = await new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    client.close();
                    reject(new Error('Request Timed Out!'));
                } catch (error) {
                    if (error?.message === 'Not running') return;
                    console.error(error);
                }
            }, 100);

            client.send(message, 0, message.length, 9999, this.ip, error => {
                if (error) {
                    client.close();
                    return reject(error);
                }
                client.once('message', message => {
                    client.close();
                    let decodedData;
                    try {
                        decodedData = JSON.parse(
                            TpLinkDevice.decrypt(message).toString()
                        );
                    } catch {
                        return reject(new Error('Could not parse payload!'));
                    }
                    resolve(decodedData);
                });
            });
        });

        return decodedData;
    }
    public async getStatus() {
        const data = await this.sendData({ system: { get_sysinfo: {} } });
        return data?.system?.get_sysinfo;
    }
    public async getLightingState(): Promise<LightState> {
        const data = await this.getStatus();
        return TpLinkDevice.convertToLightState(data?.light_state);
    }
    public async updateState(updateData: UpdateData) {
        if (!updateData) throw new Error('No update data provided!');

        let retry = updateData.retry ?? 4;
        const transitionSpeed = updateData.transitionSpeed ?? 1000;

        let payload: any = {
            ignore_default: 1,
            transition_period: transitionSpeed
        };

        if (updateData.power != null) {
            payload.on_off = updateData.power ? 1 : 0;
        }
        if (updateData.brightness != null) {
            let brightness = updateData.brightness;

            if (brightness < 0) brightness = 0;
            if (brightness > 100) brightness = 100;

            payload.brightness = Math.round(brightness);
        }
        if (updateData.colorTemp != null) {
            let colorTemp = updateData.colorTemp;

            if (colorTemp === 'warm') colorTemp = 2700;
            if (colorTemp === 'neutral') colorTemp = 6500;
            if (colorTemp === 'cold') colorTemp = 9000;

            if (colorTemp < 2500) colorTemp = 2500;
            if (colorTemp > 9000) colorTemp = 9000;

            payload.color_temp = Math.round(colorTemp);
        }
        if (updateData.hue != null) {
            let hue = Math.round(updateData.hue);

            if (hue < 0) hue = 0;
            if (hue > 360) hue = 360;

            payload.color_temp = 0;
            payload.hue = hue;
        }
        if (updateData.saturation != null) {
            let saturation = updateData.saturation;

            if (saturation < 0) saturation = 0;
            if (saturation > 100) saturation = 100;

            payload.color_temp = 0;
            payload.saturation = Math.round(saturation);
        }

        let data;
        do {
            data = await this.sendData({
                'smartlife.iot.smartbulb.lightingservice': {
                    transition_light_state: payload
                }
            }).catch(() => null);
            if (data) break;
            retry--;
        } while (retry > 0);

        return data;
    }

    public async setRelayPower(powerState: boolean) {
        return this.sendData({
            system: {
                set_relay_state: {
                    state: powerState ? 1 : 0
                }
            }
        });
    }
}
