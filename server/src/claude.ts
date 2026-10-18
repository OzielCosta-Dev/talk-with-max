// ---------------------------------------------------------------------------
// claude.ts
// The only file that talks to the Claude API.
// ---------------------------------------------------------------------------
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
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

// The model the app uses. Change it here if you want to try another one.
const MODEL = "claude-sonnet-5-5";

// The client reads ANTHROPIC_API_KEY from the environment (loaded from .env).
const client = new Anthropic();

/**
 * Sends a request to Claude and returns the parsed JSON object.
 *
 * - `betaZodOutputFormat(schema)` forces Claude to answer with JSON that
 *   matches our Zod schema, and parses it into `parsed_output`.
 * - `fallbacks: "default"` (beta): if the model declines a request for safety
 *   reasons, the API automatically retries it on a recommended fallback model.
 * - `effort` controls how much Claude "thinks" before answering. A chat needs
 *   fast answers, so we use "low"; the summary needs more care, so "medium".
 */
async function askClaude<T>(options: {
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  schema: Parameters<typeof betaZodOutputFormat>[0];
  effort: "low" | "medium";
  maxTokens: number;
}): Promise<T> {
  // Give a clear message instead of a confusing SDK error when the key is missing.
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new MaxError(
      "The API key is missing. Copy .env.example to .env, add your ANTHROPIC_API_KEY and restart the server.",
    );
  }

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: options.maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: options.system,
    messages: options.messages,
    output_config: {
      effort: options.effort,
      format: betaZodOutputFormat(options.schema),
    },
  });

  // Always check WHY Claude stopped before reading the answer.
  if (response.stop_reason === "refusal") {
    throw new MaxError("Max couldn't answer that one. Try saying it in a different way!");
  }
  if (response.stop_reason === "max_tokens") {
    throw new MaxError("Max's answer was too long and got cut off. Please try again.");
  }
  if (!response.parsed_output) {
    throw new MaxError("Max got confused. Please try again.");
  }
  return response.parsed_output as T;
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
  // Keep only the last 40 messages so long sessions don't get slow or expensive.
  let messages: Anthropic.Beta.BetaMessageParam[] = history.slice(-40);

  // The Claude API expects the conversation to start with a "user" message,
  // but our chats start with Max's opening line. So we add a small hidden
  // user message at the beginning.
  if (messages[0]?.role === "assistant") {
    messages = [{ role: "user", content: "(The student opened the app.)" }, ...messages];
  }

  return askClaude<ChatReply>({
    system: buildSystemPrompt(level, mode, correctionsEnabled),
    messages,
    schema: ChatReplySchema,
    effort: "low",
    maxTokens: 4000,
  });
}

/** Starts a "Teach me" session: Max picks a topic and gives a mini-lesson. */
export async function startTeachSession(level: Level): Promise<ChatReply> {
  return askClaude<ChatReply>({
    system: buildSystemPrompt(level, "teach", false),
    messages: [{ role: "user", content: buildTeachStartMessage(level) }],
    schema: ChatReplySchema,
    effort: "low",
    maxTokens: 4000,
  });
}

/**
 * Dina's face-to-face reply, streamed as plain text: pieces of the answer are
 * yielded as soon as Claude writes them, so the voice can start right away.
 */
export async function* streamFaceToFace(history: ChatMessage[], level: Level): AsyncGenerator<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new MaxError(
      "The API key is missing. Copy .env.example to .env, add your ANTHROPIC_API_KEY and restart the server.",
    );
  }
  let messages: Anthropic.MessageParam[] = history.slice(-40);
  if (messages[0]?.role === "assistant") {
    messages = [{ role: "user", content: "(The student opened the app.)" }, ...messages];
  }
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 400,
    system: buildFaceToFacePrompt(level),
    messages,
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
  }
}

/** End-of-session feedback. */
export async function summarizeSession(
  history: ChatMessage[],
  level: Level,
  mode: Mode,
): Promise<Summary> {
  // Turn the conversation into a simple transcript that Claude can read.
  const transcript = history
    .map((m) => `${m.role === "user" ? "Student" : tutorName(mode)}: ${m.content}`)
    .join("\n");

  return askClaude<Summary>({
    system: buildSummaryPrompt(level, mode),
    messages: [
      {
        role: "user",
        content: `Conversation mode: ${mode}\n\n<transcript>\n${transcript}\n</transcript>`,
      },
    ],
    schema: SummarySchema,
    effort: "medium",
    maxTokens: 8000,
  });
}
