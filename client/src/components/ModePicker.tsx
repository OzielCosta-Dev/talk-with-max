// ---------------------------------------------------------------------------
// ModePicker
// The start screen: choose what kind of conversation you want to practice.
// ---------------------------------------------------------------------------
import { LEVEL_LABELS, MODE_CARDS } from "../modes";
import type { Level, Mode } from "../types";

interface Props {
  level: Level;
  loadingMode: Mode | null;
  onPick: (mode: Mode) => void;
}

export default function ModePicker({ level, loadingMode, onPick }: Props) {
  return (
    <div className="mode-picker">
      <div className="welcome">
        <img src="/max.svg" alt="" className="welcome-avatar" />
        <h1>Hi, I'm Max!</h1>
        <p>
          What do you want to practice today? <span className="level-pill">{LEVEL_LABELS[level]}</span>
        </p>
      </div>

      <div className="mode-grid">
        {MODE_CARDS.map((m) => (
          <button
            key={m.id}
            className="mode-card"
            onClick={() => onPick(m.id)}
            disabled={loadingMode !== null}
          >
            <span className="mode-emoji" aria-hidden>
              {m.emoji}
            </span>
            <span className="mode-title">{m.title}</span>
            <span className="mode-desc">{loadingMode === m.id ? "Starting…" : m.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
