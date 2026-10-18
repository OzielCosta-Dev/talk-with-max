// ---------------------------------------------------------------------------
// CorrectionsPanel
// Shown under each of YOUR messages: the mistakes Max found, or a compliment.
// ---------------------------------------------------------------------------
import type { Correction } from "../types";

interface Props {
  corrections: Correction[];
  compliment?: string;
}

export default function CorrectionsPanel({ corrections, compliment }: Props) {
  // No mistakes: show the compliment in green.
  if (corrections.length === 0) {
    if (!compliment) return null;
    return (
      <div className="feedback feedback-good">
        <span aria-hidden>✅</span> {compliment}
      </div>
    );
  }

  return (
    <div className="feedback feedback-fix">
      <div className="feedback-title">
        ✏️ {corrections.length === 1 ? "1 correction" : `${corrections.length} corrections`}
      </div>
      <ul className="corrections">
        {corrections.map((c, i) => (
          <li key={i}>
            <div className="correction-original">{c.original}</div>
            <div className="correction-fixed">{c.corrected}</div>
            <div className="correction-why">{c.explanation}</div>
            {c.ptHint && (
              <div className="correction-pt">
                <span aria-label="Dica em português">🇧🇷</span> {c.ptHint}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
