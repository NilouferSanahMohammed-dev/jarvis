/**
 * jarvis
 * --------
 * Ties the HUD visuals to the Web Speech API. Voice input uses
 * SpeechRecognition (Chrome and Edge support this well; Firefox and
 * Safari currently don't, hence the text input fallback that always
 * works everywhere). Voice output uses SpeechSynthesis, which is far
 * more broadly supported.
 *
 * Two ways to talk to it:
 *   1. Tap the core, say one thing, done (works whether or not wake
 *      mode is on).
 *   2. Turn on "hey jarvis" mode (top right toggle) for hands-free use.
 *      That keeps the mic continuously listening in the background for
 *      the wake phrase, so nothing gets sent anywhere until you say it.
 */

const coreWrap = document.getElementById("coreWrap");
const coreHint = document.getElementById("coreHint");
const transcript = document.getElementById("transcript");
const textForm = document.getElementById("textForm");
const textInput = document.getElementById("textInput");
const statusEl = document.getElementById("readoutStatus");
const powerEl = document.getElementById("powerVal");
const timeEl = document.getElementById("readoutTime");
const dateEl = document.getElementById("readoutDate");
const tickMarks = document.getElementById("tickMarks");
const wakeToggle = document.getElementById("wakeToggle");
const nameOverlay = document.getElementById("nameOverlay");
const nameForm = document.getElementById("nameForm");
const nameInput = document.getElementById("nameInput");

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

/* ---------------- Name capture (remembered per browser) ---------------- */

const NAME_KEY = "jarvis-user-name";

function getUserName() {
  return localStorage.getItem(NAME_KEY) || "";
}

function setUserName(name) {
  localStorage.setItem(NAME_KEY, name);
}

nameForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = nameInput.value.trim();
  if (!value) return;
  setUserName(value);
  nameOverlay.classList.remove("open");
  greet();
});

/* ---------------- Transcript ---------------- */

