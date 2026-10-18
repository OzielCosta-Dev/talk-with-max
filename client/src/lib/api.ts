// ---------------------------------------------------------------------------
// api.ts
// Functions that call our own backend (never Claude directly - the API key
// stays on the server). In development, Vite forwards /api to port 3001.
// ---------------------------------------------------------------------------
import type { ChatMessage, Level, MaxReply, Mode, Summary } from "../types";

async function post<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach the server. Is it running? (npm run dev)");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? `Server error (${res.status}). Is the backend running?`);
  }
  return data as T;
}

/** The server only needs the role and the text of each message. */
function toApiMessages(messages: ChatMessage[]) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

export function startConversation(mode: Mode, level: Level): Promise<MaxReply> {
  return post("/api/start", { mode, level });
}

export function sendChat(
  messages: ChatMessage[],
  mode: Mode,
  level: Level,
  correctionsEnabled: boolean,
): Promise<MaxReply> {
  return post("/api/chat", {
    messages: toApiMessages(messages),
    mode,
    level,
    correctionsEnabled,
  });
}

/**
 * Dina's face-to-face answer, streamed: `onText` is called with each new piece
 * of text as it arrives. Resolves with the whole answer.
 */
export async function talk(
  messages: ChatMessage[],
  level: Level,
  onText: (piece: string) => void,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/talk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: toApiMessages(messages), level }),
    });
  } catch {
    throw new Error("Can't reach the server. Is it running? (npm run dev)");
  }
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Server error (${res.status}). Is the backend running?`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let all = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const piece = decoder.decode(value, { stream: true });
    all += piece;
    onText(piece);
  }
  if (!all.trim()) throw new Error("Dina didn't answer. Please try again.");
  return all.trim();
}

export function getSummary(messages: ChatMessage[], mode: Mode, level: Level): Promise<Summary> {
  return post("/api/summary", { messages: toApiMessages(messages), mode, level });
}
