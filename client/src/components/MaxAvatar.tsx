// ---------------------------------------------------------------------------
// MaxAvatar
// Max as a sleek humanoid robot (silver and black shell, black glass face with
// a neon ring) standing on a gray metal platform. He reacts to the chat:
//   idle      -> floats gently, the neon ring breathes, sometimes waves
//   listening -> tilts his head, the ring turns green and grows
//   thinking  -> a light scans around the ring
//   speaking  -> the ring pulses and a sound meter moves inside it
// The drawing is inline SVG and all the movement is CSS (see styles.css).
// ---------------------------------------------------------------------------
import { AVATAR_STATUS, type AvatarState } from "./avatarState";

interface Props {
  state: AvatarState;
  /** Smaller text under the status, e.g. the conversation mode. */
  caption?: string;
}

const SHELL_STROKE = "#9aa1ad";
const JOINT = "#1c1f25";

export default function MaxAvatar({ state, caption }: Props) {
  return (
    <div className="max-avatar robot-avatar" data-state={state}>
      <div className="avatar-stage">
        <svg className="avatar-svg" viewBox="0 0 240 320" role="img" aria-label={`Max: ${AVATAR_STATUS[state]}`}>
          <defs>
            <linearGradient id="opt-shell" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.55" stopColor="#e3e6eb" />
              <stop offset="1" stopColor="#b7bcc6" />
            </linearGradient>
            <linearGradient id="opt-glass" x1="0.2" y1="0" x2="0.8" y2="1">
              <stop offset="0" stopColor="#30343d" />
              <stop offset="0.5" stopColor="#0b0c10" />
              <stop offset="1" stopColor="#1a1c22" />
            </linearGradient>
            <linearGradient id="opt-metal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c9cdd4" />
              <stop offset="1" stopColor="#7d838e" />
            </linearGradient>
            <linearGradient id="opt-metal-side" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#3c4048" />
              <stop offset="0.5" stopColor="#5e636d" />
              <stop offset="1" stopColor="#30343b" />
            </linearGradient>
            <radialGradient id="opt-floor-glow">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.35" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </radialGradient>
            <filter id="opt-neon" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Gray metal platform with a thin neon line (stays still) */}
          <g className="avatar-platform">
            <ellipse className="platform-glow" cx="120" cy="300" rx="100" ry="20" fill="url(#opt-floor-glow)" />
            <path d="M34 296v10a86 15 0 0 0 172 0v-10z" fill="url(#opt-metal-side)" />
            <ellipse cx="120" cy="296" rx="86" ry="15" fill="url(#opt-metal)" stroke="#6b717c" strokeWidth="1" />
            <ellipse cx="120" cy="296" rx="70" ry="11.5" fill="none" stroke="currentColor" strokeWidth="1.6" filter="url(#opt-neon)" />
            <ellipse cx="120" cy="296" rx="58" ry="9" fill="#8e949e" opacity="0.55" />
            <ellipse className="platform-shadow" cx="120" cy="295" rx="34" ry="5.5" fill="#000" opacity="0.4" />
          </g>

          <g className="avatar-body">
            {/* Legs */}
            <rect x="100" y="216" width="18" height="44" rx="8" fill="url(#opt-shell)" stroke={SHELL_STROKE} strokeWidth="1.5" />
            <rect x="122" y="216" width="18" height="44" rx="8" fill="url(#opt-shell)" stroke={SHELL_STROKE} strokeWidth="1.5" />
            <circle cx="109" cy="262" r="7" fill={JOINT} />
            <circle cx="131" cy="262" r="7" fill={JOINT} />
            <rect x="102.5" y="263" width="13" height="25" rx="6" fill="#262a31" />
            <rect x="124.5" y="263" width="13" height="25" rx="6" fill="#262a31" />
            <ellipse cx="107" cy="291" rx="13" ry="5" fill="#111317" />
            <ellipse cx="133" cy="291" rx="13" ry="5" fill="#111317" />

            {/* Waist and hips */}
            <rect x="100" y="174" width="40" height="30" rx="9" fill={JOINT} />
            <path d="M104 184h32M104 193h32" stroke="#343841" strokeWidth="2" />
            <path d="M96 200h48l-6 22h-36z" fill="url(#opt-shell)" stroke={SHELL_STROKE} strokeWidth="1.5" strokeLinejoin="round" />

            {/* Chest plate */}
            <path
              d="M80 118c8-10 72-10 80 0l-4 50c-10 16-62 16-72 0z"
              fill="url(#opt-shell)"
              stroke={SHELL_STROKE}
              strokeWidth="1.5"
            />
            <path d="M120 112v62" stroke="#c4c8cf" strokeWidth="1.5" />
            <path d="M92 150c10 8 46 8 56 0" fill="none" stroke="#c4c8cf" strokeWidth="1.5" />
            <rect className="chest-light" x="111" y="128" width="18" height="3.5" rx="1.75" fill="currentColor" filter="url(#opt-neon)" />

            {/* Shoulders */}
            <circle cx="76" cy="123" r="11" fill={JOINT} />
            <circle cx="164" cy="123" r="11" fill={JOINT} />

            {/* Left arm, hanging down */}
            <g className="arm-left">
              <line x1="75" y1="126" x2="66" y2="164" stroke={SHELL_STROKE} strokeWidth="17" strokeLinecap="round" />
              <line x1="75" y1="126" x2="66" y2="164" stroke="#eceef2" strokeWidth="14" strokeLinecap="round" />
              <circle cx="66" cy="167" r="6.5" fill={JOINT} />
              <line x1="66" y1="170" x2="62" y2="203" stroke="#262a31" strokeWidth="11" strokeLinecap="round" />
              <ellipse cx="61" cy="212" rx="6.5" ry="9" fill="#2c3038" />
            </g>

            {/* Right arm: upper arm down, forearm raised to wave */}
            <line x1="165" y1="126" x2="178" y2="160" stroke={SHELL_STROKE} strokeWidth="17" strokeLinecap="round" />
            <line x1="165" y1="126" x2="178" y2="160" stroke="#eceef2" strokeWidth="14" strokeLinecap="round" />
            <g className="arm-right">
              <line x1="178" y1="163" x2="196" y2="128" stroke="#262a31" strokeWidth="11" strokeLinecap="round" />
              <ellipse cx="200" cy="118" rx="7" ry="10" fill="#2c3038" transform="rotate(22 200 118)" />
              <circle cx="178" cy="163" r="6.5" fill={JOINT} />
            </g>

            {/* Neck */}
            <rect x="111" y="96" width="18" height="18" rx="5" fill={JOINT} />
            <path d="M111 102h18M111 108h18" stroke="#343841" strokeWidth="1.5" />

            <g className="avatar-head">
              {/* Helmet and black glass faceplate */}
              <ellipse cx="88" cy="62" rx="4" ry="10" fill="#7d838e" />
              <ellipse cx="152" cy="62" rx="4" ry="10" fill="#7d838e" />
              <ellipse cx="120" cy="60" rx="33" ry="38" fill="url(#opt-shell)" stroke={SHELL_STROKE} strokeWidth="1.5" />
              <ellipse cx="120" cy="63" rx="28" ry="31" fill="url(#opt-glass)" />
              <path d="M98 50c4-12 14-18 26-19" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="3" strokeLinecap="round" />

              {/* Neon ring on the face */}
              <circle cx="120" cy="64" r="23" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1" />
              <circle className="face-ring" cx="120" cy="64" r="19" fill="none" stroke="currentColor" strokeWidth="2.6" filter="url(#opt-neon)" />
              <circle
                className="ring-scan"
                cx="120"
                cy="64"
                r="19"
                fill="none"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="18 102"
                filter="url(#opt-neon)"
              />

              {/* Eyes and mouth, drawn in neon inside the ring */}
              <g className="avatar-eyes">
                <g className="avatar-pupils" fill="currentColor" filter="url(#opt-neon)">
                  <rect x="107" y="57" width="9" height="4.5" rx="2.25" />
                  <rect x="124" y="57" width="9" height="4.5" rx="2.25" />
                </g>
              </g>
              <path
                className="avatar-smile"
                d="M113 71q7 5 14 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                filter="url(#opt-neon)"
              />
              <g className="avatar-talk" fill="currentColor" filter="url(#opt-neon)">
                <rect x="110" y="67" width="2.6" height="9" rx="1.3" />
                <rect x="114.6" y="67" width="2.6" height="9" rx="1.3" />
                <rect x="119.2" y="67" width="2.6" height="9" rx="1.3" />
                <rect x="123.8" y="67" width="2.6" height="9" rx="1.3" />
                <rect x="128.4" y="67" width="2.6" height="9" rx="1.3" />
              </g>
            </g>
          </g>
        </svg>

        <div className="avatar-thought" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="avatar-caption">
        <strong>Max</strong>
        <span className="avatar-status" aria-live="polite">
          <span className="status-dot" aria-hidden />
          {AVATAR_STATUS[state]}
        </span>
        {caption && <span className="avatar-sub">{caption}</span>}
      </div>
    </div>
  );
}
