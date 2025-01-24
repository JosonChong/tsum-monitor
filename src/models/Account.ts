import * as dateUtil from '../utils/dateUtils';
import { log, logError } from '../utils/logUtils';
import { Emulator } from './Emulator';

export class Account {
    
    accountName: string;
    
    lastAlive?: Date;

    notifiedDeath?: boolean;

    discordUserId?: string;

    deathThreshold: number = 20;

    emulator?: Emulator;

    constructor(accountName: string, discordUserId?: string, emulator?: Emulator, deathThreshold?: number) {
        this.accountName = accountName;

        if (discordUserId) {
            this.discordUserId = discordUserId;
        }

        if (emulator) {
            this.emulator = emulator;
        }

        if (deathThreshold) {
            this.deathThreshold = deathThreshold;
        }
    }

    reportAlive(): void {
        this.lastAlive = new Date();
        this.notifiedDeath = false;
    }

    isDead(): boolean {
        return !!this.lastAlive && dateUtil.timePastInMinutes(this.lastAlive) > this.deathThreshold;
    }

    isStartingGame(): boolean {
        return !!(this.emulator?.startGameBeginTime);
    }

    isStartingEmulator(): boolean {
        return !!(this.emulator?.startEmulatorBeginTime);
    }

    startGameFailed(): boolean {
        if (this.isStartingGame()) {
            return dateUtil.timePastInMinutes(this.emulator!.startGameBeginTime!) > this.emulator!.startGameTimeLimit;
        }
        
        return false;
    }

    startEmulatorFailed(): boolean {
        if (this.isStartingEmulator()) {
            return dateUtil.timePastInMinutes(this.emulator!.startEmulatorBeginTime!) > this.emulator!.startEmulatorTimeLimit;
        }
        
        return false;
    }

    async killGame() {
        if (!this.emulator) {
            return;
        }

        this.lastAlive = undefined;
        log(`Trying to kill game for ${this.accountName}.`);

        this.emulator!.killGame();
    }

    async startGame() {
        if (!this.emulator) {
            return;
        }

        log(`Trying to start game for ${this.accountName}.`);
        this.emulator!.startGame();
    }

    async restartGame() {
        await this.killGame();

        await this.startGame();
    }

    async runStartupCommand() {
        if (!this.emulator) {
            return;
        }

        await new Promise(f => setTimeout(f, 3000));

        log(`Trying to run startup command for ${this.accountName}.`);

        this.emulator!.runStartupCommand();
    }

    async killEmulator() {
        if (!this.emulator) {
            return;
        }

        this.lastAlive = undefined;

        log(`Trying to kill emulator for ${this.accountName}.`);

        this.emulator!.killEmulator();
    }

    async startEmulator() {
        if (!this.emulator) {
            return;
        }

        log(`Trying to start emulator for ${this.accountName}.`);
        this.emulator!.startEmulator();
    }

    async restartEmulator() {
        await this.killEmulator();

        await new Promise(f => setTimeout(f, 5000));

        await this.startEmulator();
    }

    async minimizeEmulator() {
        try {
            log(`Trying to minimize emulator for ${this.accountName}.`);
                        
            this.emulator?.minimizeEmulator();
        } catch (error) {
            logError(`Unable to minimize emulator, error: ${error}`);
        }
    }

    async restoreEmulator() {
        try {
            log(`Trying to restore emulator for ${this.accountName}.`);

            this.emulator?.restoreEmulator();
        } catch (error) {
            logError(`Unable to restore emulator, error: ${error}`);
        }
    }

}