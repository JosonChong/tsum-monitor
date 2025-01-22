import { EmulatorInstance } from './EmulatorInstance';
import util from 'util';
const exec = util.promisify(require('child_process').exec);

export class LdPlayerInstance extends EmulatorInstance {

    instanceName: string;
    
    deviceNames: string[]

    constructor(instanceName: string, deviceNames: string[]) {
        super();
        this.instanceName = instanceName;
        this.deviceNames = deviceNames;
    }
    
    async killGame() {
        await exec(`C:/LDPlayer/LDPlayer64/ldconsole.exe killapp --name ${this.instanceName} --packagename com.linecorp.LGTMTM`);
    }

    async startGame() {
        this.startGameBeginTime = new Date();

        await new Promise(f => setTimeout(f, 1000));

        await exec(`C:/LDPlayer/LDPlayer64/dnconsole.exe action --name ${this.instanceName} --key call.keyboard --value home`);

        await new Promise(f => setTimeout(f, 1000));

        await exec(`C:/LDPlayer/LDPlayer64/ldconsole.exe runapp --name ${this.instanceName} --packagename com.linecorp.LGTMTM`);

        await new Promise(f => setTimeout(f, 60000));

        await exec(`C:/LDPlayer/LDPlayer64/ldconsole.exe action --name ${this.instanceName} --key call.gravity --value -320,200,0`);
    }

    async restartGame() {
        await this.killGame();

        await this.startGame();
    }

    async killInstance(){
        await exec(`C:/LDPlayer/LDPlayer64/ldconsole.exe quit --name ${this.instanceName}`);
    }

    async startInstance() {
        this.startInstanceBeginTime = new Date();

        await exec(`C:/LDPlayer/LDPlayer64/ldconsole.exe launchex --name ${this.instanceName} --packagename com.r2studio.robotmon`);

        await new Promise(f => setTimeout(f, 20000));

        for (let deviceName of this.deviceNames) {
            this.startService(deviceName);
        }
    }

    async startService(deviceName: string){
        try {
			console.log(`starting service for ${deviceName}...`);
			
            await exec(`C:/LDPlayer/LDPlayer64/adb.exe -s ${deviceName} shell nohup sh -c "'LD_LIBRARY_PATH=/system/lib:/data/data/com.r2studio.robotmon/lib:/data/app/com.r2studio.robotmon-1/lib:/data/app/com.r2studio.robotmon-1/lib/x86 CLASSPATH=/data/app/com.r2studio.robotmon-1/base.apk app_process32 /system/bin com.r2studio.robotmon.Main $@' > /dev/null 2> /dev/null && sleep 1 &"`);
        } catch (error) {}
    }

    async restartInstance() {
        await this.killInstance();

        await new Promise(f => setTimeout(f, 5000));

        await this.startInstance();
    }

}