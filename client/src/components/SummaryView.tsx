// ---------------------------------------------------------------------------
// SummaryView
// Max's end-of-session feedback. Used in the chat (after "Finish session")
// and on the Progress page.
// ---------------------------------------------------------------------------
import type { Summary } from "../types";

export default function SummaryView({ summary }: { summary: Summary }) {
  return (
    <div className="summary">
      <p className="summary-encouragement">{summary.encouragement}</p>

      <section>
        <h3>🌟 What you did well</h3>
        <ul>
          {summary.wellDone.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      {summary.commonMistakes.length > 0 && (
        <section>
          <h3>🔧 Most common mistakes</h3>
          <ol className="summary-mistakes">
            {summary.commonMistakes.map((m, i) => (
              <li key={i}>
                <div className="correction-original">{m.mistake}</div>
                <div className="correction-fixed">{m.correction}</div>
                <div className="correction-why">💡 {m.tip}</div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section>
        <h3>🎯 Practice next</h3>
        <ul>
          {summary.practiceNext.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
