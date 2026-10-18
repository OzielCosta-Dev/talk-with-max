// ---------------------------------------------------------------------------
// App.tsx
// The main component. It holds the data shared by all pages (settings,
// vocabulary, session history) and shows the page chosen in the nav bar.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useSpeechSynthesis } from "./hooks/useSpeechSynthesis";
import { DEFAULT_SETTINGS, KEYS, mergeWords } from "./lib/storage";
import type { NewWord, Settings, SummaryRecord, VocabWord } from "./types";
import ChatPage from "./pages/ChatPage";
import FaceToFacePage from "./pages/FaceToFacePage";
import VocabularyPage from "./pages/VocabularyPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";

type Tab = "chat" | "face" | "vocab" | "history" | "settings";

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "chat", icon: "💬", label: "Chat" },
  { id: "face", icon: "👩🏽", label: "Dina" },
  { id: "vocab", icon: "📒", label: "Words" },
  { id: "history", icon: "📈", label: "Progress" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("chat");
  const [storedSettings, setSettings] = useLocalStorage<Settings>(KEYS.settings, DEFAULT_SETTINGS);
  const [words, setWords] = useLocalStorage<VocabWord[]>(KEYS.vocabulary, []);
  const [summaries, setSummaries] = useLocalStorage<SummaryRecord[]>(KEYS.summaries, []);

  // Merge with defaults, in case an older saved version is missing a setting.
  const settings = { ...DEFAULT_SETTINGS, ...storedSettings };

  // One text-to-speech instance shared by every page.
  const tts = useSpeechSynthesis();

  // Apply the theme: "system" follows the operating system (see styles.css).
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  // Stop Max talking when you switch pages.
  const goTo = (next: Tab) => {
    tts.cancel();
    setTab(next);
  };

  const addWords = (incoming: NewWord[]) => setWords((current) => mergeWords(current, incoming));
  const addSummary = (record: SummaryRecord) => setSummaries((current) => [record, ...current]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <img src="/max.svg" alt="" className="brand-logo" />
          <span>Talk with Max</span>
        </div>
        <nav className="tabs" aria-label="Main">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? "active" : ""}`}
              onClick={() => goTo(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
            >
              <span className="tab-icon" aria-hidden>
                {t.icon}
              </span>
              <span className="tab-label">
                {t.label}
                {t.id === "vocab" && words.length > 0 && <span className="badge">{words.length}</span>}
              </span>
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {/* The chat stays mounted (just hidden) so a conversation isn't interrupted. */}
        <div className="page-slot" hidden={tab !== "chat"}>
          <ChatPage
            settings={settings}
            updateSettings={(changes) => setSettings((current) => ({ ...current, ...changes }))}
            tts={tts}
            onNewWords={addWords}
            onSessionSummary={addSummary}
          />
        </div>
        {tab === "face" && (
          <FaceToFacePage settings={settings} tts={tts} onSessionSummary={addSummary} />
        )}
        {tab === "vocab" && <VocabularyPage words={words} setWords={setWords} settings={settings} tts={tts} />}
        {tab === "history" && <HistoryPage summaries={summaries} setSummaries={setSummaries} />}
        {tab === "settings" && <SettingsPage settings={settings} setSettings={setSettings} tts={tts} />}
      </main>
    </div>
  );
}
