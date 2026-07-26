/**
 * jarvis
 * --------
 * Ties the HUD visuals to the Web Speech API. Voice input uses
 * SpeechRecognition (Chrome and Edge support this well; Firefox and
 * Safari currently don't, hence the text input fallback that always
 * works everywhere). Voice output uses SpeechSynthesis, which is far
 * more broadly supported.
 */

const coreWrap = document.getElementById("coreWrap");
const coreHint = document.getElementById("coreHint");
const toast = document.getElementById("toast");
const textForm = document.getElementById("textForm");
const textInput = document.getElementById("textInput");
const statusEl = document.getElementById("readoutStatus");
const powerEl = document.getElementById("powerVal");
const timeEl = document.getElementById("readoutTime");
const dateEl = document.getElementById("readoutDate");
const tickMarks = document.getElementById("tickMarks");
const historyToggle = document.getElementById("historyToggle");
const historyOverlay = document.getElementById("historyOverlay");
const closeHistoryBtn = document.getElementById("closeHistoryBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const historyList = document.getElementById("historyList");

/* ---------------- Decorative edge readouts ---------------- */

function renderClock() {
  const now = new Date();
  timeEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  dateEl.textContent = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
renderClock();
setInterval(renderClock, 1000);

// Ambient "power" readout: gently wanders for flavor, purely decorative.
let power = 98;
setInterval(() => {
  power += (Math.random() - 0.5) * 1.5;
  power = Math.max(90, Math.min(100, power));
  powerEl.textContent = `${power.toFixed(0)}%`;
}, 2200);

// Tick marks around the outer ring, drawn once.
for (let i = 0; i < 60; i++) {
  const angle = (i / 60) * Math.PI * 2;
  const isMajor = i % 5 === 0;
  const r1 = 180, r2 = isMajor ? 172 : 176;
  const x1 = 200 + r1 * Math.cos(angle), y1 = 200 + r1 * Math.sin(angle);
  const x2 = 200 + r2 * Math.cos(angle), y2 = 200 + r2 * Math.sin(angle);
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1); line.setAttribute("y1", y1);
  line.setAttribute("x2", x2); line.setAttribute("y2", y2);
  line.setAttribute("stroke", "#6df3ff");
  line.setAttribute("stroke-opacity", isMajor ? "0.6" : "0.25");
  line.setAttribute("stroke-width", isMajor ? "1.5" : "1");
  tickMarks.appendChild(line);
}

/* ---------------- Toast (the only visible reply, briefly) ---------------- */

let toastTimeoutId = null;

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("visible");
  clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => {
    toast.classList.remove("visible");
  }, 5000);
}

/* ---------------- Persisted history (hidden by default, viewable on demand) ---------------- */

const HISTORY_KEY = "jarvis-history-v1";

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistoryEntry(who, text) {
  const history = loadHistory();
  history.push({ who, text, timestamp: Date.now() });
  // Keep the log from growing forever, the last 500 exchanges is plenty.
  const trimmed = history.slice(-500);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

function renderHistory() {
  const history = loadHistory();
  historyList.innerHTML = "";

  if (history.length === 0) {
    historyList.innerHTML = `<p class="history-empty">nothing logged yet, start a conversation and it'll show up here.</p>`;
    return;
  }

  let lastDay = "";
  history.forEach((entry) => {
    const day = new Date(entry.timestamp).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    if (day !== lastDay) {
      const label = document.createElement("p");
      label.className = "history-day-label";
      label.textContent = day;
      historyList.appendChild(label);
      lastDay = day;
    }
    const line = document.createElement("p");
    line.className = entry.who === "user" ? "history-line history-line-user" : "history-line history-line-jarvis";
    line.textContent = entry.text;
    historyList.appendChild(line);
  });
}

historyToggle.addEventListener("click", () => {
  renderHistory();
  historyOverlay.classList.add("open");
});
closeHistoryBtn.addEventListener("click", () => historyOverlay.classList.remove("open"));
historyOverlay.addEventListener("click", (e) => {
  if (e.target === historyOverlay) historyOverlay.classList.remove("open");
});
clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

function addLine(who, text) {
  saveHistoryEntry(who, text);
  if (who === "jarvis") showToast(text);
}

/* ---------------- Speech synthesis ---------------- */

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.02;
  utterance.pitch = 1.0;

  utterance.onstart = () => {
    coreWrap.classList.add("speaking");
    statusEl.textContent = "responding";
  };
  utterance.onend = () => {
    coreWrap.classList.remove("speaking");
    statusEl.textContent = "standing by";
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

/* ---------------- Command submission (shared by voice + text) ---------------- */

async function submitCommand(text) {
  addLine("user", text);
  const reply = await handleCommand(text);
  addLine("jarvis", reply);
  speak(reply);
}

/* ---------------- Text input fallback ---------------- */

textForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = textInput.value.trim();
  if (!value) return;
  textInput.value = "";
  submitCommand(value);
});

/* ---------------- Timer completion ---------------- */

window.addEventListener("jarvis-timer-done", (e) => {
  const { amount, unit } = e.detail;
  const message = `your ${amount} ${unit}${amount === 1 ? "" : "s"} timer is up.`;
  addLine("jarvis", message);
  speak(message);
});

window.addEventListener("jarvis-reminder-done", (e) => {
  const { task } = e.detail;
  const message = `reminder: ${task}.`;
  addLine("jarvis", message);
  speak(message);
});

window.addEventListener("jarvis-show-history", () => {
  renderHistory();
  historyOverlay.classList.add("open");
});

window.addEventListener("jarvis-clear-history", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

/* ---------------- Voice recognition ---------------- */

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let listening = false;

if (SpeechRecognitionAPI) {
  recognition = new SpeechRecognitionAPI();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    listening = true;
    coreWrap.classList.add("listening");
    coreHint.textContent = "listening...";
    statusEl.textContent = "listening";
  };

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    submitCommand(text);
  };

  recognition.onerror = () => {
    statusEl.textContent = "mic error";
  };

  recognition.onend = () => {
    listening = false;
    coreWrap.classList.remove("listening");
    coreHint.textContent = "tap to talk";
    if (statusEl.textContent === "listening") statusEl.textContent = "standing by";
  };

  coreWrap.addEventListener("click", () => {
    if (listening) {
      recognition.stop();
    } else {
      try { recognition.start(); } catch { /* already started */ }
    }
  });

  coreHint.textContent = "tap to talk";
} else {
  coreWrap.style.cursor = "default";
  coreHint.textContent = "voice input isn't supported in this browser, type below instead";
}

/* ---------------- Greeting ---------------- */

setTimeout(() => {
  const greeting = "good to see you. all systems green. tap me and speak, or just type below, either works.";
  addLine("jarvis", greeting);
}, 500);
