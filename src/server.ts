import { readFileSync } from 'fs';
import { inMemoryLogs, log, logError } from "./utils/logUtils";
import schedule from 'node-schedule';
import { Account } from './models/Account';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import moment = require('moment');
import { Emulator } from './models/Emulator';
import { LdPlayerEmulator } from './models/LdPlayerEmulator';
import { MumuPlayerEmulator } from './models/MumuPlayerEmulator';
import express from 'express';
import cors from 'cors';
import { setWSClients } from './utils/logUtils';
import { Server as WebSocketServer, WebSocket } from 'ws';

const config = JSON.parse(readFileSync('./config.json', 'utf-8'));
const port = config.serverPort ? config.serverPort : 3000;

interface AccountCommand {
    shortNames: string[];
    action: (account: Account, additionalParams?: any) => void;
    allowAll?: boolean;
}

const accountCommands: Record<string, AccountCommand> = {
    'killGame': { shortNames: ['kg'], action: function(account: Account) { account.killGame(); }},
    'startGame': { shortNames: ['sg'], action: function(account: Account) { account.startGame(); }},
    'restartGame': { shortNames: ['rsg'], action: function(account: Account) { account.restartGame(true); }},
    'killEmulator': { shortNames: ['ke'], action: function(account: Account) { account.killEmulator(); }},
    'startEmulator': { shortNames: ['se'], action: function(account: Account) { account.startEmulator(); }}, 
    'restartEmulator': { shortNames: ['rse'], action: function(account: Account) { account.restartEmulator(true); }},
    'minimizeEmulator': { shortNames: ['me'], allowAll: true, action: function(account: Account) { account.minimizeEmulator(); }},
    'restoreEmulator': { shortNames: ['ne'], allowAll: true, action: function(account: Account) { account.restoreEmulator(); }},
    'togglePause': { shortNames: ['tp'], action: function(account: Account) { account.togglePause(); }},
    'startService': { shortNames: ['ss'], action: function(account: Account) { account.emulator?.startServiceForAllDevices(); }},
    'runStartup': { shortNames: ['rs'], action: function(account: Account) { account.runStartupCommand(); }},
};

async function runAccountCommand(command: string, accountName: string) {
    let commandObj;
    for (const [key, accountCommand] of Object.entries(accountCommands)) {
        if (key === command || accountCommand.shortNames.includes(command)) {
            commandObj = accountCommand;
        }
    }

    if (!commandObj) {
        logError(`Invalid command: ${command}.`);
        return;
    }

    if (commandObj.allowAll && accountName === "all") {
        for (let account of accounts) {
            commandObj.action(account);
        }

        return;
    }

    const account = accounts.find(a => a.accountName === accountName);
    if (!account) {
        logError(`Account ${accountName} not found`);
        return;
    }

    commandObj.action(account);
}

const app = express();
app.use(cors());

// Add root route handler for account parameter
app.get('/', (req, res) => {
    const accountNameReported = req.query.account;

    // If no account parameter, serve the UI
    if (!accountNameReported) {
        res.sendFile('index.html', { root: './public' });
        return;
    }

   let account = accounts.find(a => a.accountName === accountNameReported);

    if (!account) {
        logError(`Unknown account "${accountNameReported}" reported alive.`);
        res.status(404).send('Account not found.');
        return;
    }

    if (account.paused) {
        log(`${account.accountName} reported alive while paused, skipping...`);

        res.sendStatus(200);
        return;
    }

    // start emulator success, start game on emulator
    if (account.isStartingEmulator()) {
        account.emulator!.startEmulatorBeginTime = undefined;
        account.emulatorRestartAttempts = 0;
        log(`Started emulator for ${account.accountName} successfully, starting Game now...`);
        account.startGame(true);
    } else {
        res.sendStatus(200);

        let logMessage = `${accountNameReported} reported alive.`;

        // start game success
        if (account.isStartingGame()) {
            account.emulator!.startGameBeginTime = undefined;
            account.gameRestartAttempts = 0;
            logMessage = `Started game for ${account.accountName} successfully.`;
            account.runStartupCommand();
        }

        if (account.isDead()) {
            logMessage = `${account.accountName} is back to online.`;
        }

        account.reportAlive();
        log(logMessage);
    }
});

// Serve static files after the root route handler
app.use(express.static('public'));

// Create WebSocket server attached to the Express server
const server = app.listen(port, () => {
    log(`Server running at http://localhost:${port}/`);

    const discordBotToken = config.discordBotToken;
    if (discordBotToken) {
        client.login(discordBotToken).then(() => {
        }).catch((error) => {
            log('Failed to start discord bot, running server UI only.');
        });
    } else {
        log('Discord bot token not found in config.json, not starting discord bot.');
    }

    startScheduleJob();
    setWSClients(clients);
});

const wss = new WebSocketServer({ server });

