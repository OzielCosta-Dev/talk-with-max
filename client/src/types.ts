// ---------------------------------------------------------------------------
// types.ts
// The data shapes used across the frontend.
// ---------------------------------------------------------------------------

export type Level = "beginner" | "intermediate" | "advanced";
export type Mode = "free" | "interview" | "restaurant" | "travel" | "work" | "smalltalk" | "teach" | "facetoface";
export type Theme = "system" | "light" | "dark";

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  ptHint: string; // short hint in Portuguese, "" when there is none
}

export interface NewWord {
  word: string;
  meaning: string;
  example: string;
}

/** What the server returns for /api/start and /api/chat. */
export interface MaxReply {
  reply: string;
  corrections: Correction[];
  compliment: string;
  newWords: NewWord[];
}

/** One bubble in the chat. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant"; // "assistant" = Max
  content: string;
  // Only on the student's messages (filled in when Max answers):
  corrections?: Correction[];
  compliment?: string;
  // Only on Max's messages:
  newWords?: NewWord[];
}

/** A conversation in progress. */
export interface Session {
  mode: Mode;
  level: Level;
  startedAt: string; // ISO date
  messages: ChatMessage[];
}

export interface Settings {
  level: Level;
  rate: number; // speech speed, 1 = normal
  voiceURI: string; // "" = choose automatically
  autoSpeak: boolean; // read Max's replies aloud
  corrections: boolean;
  theme: Theme;
}

/** A word saved in the vocabulary notebook. */
export interface VocabWord extends NewWord {
  id: string;
  addedAt: string;
  score: number; // goes up when you get the flashcard right
}

/** What the server returns for /api/summary. */
export interface Summary {
  wellDone: string[];
  commonMistakes: { mistake: string; correction: string; tip: string }[];
  practiceNext: string[];
  encouragement: string;
}

/** A finished session saved in the history. */
export interface SummaryRecord {
  id: string;
  date: string;
  mode: Mode;
  level: Level;
  studentMessages: number;
  summary: Summary;
}
