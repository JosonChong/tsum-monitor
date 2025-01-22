import { log, logError } from '../utils/logUtils';
import { EmulatorInstance } from './EmulatorInstance';
import util from 'util';
const exec = util.promisify(require('child_process').exec);

export class MumuPlayerInstance extends EmulatorInstance {

    instanceId: string;
    
    deviceNames: string[]

    constructor(instanceId: string, deviceNames: string[]) {
        super();
        this.instanceId = instanceId;
        this.deviceNames = deviceNames;
    }
    
    async killGame() {
        try {
            await exec(`"C:/Program Files/MuMu Player 12/shell/MuMuManager.exe" control -v ${this.instanceId} app close -pkg com.linecorp.LGTMTM`);
        } catch (error) {
            logError(`Encountered error when killing game: ${error}`);
        }
    }

    async startGame() {
        this.startGameBeginTime = new Date();

        await new Promise(f => setTimeout(f, 1000));

        await exec(`"C:/Program Files/MuMu Player 12/shell/MuMuManager.exe" control -v ${this.instanceId} tool func -n go_home`);

        await new Promise(f => setTimeout(f, 1000));

        await exec(`"C:/Program Files/MuMu Player 12/shell/MuMuManager.exe" control -v ${this.instanceId} app launch -pkg com.linecorp.LGTMTM`);
    }

    async restartGame() {
        await this.killGame();

        await this.startGame();
    }

    async killInstance(){
        await exec(`"C:/Program Files/MuMu Player 12/shell/MuMuManager.exe" control -v ${this.instanceId} shutdown`);
    }

    async startInstance() {
        this.startInstanceBeginTime = new Date();

        await exec(`"C:/Program Files/MuMu Player 12/shell/MuMuManager.exe" control -v ${this.instanceId} launch -pkg com.r2studio.robotmon`);

        await new Promise(f => setTimeout(f, 20000));

        for (let deviceName of this.deviceNames) {
            this.startService(deviceName);
        }
    }

    async startService(deviceName: string){
        try {
			log(`starting service for ${deviceName}...`);
			
            await exec(`"C:/Program Files/MuMu Player 12/shell/adb.exe" -s ${deviceName} shell nohup sh -c "'LD_LIBRARY_PATH=/system/lib:/data/data/com.r2studio.robotmon/lib:/data/app/~~rXsxvLiK9gVsdhrjyD5VFQ==/com.r2studio.robotmon-Li83vmg8rtG0L2OuGy4_3Q==/lib:/data/app/~~rXsxvLiK9gVsdhrjyD5VFQ==/com.r2studio.robotmon-Li83vmg8rtG0L2OuGy4_3Q==/lib/x86 CLASSPATH=/data/app/~~rXsxvLiK9gVsdhrjyD5VFQ==/com.r2studio.robotmon-Li83vmg8rtG0L2OuGy4_3Q==/base.apk app_process32 /system/bin com.r2studio.robotmon.Main $@' > /dev/null 2> /dev/null && sleep 1 &"`);
        } catch (error) {}
    }

    async restartInstance() {
        await this.killInstance();

        await new Promise(f => setTimeout(f, 5000));

        await this.startInstance();
    }

}