// Rest of the WebSocket code remains the same
const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
    clients.add(ws);
    
    // Send current logs when client connects
    ws.send(JSON.stringify({
        type: 'logs',
        data: inMemoryLogs
    }));

    // Send current account data when client connects
    const accountsData = accounts.map(account => ({
        name: account.accountName,
        emulator: account.emulator?.emulatorName || "None",
        status: account.status,
        lastUpdate: account.lastUpdate,
        paused: account.paused
    }));
    
    ws.send(JSON.stringify({
        type: 'accounts',
        data: accountsData
    }));

    ws.on('close', () => {
        clients.delete(ws);
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            if (data.type === 'command') {
                const { command, accountName } = data.data;
                runAccountCommand(command, accountName);
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    });
});

let accounts: Account[] = [];

function createEmulator(emulatorData: any): Emulator | undefined {
    switch(emulatorData.type) {
        case "Ld":
            return new LdPlayerEmulator(emulatorData.emulatorName, emulatorData.deviceNames, emulatorData.installPath, emulatorData.startupCommand);
        case "Mumu":
            return new MumuPlayerEmulator(emulatorData.emulatoreId, emulatorData.deviceNames, emulatorData.emulatorName, emulatorData.installPath, emulatorData.startupCommand);
        default:
            logError("Unknown emulator type.");
            return undefined;
    }
}

function pushAccountStatus(account: Account) {
    const accountData = {
        name: account.accountName,
        emulator: account.emulator?.emulatorName || "None",
        status: account.status,
        lastUpdate: account.lastUpdate,
        paused: account.paused
    };

    const payload = JSON.stringify({
        type: 'accountUpdate',
        data: accountData
    });
    
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

for (let accountData of config.accounts) {
    let emulator = createEmulator(accountData.emulator);
    let account = new Account(
        accountData.account, 
        accountData.discordUserId, 
        emulator, 
        accountData.deathThreshold,
        accountData.maxGameRestarts,
        accountData.maxEmulatorRestarts
    );
    
    // Set up the status update callback
    account.onStatusUpdate = pushAccountStatus;
    
    accounts.push(account);
}

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

    if (!message.content.startsWith('!')) return;

    log(`Received command ${message.content} from ${message.author.username}`);

    let messages = message.content.split(" ");
    let command = messages[0].slice(1);

    if (command === 'accounts') {
        message.reply('```' + JSON.stringify(accounts, null, 2) + '```');
        return;
    }

    if (command === 'id') {
        message.reply(message.author.id);
        return;
    }

    runAccountCommand(command, messages[1]);
});

function startScheduleJob() {
    let job = schedule.scheduleJob('*/5 * * * * *', async function() {
        try {
            for (let account of accounts) {
                if (account.paused) {
                    return;
                }

                if (account.isStartingEmulator()) {
                    if (!account.startEmulatorFailed()) {
                        return;
                    }

                    if (account.emulatorRestartAttempts >= account.maxEmulatorRestarts) {
                        if (account.notifiedDeath) {
                            return;
                        }

                        const message = `Max emulator restart attempts (${account.maxEmulatorRestarts}) reached for ${account.accountName}, please check the emulator and restart it manually.`;
                        logError(message);
    
                        if (account.discordUserId) {
                            try {
                                client.users.cache.get(account.discordUserId)!.send(message);
                            } catch (error) {
                                logError(`Encountered error when notifying discord user ${account.discordUserId}`);
                            }
                        }
    
                        account.updateStatus("Offline");
                        account.notifiedDeath = true;
                        return;
                    }

                    let secondsSpent = Math.floor((new Date().getTime() - account.emulator!.startEmulatorBeginTime!.getTime()) / 1000);
                    logError(`Already spent ${secondsSpent} seconds on starting emulator for ${account.accountName}, retrying...`);
                    account.restartEmulator();
                } else if (account.isStartingGame()) {
                    if (!account.startGameFailed()) {
                        return;
                    }

                    if (account.gameRestartAttempts >= account.maxGameRestarts) {
                        logError(`Max game restart attempts (${account.maxGameRestarts}) reached for ${account.accountName}, attempting emulator restart...`);
                        account.gameRestartAttempts = 0;
                        account.restartEmulator();
                        return;
                    }

                    let secondsSpent = Math.floor((new Date().getTime() - account.emulator!.startGameBeginTime!.getTime()) / 1000);
                    logError(`Already spent ${secondsSpent} seconds on starting game for ${account.accountName}, retrying...`);
                    account.restartGame();
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
                                client.users.cache.get(account.discordUserId)!.send(errorMessage);
                            } catch (error) {
                                logError(`Encountered error when notifying discord user ${account.discordUserId}`);
                            }
                        }
                        account.notifiedDeath = true;
                        account.updateStatus("Offline");
                    }
                }
            }
        } catch (error) {
            logError(`Error in schedule job: ${error}`);
        }
    });
    return job;
}