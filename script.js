/* =========================================================
   🌱 PVB STOCK ALERT SYSTEM (Median + Web Notification Support)
   ========================================================= */

const REFRESH_INTERVAL = 5 * 60;
const RETRY_DELAY = 5;
let lastCreatedAt = null;
let alarmInterval = null;
let audioCtx;

// 🌾 Define items
const ALL_SEEDS = ["Cactus", "Strawberry", "Pumpkin", "Sunflower", "Dragon Fruit", "Eggplant",
  "Watermelon", "Grape Seed", "Cocotank", "Carnivorous Plant", "Mr Carrot", "Tomatrio",
  "Shroombino", "Mango", "King Limone"];
const ALL_GEARS = ["Water Bucket", "Frost Grenade", "Banana Gun", "Frost Blower", "Carrot Launcher"];

let selectedSeeds = JSON.parse(localStorage.getItem("selectedSeeds")) || ALL_SEEDS;
let selectedGears = JSON.parse(localStorage.getItem("selectedGears")) || ALL_GEARS;

const ICONS = {
  "Cactus": "🌵", "Strawberry": "🍓", "Pumpkin": "🎃", "Sunflower": "🌻",
  "Dragon Fruit": "🐉", "Eggplant": "🍆", "Watermelon": "🍉", "Grape Seed": "🍇",
  "Cocotank": "🥥", "Carnivorous Plant": "🪴", "Mr Carrot": "🥕", "Tomatrio": "🍅",
  "Shroombino": "🍄", "Mango": "🥭", "King Limone": "🍋",
  "Water Bucket": "🪣", "Frost Grenade": "🧊", "Banana Gun": "🍌🔫",
  "Frost Blower": "❄️", "Carrot Launcher": "🥕🚀"
};

// 🌐 Detect if running inside Median APK
const isMedian = typeof window.Median !== "undefined";

// 🎵 Alarm sound
const alarmSound = new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg");
alarmSound.loop = true;

/* 🔔 Notification (smart: Median or Web) */
function showNotification(foundItems) {
  const message = foundItems.join(", ");
  console.log("🔔 Sending notification:", message);

  if (isMedian && window.Median.sendNotification) {
    // ✅ Native Android push (Median)
    window.Median.sendNotification({
      title: "🚨 Rare Item Found!",
      message,
      icon: "https://cdn-icons-png.flaticon.com/512/4151/4151022.png"
    });
  } else if ("Notification" in window && Notification.permission === "granted") {
    // ✅ Browser notification
    new Notification("🚨 Rare Item Found!", {
      body: message,
      icon: "https://cdn-icons-png.flaticon.com/512/4151/4151022.png",
      vibrate: [300, 200, 300],
      requireInteraction: true
    });
  } else if (navigator.serviceWorker?.controller) {
    // ✅ Service worker fallback
    navigator.serviceWorker.controller.postMessage({
      type: "SHOW_NOTIFICATION",
      payload: { message }
    });
  }

  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

/* 🎵 Unlock Audio Context */
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  alarmSound.play().then(() => {
    alarmSound.pause();
    alarmSound.currentTime = 0;
    audioUnlocked = true;
  }).catch(() => console.warn("🔇 Autoplay blocked, waiting for user gesture"));
}
document.addEventListener("click", unlockAudio, { once: true });
document.addEventListener("touchstart", unlockAudio, { once: true });

/* 🚨 Trigger Alarm */
function triggerAlarm(foundItems) {
  console.log("🚨 Alarm triggered for:", foundItems);
  showPopup("🚨 " + foundItems.join(", ") + " found!");
  showNotification(foundItems);

  document.body.style.backgroundColor = "#ffcccc";
  document.getElementById("stopSoundBtn").style.display = "block";

  alarmSound.currentTime = 0;
  alarmSound.play().catch(() => console.warn("🔇 Autoplay blocked."));

  if (alarmInterval) clearInterval(alarmInterval);
  alarmInterval = setInterval(() => {
    showNotification(foundItems);
    playBeepLoop();
  }, 15000);
}

/* 🛑 Stop Alarm */
function stopSound() {
  alarmSound.pause();
  alarmSound.currentTime = 0;
  clearInterval(alarmInterval);
  alarmInterval = null;
  document.body.style.backgroundColor = "#f4f4f9";
  document.getElementById("stopSoundBtn").style.display = "none";
}

/* 🎵 Simple Beep */
function playBeepLoop() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  gain.gain.value = 0.1;
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  setTimeout(() => osc.stop(), 600);
}

