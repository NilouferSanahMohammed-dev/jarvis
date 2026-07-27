/**
 * Vercel serverless function: /api/chat
 *
 * This is what gives jarvis actual open-ended conversation instead of
 * only the built-in rule-based commands. It's a thin proxy: the
 * browser sends a message, this function calls Anthropic's API using
 * a key that lives only in Vercel's environment variables (never in
 * the browser, never in this repo), and sends back a reply.
 *
 * Deploy this whole repo to Vercel, add an ANTHROPIC_API_KEY
 * environment variable in the project settings, then point
 * AI_CHAT_ENDPOINT in commands.js at your deployed URL. See the
 * README for the full walkthrough.
 */

const SYSTEM_PROMPT = `You are jarvis, a holographic HUD assistant with a dry, understated wit,
inspired by the "genius with a talking HUD" archetype, but your own
original personality, not a copy of any specific character's dialogue.
Keep replies short (1-3 sentences), conversational, and spoken out loud
by a text-to-speech engine, so avoid text-only formatting like bullet
points, asterisks, or markdown. If the person's name is known, you can
use it occasionally, but don't overdo it.`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  try {
    const { message, name, history = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "missing message" });
    }

    const nameNote = name ? ` The person's name is ${name}.` : "";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: SYSTEM_PROMPT + nameNote,
        messages: [
          ...history.slice(-8).map((turn) => ({
            role: turn.role === "jarvis" ? "assistant" : "user",
            content: turn.content,
          })),
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return res.status(502).json({ error: "upstream error" });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text?.trim() || "I'm not sure how to respond to that.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal error" });
  }
}
