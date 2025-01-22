import { log, logError } from '../utils/logUtils';
import { Emulator } from './Emulator';
import util from 'util';
const exec = util.promisify(require('child_process').exec);

export class MumuPlayerEmulator extends Emulator {

    emulatorId: string;
    
    deviceNames: string[];

    installPath: string = 'C:/Program Files/MuMu Player 12';

    constructor(emulatorId: string, deviceNames: string[], installPath?: string, startupCommand?: string) {
        super();
        this.emulatorId = emulatorId;
        this.deviceNames = deviceNames;

        if (installPath) {
            this.installPath = installPath;
        }

        if (startupCommand) {
            this.startupCommand = startupCommand;
        }
    }
    
    async killGame() {
        try {
            await exec(`"${this.installPath}/shell/MuMuManager.exe" control -v ${this.emulatorId} app close -pkg com.linecorp.LGTMTM`);
        } catch (error) {
            logError(`Encountered error when killing game: ${error}`);
        }
    }

    async startGame() {
        this.startGameBeginTime = new Date();

        await new Promise(f => setTimeout(f, 1000));

        await exec(`"${this.installPath}/shell/MuMuManager.exe" control -v ${this.emulatorId} tool func -n go_home`);

        await new Promise(f => setTimeout(f, 1000));

        await exec(`"${this.installPath}/shell/MuMuManager.exe" control -v ${this.emulatorId} app launch -pkg com.linecorp.LGTMTM`);

        if (this.startupCommand) {
            const transformedCommand = this.startupCommand.replace("<installPath>", this.installPath).replace("<emulatorId>", this.emulatorId);

            log(`Going to run startup command on MuMuPlayer ${this.emulatorId} after 60 seconds.`);

            await new Promise(f => setTimeout(f, 60000));

            log(`Running command on MuMuPlayer ${this.emulatorId}: ${transformedCommand}`);
            
            await exec(transformedCommand);
        }
    }

    async restartGame() {
        await this.killGame();

        await this.startGame();
    }

    async killEmulator(){
        await exec(`"${this.installPath}/shell/MuMuManager.exe" control -v ${this.emulatorId} shutdown`);
    }

    async startEmulator() {
        this.startEmulatorBeginTime = new Date();

        await exec(`"${this.installPath}/shell/MuMuManager.exe" control -v ${this.emulatorId} launch -pkg com.r2studio.robotmon`);

        await new Promise(f => setTimeout(f, 20000));

        for (let deviceName of this.deviceNames) {
            this.startService(deviceName);
        }
    }

    async startService(deviceName: string){
        try {
			log(`starting service for ${deviceName}...`);
			
            await exec(`"${this.installPath}/shell/adb.exe" -s ${deviceName} shell nohup sh -c "'LD_LIBRARY_PATH=/system/lib:/data/data/com.r2studio.robotmon/lib:/data/app/~~rXsxvLiK9gVsdhrjyD5VFQ==/com.r2studio.robotmon-Li83vmg8rtG0L2OuGy4_3Q==/lib:/data/app/~~rXsxvLiK9gVsdhrjyD5VFQ==/com.r2studio.robotmon-Li83vmg8rtG0L2OuGy4_3Q==/lib/x86 CLASSPATH=/data/app/~~rXsxvLiK9gVsdhrjyD5VFQ==/com.r2studio.robotmon-Li83vmg8rtG0L2OuGy4_3Q==/base.apk app_process32 /system/bin com.r2studio.robotmon.Main $@' > /dev/null 2> /dev/null && sleep 1 &"`);
        } catch (error) {}
    }

    async restartEmulator() {
        await this.killEmulator();

        await new Promise(f => setTimeout(f, 5000));

        await this.startEmulator();
    }

}