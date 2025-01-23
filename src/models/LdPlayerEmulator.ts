import { log, logError } from '../utils/logUtils';
import { Emulator } from './Emulator';
import path from 'path';
import util from 'util';
const exec = util.promisify(require('child_process').exec);

const resourcesDir = path.resolve(__dirname, '../../resources');

export class LdPlayerEmulator extends Emulator {

    emulatorName: string;

    installPath: string = 'C:/LDPlayer/LDPlayer64';

    constructor(emulatorName: string, deviceNames: string[], installPath?: string, startupCommand?: string) {
        super();
        this.emulatorName = emulatorName;
        this.deviceNames = deviceNames;

        if (installPath) {
            this.installPath = installPath;
        }

        if (startupCommand) {
            this.startupCommand = startupCommand;
        }
    }
    
    async killGame() {
        await exec(`${this.installPath}/ldconsole.exe killapp --name ${this.emulatorName} --packagename com.linecorp.LGTMTM`);
    }

    async startGame() {
        this.startGameBeginTime = new Date();

        await new Promise(f => setTimeout(f, 1000));

        await exec(`${this.installPath}/dnconsole.exe action --name ${this.emulatorName} --key call.keyboard --value home`);

        await new Promise(f => setTimeout(f, 1000));

        await exec(`${this.installPath}/ldconsole.exe runapp --name ${this.emulatorName} --packagename com.linecorp.LGTMTM`);

        if (this.startupCommand) {
            const transformedCommand = this.startupCommand.replace("<installPath>", this.installPath).replace("<emulatorName>", this.emulatorName);

            log(`Going to run startup command on LdPlayer ${this.emulatorName} after 60 seconds.`);

            await new Promise(f => setTimeout(f, 60000));

            log(`Running command on LdPlayer ${this.emulatorName}: ${transformedCommand}`);

            await exec(transformedCommand);
        }
    }

    async restartGame() {
        await this.killGame();

        await this.startGame();
    }

    async killEmulator(){
        await exec(`${this.installPath}/ldconsole.exe quit --name ${this.emulatorName}`);
    }

    async startEmulator() {
        this.startEmulatorBeginTime = new Date();

        await exec(`${this.installPath}/ldconsole.exe launchex --name ${this.emulatorName} --packagename com.r2studio.robotmon`);

        await new Promise(f => setTimeout(f, 24000));

        for (let deviceName of this.deviceNames) {
            this.startService(deviceName);
        }
    }

    async startService(deviceName: string){
        try {
			log(`starting service for ${deviceName}...`);
			
            await exec(`${this.installPath}/adb.exe -s ${deviceName} shell nohup sh -c "'LD_LIBRARY_PATH=/system/lib:/data/data/com.r2studio.robotmon/lib:/data/app/com.r2studio.robotmon-1/lib:/data/app/com.r2studio.robotmon-1/lib/x86 CLASSPATH=/data/app/com.r2studio.robotmon-1/base.apk app_process32 /system/bin com.r2studio.robotmon.Main $@' > /dev/null 2> /dev/null && sleep 1 &"`);
        } catch (error) {
            logError(`Encountered error when starting service: ${error}`);
        }
    }

    async restartEmulator() {
        await this.killEmulator();

        await new Promise(f => setTimeout(f, 5000));

        await this.startEmulator();
    }

    async minimizeEmulator() {
        await exec(`${resourcesDir}/windowMode -title "${this.emulatorName}" -mode minimized`);
    }

    async restoreEmulator() {
        await exec(`${resourcesDir}/windowMode -title "${this.emulatorName}" -mode normal`);
    }

}