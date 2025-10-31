/* =========================================================
   🌱 PVB STOCK ALERT SYSTEM - with Loading Overlay + Median Support
   ========================================================= */

const REFRESH_INTERVAL = 5 * 60;
const RETRY_DELAY = 5;
let lastCreatedAt = null;
let alarmInterval = null;
let audioCtx;

// 🌐 Detect if running inside Median APK
const isMedian = typeof window.Median !== "undefined";

const ALL_SEEDS = ["Cactus", "Strawberry", "Pumpkin", "Sunflower", "Dragon Fruit", "Eggplant",
    "Watermelon", "Grape Seed", "Cocotank", "Carnivorous Plant", "Mr Carrot", "Tomatrio",
    "Shroombino", "Mango", "King Limone"];
const ALL_GEARS = ["Water Bucket", "Frost Grenade", "Banana Gun", "Frost Blower", "Carrot Launcher"];

let selectedSeeds = JSON.parse(localStorage.getItem("selectedSeeds")) || ALL_SEEDS;
let selectedGears = JSON.parse(localStorage.getItem("selectedGears")) || ALL_GEARS;

const ICONS = {
    "Cactus": "🌵", "Strawberry": "🍓", "Pumpkin": "🎃", "Sunflower": "🌻",
    "Dragon Fruit": "🐉", "Eggplant": "🍆", "Watermelon": "🍉", "Grape": "🍇",
    "Cocotank": "🥥", "Carnivorous Plant": "🪴", "Mr Carrot": "🥕", "Tomatrio": "🍅",
    "Shroombino": "🍄", "Mango": "🥭", "King Limone": "🍋",
    "Water Bucket": "🪣", "Frost Grenade": "🧊", "Banana Gun": "🍌🔫",
    "Frost Blower": "❄️", "Carrot Launcher": "🥕🚀"
};

const alarmSound = new Audio("https://actions.google.com/sounds/v1/alarms/spaceship_alarm.ogg"); 
alarmSound.loop = true;

if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
}

// 🔔 Show Messenger-like popup + system notification
function showNotification(foundItems) {
    const message = foundItems.join(", ");
    showPopup("🚨 " + message + " found!"); // 💬 In-app popup

    if (isMedian && window.Median?.sendNotification) {
        // ✅ Native Median Notification
        window.Median.sendNotification({
            title: "🚨 Rare Item Found!",
            message,
            icon: "https://cdn-icons-png.flaticon.com/512/4151/4151022.png"
        });
    } else if (navigator.serviceWorker?.controller) {
        // ✅ PWA / Browser Fallback
        navigator.serviceWorker.controller.postMessage({
            type: "SHOW_NOTIFICATION",
            payload: { message }
        });
    } else if ("Notification" in window && Notification.permission === "granted") {
        // ✅ Direct browser notification fallback
        new Notification("🚨 Rare Item Found!", {
            body: message,
            icon: "https://cdn-icons-png.flaticon.com/512/4151/4151022.png",
            vibrate: [300, 200, 300],
            requireInteraction: true
        });
    }

    if (navigator.vibrate) navigator.vibrate([300, 200, 300]);
}

let audioUnlocked = false;
function unlockAudio() {
    if (audioUnlocked) return;
    const tempSound = new Audio();
    tempSound.play().catch(() => { });
    alarmSound.play().then(() => {
        alarmSound.pause();
        alarmSound.currentTime = 0;
        audioUnlocked = true;
        console.log("🔊 Audio unlocked by user gesture");
    }).catch(() => console.warn("🔇 Waiting for user interaction..."));
}
document.addEventListener("click", unlockAudio, { once: true });
document.addEventListener("touchstart", unlockAudio, { once: true });

function triggerAlarm(foundItems) {
    console.log("🚨 Alarm triggered for:", foundItems.join(", "));
    showPopup("🚨 " + foundItems.join(", ") + " found!");
    showNotification(foundItems);

    document.body.style.backgroundColor = "#ffcccc";
    document.getElementById("stopSoundBtn").style.display = "block";
    alarmSound.currentTime = 0;
    alarmSound.play().catch(() => console.warn("🔇 Autoplay blocked"));
    if (alarmInterval) clearInterval(alarmInterval);
    alarmInterval = setInterval(() => {
        showNotification(foundItems);
        playBeepLoop();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }, 15000);
}

function stopSound() {
    console.log("🛑 Sound stopped.");
    alarmSound.pause();
    alarmSound.currentTime = 0;
    clearInterval(alarmInterval);
    alarmInterval = null;
    document.body.style.backgroundColor = "#f4f4f9";
    document.getElementById("stopSoundBtn").style.display = "none";
}

function playBeepLoop() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.1;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    setTimeout(() => osc.stop(), 800);
}

