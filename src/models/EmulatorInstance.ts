import * as dateUtil from '../utils/dateUtils';

export class EmulatorInstance {

    accountName: string;

    startGameBeginTime?: Date; 

    startGameTimeLimit: number = 3;

    startInstanceBeginTime?: Date; 

    startInstanceTimeLimit: number = 2;
    
    async killGame() {}

    async startGame() {}

    async restartGame() {}

    async killInstance() {}

    async startInstance() {}

    async restartInstance() {}

}