import { logError } from "../utils/logUtils";
import * as path from 'path';
import * as util from 'util';
const exec = util.promisify(require('child_process').exec);

const assetsDir = path.resolve(__dirname, '../../assets');

export class Emulator {

    accountName?: string;

    deviceNames?: string[];

    emulatorName?: string;

    startupCommand?: string;

    startGameBeginTime?: Date; 

    startGameTimeLimit: number = 3;

    startEmulatorBeginTime?: Date; 

    startEmulatorTimeLimit: number = 1.5;

    getAdbPath(): string {
        return '';
    }

    async connectAdb(deviceName: string){
        try {
			await exec(`"${this.getAdbPath()}" connect ${deviceName}`);
        } catch (error) {
            logError(`Encountered error when starting service: ${error}`);
        }
    }
    
    async killGame() {}

    async startGame() {}

    async killEmulator() {}

    async startEmulator() {}

    async runStartupCommand() {}

    async minimizeEmulator() {
        if (!this.emulatorName) {
            logError("Need emualtor name to minimize emulator.");

            return;
        }

        try {            
            await exec(`${assetsDir}/windowMode -title "${this.emulatorName}" -mode minimized`);
        } catch (error) {
            logError(`Unable to minimize emulator, error: ${error}`);
        }
    }

    async restoreEmulator() {
        if (!this.emulatorName) {
            logError("Need emualtor name to restore emulator.");

            return;
        }
        
        try {            
            await exec(`${assetsDir}/windowMode -title "${this.emulatorName}" -mode normal`);
        } catch (error) {
            logError(`Unable to restore emulator, error: ${error}`);
        }
    }

}