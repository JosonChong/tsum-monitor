import * as http from 'http';
import * as url from 'url';
import { log, logError } from "./utils/logUtils";
import schedule from 'node-schedule';
import { Account } from './models/Account.ts';
import { LdPlayerInstance } from './models/LdPlayerInstance.ts';
import { MumuPlayerInstance } from './models/MumuPlayerInstance.ts';
import dotenv from 'dotenv';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import moment from 'moment';

dotenv.config();

const port = 3000;

const accounts = [];

//discord server
const client = new Client({
    'intents': [
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ],
    'partials': [Partials.Channel]
});

client.once('ready', () => {
    log(`Logged in as ${client.user?.tag}!`);
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    let messages = message.content.split(" ");

    if (messages[0] === '!killGame' || messages[0] === '!kg') {
        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            log(`Trying to kill game on ${account.accountName}.`);
            account.killGame();
        }
    }

    if (messages[0] === '!startGame' || messages[0] === '!sg') {
        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            log(`Trying to start game on ${account.accountName}.`);
            account.startGame();
        }
    }

    if (messages[0] === '!restartGame' || messages[0] === '!rsg') {
        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            log(`Trying to restart game on ${account.accountName}.`);
            account.restartGame();
        }
    }

    if (messages[0] === '!killInstance' || messages[0] === '!ki') {
        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            log(`Trying to kill instance on ${account.accountName}.`);
            account.killInstance();
        }
    }

    if (messages[0] === '!startInstance'  || messages[0] === '!si') {
        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            log(`Trying to start instance on ${account.accountName}.`);
            account.startInstance();
        }
    }

    if (messages[0] === '!restartInstance' || messages[0] === '!rsi') {
        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            log(`Trying to restart instance on ${account.accountName}.`);
            account.restartInstance();
        }
    }

});

// http server
const server = http.createServer((req, res) => {
    if (req.method !== 'GET') {
        logError('Got a http request other than GET.');

        res.statusCode = 405;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Method Not Allowed');

        return;
    }

    const parsedUrl = url.parse(req.url || '', true);
    const accountNameReported = parsedUrl.query.account;

    if (!accountNameReported) {
        logError('Null account reported.');

        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Account is null');

        return;
    }

    let account = accounts.find(a => a.accountName === accountNameReported);

    if (!account) {
        logError(`Unknown account "${accountNameReported}" reported alive.`);

        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Account not found');

        return;
    }

    // start instance success, start game on instance
    if (account.isStartingInstance()) {
        account.emulatorInstance.startInstanceBeginTime = null;

        account.startGame();

        log(`Started instance for ${account.accountName} successfully, starting Game now...`);
    } else {
        let logMessage = `${accountNameReported} reported alive.`;

        // start game success
        if (account.isStartingGame()) {
            account.emulatorInstance.startGameBeginTime = null;

            logMessage = `Started game for ${account.accountName} successfully`;
        }

        if (account.isDead()) {
            logMessage = `${account.accountName} is back to online.`;
        }

        account.reportAlive();
        log(logMessage);
    }
    
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('OK');
});

function startScheduleJob() {
    let job = schedule.scheduleJob('*/30 * * * * *', async function() {
        try {
            for (let account of accounts) {
                if (account.isStartingInstance()) {
                    if (account.startInstanceFailed()) {
                        logError(`Failed to start instance for ${account.accountName}, retrying...`);

                        account.restartInstance();
                    } else {
                        log(`Still starting instance for ${account.accountName}.`);
                    }
                } else if (account.isStartingGame()) {
                    if (account.startGameFailed()) {
                        logError(`Failed to start game for ${account.accountName}, retrying...`);

                        account.restartGame();
                    } else {
                        log(`Still starting game for ${account.accountName}.`);
                    }
                } else if (account.isDead() && !account.notifiedDeath) {
                    if (account.emulatorInstance) {
                        const message = `${account.accountName} lost connection, trying to restart game.`;
                        logError(message);

                        account.restartGame();
                    } else {
                        const errorMessage = `${account.accountName} lost connection, last alive: ${moment(account.lastAlive).format('HH:mm:ss')}`;
                        logError(errorMessage);
    
                        if (account.discordUserId) {
                            try {
                                client.users.cache.get(account.discordUserId).send(errorMessage);
                            } catch (error) {
                                logError(`Encountered error when notifying discord user ${account.discordUserId}`);
                            }
                        }
    
                        account.notifiedDeath = true;
                    }
                }
            }
        } catch (error) {
            logError("Schedule Job Exception");
        }
    });
    return job;
}

server.listen(port, () => {
    log(`Server running at http://localhost:${port}/`);

    const TOKEN = process.env.DISCORD_TOKEN;
    if (!TOKEN) {
        logError('DISCORD_TOKEN not found in .env');
        process.exit(1);
    }
    client.login(TOKEN);

    startScheduleJob();
});