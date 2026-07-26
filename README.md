# jarvis 🔵

A holographic HUD assistant with a name and a personality on purpose. Circular rings, a glowing core that pulses when it's listening or talking, voice commands, spoken replies, and a growing set of real abilities.

![status](https://img.shields.io/badge/status-active-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue)

I'll be upfront about the one thing worth being upfront about: this is my own build, inspired by that "genius with a talking HUD in the workshop" feeling everyone knows. The name and vibe are a personal homage, but the actual code, design, and voice lines here are all original. No Marvel logos, no lifted dialogue, just the same idea built from scratch in the browser.

## What it can actually do

Tap the core (where "jarvis" is written) and speak, or just type in the box, either works.

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

**Utility**
- Open a site ("open youtube", "open github")
- Search the web ("search for mechanical keyboards")
- Show your conversation history, or clear it

Every response is both shown briefly on screen and spoken out loud.

## About the conversation history

I wanted the screen to stay clean, so there's no permanent chat log cluttering the HUD. Instead, every reply shows up as a brief caption near the core that fades out after a few seconds. Nothing is lost though, every exchange is saved automatically in the background.

To look back at everything you've said, click the "history" button in the top right corner (or just say "show my history"). It opens a panel grouped by day, with a "clear" button if you'd rather start fresh. All of it lives in your browser's local storage, nothing is sent anywhere.

## A note on browser support

Voice *input* uses the `SpeechRecognition` API, which Chrome and Edge support well, but Firefox and Safari currently don't. If your browser doesn't support it, tapping the core won't do anything, so the hint text switches to telling you to type instead, which works everywhere.

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

Add a new one anywhere in the `COMMANDS` array in `commands.js` and it's live immediately, no other file needs to change. Order matters a little: more specific patterns should sit above more general ones, since the first match wins.

## Making the personality your own

The voice of this thing lives entirely in the plain strings inside `commands.js`. Want it drier, warmer, more formal, more sarcastic? Just rewrite the `run()` return strings, there's no framework or template layer to fight with, it's just text.

## Customizing

- **Colors and the ring animation** are CSS variables and keyframes at the top of `style.css`.
- **The decorative "power" readout** in the corner is just for flavor, it's not measuring anything real, it's in `script.js` if you want to wire it to something real like the Battery Status API.
- **Voice tone**: `utterance.rate` and `utterance.pitch` in the `speak()` function in `script.js` control how the responses sound.
- **World clock cities**: add more entries to `WORLD_CLOCK_ZONES` in `commands.js`, each one just needs a valid IANA timezone name.
- **Unit conversions**: add more entries to `UNIT_CONVERSIONS` in `commands.js`, each one is just a small function.

## License

MIT. Build your own version, give it your own name and your own voice.