function addLine(who, text) {
  const line = document.createElement("p");
  line.className = who === "user" ? "line line-user" : "line line-jarvis";
  line.textContent = text;
  transcript.appendChild(line);
  transcript.scrollTop = transcript.scrollHeight;
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
    statusEl.textContent = wakeModeEnabled ? "listening for \u201chey jarvis\u201d" : "standing by";
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

/* ---------------- Command submission (shared by voice + text) ---------------- */

async function submitCommand(text) {
  addLine("user", text);
  const reply = await handleCommand(text, { name: getUserName() });
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

window.addEventListener("jarvis-name-changed", (e) => {
  setUserName(e.detail.name);
});

/* ---------------- Voice recognition ---------------- */

const WAKE_MODE_KEY = "jarvis-wake-mode";
const WAKE_PATTERN = /\bhey jarvis\b|\bjarvis\b/;

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let listening = false;
let wakeModeEnabled = localStorage.getItem(WAKE_MODE_KEY) !== "off"; // on by default
let awaitingCommand = false;
let micDenied = false;
let wakeAnnounced = false;

function updateWakeToggleUI() {
  wakeToggle.textContent = `hey jarvis: ${wakeModeEnabled ? "on" : "off"}`;
  wakeToggle.classList.toggle("on", wakeModeEnabled);
  coreWrap.classList.toggle("wake-armed", wakeModeEnabled);
  if (!micDenied) {
    coreHint.textContent = wakeModeEnabled ? "say \u201chey jarvis\u201d, or tap me" : "tap to talk";
  }
}

function startRecognition() {
  if (!recognition || micDenied) return;
  recognition.continuous = wakeModeEnabled;
  try { recognition.start(); } catch { /* already running */ }
}

if (SpeechRecognitionAPI) {
  recognition = new SpeechRecognitionAPI();
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    listening = true;
    coreWrap.classList.add("listening");
    statusEl.textContent = wakeModeEnabled ? "listening for \u201chey jarvis\u201d" : "listening";
    if (!wakeModeEnabled) coreHint.textContent = "listening...";

    if (wakeModeEnabled && !wakeAnnounced) {
      wakeAnnounced = true;
      speak("voice activation online. say hey jarvis any time.");
    }
  };

  recognition.onresult = (event) => {
    const raw = event.results[event.results.length - 1][0].transcript;
    const lower = raw.toLowerCase();

    if (!wakeModeEnabled) {
      submitCommand(raw);
      return;
    }

    if (awaitingCommand) {
      awaitingCommand = false;
      coreWrap.classList.remove("awaiting");
      coreHint.textContent = "say \u201chey jarvis\u201d, or tap me";
      submitCommand(raw);
      return;
    }

    if (WAKE_PATTERN.test(lower)) {
      const remainder = raw.replace(/hey jarvis/i, "").replace(/jarvis/i, "").trim();
      if (remainder) {
        submitCommand(remainder);
      } else {
        awaitingCommand = true;
        coreWrap.classList.add("awaiting");
        coreHint.textContent = "yes?";
        setTimeout(() => {
          if (awaitingCommand) {
            awaitingCommand = false;
            coreWrap.classList.remove("awaiting");
            coreHint.textContent = "say \u201chey jarvis\u201d, or tap me";
          }
        }, 6000);
      }
    }
    // Otherwise: ambient speech not directed at jarvis, ignore it.
  };

  recognition.onerror = (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      micDenied = true;
      statusEl.textContent = "microphone blocked";
      coreHint.textContent = "microphone access is blocked, allow it in your browser's site settings, or type below";
    } else if (event.error === "no-speech") {
      // Nothing said during this window, entirely normal in wake mode, ignore it.
    } else {
      statusEl.textContent = "mic error";
    }
  };

  recognition.onend = () => {
    listening = false;
    coreWrap.classList.remove("listening");
    if (micDenied) return;
    if (!wakeModeEnabled) {
      coreHint.textContent = "tap to talk";
      if (statusEl.textContent === "listening") statusEl.textContent = "standing by";
    } else {
      // Continuous mode occasionally ends itself after silence, restart it
      // so hands-free listening keeps working without needing another tap.
      statusEl.textContent = "listening for \u201chey jarvis\u201d";
      setTimeout(() => {
        if (wakeModeEnabled) startRecognition();
      }, 250);
    }
  };

  coreWrap.addEventListener("click", () => {
    if (wakeModeEnabled) {
      if (listening) {
        awaitingCommand = true;
        coreWrap.classList.add("awaiting");
        coreHint.textContent = "yes?";
      } else {
        startRecognition();
      }
      return;
    }
    if (listening) {
      recognition.stop();
    } else {
      startRecognition();
    }
  });

  wakeToggle.addEventListener("click", () => {
    wakeModeEnabled = !wakeModeEnabled;
    localStorage.setItem(WAKE_MODE_KEY, wakeModeEnabled ? "on" : "off");
    updateWakeToggleUI();

    if (wakeModeEnabled) {
      startRecognition();
    } else if (listening) {
      recognition.stop();
    }
  });

  updateWakeToggleUI();

  // Browsers only grant microphone access following a real user gesture,
  // so wake mode (on by default) arms itself the moment the person does
  // anything at all on the page, a click, a tap, a keypress, rather than
  // requiring them to specifically find and press the toggle first.
  const armOnFirstInteraction = () => {
    if (wakeModeEnabled && !listening) startRecognition();
  };
  ["click", "keydown", "touchstart"].forEach((evt) =>
    document.addEventListener(evt, armOnFirstInteraction, { once: true })
  );
} else {
  coreWrap.style.cursor = "default";
  coreHint.textContent = "voice input isn't supported in this browser, type below instead";
  wakeToggle.style.display = "none";
}

/* ---------------- Greeting ---------------- */

function greet() {
  const name = getUserName();
  const wakeNote = wakeModeEnabled
    ? "hands-free is on, just say \u201chey jarvis\u201d any time."
    : "tap me and speak, or just type below.";
  const greeting = name
    ? `good to see you, ${name}. all systems green. ${wakeNote}`
    : `good to see you. all systems green. ${wakeNote}`;
  addLine("jarvis", greeting);
}

setTimeout(() => {
  if (!getUserName()) {
    nameOverlay.classList.add("open");
    nameInput.focus();
  } else {
    greet();
  }
}, 500);
