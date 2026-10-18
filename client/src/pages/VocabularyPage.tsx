// ---------------------------------------------------------------------------
// VocabularyPage
// Your notebook of new words from conversations, plus a simple flashcard
// review. Words you get wrong come back sooner.
// ---------------------------------------------------------------------------
import { useState } from "react";
import type { Tts } from "../hooks/useSpeechSynthesis";
import type { Settings, VocabWord } from "../types";

interface Props {
  words: VocabWord[];
  setWords: (update: (current: VocabWord[]) => VocabWord[]) => void;
  settings: Settings;
  tts: Tts;
}

/** Shuffles a copy of an array (Fisher-Yates algorithm). */
function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function VocabularyPage({ words, setWords, settings, tts }: Props) {
  const [reviewing, setReviewing] = useState(false);
  const [search, setSearch] = useState("");

  const say = (text: string) => tts.speak(text, { rate: settings.rate, voiceURI: settings.voiceURI });

  const remove = (id: string) => setWords((current) => current.filter((w) => w.id !== id));

  if (reviewing) {
    return (
      <Flashcards
        words={words}
        onScore={(id, delta) =>
          setWords((current) =>
            current.map((w) => (w.id === id ? { ...w, score: Math.max(0, w.score + delta) } : w)),
          )
        }
        onExit={() => setReviewing(false)}
        say={say}
      />
    );
  }

  const query = search.trim().toLowerCase();
  const visible = query
    ? words.filter((w) => w.word.toLowerCase().includes(query) || w.meaning.toLowerCase().includes(query))
    : words;

  return (
    <div className="page page-padded">
      <div className="page-head">
        <h1>📒 My words</h1>
        <button className="btn btn-primary" onClick={() => setReviewing(true)} disabled={words.length === 0}>
          Review flashcards
        </button>
      </div>

      {words.length === 0 ? (
        <div className="empty">
          <p>No words yet.</p>
          <p className="muted">Talk with Max: useful new words are saved here automatically.</p>
        </div>
      ) : (
        <>
          <input
            className="search"
            type="search"
            placeholder={`Search ${words.length} words…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ul className="word-list">
            {visible.map((w) => (
              <li key={w.id} className="word-card">
                <div className="word-top">
                  <button className="word-title" onClick={() => say(w.word)} title="Listen">
                    {w.word} <span aria-hidden>🔊</span>
                  </button>
                  <span className="stars" title="How well you know it">
                    {"★".repeat(Math.min(w.score, 3))}
                    {"☆".repeat(3 - Math.min(w.score, 3))}
                  </span>
                </div>
                <div className="word-meaning">{w.meaning}</div>
                <button className="word-example" onClick={() => say(w.example)} title="Listen">
                  “{w.example}”
                </button>
                <button className="link-danger" onClick={() => remove(w.id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flashcards: see the word, try to remember the meaning, then flip the card.
// ---------------------------------------------------------------------------
function Flashcards({
  words,
  onScore,
  onExit,
  say,
}: {
  words: VocabWord[];
  onScore: (id: string, delta: number) => void;
  onExit: () => void;
  say: (text: string) => void;
}) {
  // Build the deck once: up to 20 words, the ones you know least come first.
  const [deck, setDeck] = useState<VocabWord[]>(() =>
    shuffle(words)
      .sort((a, b) => a.score - b.score)
      .slice(0, 20),
  );
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ right: 0, again: 0 });

  const card = deck[0];

  const answer = (knewIt: boolean) => {
    onScore(card.id, knewIt ? 1 : -1);
    setStats((s) => (knewIt ? { ...s, right: s.right + 1 } : { ...s, again: s.again + 1 }));
    // Correct: remove the card. Wrong: put it at the end of the deck to try again.
    setDeck(([first, ...rest]) => (knewIt ? rest : [...rest, first]));
    setFlipped(false);
  };

  if (!card) {
    return (
      <div className="page page-padded">
        <div className="empty">
          <h2>🎉 Review complete!</h2>
          <p>
            {stats.right} correct · {stats.again} to practice again
          </p>
          <button className="btn btn-primary" onClick={onExit}>
            Back to my words
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-padded">
      <div className="page-head">
        <button className="btn btn-ghost" onClick={onExit}>
          ← Back
        </button>
        <span className="muted">{deck.length} cards left</span>
      </div>

      <button
        className={`flashcard ${flipped ? "flipped" : ""}`}
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Card back. Tap to see the word." : "Card front. Tap to see the meaning."}
      >
        {!flipped ? (
          <>
            <span className="flash-word">{card.word}</span>
            <span className="muted">Do you remember the meaning? Tap to check.</span>
          </>
        ) : (
          <>
            <span className="flash-word small">{card.word}</span>
            <span className="flash-meaning">{card.meaning}</span>
            <span className="flash-example">“{card.example}”</span>
          </>
        )}
      </button>

      <div className="flash-actions">
        <button className="btn btn-ghost" onClick={() => say(flipped ? card.example : card.word)}>
          🔊 Listen
        </button>
        {flipped && (
          <>
            <button className="btn btn-again" onClick={() => answer(false)}>
              Practice again
            </button>
            <button className="btn btn-good" onClick={() => answer(true)}>
              I knew it!
            </button>
          </>
        )}
      </div>
    </div>
  );
}
