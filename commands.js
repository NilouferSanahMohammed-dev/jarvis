/**
 * jarvis command handling
 * -------------------------
 * A small, readable command matcher. Each entry has a `test(input)`
 * that returns true if it should handle the phrase, and a `run(input)`
 * that returns either a string or a Promise<string> reply. The first
 * matching command wins, so more specific tests should sit above more
 * general ones in the COMMANDS array.
 *
 * To add a new command: add an object to COMMANDS with your own test
 * and run functions. Nothing else needs to change.
 *
 * Anything that doesn't match a built-in command falls through to
 * askAI(), which is real open-ended conversation via a small backend
 * you deploy yourself (see README). Without that backend configured,
 * it just returns a plain "I don't have a command for that" message,
 * same as before, nothing breaks if you skip this part.
 */

const AI_CHAT_ENDPOINT = ""; // e.g. "https://your-app.vercel.app/api/chat"

async function askAI(message, context) {
  if (!AI_CHAT_ENDPOINT) {
    return `I heard "${message}", but I don't have a command for that yet. Try "help" to see what I can do.`;
  }

  try {
    const res = await fetch(AI_CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        name: context?.name || "",
        history: context?.history || [],
      }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    return data.reply || "I didn't quite catch that.";
  } catch (err) {
    console.error("jarvis: askAI failed", err);
    return "I couldn't reach my thinking backend just now. Try again in a moment, or ask me something I have a built-in command for.";
  }
}

const JOKES = [
  "why do programmers prefer dark mode? because light attracts bugs.",
  "there are only 10 types of people: those who understand binary, and those who don't.",
  "i told my computer i needed a break. now it won't stop sending me kit kats.",
  "why did the developer go broke? because they used up all their cache.",
  "i would tell you a udp joke, but you might not get it.",
];

function extractMathExpression(text) {
  const words = text
    .replace(/plus/g, "+")
    .replace(/minus/g, "-")
    .replace(/times|multiplied by/g, "*")
    .replace(/divided by/g, "/")
    .replace(/what is|what's|calculate|equals|=/g, "")
    .trim();

  if (!/^[0-9+\-*/.\s]+$/.test(words) || words.length === 0) return null;

  try {
    // Safe-ish: input is restricted to digits and + - * / . and whitespace above.
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${words})`)();
    if (typeof result === "number" && Number.isFinite(result)) return result;
  } catch {
    return null;
  }
  return null;
}

const SITE_MAP = {
  youtube: "https://youtube.com",
  github: "https://github.com",
  wikipedia: "https://wikipedia.org",
  google: "https://google.com",
  gmail: "https://mail.google.com",
  spotify: "https://open.spotify.com",
};

const WEATHER_CODES = {
  0: "clear sky", 1: "mostly clear", 2: "partly cloudy", 3: "overcast",
  45: "fog", 48: "icy fog", 51: "light drizzle", 61: "light rain",
  63: "rain", 65: "heavy rain", 71: "light snow", 73: "snow",
  75: "heavy snow", 80: "rain showers", 95: "a thunderstorm",
};

function getWeather() {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve("i don't have access to your location, so I can't check the weather.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`;
          const res = await fetch(url);
          const data = await res.json();
          const temp = Math.round(data.current.temperature_2m);
          const desc = WEATHER_CODES[data.current.weather_code] || "conditions I can't quite place";
          resolve(`it's ${temp} degrees with ${desc} right now.`);
        } catch {
          resolve("I reached out for the weather but the signal dropped.");
        }
      },
      () => resolve("I'll need location access to check the weather for you."),
      { timeout: 6000 }
    );
  });
}

const FACTS = [
  "a group of flamingos is called a flamboyance.",
  "octopuses have three hearts, and two of them stop beating when they swim.",
  "the shortest war in recorded history lasted 38 minutes, between Britain and Zanzibar in 1896.",
  "bananas are berries, but strawberries technically aren't.",
  "honey never spoils. archaeologists have found edible honey in ancient Egyptian tombs.",
  "a day on Venus is longer than a year on Venus.",
];

