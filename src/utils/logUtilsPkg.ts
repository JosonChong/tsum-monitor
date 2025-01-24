// removed log4js dependency due to its conflit with pkg
import moment from 'moment';
import cliColor from 'cli-color';

export let inMemoryLogs: {}[] = [];

export function log(message: string) {
    let now = new Date().getTime();
    console.log(cliColor.green(moment(now).format('DD/MM HH:mm:ss')) + " " + message);
    addInMemoryLog(message, "info");
}

export function logError(message: string) {
    let now = new Date().getTime();
    console.log(cliColor.red(moment(now).format('DD/MM HH:mm:ss')) + " " + message);
    addInMemoryLog(message, "error");
}

function addInMemoryLog(message: string, level: string) {
    let now = new Date().getTime();
    inMemoryLogs.push({
        "timestamp": moment(now).format('DD/MM HH:mm:ss'),
        "message": message,
        "level": level
    });

    if (inMemoryLogs.length > 1000) {
        inMemoryLogs.shift();
    }
}