function updateDateTime() {
    const now = new Date();
    document.getElementById("timeDisplay").textContent =
        "📅 " + now.toLocaleString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
            hour: "2-digit", minute: "2-digit", second: "2-digit"
        });
}

/* 🌐 FETCH STOCK DATA */
/* 🌐 FETCH STOCK DATA */
async function fetchStockData(isRetry = false, isManual = false) {
    const refreshBtn = document.getElementById("refreshBtn");
    const loadingOverlay = document.getElementById("loadingOverlay");
    const stockData = document.getElementById("stockData");

    // Keep spinner active during manual refresh
    if (isManual) refreshBtn.classList.add("spinning");

    try {
        // 🌀 Keep loading overlay visible until new data arrives
        if (!isRetry) {
            loadingOverlay.style.display = "flex";
            stockData.style.opacity = "0.4";
        }

        const timestamp = Date.now();
        const [seedsRes, gearRes] = await Promise.all([
            fetch(`https://pvbstockbackend-1.onrender.com/seed_proxy.php?t=${timestamp}`),
            fetch(`https://pvbstockbackend-1.onrender.com/gear_proxy.php?t=${timestamp}`)
        ]);
        const [seeds, gear] = await Promise.all([seedsRes.json(), gearRes.json()]);

        if (!Array.isArray(seeds) || !Array.isArray(gear)) {
            stockData.innerHTML = "<p>No stock data available.</p>";
            return;
        }

        const latestTime = seeds[0]?.created_at;
        if (lastCreatedAt && lastCreatedAt === latestTime) {
            console.log("⏳ No new data, still loading...");
            // ⚠️ Do not hide the loader here — just retry silently
            setTimeout(() => fetchStockData(true), RETRY_DELAY * 1000);
            return;
        }

        // ✅ Only hide loader after detecting *new* data
        lastCreatedAt = latestTime;
        stockData.innerHTML = `
            <div class="stock-item">
                <div class="section-header"><div class="section-title">🌱 SEEDS STOCK</div></div>
                ${renderItems(seeds, "seeds")}
                <br><div class="section-title">⚙️ GEAR STOCK</div>
                ${renderItems(gear, "gear")}
                <div class="timestamp">Updated at: ${new Date(latestTime).toLocaleString()}</div>
            </div>
        `;

        const foundSeeds = selectedSeeds.filter(s =>
            seeds.some(item => item.display_name.toLowerCase().includes(s.toLowerCase()))
        );
        const foundGears = selectedGears.filter(g =>
            gear.some(item => item.display_name.toLowerCase().includes(g.toLowerCase()))
        );

        if (foundSeeds.length || foundGears.length)
            triggerAlarm([...foundSeeds, ...foundGears]);

        // 🟢 New data received — hide loader now
        setTimeout(() => {
            loadingOverlay.style.display = "none";
            stockData.style.opacity = "1";
        }, 600);

    } catch (err) {
        console.error("❌ Fetch error:", err);
        stockData.innerHTML = "<p>Error loading data. Retrying...</p>";
        // ❌ Keep loading visible (don’t stop) while retrying
        setTimeout(() => fetchStockData(true), RETRY_DELAY * 1000);
    } finally {
        refreshBtn.classList.remove("spinning");
        loadingOverlay.style.display = "none";
        loading.style.display = "none";
    }
}

// async function fetchStockData(isRetry = false, isManual = false) {
//     const refreshBtn = document.getElementById("refreshBtn");
//     refreshBtn.classList.add("spinning");
//     const loadingOverlay = document.getElementById("loadingOverlay");
//     const stockData = document.getElementById("stockData");

//     try {
//         if (!isRetry || isManual) {
//             loadingOverlay.style.display = "flex";
//             stockData.style.opacity = "0.4";
//         }

//         const timestamp = Date.now();
//         const [seedsRes, gearRes] = await Promise.all([
//             fetch(`https://pvbstockbackend.onrender.com/seed_proxy.php?t=${timestamp}`),
//             fetch(`https://pvbstockbackend.onrender.com/gear_proxy.php?t=${timestamp}`)
//         ]);
//         const [seeds, gear] = await Promise.all([seedsRes.json(), gearRes.json()]);

//         if (!Array.isArray(seeds) || !Array.isArray(gear)) {
//             stockData.innerHTML = "<p>No stock data available.</p>";
//             return;
//         }

//         const latestTime = seeds[0]?.created_at;
//         if (lastCreatedAt && lastCreatedAt === latestTime) {
//             console.log("⏳ No new data, retrying...");
//             setTimeout(() => fetchStockData(true), RETRY_DELAY * 1000);
//             return;
//         }

