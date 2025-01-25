// removed log4js dependency due to its conflit with pkg
import moment from 'moment';
import cliColor from 'cli-color';
import WebSocket from 'ws';

export let inMemoryLogs: {}[] = [];
export let wsClients: Set<WebSocket>;

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


export function setWSClients(clients: Set<WebSocket>) {
    wsClients = clients;
}

function addInMemoryLog(message: string, level: string) {
    let now = new Date().getTime();
    const logEntry = {
        "timestamp": moment(now).format('DD/MM HH:mm:ss'),
        "message": message,
        "level": level
    };
    
    inMemoryLogs.push(logEntry);

    if (inMemoryLogs.length > 1000) {
        inMemoryLogs.shift();
    }

    // Broadcast to all connected clients
    if (wsClients) {
        const payload = JSON.stringify({
            type: 'logs',
            data: [logEntry]
        });
        
        wsClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    }
}