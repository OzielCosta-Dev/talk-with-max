// ---------------------------------------------------------------------------
// HistoryPage ("Progress")
// All your past session summaries, newest first. Tap one to open it.
// ---------------------------------------------------------------------------
import SummaryView from "../components/SummaryView";
import { LEVEL_LABELS, modeCard } from "../modes";
import type { SummaryRecord } from "../types";

interface Props {
  summaries: SummaryRecord[];
  setSummaries: (update: (current: SummaryRecord[]) => SummaryRecord[]) => void;
}

export default function HistoryPage({ summaries, setSummaries }: Props) {
  const remove = (id: string) => setSummaries((current) => current.filter((s) => s.id !== id));

  return (
    <div className="page page-padded">
      <div className="page-head">
        <h1>📈 My progress</h1>
        <span className="muted">
          {summaries.length} {summaries.length === 1 ? "session" : "sessions"}
        </span>
      </div>

      {summaries.length === 0 ? (
        <div className="empty">
          <p>No sessions yet.</p>
          <p className="muted">Click “Finish session” after a chat to get feedback from Max.</p>
        </div>
      ) : (
        <ul className="history-list">
          {summaries.map((s) => {
            const card = modeCard(s.mode);
            return (
              <li key={s.id}>
                {/* <details> is a built-in HTML element that opens and closes on click. */}
                <details className="history-item">
                  <summary>
                    <span className="history-mode">
                      {card.emoji} {card.title}
                    </span>
                    <span className="muted">
                      {new Date(s.date).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {LEVEL_LABELS[s.level]} · {s.studentMessages} messages
                    </span>
                  </summary>
                  <SummaryView summary={s.summary} />
                  <button className="link-danger" onClick={() => remove(s.id)}>
                    Delete this summary
                  </button>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
