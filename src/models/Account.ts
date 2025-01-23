import * as dateUtil from '../utils/dateUtils';
import { Emulator } from './Emulator';

export class Account {
    
    accountName: string;
    
    lastAlive?: Date;

    notifiedDeath: boolean;

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
        if (this.lastAlive) {
            return dateUtil.timePastInMinutes(this.lastAlive) > this.deathThreshold;
        }
        
        return false;
    }

    isStartingGame(): boolean {
        return !!(this.emulator?.startGameBeginTime);
    }

    isStartingEmulator(): boolean {
        return !!(this.emulator?.startEmulatorBeginTime);
    }

    startGameFailed(): boolean {
        if (this.isStartingGame()) {
            return dateUtil.timePastInMinutes(this.emulator.startGameBeginTime) > this.emulator.startGameTimeLimit;
        }
        
        return false;
    }

    startEmulatorFailed(): boolean {
        if (this.isStartingEmulator) {
            return dateUtil.timePastInMinutes(this.emulator.startEmulatorBeginTime) > this.emulator.startEmulatorTimeLimit;
        }
        
        return false;
    }

    async killGame() {
        if (this.emulator) {
            this.lastAlive = null;

            this.emulator.killGame();
        }
    }

    async startGame() {
        if (this.emulator) {
            this.emulator.startGame();
        }
    }

    async restartGame() {
        if (this.emulator) {
            this.lastAlive = null;

            this.emulator.restartGame();
        }
    }

    async killEmulator() {
        if (this.emulator) {
            this.lastAlive = null;

            this.emulator.killEmulator();
        } 
    }

    async startEmulator() {
        if (this.emulator) {
            this.emulator.startEmulator();
        }
    }

    async restartEmulator() {
        if (this.emulator) {
            this.lastAlive = null;

            this.emulator.restartEmulator();
        }
    }

    async minimizeEmulator() {
        if (this.emulator) {
            this.emulator.minimizeEmulator();
        }
    }

    async restoreEmulator() {
        if (this.emulator) {
            this.emulator.restoreEmulator();
        }
    }

}