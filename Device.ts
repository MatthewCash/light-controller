import dgram from 'dgram';
import { EventEmitter } from 'events';

export interface LightState {
    hue?: number;
    saturation?: number;
    brightness: number;
    colorTemp?: number;
    power: boolean;
}

export class SmartDevice extends EventEmitter {
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
            const message = SmartDevice.encrypt(
                '{"system":{"get_sysinfo":{}}}'
            );
            client.send(message, 0, message.length, 9999, broadcastAddr);
        });
        client.on('message', (msg, rinfo) => {
            const device = new SmartDevice(rinfo.address);

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
            power: data.on_off
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

        const message = SmartDevice.encrypt(JSON.stringify(data));

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
                            SmartDevice.decrypt(message).toString()
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
        return SmartDevice.convertToLightState(data?.light_state);
    }
    public async setLighting(lightingData, retry = 4) {
        let data;
        do {
            data = await this.sendData({
                'smartlife.iot.smartbulb.lightingservice': {
                    transition_light_state: lightingData
                }
            }).catch(() => null);
            if (data) break;
            retry--;
        } while (retry > 0);

        return data;
    }
    public async setColor(
        hue: number,
        saturation = 100,
        brightness?: number,
        transitionSpeed = 100,
        setPower = true,
        retry?: number
    ) {
        const lightingData = {
            on_off: true,
            ignore_default: 1,
            hue,
            saturation,
            color_temp: 0,
            transition_period: transitionSpeed,
            ...(brightness !== null ? { brightness } : null),
            ...(setPower ? { on_off: true } : null)
        };

        return this.setLighting(lightingData, retry);
    }
    public async setBrightness(
        brightness?: number,
        transitionSpeed = 100,
        setPower = false,
        retry?: number
    ) {
        const lightingData = {
            on_off: true,
            ignore_default: 1,
            transition_period: transitionSpeed,
            brightness,
            ...(setPower ? { on_off: true } : null)
        };

        return this.setLighting(lightingData, retry);
    }
    public async setWhite(
        temperature = 9000,
        setPower = true,
        transitionSpeed = 100,
        retry?: number
    ) {
        return this.setLighting(
            {
                ignore_default: 1,
                on_off: setPower,
                color_temp: temperature,
                transition_period: transitionSpeed
            },
            retry
        );
    }
    public async setLightingPower(powerState: boolean, transitionSpeed = 1000) {
        return this.sendData({
            'smartlife.iot.smartbulb.lightingservice': {
                transition_light_state: {
                    ignore_default: 1,
                    on_off: powerState ? 1 : 0,
                    transition_period: transitionSpeed
                }
            }
        });
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
