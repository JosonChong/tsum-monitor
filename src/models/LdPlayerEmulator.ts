import { log, logError } from '../utils/logUtils';
import { Emulator } from './Emulator';
import * as util from 'util';
const exec = util.promisify(require('child_process').exec);

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

    getAdbPath(): string {
        return `${this.installPath}/adb.exe`;
    }
    
    async killGame() {
        try {
            await exec(`${this.installPath}/ldconsole.exe killapp --name ${this.emulatorName} --packagename com.linecorp.LGTMTM`);
        } catch (error) {
            logError(`Unable to kill game, error: ${error}`);
        }
    }

    async startGame() {
        try {
            this.startGameBeginTime = new Date();
    
            await new Promise(f => setTimeout(f, 1000));
    
            await exec(`${this.installPath}/dnconsole.exe action --name ${this.emulatorName} --key call.keyboard --value home`);
    
            await new Promise(f => setTimeout(f, 1000));
    
            await exec(`${this.installPath}/ldconsole.exe runapp --name ${this.emulatorName} --packagename com.linecorp.LGTMTM`);
        } catch (error) {
            logError(`Unable to start game, error: ${error}`);
        }
    }

    async runStartupCommand() {
        if (!this.startupCommand) {
            return;
        }

        try {
            const transformedCommand = this.startupCommand.replace("<installPath>", this.installPath).replace("<emulatorName>", this.emulatorName);
    
            log(`Trying to run command on LdPlayer ${this.emulatorName}: ${transformedCommand}`);
    
            await exec(transformedCommand);
        } catch (error) {
            logError(`Unable to run command, error: ${error}`);
        }
    }

    async killEmulator(){
        try {      
            await exec(`${this.installPath}/ldconsole.exe quit --name ${this.emulatorName}`);
        } catch (error) {
            logError(`Unable to kill emulator, error: ${error}`);
        }
    }

    async startEmulator() {
        if (!this.deviceNames) {
            logError(`Can't start emulator because of no device names.`);

            return;
        }

        try {    
            this.startEmulatorBeginTime = new Date();

            await exec(`${this.installPath}/ldconsole.exe launchex --name ${this.emulatorName} --packagename com.r2studio.robotmon`);

            await new Promise(f => setTimeout(f, 24000));

            for (let deviceName of this.deviceNames) {
                this.startService(deviceName);
            }
        } catch (error) {
            logError(`Unable to start emulator, error: ${error}`);
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

}