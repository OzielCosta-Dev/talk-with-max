// ---------------------------------------------------------------------------
// index.ts
// The Express web server. The React app (frontend) calls these endpoints:
//
//   GET  /api/health   -> is the server running? is the API key set?
//   POST /api/start    -> Max's first message for a conversation mode
//   POST /api/chat     -> send the conversation, get Max's reply + corrections
//   POST /api/summary  -> end-of-session feedback
//   POST /api/talk     -> Dina's face-to-face reply, streamed as plain text
//
// Why a server at all? The Claude API key is secret. If we called Claude
// directly from the browser, anyone could open DevTools and steal the key.
// The server keeps the key private and only sends back Max's answers.
// ---------------------------------------------------------------------------
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express, { type NextFunction, type Request, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { ApiError as GeminiApiError } from "@google/genai";
import { ZodError } from "zod";

// Find the project root folder (two levels up from server/src or server/dist).
const here = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, "..", "..");

// Load the secret API key from the .env file in the project root.
dotenv.config({ path: path.join(rootDir, ".env"), quiet: true });

// Use Gemini (free tier) when GEMINI_API_KEY is set, otherwise Claude.
const useGemini = Boolean(process.env.GEMINI_API_KEY);
const hasApiKey = useGemini || Boolean(process.env.ANTHROPIC_API_KEY);

// Import our modules AFTER loading .env, so the API client sees the key.
const { chatWithMax, startTeachSession, summarizeSession, streamFaceToFace } = await import(
  useGemini ? "./gemini.js" : "./claude.js"
);
const { MaxError } = await import("./errors.js");
const { MODES } = await import("./prompts.js");
const { ChatRequestSchema, StartRequestSchema, SummaryRequestSchema, TalkRequestSchema } = await import("./schemas.js");

const app = express();
app.use(express.json({ limit: "1mb" })); // parse JSON request bodies

// --- Routes ---------------------------------------------------------------

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasApiKey });
});

app.post("/api/start", async (req, res) => {
  const { level, mode } = StartRequestSchema.parse(req.body);

  // "Teach me" needs a fresh lesson from Claude. The other modes have a
  // fixed opening line, so we answer instantly (and for free).
  if (mode === "teach") {
    res.json(await startTeachSession(level));
    return;
  }
  res.json({ reply: MODES[mode].opening, corrections: [], compliment: "", newWords: [] });
});

app.post("/api/chat", async (req, res) => {
  const { messages, level, mode, correctionsEnabled } = ChatRequestSchema.parse(req.body);
  res.json(await chatWithMax(messages, level, mode, correctionsEnabled));
});

// Streams Dina's answer piece by piece, so the browser can start speaking the
// first sentence while the rest is still being written.
app.post("/api/talk", async (req, res) => {
  const { messages, level } = TalkRequestSchema.parse(req.body);
  const stream = streamFaceToFace(messages, level);
  // Wait for the first piece before sending headers, so an early error can
  // still become a normal JSON error response.
  const first = await stream.next();
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  if (!first.done) res.write(first.value);
  for await (const piece of stream) res.write(piece);
  res.end();
});

app.post("/api/summary", async (req, res) => {
  const { messages, level, mode } = SummaryRequestSchema.parse(req.body);
  res.json(await summarizeSession(messages, level, mode));
});

// --- Production: serve the built React app --------------------------------
// In development Vite serves the frontend. After `npm run build`, this
// server can serve the files in client/dist by itself.
const clientDist = path.join(rootDir, "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

// --- Error handling -------------------------------------------------------
// Express 5 sends errors thrown in async routes here. We turn them into
// friendly messages for the student (and log details for the developer).
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);

  // A streamed answer that fails halfway can't become a JSON error anymore.
  if (res.headersSent) {
    res.end();
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: "The request was not in the expected format." });
  } else if (err instanceof MaxError) {
    res.status(502).json({ error: err.message });
  } else if (err instanceof GeminiApiError) {
    if (err.status === 429) {
      res.status(429).json({ error: "The free Gemini quota is used up for now. Wait a bit (or until tomorrow) and try again." });
    } else if (/api key/i.test(err.message)) {
      res.status(500).json({ error: "Your GEMINI_API_KEY is invalid. Check the .env file." });
    } else {
      res.status(502).json({ error: `The Gemini API returned an error (${err.status}). Try again.` });
    }
  } else if (err instanceof Anthropic.AuthenticationError) {
    res.status(500).json({ error: "Your API key is missing or invalid. Check the .env file." });
  } else if (err instanceof Anthropic.RateLimitError) {
    res.status(429).json({ error: "Too many requests right now. Wait a moment and try again." });
  } else if (err instanceof Anthropic.APIConnectionError) {
    res.status(503).json({ error: "Couldn't reach the Claude API. Check your internet connection." });
  } else if (err instanceof Anthropic.APIError) {
    res.status(502).json({ error: `The Claude API returned an error (${err.status}). Try again.` });
  } else {
    res.status(500).json({ error: "Something went wrong on the server." });
  }
});

// --- Start ----------------------------------------------------------------
const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`Max's server is running on http://localhost:${PORT} (using ${useGemini ? "Gemini" : "Claude"})`);
  if (!hasApiKey) {
    console.warn("WARNING: no API key is set. Copy .env.example to .env and add GEMINI_API_KEY or ANTHROPIC_API_KEY.");
  }
});