/* 🕒 Time Display */
function updateDateTime() {
  const now = new Date();
  document.getElementById("timeDisplay").textContent =
    "📅 " + now.toLocaleString("en-US", {
      weekday: "long", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
}

/* 🌐 Fetch Stock Data */
async function fetchStockData(isRetry = false, isManual = false) {
  const overlay = document.getElementById("loadingOverlay");
  const refreshBtn = document.getElementById("refreshBtn");
  const stockData = document.getElementById("stockData");

  try {
    if (!isRetry || isManual) {
      overlay.style.display = "flex";
      refreshBtn.classList.add("spinning");
    }

    const timestamp = Date.now();
    const [seedsRes, gearRes] = await Promise.all([
      fetch(`https://pvbstockbackend.onrender.com/seed_proxy.php?t=${timestamp}`),
      fetch(`https://pvbstockbackend.onrender.com/gear_proxy.php?t=${timestamp}`)
    ]);

    const [seeds, gear] = await Promise.all([seedsRes.json(), gearRes.json()]);
    const latestTime = seeds[0]?.created_at;

    if (lastCreatedAt && lastCreatedAt === latestTime) {
      console.log("⏳ No new data, retrying...");
      setTimeout(() => fetchStockData(true), RETRY_DELAY * 1000);
      return;
    }

    lastCreatedAt = latestTime;
    console.log("✅ New data loaded");

    stockData.innerHTML = `
      <div class="section-title">🌱 SEEDS STOCK
        <button id="refreshBtnInner" class="refresh-top-btn">🔄</button>
      </div>
      ${renderItems(seeds, "seeds")}
      <div class="section-title">⚙️ GEAR STOCK</div>
      ${renderItems(gear, "gear")}
      <div class="timestamp">Updated: ${new Date(latestTime).toLocaleString()}</div>
    `;

    document.getElementById("refreshBtnInner")
      ?.addEventListener("click", () => fetchStockData(false, true));

    const foundSeeds = selectedSeeds.filter(s =>
      seeds.some(i => i.display_name.toLowerCase().includes(s.toLowerCase()))
    );
    const foundGears = selectedGears.filter(g =>
      gear.some(i => i.display_name.toLowerCase().includes(g.toLowerCase()))
    );

    if (foundSeeds.length || foundGears.length)
      triggerAlarm([...foundSeeds, ...foundGears]);

  } catch (err) {
    console.error("❌ Fetch error:", err);
    setTimeout(() => fetchStockData(true), RETRY_DELAY * 1000);
  } finally {
    overlay.style.display = "none";
    refreshBtn.classList.remove("spinning");
  }
}

/* 🧾 Render */
function renderItems(items, type) {
  return items.map(item => {
    const icon = ICONS[item.display_name] || (type === "seeds" ? "🌱" : "⚙️");
    return `<div class="stock-list">
        <span>${icon} ${item.display_name}</span>
        <span>x${item.multiplier}</span>
      </div>`;
  }).join("");
}

/* ⚙️ Settings Modal */
function openSettings() {
  const modal = document.getElementById("settingsModal");
  const seedSettings = document.getElementById("seedSettings");
  const gearSettings = document.getElementById("gearSettings");

  seedSettings.innerHTML = ALL_SEEDS.map(seed =>
    `<div><input type="checkbox" id="${seed}" ${selectedSeeds.includes(seed) ? "checked" : ""}>
     <label for="${seed}">${ICONS[seed]} ${seed}</label></div>`).join("");

  gearSettings.innerHTML = ALL_GEARS.map(gear =>
    `<div><input type="checkbox" id="${gear}" ${selectedGears.includes(gear) ? "checked" : ""}>
     <label for="${gear}">${ICONS[gear]} ${gear}</label></div>`).join("");

  modal.style.display = "flex";
}

function closeSettings() {
  document.getElementById("settingsModal").style.display = "none";
}

function saveSettings() {
  const seedSettings = document.getElementById("seedSettings");
  const gearSettings = document.getElementById("gearSettings");

  selectedSeeds = [...seedSettings.querySelectorAll("input:checked")].map(el => el.id);
  selectedGears = [...gearSettings.querySelectorAll("input:checked")].map(el => el.id);
  localStorage.setItem("selectedSeeds", JSON.stringify(selectedSeeds));
  localStorage.setItem("selectedGears", JSON.stringify(selectedGears));

  alert("✅ Settings saved!");
  closeSettings();
}

/* 🔔 Popup Notification */
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

/* 🧠 Initialize */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("stopSoundBtn").addEventListener("click", stopSound);
  document.getElementById("refreshBtn").addEventListener("click", () => fetchStockData(false, true));
  document.getElementById("settingsBtn").addEventListener("click", openSettings);

  setInterval(updateDateTime, 1000);
  updateDateTime();
  fetchStockData();
});
