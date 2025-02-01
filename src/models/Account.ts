import * as dateUtil from '../utils/dateUtils';
import { log, logError } from '../utils/logUtils';
import { Emulator } from './Emulator';

export class Account {
    
    accountName: string;
    
    lastAlive?: Date;

    notifiedDeath?: boolean;

    discordUserId?: string;

    deathThreshold: number = 20;

    status: string;

    lastUpdate?: Date;

    emulator?: Emulator;

    paused: boolean = false;

    gameRestartAttempts: number = 0;

    emulatorRestartAttempts: number = 0;

    maxGameRestarts: number = 3;

    maxEmulatorRestarts: number = 3;

    constructor(accountName: string, discordUserId?: string, emulator?: Emulator, deathThreshold?: number, maxGameRestarts?: number, maxEmulatorRestarts?: number) {
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

        if (maxGameRestarts) {
            this.maxGameRestarts = maxGameRestarts;
        }

        if (maxEmulatorRestarts) {
            this.maxEmulatorRestarts = maxEmulatorRestarts;
        }

        this.status = "Unknown";
    }

    updateStatus(status: string) {
        this.status = status;
        this.lastUpdate = new Date();
        // Emit status update event or call callback
        if (this.onStatusUpdate) {
            this.onStatusUpdate(this);
        }
    }

    // Add a callback property for status updates
    onStatusUpdate?: (account: Account) => void;

    reportAlive(): void {
        this.lastAlive = new Date();
        this.notifiedDeath = false;
        this.updateStatus("Online");
    }

    resetRestartAttempts(): void {
        this.gameRestartAttempts = 0;
        this.emulatorRestartAttempts = 0;
        if (this.emulator) {
            this.emulator.startGameBeginTime = undefined;
            this.emulator.startEmulatorBeginTime = undefined;
        }
    }

    isDead(): boolean {
        if (this.paused) return false;
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

        log(`Killing game for ${this.accountName}...`);
        await this.emulator.killGame();
        this.lastAlive = undefined;
        this.emulator.startGameBeginTime = undefined;
        this.paused = false;
        this.updateStatus("Offline");
    }

    async startGame(suppressLog: boolean = false) {
        if (!this.emulator) {
            return;
        }

        if (!suppressLog) {
            log(`Starting game for ${this.accountName}...`);
        }
        this.updateStatus("Starting Game");
        this.emulator.startGameBeginTime = new Date();
        await this.emulator.startGame();
    }

    async restartGame(manuallyTriggered: boolean = false) {
        if (!this.emulator) {
            return;
        }

        if (manuallyTriggered) {
            this.resetRestartAttempts();
        }

        this.gameRestartAttempts++;

        log(`Restarting game for ${this.accountName} (attempt ${this.gameRestartAttempts}/${this.maxGameRestarts})...`);
        this.updateStatus("Restarting Game");
        await this.emulator.killGame();
        this.lastAlive = undefined;
        await this.emulator.startGame();
    }

    async runStartupCommand() {
        console.log("runStartupCommand");
        if (!this.emulator || !this.emulator.startupGravity) {
            return;
        }

        console.log(this.emulator.startupGravity);

        await this.emulator.changeGravity(this.emulator.startupGravity);
    }

    async killEmulator() {
        if (!this.emulator) {
            return;
        }

        log(`Killing emulator for ${this.accountName}...`);
        await this.emulator.killEmulator();
        this.lastAlive = undefined;
        this.emulator.startGameBeginTime = undefined;
        this.emulator.startEmulatorBeginTime = undefined;
        this.paused = false;
        this.updateStatus("Offline");
    }

    async startEmulator() {
        if (!this.emulator) {
            return;
        }

        log(`Starting emulator for ${this.accountName}...`);
        this.updateStatus("Starting Emulator");
        this.emulator.startEmulatorBeginTime = new Date();
        await this.emulator.startEmulator();
    }

        async restartEmulator(manuallyTriggered: boolean = false) {
        if (!this.emulator) {
            return;
        }

        if (manuallyTriggered) {
            this.resetRestartAttempts();
        }

        this.emulatorRestartAttempts++;

        log(`Restarting emulator for ${this.accountName} (attempt ${this.emulatorRestartAttempts}/${this.maxEmulatorRestarts})...`);
        this.updateStatus("Restarting Emulator");
        await this.emulator.killEmulator();
        this.lastAlive = undefined;
        await new Promise(f => setTimeout(f, 2000));
        await this.emulator.startEmulator();
    }

    async minimizeEmulator() {
        if (!this.emulator) {
            return;
        }

        log(`Minimizing emulator for ${this.accountName}...`);
        await this.emulator.minimizeEmulator();
    }

    async restoreEmulator() {
        if (!this.emulator) {
            return;
        }

        log(`Restoring emulator for ${this.accountName}...`);
        await this.emulator.restoreEmulator();
    }

    togglePause() {
        if (!this.paused && (this.status === "Unknown" || this.status === "Offline")) {
            log(`Cannot pause ${this.accountName} while ${this.status}`);
            return;
        }

        this.paused = !this.paused;
        log(`${this.accountName} is ${this.paused ? 'paused' : 'resumed'}`);

        if (this.paused) {
            this.updateStatus("Paused");
            return;
        }

        let status;
        if (this.emulator) {
            if (this.emulator.startEmulatorBeginTime) {
                this.emulator.startEmulatorBeginTime = new Date();
                status = "Starting Emulator";
            }   

            if (this.emulator.startGameBeginTime) {
                this.emulator.startGameBeginTime = new Date();
                status = "Starting Game";
            }
        }

        if (!status) {
            this.lastAlive = new Date();
            status = "Resumed";
        }

        this.updateStatus(status);
    }

}