const WORLD_CLOCK_ZONES = {
  london: "Europe/London",
  paris: "Europe/Paris",
  berlin: "Europe/Berlin",
  tokyo: "Asia/Tokyo",
  "new york": "America/New_York",
  "los angeles": "America/Los_Angeles",
  chicago: "America/Chicago",
  sydney: "Australia/Sydney",
  dubai: "Asia/Dubai",
  mumbai: "Asia/Kolkata",
  singapore: "Asia/Singapore",
  toronto: "America/Toronto",
};

const UNIT_CONVERSIONS = {
  "km to miles": (n) => (n * 0.621371).toFixed(2) + " miles",
  "miles to km": (n) => (n * 1.60934).toFixed(2) + " km",
  "kg to lbs": (n) => (n * 2.20462).toFixed(2) + " lbs",
  "lbs to kg": (n) => (n * 0.453592).toFixed(2) + " kg",
  "celsius to fahrenheit": (n) => (n * 9 / 5 + 32).toFixed(1) + " degrees fahrenheit",
  "fahrenheit to celsius": (n) => (((n - 32) * 5) / 9).toFixed(1) + " degrees celsius",
};

const NOTES_KEY = "jarvis-notes-v1";

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY)) || [];
  } catch {
    return [];
  }
}

function saveNote(text) {
  const notes = loadNotes();
  notes.push(text);
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

/**
 * Strips the wake phrase ("hey jarvis" / "jarvis") and common polite
 * filler ("could you", "can you", "please", and so on) from the front
 * of whatever the person said, so "hey jarvis could you open youtube"
 * and "jarvis open youtube" and plain "open youtube" all end up as the
 * same normalized command underneath.
 */
function normalizeInput(rawInput) {
  let text = rawInput.trim().toLowerCase();
  text = text.replace(/\bhey jarvis\b/g, "").replace(/\bjarvis\b/g, "");
  text = text.trim();

  const fillerPrefixes = [
    /^could you\s+/, /^can you\s+/, /^would you\s+/, /^will you\s+/,
    /^please\s+/, /^can u\s+/, /^hey\s+/,
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of fillerPrefixes) {
      if (pattern.test(text)) {
        text = text.replace(pattern, "");
        changed = true;
      }
    }
  }

  return text.replace(/\s+/g, " ").replace(/[?.!]+$/, "").trim();
}

