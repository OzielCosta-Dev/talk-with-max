// ---------------------------------------------------------------------------
// SettingsPage
// Level, Max's voice and speed, corrections and theme. Saved automatically.
// ---------------------------------------------------------------------------
import { pickVoice, type Tts } from "../hooks/useSpeechSynthesis";
import { LEVEL_LABELS } from "../modes";
import type { Level, Settings, Theme } from "../types";

interface Props {
  settings: Settings;
  setSettings: (update: (current: Settings) => Settings) => void;
  tts: Tts;
}

const LEVEL_HINTS: Record<Level, string> = {
  beginner: "Simple words, short sentences.",
  intermediate: "Natural English, some idioms.",
  advanced: "Like a native speaker.",
};

export default function SettingsPage({ settings, setSettings, tts }: Props) {
  // Helper to change one setting and keep the others.
  const update = (changes: Partial<Settings>) => setSettings((current) => ({ ...current, ...changes }));

  const autoVoice = pickVoice(tts.voices, "");

  const testVoice = () =>
    tts.speak("Hi! I'm Max. Let's practice some English together!", {
      rate: settings.rate,
      voiceURI: settings.voiceURI,
    });

  return (
    <div className="page page-padded">
      <h1>⚙️ Settings</h1>

      <section className="setting">
        <h2>Your English level</h2>
        <div className="segmented" role="radiogroup" aria-label="English level">
          {(Object.keys(LEVEL_LABELS) as Level[]).map((level) => (
            <button
              key={level}
              role="radio"
              aria-checked={settings.level === level}
              className={settings.level === level ? "active" : ""}
              onClick={() => update({ level })}
            >
              {LEVEL_LABELS[level]}
            </button>
          ))}
        </div>
        <p className="muted">{LEVEL_HINTS[settings.level]}</p>
      </section>

      <section className="setting">
        <h2>Max's voice</h2>
        {!tts.supported ? (
          <p className="muted">Your browser doesn't support text-to-speech.</p>
        ) : (
          <>
            <label className="field">
              <span>Voice</span>
              <select value={settings.voiceURI} onChange={(e) => update({ voiceURI: e.target.value })}>
                <option value="">Automatic{autoVoice ? ` (${autoVoice.name})` : ""}</option>
                {tts.voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>
                Speed: <strong>{settings.rate.toFixed(2)}×</strong>
              </span>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={settings.rate}
                onChange={(e) => update({ rate: Number(e.target.value) })}
              />
              <span className="range-labels muted">
                <span>Slower</span>
                <span>Faster</span>
              </span>
            </label>

            <button className="btn btn-ghost" onClick={testVoice}>
              🔊 Test voice
            </button>

            <Toggle
              label="Read Max's replies aloud"
              checked={settings.autoSpeak}
              onChange={(autoSpeak) => update({ autoSpeak })}
            />
          </>
        )}
      </section>

      <section className="setting">
        <h2>Corrections</h2>
        <Toggle
          label="Show corrections under my messages"
          checked={settings.corrections}
          onChange={(corrections) => update({ corrections })}
        />
        <p className="muted">Turn it off when you just want to talk freely.</p>
      </section>

      <section className="setting">
        <h2>Appearance</h2>
        <div className="segmented" role="radiogroup" aria-label="Theme">
          {(["system", "light", "dark"] as Theme[]).map((theme) => (
            <button
              key={theme}
              role="radio"
              aria-checked={settings.theme === theme}
              className={settings.theme === theme ? "active" : ""}
              onClick={() => update({ theme })}
            >
              {theme === "system" ? "🖥️ Auto" : theme === "light" ? "☀️ Light" : "🌙 Dark"}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/** A simple on/off switch. */
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden>
        <span className="toggle-thumb" />
      </span>
    </label>
  );
}
