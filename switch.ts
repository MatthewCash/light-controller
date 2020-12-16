import { SwitchController } from './SwitchController';

interface SwitchSetup {
    switchIps: string | string[];
    bulbIps: string | string[];
}

const switchSetups: SwitchSetup[] = [
    {
        switchIps: '192.168.1.183',
        bulbIps: ['192.168.1.209', '192.168.1.151']
    }
];

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
