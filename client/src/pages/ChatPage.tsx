// ---------------------------------------------------------------------------
// ChatPage
// The conversation with Max: choose a mode, then talk by typing or by holding
// the microphone button. Max answers out loud and corrects your English.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import MaxAvatar from "../components/MaxAvatar";
import type { AvatarState } from "../components/avatarState";
import MessageBubble from "../components/MessageBubble";
import MicButton from "../components/MicButton";
import ModePicker from "../components/ModePicker";
import SummaryView from "../components/SummaryView";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import type { Tts } from "../hooks/useSpeechSynthesis";
import { getSummary, sendChat, startConversation } from "../lib/api";
import { KEYS, newId } from "../lib/storage";
import { LEVEL_LABELS, modeCard } from "../modes";
import type { ChatMessage, MaxReply, Mode, NewWord, Session, Settings, Summary, SummaryRecord } from "../types";

interface Props {
  settings: Settings;
  updateSettings: (changes: Partial<Settings>) => void;
  tts: Tts;
  onNewWords: (words: NewWord[]) => void;
  onSessionSummary: (record: SummaryRecord) => void;
}

export default function ChatPage({ settings, updateSettings, tts, onNewWords, onSessionSummary }: Props) {
  // The current conversation is saved, so refreshing the page doesn't lose it.
  const [session, setSession] = useLocalStorage<Session | null>(KEYS.session, null);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false); // waiting for Max's reply
  const [startingMode, setStartingMode] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<"loading" | Summary | null>(null);

  const speech = useSpeechRecognition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to the newest message whenever something is added.
  const messageCount = session?.messages.length ?? 0;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messageCount, waiting]);

  /** Turns a server reply into a Max chat bubble. */
  const toMaxMessage = (reply: MaxReply): ChatMessage => ({
    id: newId(),
    role: "assistant",
    content: reply.reply,
    newWords: reply.newWords,
  });

  /** Reads a Max message aloud, if voice is turned on. */
  const autoSpeak = (message: ChatMessage) => {
    if (settings.autoSpeak) {
      tts.speak(message.content, { rate: settings.rate, voiceURI: settings.voiceURI, id: message.id });
    }
  };

  // --- Start a conversation ------------------------------------------------
  const startMode = async (mode: Mode) => {
    setError(null);
    setStartingMode(mode);
    try {
      const reply = await startConversation(mode, settings.level);
      const first = toMaxMessage(reply);
      setSession({ mode, level: settings.level, startedAt: new Date().toISOString(), messages: [first] });
      onNewWords(reply.newWords);
      autoSpeak(first);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStartingMode(null);
    }
  };

  // --- Send a message ------------------------------------------------------
  const send = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || !session || waiting) return;

    tts.cancel();
    setError(null);
    setInput("");

    const userMessage: ChatMessage = { id: newId(), role: "user", content: text };
    const history = [...session.messages, userMessage];
    setSession({ ...session, messages: history });
    setWaiting(true);

    try {
      const reply = await sendChat(history, session.mode, settings.level, settings.corrections);
      const maxMessage = toMaxMessage(reply);

      // Attach the corrections to YOUR message, and add Max's reply after it.
      setSession((current) =>
        current && {
          ...current,
          messages: [
            ...current.messages.map((m) =>
              m.id === userMessage.id
                ? { ...m, corrections: reply.corrections, compliment: reply.compliment }
                : m,
            ),
            maxMessage,
          ],
        },
      );
      onNewWords(reply.newWords);
      autoSpeak(maxMessage);
    } catch (e) {
      // Something failed: remove the message and put the text back in the box.
      setSession((current) =>
        current && { ...current, messages: current.messages.filter((m) => m.id !== userMessage.id) },
      );
      setInput(text);
      setError((e as Error).message);
    } finally {
      setWaiting(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  // Enter sends the message, Shift+Enter makes a new line.
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  // --- Microphone (push to talk) ------------------------------------------
  const startListening = () => {
    tts.cancel(); // don't let the microphone hear Max
    setError(null);
    speech.start();
  };

  const stopListening = async () => {
    const text = await speech.stop();
    if (text) send(text);
  };

  // --- Finish the session ------------------------------------------------
  const finishSession = async () => {
    if (!session) return;
    tts.cancel();
    const studentMessages = session.messages.filter((m) => m.role === "user").length;
    if (studentMessages === 0) {
      setSession(null); // nothing to give feedback on
      return;
    }

    setSummary("loading");
    setError(null);
    try {
      const result = await getSummary(session.messages, session.mode, settings.level);
      setSummary(result);
      onSessionSummary({
        id: newId(),
        date: new Date().toISOString(),
        mode: session.mode,
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

  const newConversation = () => {
    if (window.confirm("Start a new conversation? This one will end without feedback.")) {
      tts.cancel();
      setSession(null);
    }
  };

  // --- Screens -------------------------------------------------------------
  if (!session) {
    return (
      <div className="page">
        {error && <div className="error-banner">{error}</div>}
        <ModePicker level={settings.level} loadingMode={startingMode} onPick={startMode} />
      </div>
    );
  }

  const card = modeCard(session.mode);
  const busy = waiting || summary === "loading";

  // What the avatar shows. Listening wins, because the student is talking.
  const avatarState: AvatarState = speech.listening
    ? "listening"
    : busy
      ? "thinking"
      : tts.speakingId
        ? "speaking"
        : "idle";

  return (
    <div className="chat-layout">
      <aside className="avatar-panel">
        <MaxAvatar state={avatarState} caption={`${card.emoji} ${card.title}`} />
      </aside>

      <div className="chat">
        <div className="chat-header">
          <div className="chat-title">
            <span aria-hidden>{card.emoji}</span> {card.title}
            <span className="level-pill">{LEVEL_LABELS[settings.level]}</span>
          </div>
          <div className="chat-actions">
            <button className="btn btn-ghost" onClick={newConversation} disabled={busy}>
              New
            </button>
            <button className="btn btn-primary" onClick={finishSession} disabled={busy}>
              {summary === "loading" ? "Thinking…" : "Finish session"}
            </button>
          </div>
        </div>

        <div className="messages" aria-live="polite">
          {session.messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              showCorrections={settings.corrections}
              isSpeaking={tts.speakingId === m.id}
              onReplay={() =>
                tts.speakingId === m.id
                  ? tts.cancel()
                  : tts.speak(m.content, { rate: settings.rate, voiceURI: settings.voiceURI, id: m.id })
              }
            />
          ))}
          {waiting && (
            <div className="message-row from-max">
              <img src="/max.svg" alt="Max" className="avatar" />
              <div className="bubble bubble-max typing" aria-label="Max is typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="composer">
          {(error || speech.error) && <div className="error-banner">{error ?? speech.error}</div>}

          <form className="composer-row" onSubmit={handleSubmit}>
            <textarea
              className="text-input"
              rows={1}
              placeholder={speech.listening ? "Listening…" : "Type in English…"}
              value={speech.listening ? speech.transcript : input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={speech.listening}
              aria-label="Your message"
            />
            <button className="btn btn-send" type="submit" disabled={!input.trim() || busy} aria-label="Send">
              ➤
            </button>
          </form>

          <div className="composer-controls">
            <button
              className={`btn btn-round ${settings.autoSpeak ? "on" : ""}`}
              onClick={() => {
                if (settings.autoSpeak) tts.cancel();
                updateSettings({ autoSpeak: !settings.autoSpeak });
              }}
              aria-pressed={settings.autoSpeak}
              title={settings.autoSpeak ? "Max's voice is ON" : "Max's voice is OFF"}
            >
              {settings.autoSpeak ? "🔊" : "🔇"}
            </button>

            {speech.supported ? (
              <MicButton
                listening={speech.listening}
                disabled={busy}
                onStart={startListening}
                onStop={stopListening}
              />
            ) : (
              <p className="hint">Voice input needs Chrome or Edge. You can still type!</p>
            )}

            <button
              className={`btn btn-round ${settings.corrections ? "on" : ""}`}
              onClick={() => updateSettings({ corrections: !settings.corrections })}
              aria-pressed={settings.corrections}
              title={settings.corrections ? "Corrections are ON" : "Corrections are OFF"}
            >
              ✏️
            </button>
          </div>
        </div>

        {/* Session summary popup */}
        {summary && summary !== "loading" && (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Session summary">
            <div className="modal">
              <h2>Session feedback</h2>
              <SummaryView summary={summary} />
              <button className="btn btn-primary btn-block" onClick={closeSummary}>
                Start a new conversation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
