import { SwitchController } from './SwitchController';
import config from './config.json';

interface SwitchSetup {
    switchIps: string | string[];
    bulbIps: string | string[];
}

const switchSetups: SwitchSetup[] = config.switchSetups;

export const startSwitchMonitoring = async () => {
    const switchSetupPromises = switchSetups.map(
        switchSetup =>
            new Promise<void>(async resolve => {
                const switchController = new SwitchController(
                    switchSetup.switchIps,
                    switchSetup.bulbIps
                );
                await switchController.connect();
                switchController.startPolling();
                resolve();
            })
    );

    await Promise.all(switchSetupPromises);

    console.log('Switch Controllers connected!');
};
