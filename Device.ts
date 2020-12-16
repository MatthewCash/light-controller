import dgram from 'dgram';
import { EventEmitter } from 'events';

export interface LightState {
    on_off: 0 | 1;
    mode: 'normal' | string;
    hue: number;
    saturation: number;
    color_temp: number;
    brightness: number;
}

export class SmartDevice extends EventEmitter {
    readonly ip: string;
    constructor(ip: string) {
        super();
        this.ip = ip;
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
            setTimeout(() => {
                try {
                    client.close();
                    reject(new Error('Request Timed Out!'));
                } catch (error) {
                    if (error?.message === 'Not running') return;
                    console.error(error);
                }
            }, 3000);

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
        return data?.light_state;
    }
    public async setLighting(lightingData) {
        return this.sendData({
            'smartlife.iot.smartbulb.lightingservice': {
                transition_light_state: lightingData
            }
        });
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
