// ---------------------------------------------------------------------------
// useSpeechRecognition
// Turns your voice into text with the browser's Web Speech API.
//
// Usage (push to talk):
//   start()  -> when you press the mic button
//   stop()   -> when you release it; returns a Promise with the final text
//
// Works best in Chrome and Edge. Firefox doesn't support it yet.
// ---------------------------------------------------------------------------
import { useCallback, useRef, useState } from "react";

// Chrome/Edge call it "webkitSpeechRecognition". We look it up once.
const Recognition =
  typeof window !== "undefined"
    ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
    : undefined;

/** Friendly messages for the most common errors. */
function errorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was blocked. Allow the microphone in your browser settings.";
    case "audio-capture":
      return "No microphone was found.";
    case "network":
      return "Speech recognition needs an internet connection.";
    default:
      return `Speech recognition error: ${code}`;
  }
}

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState(""); // live text while you speak
  const [error, setError] = useState<string | null>(null);

  // useRef keeps values between renders without causing re-renders.
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textRef = useRef("");
  const resolveRef = useRef<((text: string) => void) | null>(null);

  const start = useCallback(() => {
    if (!Recognition || recognitionRef.current) return;

    const rec = new Recognition();
    rec.lang = "en-US";
    rec.continuous = true; // keep listening while the button is held
    rec.interimResults = true; // show words as you say them

    textRef.current = "";
    setTranscript("");
    setError(null);

    rec.onresult = (event) => {
      if (recognitionRef.current !== rec) return; // an old recognition we already stopped
      // Rebuild the whole text from all results every time.
      const parts: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        parts.push(event.results[i][0].transcript);
      }
      textRef.current = parts.join(" ").replace(/\s+/g, " ").trim();
      setTranscript(textRef.current);
    };

    rec.onerror = (event) => {
      // "no-speech" and "aborted" are normal (you didn't say anything).
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(errorMessage(event.error));
      }
    };

    rec.onend = () => {
      if (recognitionRef.current !== rec) return; // already handled by a fast stop()
      recognitionRef.current = null;
      setListening(false);
      // If someone is waiting for the final text (stop() was called), give it to them.
      resolveRef.current?.(textRef.current);
      resolveRef.current = null;
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
    }
  }, []);

  const stop = useCallback((): Promise<string> => {
    const rec = recognitionRef.current;
    if (!rec) return Promise.resolve(textRef.current);

    // Fast path: we already heard words, so use them right away instead of
    // waiting (up to a second or more) for the browser to finalize them.
    if (textRef.current) {
      recognitionRef.current = null;
      setListening(false);
      rec.abort();
      return Promise.resolve(textRef.current);
    }

    return new Promise((resolve) => {
      resolveRef.current = resolve;
      rec.stop(); // the browser finishes processing, then calls onend
      // Safety net: if onend never fires, resolve anyway after 2 seconds.
      setTimeout(() => {
        if (resolveRef.current === resolve) {
          resolveRef.current = null;
          recognitionRef.current = null;
          setListening(false);
          resolve(textRef.current);
        }
      }, 2000);
    });
  }, []);

  return { supported: Boolean(Recognition), listening, transcript, error, start, stop };
}
