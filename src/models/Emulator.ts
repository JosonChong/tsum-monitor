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

    async returnToHome() {}

    async launchGame() {}

    async startGame() {
        try {
            this.startGameBeginTime = new Date();

            await new Promise(f => setTimeout(f, 1000));

            await this.returnToHome();

            await new Promise(f => setTimeout(f, 1000));

            await this.launchGame();
        } catch (error) {
            logError(`Unable to start game, error: ${error}`);
        }
    }

    async killEmulator() {}

    async launchEmulator() {}

    async startService(deviceName: string) {}

    async startServiceForAllDevices() {
        for (let deviceName of this.deviceNames!) {
            this.startService(deviceName);
        }
    }

    async startEmulator() {
        try {
            this.startEmulatorBeginTime = new Date();

            await this.launchEmulator();

            await new Promise(f => setTimeout(f, 20000));

            for (let deviceName of this.deviceNames!) {
                this.connectAdb(deviceName);
            }

            await new Promise(f => setTimeout(f, 2000));

            this.startServiceForAllDevices();
        } catch (error) {
            logError(`Unable to start emulator, error: ${error}`);
        }
    }

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