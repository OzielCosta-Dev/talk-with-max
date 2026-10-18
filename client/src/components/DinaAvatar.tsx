// ---------------------------------------------------------------------------
// DinaAvatar
// Dina, the face-to-face conversation partner: a 3D holographic AI face
// floating above a light projector (drawn by lib/holoFace.ts).
// She reacts like a person:
//   idle      -> sways gently, blinks, glances around, slight smile
//   listening -> tilts her head, raises her eyebrows, nods "mm-hm"
//   thinking  -> looks up and to the side
//   speaking  -> jaw and lips move in syllables, a small nod on every word
// ---------------------------------------------------------------------------
import { useEffect, useRef } from "react";
import { HoloFace } from "../lib/holoFace";
import { AVATAR_STATUS, type AvatarState } from "./avatarState";

interface Props {
  state: AvatarState;
  /** Subscribes to "a new word is being spoken" events (from the voice). */
  onWord?: (listener: () => void) => () => void;
}

export default function DinaAvatar({ state, onWord }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceRef = useRef<HoloFace | null>(null);

  // Start the 3D face when the component appears, stop it when it goes away.
  useEffect(() => {
    if (!canvasRef.current) return;
    const face = new HoloFace(canvasRef.current);
    faceRef.current = face;
    face.start();
    return () => {
      face.stop();
      faceRef.current = null;
    };
  }, []);

  useEffect(() => {
    faceRef.current?.setMood(state);
  }, [state]);

  useEffect(() => onWord?.(() => faceRef.current?.word()), [onWord]);

  return (
    <div className="max-avatar dina-avatar" data-state={state}>
      <div className="avatar-stage">
        <div className="holo-screen" role="img" aria-label={`Dina: ${AVATAR_STATUS[state]}`}>
          <canvas ref={canvasRef} className="holo-canvas" />
        </div>

        <div className="avatar-thought" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="avatar-caption">
        <strong>Dina</strong>
        <span className="avatar-status" aria-live="polite">
          <span className="status-dot" aria-hidden />
          {AVATAR_STATUS[state]}
        </span>
      </div>
    </div>
  );
}
