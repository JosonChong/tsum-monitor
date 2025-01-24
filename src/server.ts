import { readFileSync } from 'fs';
import * as http from 'http';
import * as url from 'url';
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

const accountCommands = {
    'killGame': { shortNames: ['kg'], action: function(account: Account, additionalParams?: any) { account.killGame(); }},
    'startGame': { shortNames: ['sg'], action: function(account: Account, additionalParams?: any) { account.startGame(); }},
    'restartGame': { shortNames: ['rsg'], action: function(account: Account, additionalParams?: any) { account.restartGame(); }},
    'killEmulator': { shortNames: ['ke'], action: function(account: Account, additionalParams?: any) { account.killEmulator(); }},
    'startEmulator': { shortNames: ['se'], action: function(account: Account, additionalParams?: any) { account.startEmulator(); }}, 
    'restartEmulator': { shortNames: ['rse'], action: function(account: Account, additionalParams?: any) { account.restartEmulator(); }},
    'minimizeEmulator': { shortNames: ['me'], action: function(account: Account, additionalParams?: any) { account.minimizeEmulator(); }},
    'restoreEmulator': { shortNames: ['ne'], action: function(account: Account, additionalParams?: any) { account.restoreEmulator(); }}
};

// Add type definition for commands
type CommandKey = keyof typeof accountCommands;

function runAccountCommand(commandKey: string, accountName: string, additionalParams?: any) {
    const account = accounts.find(a => a.accountName === accountName);
    
    if (!account) {
        console.error(`Account not found: ${accountName}`);
        return;
    }

    for (const [key, command] of Object.entries(accountCommands)) {
        if (key === commandKey || command.shortNames.includes(commandKey)) {
            command.action(account, additionalParams);
            return;
        }
    }

    logError(`Invalid command: ${commandKey}`);
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

    // Handle account alive reporting
    if (!accountNameReported) {
        logError('Null account reported.');
        res.status(404).send('Account is null');
        return;
    }

    let account = accounts.find(a => a.accountName === accountNameReported);

    if (!account) {
        logError(`Unknown account "${accountNameReported}" reported alive.`);
        res.status(404).send('Account not found');
        return;
    }

    // start emulator success, start game on emulator
    if (account.isStartingEmulator()) {
        account.emulator!.startEmulatorBeginTime = undefined;
        account.startGame();
        log(`Started emulator for ${account.accountName} successfully, starting Game now...`);
    } else {
        res.sendStatus(200);

        let logMessage = `${accountNameReported} reported alive.`;

        // start game success
        if (account.isStartingGame()) {
            account.emulator!.startGameBeginTime = undefined;
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

app.get('/logs', (_, res) => {
    res.json(inMemoryLogs);
});

app.get('/accounts', (_, res) => {
    res.json(
        accounts.map(account => ({
            name: account.accountName,
            emulator: account.emulator?.emulatorName || "None",
            status: account.isDead() ? "Offline" : "Online",
            lastAlive: account.lastAlive,
        }))
    );
});

// Serve static files after the root route handler
app.use(express.static('public'));

// Create WebSocket server attached to the Express server
const server = app.listen(port, () => {
    log(`Server running at http://localhost:${port}/`);
    const discordBotToken = config.discordBotToken;
    if (!discordBotToken) {
        log('Discord bot token not found in config.json.');
        process.exit(1);
    }
    client.login(discordBotToken);
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
        status: account.isDead() ? "Offline" : "Online",
        lastAlive: account.lastAlive,
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

for (let accountData of config.accounts) {
    let emulator = createEmulator(accountData.emulator);
    let account = new Account(accountData.account, accountData.discordUserId, emulator, accountData.deathThreshold);
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

    log(`Received command ${message.content} from ${message.author.username}`)

    let messages = message.content.split(" ");

    if (messages[0] === '!accounts') {
        message.reply('```' + JSON.stringify(accounts, null, 2) + '```');
    }

    if (messages[0] === '!id') {
        message.reply(message.author.id);
    }

    if (messages[0] === '!killGame' || messages[0] === '!kg') {
        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            account.killGame();
        }
    }

    if (messages[0] === '!startGame' || messages[0] === '!sg') {
        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            account.startGame();
        }
    }

    if (messages[0] === '!restartGame' || messages[0] === '!rsg') {
        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            account.restartGame();
        }
    }

    if (messages[0] === '!killEmulator' || messages[0] === '!ke') {
        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            account.killEmulator();
        }
    }

    if (messages[0] === '!startEmulator'  || messages[0] === '!se') {
        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            account.startEmulator();
        }
    }

    if (messages[0] === '!restartEmulator' || messages[0] === '!rse') {
        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            account.restartEmulator();
        }
    }

    if (messages[0] === '!minimizeEmulator' || messages[0] === '!me') {
        if (messages[1] === "all") {
            for (let account of accounts) {
                account.minimizeEmulator();
            }

            return;
        }

        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            account.minimizeEmulator();
        }
    }

    if (messages[0] === '!restoreEmulator' || messages[0] === '!ne') {
        if (messages[1] === "all") {
            for (let account of accounts) {
                account.restoreEmulator();
            }

            return;
        }

        let account = accounts.find(a => a.accountName === messages[1]);

        if (account) {
            account.restoreEmulator();
        }
    }
});

function startScheduleJob() {
    let job = schedule.scheduleJob('*/30 * * * * *', async function() {
        try {
            let statusChanged = false;
            for (let account of accounts) {
                const previousStatus = account.isDead();
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
                                client.users.cache.get(account.discordUserId)!.send(errorMessage);
                            } catch (error) {
                                logError(`Encountered error when notifying discord user ${account.discordUserId}`);
                            }
                        }
    
                        account.notifiedDeath = true;
                    }
                }
                
                // If status changed, we'll want to broadcast updates
                if (previousStatus !== account.isDead()) {
                    statusChanged = true;
                }
            }
            
            // Broadcast account updates if any status changed
            if (statusChanged) {
                console.log('Account status changed, broadcasting updates'); // Debug log
                const accountsData = accounts.map(account => ({
                    name: account.accountName,
                    emulator: account.emulator?.emulatorName || "None",
                    status: account.isDead() ? "Offline" : "Online",
                    lastAlive: account.lastAlive,
                }));
                
                const payload = JSON.stringify({
                    type: 'accounts',
                    data: accountsData
                });
                
                clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(payload);
                    }
                });
            }
        } catch (error) {
            logError("Schedule Job Exception");
            console.error('Schedule job error:', error); // Debug log
        }
    });
    return job;
}