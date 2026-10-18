// ---------------------------------------------------------------------------
// useSpeechSynthesis
// Gives Max a voice, using the browser's built-in text-to-speech.
// The available voices depend on your browser and operating system.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useRef, useState } from "react";

const supported = typeof window !== "undefined" && "speechSynthesis" in window;

// Max is a man, so when choosing automatically we prefer these US voices.
const PREFERRED_VOICES = [
  "Andrew", // Microsoft Edge natural voices
  "Guy",
  "Christopher",
  "Eric",
  "Google US English",
  "David",
  "Mark",
  "Alex", // macOS
];

/** Finds the voice to use: the one chosen in settings, or a good default. */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  voiceURI: string,
): SpeechSynthesisVoice | undefined {
  const chosen = voices.find((v) => v.voiceURI === voiceURI);
  if (chosen) return chosen;

  const us = voices.filter((v) => v.lang.replace("_", "-").toLowerCase() === "en-us");
  for (const name of PREFERRED_VOICES) {
    const match = us.find((v) => v.name.includes(name));
    if (match) return match;
  }
  return us[0] ?? voices[0];
}

// Dina speaks with an American (US) accent: prefer natural US female voices.
const DINA_VOICES = [
  "Ava", // Microsoft Edge natural voices (en-US)
  "Jenny",
  "Aria",
  "Emma",
  "Michelle",
  "Samantha", // macOS
  "Google US English", // Chrome
  "Zira", // Windows (sounds more robotic, so it comes last)
];

/** Finds a US English female voice for Dina, or undefined to use the browser default. */
export function pickDinaVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const us = voices.filter((v) => v.lang.replace("_", "-").toLowerCase() === "en-us");
  for (const name of DINA_VOICES) {
    const match = us.find((v) => v.name.includes(name));
    if (match) return match;
  }
  return us[0];
}

export function useSpeechSynthesis() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  // The id of the message being read aloud right now (or null).
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  // Functions to call each time the voice starts a new word (used by Dina's face).
  const wordListeners = useRef(new Set<() => void>());

  // Voices load asynchronously, so we listen for the "voiceschanged" event.
  useEffect(() => {
    if (!supported) return;
    const update = () =>
      setVoices(
        window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en")),
      );
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  const speak = useCallback(
    (text: string, options: { rate: number; voiceURI: string; id?: string; queue?: boolean }) => {
      if (!supported) return;
      // Normally stop anything that is already playing. With `queue`, add this
      // text after it instead (used to speak a streamed answer sentence by sentence).
      if (!options.queue) window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = options.rate;
      const voice = pickVoice(voices, options.voiceURI);
      if (voice) utterance.voice = voice;

      const id = options.id ?? "preview";
      // Only clear the "speaking" state if THIS utterance is the current one,
      // and nothing else is still queued.
      const done = () => {
        if (window.speechSynthesis.pending) return;
        setSpeakingId((current) => (current === id ? null : current));
      };
      utterance.onend = done;
      utterance.onerror = done;
      // Not every voice sends word events; the avatars still animate without them.
      utterance.onboundary = (event) => {
        if (event.name === "word") wordListeners.current.forEach((listener) => listener());
      };

      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    },
    [voices],
  );

  /** Calls `listener` at every spoken word. Returns a function that stops it. */
  const onWord = useCallback((listener: () => void) => {
    wordListeners.current.add(listener);
    return () => {
      wordListeners.current.delete(listener);
    };
  }, []);

  return { supported, voices, speakingId, speak, cancel, onWord };
}

/** The type of the object returned by the hook (passed to pages as `tts`). */
export type Tts = ReturnType<typeof useSpeechSynthesis>;
