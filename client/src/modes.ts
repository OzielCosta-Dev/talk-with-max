// ---------------------------------------------------------------------------
// modes.ts
// How each conversation mode looks in the app. Max's behavior for each mode
// lives on the server (server/src/prompts.ts).
// ---------------------------------------------------------------------------
import type { Level, Mode } from "./types";

export interface ModeCard {
  id: Mode;
  emoji: string;
  title: string;
  description: string;
}

export const MODE_CARDS: ModeCard[] = [
  { id: "free", emoji: "💬", title: "Free talk", description: "Chat about anything you like." },
  { id: "teach", emoji: "🎓", title: "Teach me", description: "A mini-lesson, then practice it." },
  { id: "interview", emoji: "💼", title: "Job interview", description: "Answer real interview questions." },
  { id: "restaurant", emoji: "🍔", title: "Restaurant", description: "Order food and drinks." },
  { id: "travel", emoji: "✈️", title: "Airport & travel", description: "Check-in, hotels, directions." },
  { id: "work", emoji: "⚡", title: "My work", description: "Talk about your electrical work." },
  { id: "smalltalk", emoji: "☀️", title: "Small talk", description: "Weather, weekends, hobbies." },
];

/** The voice-only conversation with Dina (its own tab, not in the mode grid). */
export const FACE_TO_FACE_CARD: ModeCard = {
  id: "facetoface",
  emoji: "👩🏽",
  title: "Face to face with Dina",
  description: "Voice only: Dina corrects you out loud.",
};

export function modeCard(mode: Mode): ModeCard {
  if (mode === "facetoface") return FACE_TO_FACE_CARD;
  return MODE_CARDS.find((m) => m.id === mode) ?? MODE_CARDS[0];
}

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};