//         lastCreatedAt = latestTime;
//         stockData.innerHTML = `
//       <div class="stock-item">
//         <div class="section-header"><div class="section-title">🌱 SEEDS STOCK</div></div>
//         ${renderItems(seeds, "seeds")}
//         <br><div class="section-title">⚙️ GEAR STOCK</div>
//         ${renderItems(gear, "gear")}
//         <div class="timestamp">Updated at: ${new Date(latestTime).toLocaleString()}</div>
//       </div>
//     `;

//         const foundSeeds = selectedSeeds.filter(s =>
//             seeds.some(item => item.display_name.toLowerCase().includes(s.toLowerCase()))
//         );
//         const foundGears = selectedGears.filter(g =>
//             gear.some(item => item.display_name.toLowerCase().includes(g.toLowerCase()))
//         );

//         if (foundSeeds.length || foundGears.length)
//             triggerAlarm([...foundSeeds, ...foundGears]);

//     } catch (err) {
//         console.error("❌ Fetch error:", err);
//         stockData.innerHTML = "<p>Error loading data. Retrying...</p>";
//         setTimeout(() => fetchStockData(true), RETRY_DELAY * 1000);
//     } finally {
//         refreshBtn.classList.remove("spinning");
//         loadingOverlay.style.display = "none";
//         loading.style.display = "none";

//         if (lastCreatedAt) {
//             setTimeout(() => {
//                 loadingOverlay.style.display = "none";
//                 stockData.style.opacity = "1";
//             }, 600);
//         } else {
//             console.log("⏳ Waiting for new data... keeping loader visible");
//         }
//     }

// }

function renderItems(items, type) {
    return items.map(item => {
        const icon = ICONS[item.display_name] || (type === "seeds" ? "🌱" : "⚙️");
        return `<div class="stock-list"><span>${icon} ${item.display_name}</span><span>x${item.multiplier}</span></div>`;
    }).join("");
}

function startTimer() {
    const timerDisplay = document.getElementById("timer");
    setInterval(() => {
        const now = new Date();
        const nextUpdate = new Date(Math.ceil(now / (REFRESH_INTERVAL * 1000)) * (REFRESH_INTERVAL * 1000));
        const diff = nextUpdate - now;
        const totalSec = Math.floor(diff / 1000);
        const minutes = Math.floor(totalSec / 60);
        const seconds = totalSec % 60;
        timerDisplay.textContent = `⏱️ Next update in: ${minutes}m ${seconds < 10 ? "0" + seconds : seconds}s`;
        if (totalSec <= 0) fetchStockData();
    }, 1000);
}

/* ⚙️ SETTINGS */
const modal = document.getElementById("settingsModal");
const seedSettings = document.getElementById("seedSettings");
const gearSettings = document.getElementById("gearSettings");

function openSettings() {
    seedSettings.innerHTML = ALL_SEEDS.map(seed =>
        `<div class="seed-option"><input type="checkbox" id="${seed}" ${selectedSeeds.includes(seed) ? "checked" : ""}>
    <label for="${seed}">${ICONS[seed] || "🌱"} ${seed}</label></div>`).join("");
    gearSettings.innerHTML = ALL_GEARS.map(gear =>
        `<div class="seed-option"><input type="checkbox" id="${gear}" ${selectedGears.includes(gear) ? "checked" : ""}>
    <label for="${gear}">${ICONS[gear] || "⚙️"} ${gear}</label></div>`).join("");
    modal.style.display = "flex";
}
function closeSettings() { modal.style.display = "none"; }
function saveSettings() {
    selectedSeeds = [...seedSettings.querySelectorAll("input:checked")].map(el => el.id);
    selectedGears = [...gearSettings.querySelectorAll("input:checked")].map(el => el.id);
    localStorage.setItem("selectedSeeds", JSON.stringify(selectedSeeds));
    localStorage.setItem("selectedGears", JSON.stringify(selectedGears));
    alert("✅ Settings saved!");
    closeSettings();
}
function switchTab(tab) {
    document.getElementById("tabSeeds").classList.toggle("active", tab === "seeds");
    document.getElementById("tabGears").classList.toggle("active", tab === "gears");
    seedSettings.style.display = tab === "seeds" ? "block" : "none";
    gearSettings.style.display = tab === "gears" ? "block" : "none";
}

/* 🔔 POPUP */
function showPopup(message) {
    const popup = document.getElementById("popupNotification");
    const popupMsg = document.getElementById("popupMessage");
    popupMsg.textContent = message;
    popup.classList.add("show");
    setTimeout(() => popup.classList.remove("show"), 7000);
}
function hidePopup() {
    document.getElementById("popupNotification").classList.remove("show");
}

/* 🧠 INIT */
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("stopSoundBtn").addEventListener("click", stopSound);
    document.getElementById("refreshBtn").addEventListener("click", () => fetchStockData(false, true));
    document.getElementById("settingsBtn").addEventListener("click", openSettings);
    setInterval(updateDateTime, 1000);
    updateDateTime();
    fetchStockData();
    startTimer();
});
