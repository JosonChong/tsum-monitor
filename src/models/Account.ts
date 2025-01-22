import * as dateUtil from '../utils/dateUtils';
import { EmulatorInstance } from './EmulatorInstance';

export class Account {
    
    accountName: string;
    
    lastAlive?: Date;

    notifiedDeath: boolean;

    discordUserId?: string;

    deathThreshold: number = 15;

    emulatorInstance?: EmulatorInstance;

    constructor(accountName: string, discordUserId?: string, emulatorInstance?: EmulatorInstance, deathThreshold?: number) {
        this.accountName = accountName;

        if (discordUserId) {
            this.discordUserId = discordUserId;
        }

        if (emulatorInstance) {
            this.emulatorInstance = emulatorInstance;
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
        return !!(this.emulatorInstance?.startGameBeginTime);
    }

    isStartingInstance(): boolean {
        return !!(this.emulatorInstance?.startInstanceBeginTime);
    }

    startGameFailed(): boolean {
        if (this.isStartingGame()) {
            return dateUtil.timePastInMinutes(this.emulatorInstance.startGameBeginTime) > this.emulatorInstance.startGameTimeLimit;
        }
        
        return false;
    }

    startInstanceFailed(): boolean {
        if (this.isStartingInstance) {
            return dateUtil.timePastInMinutes(this.emulatorInstance.startInstanceBeginTime) > this.emulatorInstance.startInstanceTimeLimit;
        }
        
        return false;
    }

    async killGame() {
        if (this.emulatorInstance) {
            this.lastAlive = null;

            this.emulatorInstance.killGame();
        }
    }

    async startGame() {
        if (this.emulatorInstance) {
            this.emulatorInstance.startGame();
        }
    }

    async restartGame() {
        if (this.emulatorInstance) {
            this.lastAlive = null;

            this.emulatorInstance.restartGame();
        }
    }

    async killInstance() {
        if (this.emulatorInstance) {
            this.lastAlive = null;

            this.emulatorInstance.killInstance();
        } 
    }

    async startInstance() {
        if (this.emulatorInstance) {
            this.emulatorInstance.startInstance();
        }
    }

    async restartInstance() {
        if (this.emulatorInstance) {
            this.lastAlive = null;

            this.emulatorInstance.restartInstance();
        }
    }

}