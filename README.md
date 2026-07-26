# jarvis 🔵

A holographic HUD assistant with a name and a personality on purpose. Circular rings, a glowing core that pulses when it's listening or talking, voice commands, spoken replies, hands-free wake word activation, and a growing set of real abilities.

![status](https://img.shields.io/badge/status-active-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue)

I'll be upfront about the one thing worth being upfront about: this is my own build, inspired by that "genius with a talking HUD in the workshop" feeling everyone knows. The name and vibe are a personal homage, but the actual code, design, and voice lines here are all original. No Marvel logos, no lifted dialogue, just the same idea built from scratch in the browser.

## First time you open it

It asks what to call you, once, and remembers it in that browser from then on (there's no account or server behind this, so "remembering you" means "remembering this browser," not you specifically across every device). After that, it greets you by name every time you load the page. You can change it later any time by saying "call me" followed by a new name, or ask "what's my name" to hear what it currently has saved.

## Two ways to talk to it

**Tap the core** (where "jarvis" is written), say one thing, done. Works every time, no setup needed.

**Say "hey jarvis"**, hands-free, if you turn on the toggle in the top right corner. This keeps the microphone continuously listening in the background for the wake phrase specifically, nothing else gets sent anywhere or acted on until you say it. When it's on, the outer ring gets a slow amber pulse so it's always visually obvious the mic is live. Say "hey jarvis" alone and it'll wait for your next sentence, or say the whole thing in one breath, like "hey jarvis, what's the weather," and it skips straight to answering.

This is an opt-in toggle rather than always on by default, continuously listening in the background is a real thing worth being asked about first, not something a page should just start doing on its own.

## Talking to it naturally

Commands don't need to be exact. All of these do the same thing:

- "open youtube"
- "jarvis youtube"
- "hey jarvis could you open youtube"
- "hey jarvis, open youtube please"

Under the hood, it strips the wake phrase and common filler words ("could you," "can you," "please," and so on) before trying to match a command, so the phrasing around the actual request doesn't have to be exact. It also recognizes a known site name anywhere in the sentence, not just right after the word "open."

## What it can actually do

**Basics**
- Tell you the time or date
- Check the real weather for your location
- Tell you a random fact
- Tell a joke, if your standards are low

**Useful stuff**
- Quick math, like "what is 12 plus 4"
- Unit conversions, like "convert 10 km to miles" (also handles miles to km, kg to lbs, lbs to kg, and celsius to fahrenheit both ways)
- The time somewhere else in the world, like "what time is it in tokyo"
- Look up a word's definition, like "define ephemeral"
- Check your device's battery level, if your browser supports it

**For fun**
- Flip a coin
- Roll a dice (or a specific one, like "roll a d20")

**Memory**
- Take a note, like "take a note: buy milk", then ask "what are my notes" any time
- Set a reminder, like "remind me to stretch in 10 minutes"
- Set a plain timer, like "set a timer for 5 minutes"
- Remembers your name, and lets you change it with "call me" followed by a new one

**Utility**
- Open a site ("open youtube", "open github")
- Search the web ("search for mechanical keyboards")

Every response is both shown briefly on screen and spoken out loud.

## A note on browser support

Voice *input* uses the `SpeechRecognition` API, which Chrome and Edge support well, but Firefox and Safari currently don't. If your browser doesn't support it, tapping the core won't do anything and the wake word toggle hides itself, so the hint text switches to telling you to type instead, which works everywhere.

Voice *output* (the spoken replies) uses `SpeechSynthesis`, which is supported much more broadly, so that part should work in most modern browsers regardless.

## Running it

Open `index.html` in Chrome or Edge for the full voice experience, or any modern browser for the typed version:

```bash
npx serve .
```

Voice recognition also needs to run over HTTPS (or localhost) to work at all, that's a browser security requirement, not something this project can work around, so if you deploy it, make sure it's served over HTTPS (GitHub Pages does this by default).

## How commands are structured

Every command lives in `commands.js` as one object with a `test` (does this phrase match?) and a `run` (what do we say back?):

```js
{
  test: (t) => /joke/.test(t),
  run: () => JOKES[Math.floor(Math.random() * JOKES.length)],
}
```

Add a new one anywhere in the `COMMANDS` array in `commands.js` and it's live immediately, no other file needs to change. Order matters a little: more specific patterns should sit above more general ones, since the first match wins. Every phrase passes through `normalizeInput()` first, which strips the wake word and common filler before any command sees it, so you don't need to account for that yourself.

## Making the personality your own

The voice of this thing lives entirely in the plain strings inside `commands.js`. Want it drier, warmer, more formal, more sarcastic? Just rewrite the `run()` return strings, there's no framework or template layer to fight with, it's just text.

## Customizing

- **Colors and the ring animation** are CSS variables and keyframes at the top of `style.css`.
- **The decorative "power" readout** in the corner is just for flavor, it's not measuring anything real, it's in `script.js` if you want to wire it to something real like the Battery Status API.
- **Voice tone**: `utterance.rate` and `utterance.pitch` in the `speak()` function in `script.js` control how the responses sound.
- **World clock cities**: add more entries to `WORLD_CLOCK_ZONES` in `commands.js`, each one just needs a valid IANA timezone name.
- **Unit conversions**: add more entries to `UNIT_CONVERSIONS` in `commands.js`, each one is just a small function.
- **The wake phrase itself**: `WAKE_PATTERN` near the top of the voice recognition section in `script.js` is just a regular expression, change it if you'd rather it respond to a different name.
- **Filler words it ignores**: the `fillerPrefixes` list inside `normalizeInput()` in `commands.js`, add more polite phrasings there if you keep saying something it doesn't strip yet.

## License

MIT. Build your own version, give it your own name and your own voice.
