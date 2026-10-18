// ---------------------------------------------------------------------------
// schemas.ts
// The shapes of the JSON that Claude must return.
//
// We describe each shape with Zod. The Anthropic SDK turns these Zod schemas
// into "structured outputs": Claude is forced to reply with JSON that matches
// the schema exactly, and the SDK parses and validates it for us.
// ---------------------------------------------------------------------------
import { z } from "zod";

/** One mistake the student made, and how to fix it. */
export const CorrectionSchema = z.object({
  original: z.string().describe("The exact part of the student's text that has a mistake"),
  corrected: z.string().describe("The corrected version of that sentence"),
  explanation: z.string().describe("A very short explanation in simple English"),
  ptHint: z
    .string()
    .describe("Optional short hint in Brazilian Portuguese. Empty string if not useful."),
});

/** A useful word or expression the student can save in their notebook. */
export const NewWordSchema = z.object({
  word: z.string().describe("The word or short expression"),
  meaning: z.string().describe("A simple meaning in English"),
  example: z.string().describe("A short example sentence using the word"),
});

/** What Max returns after every message in the chat. */
export const ChatReplySchema = z.object({
  reply: z.string().describe("Max's conversational reply. English only. 2-4 sentences."),
  corrections: z.array(CorrectionSchema),
  compliment: z
    .string()
    .describe("If there are no corrections, a short compliment. Otherwise an empty string."),
  newWords: z.array(NewWordSchema),
});

/** What Max returns when the student clicks "Finish session". */
export const SummarySchema = z.object({
  wellDone: z.array(z.string()).describe("2-4 specific things the student did well"),
  commonMistakes: z
    .array(
      z.object({
        mistake: z.string().describe("The kind of mistake, with a real example from the chat"),
        correction: z.string().describe("The correct way to say it"),
        tip: z.string().describe("A short tip to avoid it"),
      }),
    )
    .describe("The student's 3 most common mistakes (fewer if there were fewer)"),
  practiceNext: z.array(z.string()).describe("2-3 concrete things to practice next"),
  encouragement: z.string().describe("One or two warm, motivating sentences from Max"),
});

// TypeScript types generated from the schemas above.
export type ChatReply = z.infer<typeof ChatReplySchema>;
export type Summary = z.infer<typeof SummarySchema>;

// ---------------------------------------------------------------------------
// Request bodies (what the browser sends to our server). We validate them so
// a bad request gets a clear error instead of a crash.
// ---------------------------------------------------------------------------
export const LevelSchema = z.enum(["beginner", "intermediate", "advanced"]);
export const ModeSchema = z.enum([
  "free",
  "interview",
  "restaurant",
  "travel",
  "work",
  "smalltalk",
  "teach",
  "facetoface",
]);

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  level: LevelSchema,
  mode: ModeSchema,
  correctionsEnabled: z.boolean().default(true),
});

export const TalkRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  level: LevelSchema,
});

export const StartRequestSchema = z.object({
  level: LevelSchema,
  mode: ModeSchema,
});

export const SummaryRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  level: LevelSchema,
  mode: ModeSchema,
});

export type Level = z.infer<typeof LevelSchema>;
export type Mode = z.infer<typeof ModeSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
