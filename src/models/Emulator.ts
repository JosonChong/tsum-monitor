import { logError } from "../utils/logUtils";

export class Emulator {

    accountName: string;

    deviceNames: string[];

    startupCommand: string;

    startGameBeginTime?: Date; 

    startGameTimeLimit: number = 3;

    startEmulatorBeginTime?: Date; 

    startEmulatorTimeLimit: number = 2;
    
    async killGame() {}

    async startGame() {}

    async restartGame() {}

    async killEmulator() {}

    async startEmulator() {}

    async restartEmulator() {}

    async minimizeEmulator() {
        logError("This emulator doesn't support minimizing.");
    }

    async restoreEmulator() {
        logError("This emulator doesn't support showing.");
    }

}