/* =========================================================
   🌱 PVB STOCK ALERT SYSTEM - Clean Version
   ========================================================= */

const REFRESH_INTERVAL = 5 * 60; // 5 minutes
const RETRY_DELAY = 5; // seconds
let lastCreatedAt = null;
let alarmInterval = null;

/* ------------------- CONFIGURATION ------------------- */

const ALL_SEEDS = [
    "Cactus", "Strawberry", "Pumpkin", "Sunflower",
    "Dragon Fruit", "Eggplant", "Watermelon", "Grape Seed",
    "Cocotank", "Carnivorous Plant", "Mr Carrot", "Tomatrio",
    "Shroombino", "Mango", "King Limone"
];

const ALL_GEARS = [
    "Water Bucket", "Frost Grenade", "Banana Gun",
    "Frost Blower", "Carrot Launcher"
];

// Load saved selections or default to all
let selectedSeeds = JSON.parse(localStorage.getItem("selectedSeeds")) || ALL_SEEDS;
let selectedGears = JSON.parse(localStorage.getItem("selectedGears")) || ALL_GEARS;

// Item icons
const ICONS = {
    "Cactus": "🌵", "Strawberry": "🍓", "Pumpkin": "🎃", "Sunflower": "🌻",
    "Dragon Fruit": "🐉", "Eggplant": "🍆", "Watermelon": "🍉", "Grape Seed": "🍇",
    "Cocotank": "🥥", "Carnivorous Plant": "🪴", "Mr Carrot": "🥕", "Tomatrio": "🍅",
    "Shroombino": "🍄", "Mango": "🥭", "King Limone": "🍋",
    "Water Bucket": "🪣", "Frost Grenade": "🧊", "Banana Gun": "🍌🔫",
    "Frost Blower": "❄️", "Carrot Launcher": "🥕🚀"
};

/* ------------------- AUDIO & NOTIFICATIONS ------------------- */

const alarmSound = new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg");
alarmSound.loop = true;

// Ask for notification permission
if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
}

function showNotification(foundItems) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("🚨 Rare Item Found!", {
            body: foundItems.join(", "),
            icon: "https://cdn-icons-png.flaticon.com/512/4151/4151022.png",
            vibrate: [300, 200, 300],
            requireInteraction: true
        });
    }
    if (navigator.vibrate) navigator.vibrate([300, 200, 300]);
}

function triggerAlarm(foundItems) {
    alarmSound.play().catch(() => console.warn("🔇 Autoplay blocked."));
    document.body.style.backgroundColor = "#ffcccc";
    document.getElementById("stopSoundBtn").style.display = "block";

    if (!alarmInterval) {
        alarmInterval = setInterval(() => {
            showNotification(foundItems);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }, 8000);
    }
}

function stopSound() {
    alarmSound.pause();
    alarmSound.currentTime = 0;
    document.body.style.backgroundColor = "#f4f4f9";
    document.getElementById("stopSoundBtn").style.display = "none";
    clearInterval(alarmInterval);
    alarmInterval = null;
}

document.getElementById("stopSoundBtn").addEventListener("click", stopSound);

/* ------------------- TIME & UI ------------------- */

function updateDateTime() {
    const now = new Date();
    document.getElementById("timeDisplay").textContent =
        "📅 " + now.toLocaleString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
            hour: "2-digit", minute: "2-digit", second: "2-digit"
        });
}

/* ------------------- DATA FETCHING ------------------- */

async function fetchStockData(isRetry = false) {
    const loading = document.getElementById("loading");
    const stockData = document.getElementById("stockData");

    try {
        if (!isRetry) loading.style.display = "block";

        const timestamp = Date.now();
        const [seedsRes, gearRes] = await Promise.all([
            fetch(`https://pvbstockbackend.onrender.com/seed_proxy.php?t=${timestamp}`),
            fetch(`https://pvbstockbackend.onrender.com/gear_proxy.php?t=${timestamp}`)
        ]);

        const [seeds, gear] = await Promise.all([seedsRes.json(), gearRes.json()]);
        if (!Array.isArray(seeds) || !Array.isArray(gear)) {
            stockData.innerHTML = "<p>No stock data available.</p>";
            return;
        }

        const latestTime = seeds[0]?.created_at;
        if (lastCreatedAt && lastCreatedAt === latestTime) {
            setTimeout(() => fetchStockData(true), RETRY_DELAY * 1000);
            return;
        }

        lastCreatedAt = latestTime;
        stockData.innerHTML = `
      <div class="stock-item">
        <div class="section-title">🌱 SEEDS STOCK</div>
        ${renderItems(seeds, "seeds")}
        <br>
        <div class="section-title">⚙️ GEAR STOCK</div>
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

        if (foundSeeds.length || foundGears.length) {
            triggerAlarm([...foundSeeds, ...foundGears]);
        }

    } catch (err) {
        console.error("❌ Fetch error:", err);
        stockData.innerHTML = "<p>Error loading data.</p>";
    } finally {
        loading.style.display = "none";
    }
}

function renderItems(items, type) {
    return items.map(item => {
        const icon = ICONS[item.display_name] || (type === "seeds" ? "🌱" : "⚙️");
        return `
      <div class="stock-list">
        <span>${icon} ${item.display_name}</span>
        <span>x${item.multiplier}</span>
      </div>`;
    }).join("");
}

/* ------------------- TIMER ------------------- */

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

/* ------------------- SETTINGS ------------------- */

const modal = document.getElementById("settingsModal");
const seedSettings = document.getElementById("seedSettings");
const gearSettings = document.getElementById("gearSettings");

document.getElementById("settingsBtn").onclick = openSettings;

function openSettings() {
    seedSettings.innerHTML = ALL_SEEDS.map(seed =>
        `<div class="seed-option">
      <input type="checkbox" id="${seed}" ${selectedSeeds.includes(seed) ? "checked" : ""}>
      <label for="${seed}">${ICONS[seed] || "🌱"} ${seed}</label>
    </div>`).join("");

    gearSettings.innerHTML = ALL_GEARS.map(gear =>
        `<div class="seed-option">
      <input type="checkbox" id="${gear}" ${selectedGears.includes(gear) ? "checked" : ""}>
      <label for="${gear}">${ICONS[gear] || "⚙️"} ${gear}</label>
    </div>`).join("");

    modal.style.display = "block";
}

function closeSettings() {
    modal.style.display = "none";
}

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

/* ------------------- INITIALIZATION ------------------- */

// Allow audio autoplay after first user click
document.addEventListener("click", () => {
    alarmSound.play().then(() => {
        alarmSound.pause();
        alarmSound.currentTime = 0;
    }).catch(() => { });
}, { once: true });

// Start everything
setInterval(updateDateTime, 1000);
updateDateTime();
fetchStockData();
startTimer();
