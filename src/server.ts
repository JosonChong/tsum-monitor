#!/usr/bin/env node

import { readFileSync } from 'fs';
import * as http from 'http';
import * as url from 'url';
import { log, logError } from "./utils/logUtils";
import schedule from 'node-schedule';
import { Account } from './models/Account.ts';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import moment from 'moment';
import { Emulator } from './models/Emulator.ts';
import { LdPlayerEmulator } from './models/LdPlayerEmulator.ts';
import { MumuPlayerEmulator } from './models/MumuPlayerEmulator.ts';

const config = readFileSync('./config.json', 'utf-8');
const configData = JSON.parse(config);

let accounts: Account[] = [];

function createEmulator(emulatorData: any): Emulator {
    switch(emulatorData.type) {
        case "Ld":
            return new LdPlayerEmulator(emulatorData.emulatorName, emulatorData.deviceNames, emulatorData.installPath, emulatorData.startupCommand);
        case "Mumu":
            return new MumuPlayerEmulator(emulatorData.emulatoreId, emulatorData.deviceNames, emulatorData.emulatorName, emulatorData.installPath, emulatorData.startupCommand);
        default:
            logError("Unknown emulator type.");
            return null;
    }
}

for (let accountData of configData.accounts) {
    let emulator = createEmulator(accountData.emulator);
    let account = new Account(accountData.account, accountData.discordUserId, emulator, accountData.deathThreshold);
    accounts.push(account);
}

const port = 3000;

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

    if (messages[0] === '!accounts') {
        console.log(accounts);

        message.reply('```' + JSON.stringify(accounts, null, 2) + '```');
    }

    if (messages[0] === '!id') {
        message.reply(message.author.id);
    }

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

    if (messages[0] === '!killEmulator' || messages[0] === '!ke') {
        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            log(`Trying to kill emulator on ${account.accountName}.`);
            account.killEmulator();
        }
    }

    if (messages[0] === '!startEmulator'  || messages[0] === '!se') {
        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            log(`Trying to start emulator on ${account.accountName}.`);
            account.startEmulator();
        }
    }

    if (messages[0] === '!restartEmulator' || messages[0] === '!rse') {
        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            log(`Trying to restart emulator on ${account.accountName}.`);
            account.restartEmulator();
        }
    }

    if (messages[0] === '!minimizeEmulator' || messages[0] === '!me') {
        if (messages[1] === "all") {
            log(`Trying to minimize all emulators.`);

            for (let account of accounts) {
                account.minimizeEmulator();
            }

            return;
        }

        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            log(`Trying to minimize emulator on ${account.accountName}.`);
            account.minimizeEmulator();
        }
    }

    if (messages[0] === '!restoreEmulator' || messages[0] === '!ne') {
        if (messages[1] === "all") {
            log(`Trying to restore all emulators.`);

            for (let account of accounts) {
                account.restoreEmulator();
            }

            return;
        }

        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            log(`Trying to restore emulator on ${account.accountName}.`);
            account.restoreEmulator();
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

    // start emulator success, start game on emulator
    if (account.isStartingEmulator()) {
        account.emulator.startEmulatorBeginTime = null;

        account.startGame();

        log(`Started emulator for ${account.accountName} successfully, starting Game now...`);
    } else {
        let logMessage = `${accountNameReported} reported alive.`;

        // start game success
        if (account.isStartingGame()) {
            account.emulator.startGameBeginTime = null;

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
                if (account.isStartingEmulator()) {
                    if (account.startEmulatorFailed()) {
                        logError(`Failed to start emulator for ${account.accountName}, retrying...`);

                        account.restartEmulator();
                    } else {
                        log(`Still starting emulator for ${account.accountName}.`);
                    }
                } else if (account.isStartingGame()) {
                    if (account.startGameFailed()) {
                        logError(`Failed to start game for ${account.accountName}, retrying...`);

                        account.restartGame();
                    } else {
                        log(`Still starting game for ${account.accountName}.`);
                    }
                } else if (account.isDead() && !account.notifiedDeath) {
                    if (account.emulator) {
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

    const discordServerToken = configData.discordServerToken;
    if (!discordServerToken) {
        logError('discordServerToken not found in config.json.');
        process.exit(1);
    }
    client.login(discordServerToken);

    startScheduleJob();
});