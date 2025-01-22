import log4js from 'log4js';
import path from 'path';

const logDir = path.resolve(__dirname, '../../logs');

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
}

export function logError(message: string) {
    logger.error(message);
}