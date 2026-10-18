// ---------------------------------------------------------------------------
// gemini.ts
// The same features as claude.ts, but using Google's Gemini API, which has a
// free tier. index.ts uses this file when GEMINI_API_KEY is set in .env.
// ---------------------------------------------------------------------------
import { FinishReason, GoogleGenAI, type Content } from "@google/genai";
import { z } from "zod";
import {
  ChatReplySchema,
  SummarySchema,
  type ChatMessage,
  type ChatReply,
  type Level,
  type Mode,
  type Summary,
} from "./schemas.js";
import {
  buildFaceToFacePrompt,
  buildSummaryPrompt,
  buildSystemPrompt,
  buildTeachStartMessage,
  tutorName,
} from "./prompts.js";
import { MaxError } from "./errors.js";

export { MaxError };

// The model the app uses. Set GEMINI_MODEL in .env to try another one.
// Free-tier quotas differ per model; check them at https://aistudio.google.com/.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Sends a request to Gemini and returns the parsed JSON object.
 *
 * We pass our Zod schema as a JSON Schema so Gemini answers with JSON in that
 * shape. Gemini is less strict than Claude's structured outputs, so we still
 * validate the answer with Zod before using it.
 */
async function askGemini<T>(options: {
  system: string;
  contents: Content[];
  schema: z.ZodType<T>;
  maxTokens: number;
}): Promise<T> {
  const { $schema: _, ...jsonSchema } = z.toJSONSchema(options.schema);

  const response = await client.models.generateContent({
    model: MODEL,
    contents: options.contents,
    config: {
      systemInstruction: options.system,
      maxOutputTokens: options.maxTokens,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
    },
  });

  // Always check WHY Gemini stopped before reading the answer.
  const finishReason = response.candidates?.[0]?.finishReason;
  if (response.promptFeedback?.blockReason || finishReason === FinishReason.SAFETY) {
    throw new MaxError("Max couldn't answer that one. Try saying it in a different way!");
  }
  if (finishReason === FinishReason.MAX_TOKENS) {
    throw new MaxError("Max's answer was too long and got cut off. Please try again.");
  }

  try {
    return options.schema.parse(JSON.parse(response.text ?? ""));
  } catch {
    throw new MaxError("Max got confused. Please try again.");
  }
}

/** Gemini calls the assistant role "model". */
function toContents(history: ChatMessage[]): Content[] {
  return history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

/**
 * The chat. `history` is the whole conversation so far, ending with the
 * student's newest message.
 */
export async function chatWithMax(
  history: ChatMessage[],
  level: Level,
  mode: Mode,
  correctionsEnabled: boolean,
): Promise<ChatReply> {
  // Keep only the last 40 messages so long sessions don't use up the free quota.
  let messages = history.slice(-40);

  // Our chats start with Max's opening line, so we add a small hidden user
  // message at the beginning, like in claude.ts.
  if (messages[0]?.role === "assistant") {
    messages = [{ role: "user", content: "(The student opened the app.)" }, ...messages];
  }

  return askGemini({
    system: buildSystemPrompt(level, mode, correctionsEnabled),
    contents: toContents(messages),
    schema: ChatReplySchema,
    maxTokens: 4000,
  });
}

/** Starts a "Teach me" session: Max picks a topic and gives a mini-lesson. */
export async function startTeachSession(level: Level): Promise<ChatReply> {
  return askGemini({
    system: buildSystemPrompt(level, "teach", false),
    contents: toContents([{ role: "user", content: buildTeachStartMessage(level) }]),
    schema: ChatReplySchema,
    maxTokens: 4000,
  });
}

/**
 * Dina's face-to-face reply, streamed as plain text: pieces of the answer are
 * yielded as soon as Gemini writes them, so the voice can start right away.
 */
export async function* streamFaceToFace(history: ChatMessage[], level: Level): AsyncGenerator<string> {
  let messages = history.slice(-40);
  if (messages[0]?.role === "assistant") {
    messages = [{ role: "user", content: "(The student opened the app.)" }, ...messages];
  }
  const stream = await client.models.generateContentStream({
    model: MODEL,
    contents: toContents(messages),
    config: { systemInstruction: buildFaceToFacePrompt(level), maxOutputTokens: 400 },
  });
  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}

/** End-of-session feedback. */
export async function summarizeSession(
  history: ChatMessage[],
  level: Level,
  mode: Mode,
): Promise<Summary> {
  const transcript = history
    .map((m) => `${m.role === "user" ? "Student" : tutorName(mode)}: ${m.content}`)
    .join("\n");

  return askGemini({
    system: buildSummaryPrompt(level, mode),
    contents: toContents([
      {
        role: "user",
        content: `Conversation mode: ${mode}\n\n<transcript>\n${transcript}\n</transcript>`,
      },
    ]),
    schema: SummarySchema,
    maxTokens: 8000,
  });
}
