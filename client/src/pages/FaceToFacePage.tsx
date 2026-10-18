// ---------------------------------------------------------------------------
// FaceToFacePage
// A voice-only conversation with Dina. There is no text on the screen: you
// hold the microphone and speak, Dina answers out loud. When you make a
// mistake she corrects you in her reply and then continues the conversation.
// At the end you get the same written feedback as in the chat.
// ---------------------------------------------------------------------------
import { useState } from "react";
import DinaAvatar from "../components/DinaAvatar";
import EmojiWallpaper from "../components/EmojiWallpaper";
import MicButton from "../components/MicButton";
import SummaryView from "../components/SummaryView";
import type { AvatarState } from "../components/avatarState";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { pickDinaVoice, type Tts } from "../hooks/useSpeechSynthesis";
import { getSummary, startConversation, talk } from "../lib/api";
import { KEYS, newId } from "../lib/storage";
import { LEVEL_LABELS } from "../modes";
import type { ChatMessage, Session, Settings, Summary, SummaryRecord } from "../types";

interface Props {
  settings: Settings;
  tts: Tts;
  onSessionSummary: (record: SummaryRecord) => void;
}

export default function FaceToFacePage({ settings, tts, onSessionSummary }: Props) {
  // Saved separately from the chat, so both conversations can exist at once.
  const [session, setSession] = useLocalStorage<Session | null>(KEYS.faceSession, null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<"loading" | Summary | null>(null);
  const speech = useSpeechRecognition();

  const dinaVoiceURI = pickDinaVoice(tts.voices)?.voiceURI ?? "";

  /** Dina always speaks in this mode: voice is the whole point. */
  const say = (message: ChatMessage) =>
    tts.speak(message.content, { rate: settings.rate, voiceURI: dinaVoiceURI, id: message.id });

  const lastDinaMessage = session?.messages.findLast((m) => m.role === "assistant");

  // --- Start ---------------------------------------------------------------
  const start = async () => {
    setError(null);
    setWaiting(true);
    try {
      const reply = await startConversation("facetoface", settings.level);
      const first: ChatMessage = { id: newId(), role: "assistant", content: reply.reply };
      setSession({ mode: "facetoface", level: settings.level, startedAt: new Date().toISOString(), messages: [first] });
      say(first);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWaiting(false);
    }
  };

  // --- Talk ----------------------------------------------------------------
  const startListening = () => {
    tts.cancel(); // don't let the microphone hear Dina
    setError(null);
    speech.start();
  };

  const stopListening = async () => {
    const text = (await speech.stop()).trim();
    if (!text) {
      setError("I didn't catch that. Hold the button the whole time you speak.");
      return;
    }
    if (!session) return;

    const userMessage: ChatMessage = { id: newId(), role: "user", content: text };
    const history = [...session.messages, userMessage];
    setSession({ ...session, messages: history });
    setWaiting(true);

    // The answer arrives in pieces. Each complete sentence is spoken right away,
    // so Dina starts talking about a second after you release the button.
    const id = newId();
    let pending = "";
    const speakPart = (text: string) => {
      if (text.trim()) {
        tts.speak(text.trim(), { rate: settings.rate, voiceURI: dinaVoiceURI, id, queue: true });
      }
    };

    try {
      const content = await talk(history, settings.level, (piece) => {
        pending += piece;
        // Speak every finished sentence (ending with . ! or ? and a space).
        const match = pending.match(/^[\s\S]*[.!?]["')\]]?\s/);
        if (match) {
          speakPart(match[0]);
          pending = pending.slice(match[0].length);
        }
      });
      speakPart(pending); // the last sentence
      const dinaMessage: ChatMessage = { id, role: "assistant", content };
      setSession((current) => current && { ...current, messages: [...current.messages, dinaMessage] });
    } catch (e) {
      setSession((current) =>
        current && { ...current, messages: current.messages.filter((m) => m.id !== userMessage.id) },
      );
      setError(`${(e as Error).message} Please say it again.`);
    } finally {
      setWaiting(false);
    }
  };

  // --- Finish --------------------------------------------------------------
  const finish = async () => {
    if (!session) return;
    tts.cancel();
    const studentMessages = session.messages.filter((m) => m.role === "user").length;
    if (studentMessages === 0) {
      setSession(null);
      return;
    }

    setSummary("loading");
    setError(null);
    try {
      const result = await getSummary(session.messages, "facetoface", settings.level);
      setSummary(result);
      onSessionSummary({
        id: newId(),
        date: new Date().toISOString(),
        mode: "facetoface",
        level: settings.level,
        studentMessages,
        summary: result,
      });
    } catch (e) {
      setSummary(null);
      setError((e as Error).message);
    }
  };

  const closeSummary = () => {
    setSummary(null);
    setSession(null);
  };

  // --- Screen --------------------------------------------------------------
  const busy = waiting || summary === "loading";
  // Speaking comes before thinking: Dina starts talking while the rest of
  // her answer is still arriving.
  const avatarState: AvatarState = speech.listening
    ? "listening"
    : tts.speakingId
      ? "speaking"
      : busy
        ? "thinking"
        : "idle";

  return (
    <div className="f2f">
      <EmojiWallpaper />
      <div className="f2f-top">
        <span className="f2f-title">Face to face</span>
        <span className="level-pill">{LEVEL_LABELS[settings.level]}</span>
      </div>

      <div className="f2f-body">
        <div className="f2f-stage">
          <DinaAvatar state={avatarState} onWord={tts.onWord} />
        </div>

        {/* Controls on the right, one above the other */}
        {speech.supported && session && (
          <div className="f2f-side">
            <button
              className="btn btn-round on"
              onClick={() => lastDinaMessage && say(lastDinaMessage)}
              disabled={busy || !lastDinaMessage || speech.listening}
              title="Repeat what Dina said"
              aria-label="Repeat what Dina said"
            >
              🔁
            </button>
            <MicButton listening={speech.listening} disabled={busy} onStart={startListening} onStop={stopListening} />
            <button
              className="btn btn-round on"
              onClick={finish}
              disabled={busy || speech.listening}
              title="End and get feedback"
              aria-label="End and get feedback"
            >
              ⏹
            </button>
          </div>
        )}
      </div>

      <div className="f2f-controls">
        {(error || speech.error) && <div className="error-banner">{error ?? speech.error}</div>}

        {!speech.supported ? (
          <p className="hint">Face to face needs the microphone, which works in Chrome or Edge.</p>
        ) : (
          !session && (
            <button className="btn btn-primary f2f-start" onClick={start} disabled={waiting}>
              {waiting ? "Starting…" : "Start talking with Dina"}
            </button>
          )
        )}
      </div>

      {summary && summary !== "loading" && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Session summary">
          <div className="modal">
            <h2>Feedback from Dina</h2>
            <SummaryView summary={summary} />
            <button className="btn btn-primary btn-block" onClick={closeSummary}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
