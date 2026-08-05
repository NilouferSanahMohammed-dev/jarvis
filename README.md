# jarvis 🔵

A holographic HUD assistant with a name and a personality on purpose. Circular rings, a glowing core that pulses when it's listening or talking, voice commands, spoken replies, hands-free wake word activation, and a growing set of real abilities.

![status](https://img.shields.io/badge/status-active-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue)

I'll be upfront about the one thing worth being upfront about: this is my own build, inspired by that "genius with a talking HUD in the workshop" feeling everyone knows. The name and vibe are a personal homage, but the actual code, design, and voice lines here are all original. No Marvel logos, no lifted dialogue, just the same idea built from scratch in the browser.

## First time you open it

It asks what to call you, once, and remembers it in that browser from then on (there's no account or server behind this, so "remembering you" means "remembering this browser," not you specifically across every device). After that, it greets you by name every time you load the page. You can change it later any time by saying "call me" followed by a new name, or ask "what's my name" to hear what it currently has saved.

## Two ways to talk to it

**Tap the core** (where "jarvis" is written), say one thing, done. Works every time, no setup needed.

**Say "hey jarvis"**, hands-free. This is on by default: the microphone continuously listens in the background for the wake phrase specifically, nothing else gets sent anywhere or acted on until you say it. You can turn it off any time with the toggle in the top right corner. When it's on, the outer ring gets a slow amber pulse so it's always visually obvious the mic is live. Say "hey jarvis" alone and it'll wait for your next sentence, or say the whole thing in one breath, like "hey jarvis, what's the weather," and it skips straight to answering.

One browser quirk worth knowing: microphones can only be activated after you've actually interacted with the page in some way, clicked, tapped, typed, that's a security rule every browser enforces, not something this project can bypass. So on your very first visit, hands-free listening arms itself the moment you do anything at all on the page, typing your name into the identity prompt counts. If you ever grant then later block microphone access in your browser's site settings, the hint text will tell you plainly instead of just failing silently.

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
- Checks your tasks for today ("what are my tasks") if you're also using my `daily-deck` project in the same browser, see below for how that actually works

**Utility**
- Open a site ("open youtube", "open github")
- Search the web ("search for mechanical keyboards")
- Draft an email ("email about the project update"), opens a real blank email with the subject filled in, ready for you to address and send

Every response is both shown briefly on screen and spoken out loud.

## The daily-deck connection

If you're also using my `daily-deck` task manager, jarvis can genuinely read what's on your list, not through an API, just through a shared browser storage key. Every one of my projects is deployed under the same `niloufersanahmohammed-dev.github.io` domain, and browsers scope `localStorage` to the domain rather than the specific page, so both projects are quietly reading and writing the same storage. Add a task in daily-deck, open jarvis in that same browser, and a few seconds after it greets you, it'll mention how many tasks you've got due today and what they are, or you can just ask "what are my tasks" any time.

The real limitation: this only works within one browser on one device, since that's the actual boundary of what `localStorage` shares. Tasks added on your laptop won't show up when you ask jarvis on your phone.

## How it works, in plain English

- Whatever you say or type gets cleaned up first: the wake phrase and polite filler words get stripped out, so "hey jarvis could you open youtube please" and "open youtube" end up meaning the same thing
- That cleaned-up text gets checked against a list of known command patterns, top to bottom, first match wins
- Matched something? Run that command's logic and speak the result
- Matched nothing, and a backend's configured? Send it to the AI instead, along with the last few things you've said, and speak whatever it replies
- Matched nothing, and no backend's configured? Say so plainly instead of pretending to understand
- In hands-free mode, the mic stays on continuously, but everything above only runs once it actually hears "jarvis" in what you said, anything else gets ignored

## Actual open-ended conversation

Everything above is instant, free, and works the moment you open the page, it's all pattern matching, no AI involved. But if you ask it something that isn't one of those built-in commands, like "what do you think about..." or just a normal back-and-forth question, it can hand that off to a real language model instead of shrugging.

This needs a small backend, because a language model API key can't safely live in a public repo's frontend code, anyone could pull it straight out of the page source and run up charges on your account. So the key lives server-side, and the browser only ever talks to your own backend, never to the AI provider directly.

### Setting it up

1. **Get an Anthropic API key** at [console.anthropic.com](https://console.anthropic.com). This is a paid API (Claude Haiku, the model this uses by default, is inexpensive, but it isn't free, keep an eye on usage).
2. **Deploy this whole repo to [Vercel](https://vercel.com)** (or any host that runs serverless functions the same way, Vercel is just the path of least resistance here). The `/api/chat.js` file in this repo is already written as a Vercel serverless function.
3. In your Vercel project settings, add an environment variable: `ANTHROPIC_API_KEY` set to the key from step 1. (See `.env.example` for the shape.)
4. Open `commands.js` and set:
   ```js
   const AI_CHAT_ENDPOINT = "https://your-app.vercel.app/api/chat";
   ```
5. Redeploy (or just push the change), and open jarvis again. Anything that isn't a built-in command now goes to the AI instead of a dead-end "I don't have a command for that" message.

Without this set up, jarvis works exactly as it did before, all the built-in commands, just no open-ended chat for anything outside them. Nothing breaks if you skip this section entirely.

### What it remembers mid-conversation

The last several exchanges of your conversation get sent along with each new message, so it has some memory of what you just talked about in that session. It doesn't persist between page loads (unlike your name, which does), it's just enough context for the AI to follow a real back-and-forth rather than treating every message as the first thing you've ever said to it.

## What this can't do, on purpose

This runs entirely inside a browser tab, and browsers deliberately sandbox web pages away from the operating system. That's not a gap in this project specifically, it's the same reason no website, from any developer, can restart your computer, close a notification from another app, or read your files without you explicitly choosing them. If a webpage *could* do those things, every malicious site on the internet would too. So voice commands here are limited to what a browser tab can actually reach: opening sites, drafting emails, searching the web, and so on, not controlling the machine itself. A real "control my whole laptop" assistant would need to be a native app installed with OS-level permissions, which is a fundamentally different (and far more sensitive) piece of software than a page you can open with a link.

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
- **The AI's personality**: if you've set up the backend, `SYSTEM_PROMPT` at the top of `api/chat.js` is where its conversational voice is defined, separate from the built-in commands' scripted lines in `commands.js`.

## License

MIT. Build your own version, give it your own name and your own voice.
