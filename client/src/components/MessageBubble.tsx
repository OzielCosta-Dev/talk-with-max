// ---------------------------------------------------------------------------
// MessageBubble
// One chat message. Max's messages have a replay button and new words;
// your messages show the corrections panel underneath.
// ---------------------------------------------------------------------------
import type { ChatMessage } from "../types";
import CorrectionsPanel from "./CorrectionsPanel";

interface Props {
  message: ChatMessage;
  isSpeaking: boolean;
  onReplay: () => void;
  showCorrections: boolean;
}

export default function MessageBubble({ message, isSpeaking, onReplay, showCorrections }: Props) {
  const isMax = message.role === "assistant";

  return (
    <div className={`message-row ${isMax ? "from-max" : "from-me"}`}>
      {isMax && <img src="/max.svg" alt="Max" className="avatar" />}

      <div className="message-stack">
        <div className={`bubble ${isMax ? "bubble-max" : "bubble-me"}`}>
          <p>{message.content}</p>
          {isMax && (
            <button
              className={`replay ${isSpeaking ? "playing" : ""}`}
              onClick={onReplay}
              aria-label={isSpeaking ? "Stop" : "Listen again"}
              title={isSpeaking ? "Stop" : "Listen again"}
            >
              {isSpeaking ? "⏹" : "🔊"}
            </button>
          )}
        </div>

        {/* New words Max used (saved automatically in your notebook). */}
        {isMax && message.newWords && message.newWords.length > 0 && (
          <div className="new-words">
            {message.newWords.map((w) => (
              <span key={w.word} className="chip" title={`${w.meaning}\n"${w.example}"`}>
                📒 {w.word}
              </span>
            ))}
          </div>
        )}

        {!isMax && showCorrections && message.corrections && (
          <CorrectionsPanel corrections={message.corrections} compliment={message.compliment} />
        )}
      </div>
    </div>
  );
}
