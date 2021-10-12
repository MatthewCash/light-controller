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

                let success = false;

                while (!success) {
                    try {
                        await switchController.connect();
                        success = true;
                    } catch {
                        success = false;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                switchController.startPolling();
                resolve();
            })
    );

    await Promise.all(switchSetupPromises);

    console.log('Switch Controllers connected!');
};
