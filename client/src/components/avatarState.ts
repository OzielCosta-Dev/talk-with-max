// ---------------------------------------------------------------------------
// avatarState.ts
// The states shared by Max's and Dina's animated avatars.
// ---------------------------------------------------------------------------

export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

export const AVATAR_STATUS: Record<AvatarState, string> = {
  idle: "Ready to chat",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking",
};
