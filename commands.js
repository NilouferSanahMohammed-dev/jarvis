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
 */

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

const COMMANDS = [
  {
    test: (t) => /^(hi|hello|hey)\b/.test(t),
    run: () => "hello. all systems nominal, for whatever that's worth at this hour.",
  },
  {
    test: (t) => /who are you|what('s| is) your name/.test(t),
    run: () => "jarvis. at your service, more or less. I run the interface, you run everything else.",
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
    test: (t) => /^open /.test(t),
    run: (t) => {
      const target = t.replace(/^open /, "").trim();
      const url = SITE_MAP[target];
      if (url) {
        window.open(url, "_blank");
        return `opening ${target}.`;
      }
      return `I don't have a shortcut for "${target}" yet, try "search for ${target}" instead.`;
    },
  },
  {
    test: (t) => /^search( for)? /.test(t),
    run: (t) => {
      const query = t.replace(/^search( for)? /, "").trim();
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
      return `searching for ${query}.`;
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
    test: (t) => /help|what can you do/.test(t),
    run: () =>
      "the time, the date, the weather, a joke if your standards are low, quick math, opening a site, searching the web, or setting a timer. within reason, I'm at your disposal.",
  },
];

async function handleCommand(rawInput) {
  const input = rawInput.trim().toLowerCase();
  if (!input) return "I didn't catch that.";

  for (const command of COMMANDS) {
    if (command.test(input)) {
      return await command.run(input);
    }
  }

  return `I heard "${rawInput}", but I don't have a command for that yet. Try "help" to see what I can do.`;
}
