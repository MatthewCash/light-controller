import TPLSmartDevice from 'tplink-lightbulb';
import { togglePower } from './commands/togglePower';

const switchIp = '192.168.1.183';

let lightSwitch;

export const startSwitchMonitoring = async () => {
    lightSwitch = new TPLSmartDevice(switchIp);
    const info = await lightSwitch.info();
    if (info.alias !== "Matthew's Lights") return;
    console.log('Connected to Switch: ' + info.alias);

    setInterval(pollSwitch, 10);
};

const pollSwitch = async () => {
    const data = await lightSwitch.info();

    if (data.relay_state === 1) return;
    console.log('Setting switch to ON');
    lightSwitch.power(true);
    togglePower();
    // if (status.cycl
};
