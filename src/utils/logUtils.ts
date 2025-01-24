import log4js from 'log4js';
import path from 'path';
import moment from 'moment';
import WebSocket from 'ws';

const logDir = path.resolve(__dirname, '../../logs');

export let inMemoryLogs: {}[] = [];
export let wsClients: Set<WebSocket>;

log4js.configure({
    appenders: {
        console: { 
            type: 'console',
            layout: {
                type: 'pattern',
                pattern: '%[%d{MM/dd hh:mm:ss}%] %m',
            }
        },
        file: {
            type: 'dateFile',
            filename: path.join(logDir, 'app.log'),
            pattern: 'yyyy-MM-dd',
            keepFileExt: true,
            compress: true,
        },
    },
    categories: {
        default: { appenders: ['console', 'file'], level: 'info' },
    },
});

const logger = log4js.getLogger();

// Export log functions
export function log(message: string) {
    logger.info(message);
    addInMemoryLog(message, "info");
}

export function logError(message: string) {
    logger.error(message);
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