import { log, logError } from '../utils/logUtils';
import { Emulator } from './Emulator';
import * as util from 'util';
const exec = util.promisify(require('child_process').exec);

export class MumuPlayerEmulator extends Emulator {

    emulatorId: string;

    emulatorName?: string;
    
    declare deviceNames: string[];

    installPath: string = 'C:/Program Files/MuMu Player 12';

    constructor(emulatorId: string, deviceNames: string[], emulatorName?: string, installPath?: string, startupCommand?: string, addStartRobotmonScript?: boolean) {
        super();
        this.emulatorId = emulatorId;
        this.deviceNames = deviceNames;

        if (emulatorName) {
            this.emulatorName = emulatorName;
        }

        if (installPath) {
            this.installPath = installPath;
        }

        if (startupCommand) {
            this.startupCommand = startupCommand;
        }

        if (addStartRobotmonScript !== undefined) {
            this.addStartRobotmonScript = addStartRobotmonScript;
        }
    }

    getAdbPath(): string {
        return `${this.installPath}/shell/adb.exe`;
    }
    
    async killGame() {
        try {
            await exec(`"${this.installPath}/shell/MuMuManager.exe" control -v ${this.emulatorId} app close -pkg com.linecorp.LGTMTM`);
        } catch (error) {
            logError(`Unable to kill game, error: ${error}`);
        }
    }

    async returnToHome() {
        try {
            await exec(`"${this.installPath}/shell/MuMuManager.exe" control -v ${this.emulatorId} tool func -n go_home`);
        } catch (error) {
            logError(`Unable to return to home, error: ${error}.`);
        }
    }

    async launchGame() {
        await exec(`"${this.installPath}/shell/MuMuManager.exe" control -v ${this.emulatorId} app launch -pkg com.linecorp.LGTMTM`);
    }

    async runCommand(command: string, startup: boolean = false) {
        try {
            const transformedCommand = command
                    .replace("<installPath>", this.installPath)
                    .replace("<emulatorId>", this.emulatorId)
                    .replace("<emulatorName>", this.emulatorName ? this.emulatorName : "");

            log(`Trying to run ${startup ? 'startup ' : ''}command on MuMuPlayer ${this.emulatorId}: ${transformedCommand}`);
    
            await exec(transformedCommand);
        } catch (error) {
            logError(`Unable to run command, error: ${error}`);
        }
    }

    async killEmulator(){
        try { 
            await exec(`"${this.installPath}/shell/MuMuManager.exe" control -v ${this.emulatorId} shutdown`);
        } catch (error) {
            logError(`Unable to kill emulator, error: ${error}`);
        }
    }

    async launchEmulator() {
        if (!this.emulatorId || !this.deviceNames) {
            throw new Error(`Can't start emulator because of no device id or device names.`);
        }

        await exec(`"${this.installPath}/shell/MuMuManager.exe" control -v ${this.emulatorId} launch -pkg com.r2studio.robotmon`);
    }

    async startService(deviceName: string){
        try {
			log(`starting service for ${deviceName}...`);
			
            await exec(`"${this.installPath}/shell/adb.exe" -s ${deviceName} shell nohup sh -c "'LD_LIBRARY_PATH=/system/lib:/data/data/com.r2studio.robotmon/lib:/data/app/~~rXsxvLiK9gVsdhrjyD5VFQ==/com.r2studio.robotmon-Li83vmg8rtG0L2OuGy4_3Q==/lib:/data/app/~~rXsxvLiK9gVsdhrjyD5VFQ==/com.r2studio.robotmon-Li83vmg8rtG0L2OuGy4_3Q==/lib/x86 CLASSPATH=/data/app/~~rXsxvLiK9gVsdhrjyD5VFQ==/com.r2studio.robotmon-Li83vmg8rtG0L2OuGy4_3Q==/base.apk app_process32 /system/bin com.r2studio.robotmon.Main $@' > /dev/null 2> /dev/null && sleep 1 &"`);
        } catch (error) {
            logError(`Encountered error when starting service: ${error}`);
        }
    }

}