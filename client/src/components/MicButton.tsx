// ---------------------------------------------------------------------------
// MicButton
// The big "push to talk" button: hold it down while you speak, release to send.
// Works with mouse, touch screens and keyboard (hold Space or Enter).
// ---------------------------------------------------------------------------
import type { KeyboardEvent, PointerEvent } from "react";

interface Props {
  listening: boolean;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
}

export default function MicButton({ listening, disabled, onStart, onStop }: Props) {
  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled || e.button !== 0) return; // left mouse button / finger only
    e.preventDefault();
    // "Capture" the pointer so we still get pointerup if your finger slides off.
    e.currentTarget.setPointerCapture(e.pointerId);
    onStart();
  };

  const handlePointerUp = () => {
    if (listening) onStop();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat && !disabled) {
      e.preventDefault();
      onStart();
    }
  };

  const handleKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handlePointerUp();
    }
  };

  return (
    <div className="mic-wrap">
      <button
        type="button"
        className={`mic ${listening ? "listening" : ""}`}
        disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onContextMenu={(e) => e.preventDefault()} // no long-press menu on phones
        aria-label="Hold to talk"
        aria-pressed={listening}
      >
        <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden>
          <path
            fill="currentColor"
            d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z"
          />
        </svg>
      </button>
      <span className="mic-label">{listening ? "Listening… release to send" : "Hold to talk"}</span>
    </div>
  );
}