const COMMANDS = [
  {
    test: (t) => /^(hi|hello|hey)\b/.test(t),
    run: () => "hello. all systems nominal, for whatever that's worth at this hour.",
  },
  {
    test: (t) => /who are you|what('s| is) your name/.test(t),
    run: (t, ctx) =>
      ctx?.name
        ? `jarvis. at your service, ${ctx.name}. I run the interface, you run everything else.`
        : "jarvis. at your service, more or less. I run the interface, you run everything else.",
  },
  {
    test: (t) => /^call me /.test(t),
    run: (t) => {
      const name = t.replace(/^call me /, "").trim();
      if (!name) return "call you what?";
      window.dispatchEvent(new CustomEvent("jarvis-name-changed", { detail: { name } }));
      return `got it, ${name}. I'll remember that.`;
    },
  },
  {
    test: (t) => /what('s| is) my name/.test(t),
    run: (t, ctx) => (ctx?.name ? `you're ${ctx.name}, as far as I know.` : "I don't have a name for you yet, try saying 'call me' followed by your name."),
  },
  {
    test: (t) => /my tasks|my to.?do|on my list|what.*i.*do today/.test(t),
    run: () => (typeof taskSummarySentence === "function" ? taskSummarySentence() : "I can't check tasks in this build."),
  },
  {
    test: (t) => /what time is it|current time/.test(t),
    run: () => `it's ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
  },
  {
    test: (t) => /what('s| is) (the )?date|what day is it/.test(t),
    run: () => `it's ${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}.`,
  },
  {
    test: (t) => /weather/.test(t),
    run: () => getWeather(),
  },
  {
    test: (t) => /joke/.test(t),
    run: () => JOKES[Math.floor(Math.random() * JOKES.length)],
  },
  {
    test: (t) => /^(what is|what's|calculate)\b.*[\d]/.test(t),
    run: (t) => {
      const result = extractMathExpression(t);
      return result === null
        ? "I couldn't parse that as math. try something like 'what is 12 plus 4'."
        : `that comes out to ${result}.`;
    },
  },
  {
    test: (t) => Object.keys(SITE_MAP).some((site) => new RegExp(`\\b${site}\\b`).test(t)),
    run: (t) => {
      const target = Object.keys(SITE_MAP).find((site) => new RegExp(`\\b${site}\\b`).test(t));
      window.open(SITE_MAP[target], "_blank");
      return `opening ${target}.`;
    },
  },
  {
    test: (t) => /^open /.test(t),
    run: (t) => {
      const target = t.replace(/^open /, "").trim();
      return `I don't have a shortcut for "${target}" yet, try "search for ${target}" instead.`;
    },
  },
  {
    test: (t) => /search( for)?\s+.+/.test(t),
    run: (t) => {
      const match = t.match(/search( for)?\s+(.+)/);
      const query = match ? match[2].trim() : t;
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
      return `searching for ${query}.`;
    },
  },
  {
    test: (t) => /^(email|send (an )?email|compose (an )?email)\b/.test(t),
    run: (t) => {
      let rest = t.replace(/^(email|send (an )?email|compose (an )?email)\b\s*/, "").trim();
      let to = "";
      const toMatch = rest.match(/^to\s+([a-z]+)\s*/);
      if (toMatch) {
        to = toMatch[1];
        rest = rest.slice(toMatch[0].length).trim();
      }
      const subject = rest.replace(/^about\s+/, "").trim() || "quick note";
      window.open(`mailto:?subject=${encodeURIComponent(subject)}`, "_blank");
      return to
        ? `I've opened a blank email with the subject set to "${subject}". I don't have access to your contacts, so you'll need to add ${to}'s address yourself.`
        : `I've opened a blank email with the subject set to "${subject}". add the recipient yourself, I don't have access to your contacts.`;
    },
  },
  {
    test: (t) => /^set a timer for|^timer for/.test(t),
    run: (t) => {
      const match = t.match(/(\d+)\s*(second|minute|hour)/);
      if (!match) return "tell me a duration, like 'set a timer for 5 minutes'.";
      const amount = Number(match[1]);
      const unit = match[2];
      const ms = amount * (unit === "hour" ? 3600000 : unit === "minute" ? 60000 : 1000);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("jarvis-timer-done", { detail: { amount, unit } }));
      }, ms);
      return `timer set for ${amount} ${unit}${amount === 1 ? "" : "s"}.`;
    },
  },
  {
    test: (t) => /^define /.test(t),
    run: async (t) => {
      const word = t.replace(/^define /, "").trim();
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        if (!res.ok) return `I couldn't find a definition for "${word}".`;
        const data = await res.json();
        const definition = data[0]?.meanings?.[0]?.definitions?.[0]?.definition;
        return definition ? `${word}: ${definition}` : `I couldn't find a clean definition for "${word}".`;
      } catch {
        return "I couldn't reach the dictionary just now.";
      }
    },
  },
  {
    test: (t) => /flip a coin|coin flip/.test(t),
    run: () => (Math.random() < 0.5 ? "heads." : "tails."),
  },
  {
    test: (t) => /roll a( d\d+)?( )?dice|roll a d\d+/.test(t),
    run: (t) => {
      const match = t.match(/d(\d+)/);
      const sides = match ? Number(match[1]) : 6;
      const result = Math.floor(Math.random() * sides) + 1;
      return `rolled a ${result}, out of ${sides}.`;
    },
  },
  {
    test: (t) => /^(take a note|note this|remember this)[:\s]/.test(t),
    run: (t) => {
      const note = t.replace(/^(take a note|note this|remember this)[:\s]/, "").trim();
      if (!note) return "what should I note down?";
      saveNote(note);
      return "noted.";
    },
  },
  {
    test: (t) => /(read|show|what are) my notes/.test(t),
    run: () => {
      const notes = loadNotes();
      if (notes.length === 0) return "you don't have any notes saved yet.";
      return `you've got ${notes.length} note${notes.length === 1 ? "" : "s"}: ${notes.join(". ")}.`;
    },
  },
  {
    test: (t) => /^remind me to /.test(t),
    run: (t) => {
      const match = t.match(/^remind me to (.+?) in (\d+)\s*(second|minute|hour)/);
      if (!match) return "tell me what to remind you of and when, like 'remind me to stretch in 10 minutes'.";
      const [, task, amountStr, unit] = match;
      const amount = Number(amountStr);
      const ms = amount * (unit === "hour" ? 3600000 : unit === "minute" ? 60000 : 1000);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("jarvis-reminder-done", { detail: { task } }));
      }, ms);
      return `I'll remind you to ${task} in ${amount} ${unit}${amount === 1 ? "" : "s"}.`;
    },
  },
  {
    test: (t) => /what time is it in |time in /.test(t),
    run: (t) => {
      const city = t.replace(/.*time is it in |.*time in /, "").trim();
      const zone = WORLD_CLOCK_ZONES[city];
      if (!zone) return `I don't have a timezone mapped for "${city}" yet.`;
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: zone });
      return `it's ${time} in ${city}.`;
    },
  },
  {
    test: (t) => /^convert /.test(t),
    run: (t) => {
      const match = t.match(/^convert ([\d.]+)\s*(.+?) to (.+)/);
      if (!match) return "try something like 'convert 10 km to miles'.";
      const [, amountStr, fromUnit, toUnit] = match;
      const key = `${fromUnit.trim()} to ${toUnit.trim()}`;
      const converter = UNIT_CONVERSIONS[key];
      if (!converter) return `I don't know how to convert ${fromUnit.trim()} to ${toUnit.trim()} yet.`;
      return `${amountStr} ${fromUnit.trim()} is ${converter(Number(amountStr))}.`;
    },
  },
  {
    test: (t) => /tell me a fact|random fact/.test(t),
    run: () => FACTS[Math.floor(Math.random() * FACTS.length)],
  },
  {
    test: (t) => /battery/.test(t),
    run: async () => {
      if (!navigator.getBattery) return "I don't have access to battery information in this browser.";
      try {
        const battery = await navigator.getBattery();
        const percent = Math.round(battery.level * 100);
        return `you're at ${percent}% battery${battery.charging ? ", and charging" : ""}.`;
      } catch {
        return "I couldn't read the battery status.";
      }
    },
  },
  {
    test: (t) => /help|what can you do/.test(t),
    run: () =>
      "the time, date, or weather, a joke, quick math, unit conversions, the time somewhere else in the world, a random fact, your battery level, defining a word, flipping a coin, rolling a dice, taking notes, setting reminders and timers, opening a site, searching the web, drafting an email, checking your tasks for today if you use daily deck, or remembering your name if you tell me to call you something. within reason, I'm at your disposal.",
  },
];

async function handleCommand(rawInput, context = {}) {
  const input = normalizeInput(rawInput);
  if (!input) return "I didn't catch that.";

  for (const command of COMMANDS) {
    if (command.test(input)) {
      return await command.run(input, context);
    }
  }

  return await askAI(rawInput, context);
}
