// ---------------------------------------------------------------------------
// holoFace.ts
// Draws Dina as a 3D holographic face on a <canvas>, with no 3D library.
//
// How it works:
//   1. The head is made of horizontal rings of points (like the lines of a
//      hologram). facePoint() turns a position on the face (fx = left/right,
//      fy = up/down) into a 3D point, pushing the front in and out to shape a
//      nose, eye sockets, cheekbones, lips and a chin.
//   2. Every frame, the points are deformed (jaw, lips, smile, eyebrows),
//      rotated (the head turns, nods and tilts), lit, and projected with
//      perspective. Then they are drawn as glowing lines, plus brighter
//      contour lines for the brows, nose and lips, and the eyes.
//   3. The "mood" (idle / listening / thinking / speaking) changes how she
//      moves, so she reacts like a person in a conversation.
// ---------------------------------------------------------------------------
import type { AvatarState } from "../components/avatarState";

const RINGS = 74; // horizontal lines from the top of the head to the chin
const SEGMENTS = 88; // points around each ring
const COUNT = RINGS * SEGMENTS;
const ALPHA_STEPS = 8; // lines are grouped by brightness to draw them fast

type Rgb = [number, number, number];
type Vec3 = [number, number, number];

const BASE_COLOR: Rgb = [92, 214, 255]; // hologram cyan
const MOOD_COLOR: Record<AvatarState, Rgb> = {
  idle: [92, 214, 255],
  listening: [80, 240, 190],
  thinking: [255, 200, 96],
  speaking: [150, 176, 255],
};

// Light comes from the upper left, in front of the face (camera space).
const LIGHT: Vec3 = (() => {
  const v: Vec3 = [-0.35, 0.45, 0.82];
  const len = Math.hypot(...v);
  return v.map((c) => c / len) as Vec3;
})();

/** Bell curve: 1 at d = 0, fading to 0 as |d| grows past `s`. */
const bell = (d: number, s: number) => Math.exp(-(d * d) / (2 * s * s));
/** Smooth 0 -> 1 ramp between e0 and e1 (works in both directions). */
function ramp(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** Moves `value` toward `target`; `speed` is how fast (per second). */
const approach = (value: number, target: number, speed: number, dt: number) =>
  value + (target - value) * Math.min(1, speed * dt);

// --- The shape of the head --------------------------------------------------

/** How wide the head is at height fy (narrower jaw and chin). */
const widthAt = (fy: number) => 0.86 * (fy < 0 ? 1 - 0.4 * Math.pow(-fy, 1.5) : 1 - 0.08 * fy * fy);

/** How far the facial features stick out (+) or go in (-) at (fx, fy). */
function featureDepth(fx: number, fy: number) {
  return (
    -0.13 * (bell(fx - 0.3, 0.12) + bell(fx + 0.3, 0.12)) * bell(fy - 0.05, 0.08) + // eye sockets
    0.07 * (bell(fx - 0.3, 0.17) + bell(fx + 0.3, 0.17)) * bell(fy - 0.2, 0.05) + // brow bone
    0.3 * bell(fx, 0.055) * bell(fy + 0.1, 0.15) * ramp(0.15, 0.02, fy) + // nose
    0.09 * bell(fx, 0.09) * bell(fy + 0.26, 0.05) + // tip of the nose
    0.06 * (bell(fx - 0.38, 0.13) + bell(fx + 0.38, 0.13)) * bell(fy + 0.1, 0.12) + // cheekbones
    0.08 * bell(fx, 0.16) * bell(fy + 0.45, 0.035) + // upper lip
    0.09 * bell(fx, 0.14) * bell(fy + 0.56, 0.045) - // lower lip
    0.04 * bell(fx, 0.19) * bell(fy + 0.5, 0.014) - // line between the lips
    0.05 * bell(fx, 0.14) * bell(fy + 0.65, 0.035) + // under the lower lip
    0.09 * bell(fx, 0.16) * bell(fy + 0.8, 0.08) // chin
  );
}

interface FacePoint {
  pos: Vec3;
  // How much the point follows each facial movement (0..1):
  jaw: number;
  lowerLip: number;
  upperLip: number;
  corner: number;
  brow: number;
}

/** A point on the head. sx = sideways on the unit sphere, sy = height. */
function headPoint(sx: number, sy: number, sz: number): FacePoint {
  const fy = sy; // 1 = top of the head, about -0.85 = chin
  const x = sx * widthAt(fy);
  const fx = x;
  const front = ramp(0, 0.45, sz);
  const z = sz * 0.9 * (fy < 0 ? 1 - 0.12 * fy * fy : 1) + featureDepth(fx, fy) * front;
  return {
    pos: [x, sy * 1.08, z],
    jaw: front * bell(fx, 0.36) * ramp(-0.48, -0.6, fy) * ramp(-1.05, -0.85, fy),
    lowerLip: front * bell(fx, 0.17) * bell(fy + 0.56, 0.05),
    upperLip: front * bell(fx, 0.17) * bell(fy + 0.44, 0.04),
    corner: front * (bell(fx - 0.19, 0.05) + bell(fx + 0.19, 0.05)) * bell(fy + 0.5, 0.05),
    brow: front * (bell(fx - 0.3, 0.15) + bell(fx + 0.3, 0.15)) * bell(fy - 0.2, 0.07),
  };
}

/** A point on the FRONT of the face, given face coordinates (fx, fy). */
function facePoint(fx: number, fy: number): FacePoint {
  const sx = fx / widthAt(fy);
  const sz = Math.sqrt(Math.max(0, 1 - sx * sx - fy * fy));
  return headPoint(sx, fy, sz);
}

interface Head {
  pos: Float32Array;
  normal: Float32Array; // which way the surface faces (for lighting)
  fade: Float32Array; // fades the head out below the chin
  jaw: Float32Array;
  lowerLip: Float32Array;
  upperLip: Float32Array;
  corner: Float32Array;
  brow: Float32Array;
}

function buildHead(): Head {
  const head: Head = {
    pos: new Float32Array(COUNT * 3),
    normal: new Float32Array(COUNT * 3),
    fade: new Float32Array(COUNT),
    jaw: new Float32Array(COUNT),
    lowerLip: new Float32Array(COUNT),
    upperLip: new Float32Array(COUNT),
    corner: new Float32Array(COUNT),
    brow: new Float32Array(COUNT),
  };

  for (let r = 0; r < RINGS; r++) {
    const theta = Math.PI * (0.05 + 0.9 * (r / (RINGS - 1))); // from the top down
    for (let s = 0; s < SEGMENTS; s++) {
      const phi = (s / SEGMENTS) * Math.PI * 2; // 0 = facing the viewer
      const i = r * SEGMENTS + s;
      const p = headPoint(Math.sin(theta) * Math.sin(phi), Math.cos(theta), Math.sin(theta) * Math.cos(phi));
      head.pos.set(p.pos, i * 3);
      head.fade[i] = ramp(-1, -0.72, Math.cos(theta));
      head.jaw[i] = p.jaw;
      head.lowerLip[i] = p.lowerLip;
      head.upperLip[i] = p.upperLip;
      head.corner[i] = p.corner;
      head.brow[i] = p.brow;
    }
  }

  // Surface normals from the neighbouring points, so the features catch the light.
  const at = (r: number, s: number) => ((Math.min(RINGS - 1, Math.max(0, r)) * SEGMENTS + ((s + SEGMENTS) % SEGMENTS)) * 3);
  for (let r = 0; r < RINGS; r++) {
    for (let s = 0; s < SEGMENTS; s++) {
      const a = at(r, s - 1), b = at(r, s + 1), c = at(r - 1, s), d = at(r + 1, s);
      const u = [0, 1, 2].map((k) => head.pos[b + k] - head.pos[a + k]);
      const v = [0, 1, 2].map((k) => head.pos[d + k] - head.pos[c + k]);
      let n: Vec3 = [v[1] * u[2] - v[2] * u[1], v[2] * u[0] - v[0] * u[2], v[0] * u[1] - v[1] * u[0]];
      const i = (r * SEGMENTS + s) * 3;
      // Point it outward.
      if (n[0] * head.pos[i] + n[1] * head.pos[i + 1] + n[2] * head.pos[i + 2] < 0) n = [-n[0], -n[1], -n[2]];
      const len = Math.hypot(...n) || 1;
      head.normal.set([n[0] / len, n[1] / len, n[2] / len], i);
    }
  }
  return head;
}

// Contour lines drawn brighter on top of the mesh, as lists of (fx, fy).
const curve = (n: number, f: (t: number) => [number, number]) => Array.from({ length: n + 1 }, (_, i) => f(i / n));
const BROWS = [-1, 1].map((side) => curve(12, (t) => [side * (0.13 + 0.33 * t), 0.18 + 0.05 * Math.sin(Math.PI * (0.25 + 0.75 * t)) - 0.03 * t]));
const NOSE_BRIDGE = curve(8, (t) => [-0.05 + 0.012 * t, -0.02 - 0.2 * t]);
const NOSE_BOTTOM = curve(12, (t) => [-0.1 + 0.2 * t, -0.29 - 0.018 * Math.sin(Math.PI * t) + 0.02 * Math.abs(Math.cos(Math.PI * t))]);
const lipX = (t: number) => -0.19 + 0.38 * t;
const UPPER_LIP = curve(20, (t) => {
  const x = lipX(t);
  // Cupid's bow: two little peaks and a dip in the middle.
  return [x, -0.445 - 0.012 * bell(x, 0.03) + 0.006 * (bell(x - 0.05, 0.03) + bell(x + 0.05, 0.03)) - 0.05 * (x / 0.19) ** 2];
});
const MOUTH_TOP = curve(20, (t) => [lipX(t), -0.493 - 0.004 * (1 - (lipX(t) / 0.19) ** 2)]);
const MOUTH_BOTTOM = curve(20, (t) => [lipX(t), -0.507 + 0.004 * (1 - (lipX(t) / 0.19) ** 2)]);
const LOWER_LIP = curve(20, (t) => [lipX(t) * 0.92, -0.59 + 0.075 * (lipX(t) / 0.19) ** 2]);
const CONTOURS = [...BROWS, NOSE_BRIDGE, NOSE_BOTTOM, UPPER_LIP, LOWER_LIP].map((line) => line.map(([x, y]) => facePoint(x, y)));
const MOUTH_TOP_POINTS = MOUTH_TOP.map(([x, y]) => facePoint(x, y));
const MOUTH_BOTTOM_POINTS = MOUTH_BOTTOM.map(([x, y]) => facePoint(x, y));
const EYES = [-1, 1].map((side) => facePoint(side * 0.3, 0.05));

interface Mote {
  x: number;
  y: number;
  speed: number;
  size: number;
}

export class HoloFace {
  private ctx: CanvasRenderingContext2D;
  private head = buildHead();
  private screenX = new Float32Array(COUNT);
  private screenY = new Float32Array(COUNT);
  private bright = new Float32Array(COUNT);
  private frame = 0;
  private last = 0;
  private time = 0;
  private mood: AvatarState = "idle";
  private reduced: boolean;
  private motes: Mote[] = [];
  private light = false; // light page background: draw darker, not glowing
  private themeCheck = 0;

  // Animated values (they move smoothly toward their targets).
  private color: Rgb = [...BASE_COLOR];
  private mouth = 0;
  private smile = 0.6;
  private browUp = 0;
  private eyeOpen = 1; // what is drawn (includes blinking)
  private eyeWide = 1; // how wide open, without blinking
  private yaw = 0;
  private pitch = 0;
  private roll = 0;
  private nod = 0;
  private gazeX = 0;
  private gazeY = 0;
  private wordKick = 0;

  // Timers for blinking, glancing and syllables.
  private blink = 0;
  private nextBlink = 2;
  private glanceX = 0;
  private glanceY = 0;
  private nextGlance = 3;
  private syllable = 0;
  private syllableSpeed = 26;
  private syllableSize = 0.8;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not supported");
    this.ctx = ctx;
    this.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    for (let i = 0; i < 40; i++) this.motes.push(this.newMote(Math.random()));
  }

  start() {
    const loop = (now: number) => {
      this.draw(now);
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.frame);
  }

  setMood(mood: AvatarState) {
    this.mood = mood;
  }

  /** Called at every spoken word: a small nod and a lift of the eyebrows. */
  word() {
    this.wordKick = 1;
  }

  private newMote(height = 0): Mote {
    return { x: (Math.random() - 0.5) * 1.6, y: -1.5 + height * 2.6, speed: 0.08 + Math.random() * 0.12, size: 0.6 + Math.random() };
  }

  /** Updates how she moves, based on the mood. */
  private animate(dt: number) {
    const t = (this.time += dt);
    const mood = this.mood;
    const calm = this.reduced ? 0 : 1;

    // Blinking: every 2-5 seconds, quick close and open.
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) {
      this.blink = 1;
      this.nextBlink = 2 + Math.random() * 3;
    }
    this.blink = Math.max(0, this.blink - dt * 7);
    const blinkShape = this.blink > 0.5 ? (1 - this.blink) * 2 : this.blink * 2; // 0 -> 1 -> 0

    // Glances: when idle, she looks around now and then.
    this.nextGlance -= dt;
    if (this.nextGlance <= 0) {
      this.glanceX = (Math.random() - 0.5) * 0.8;
      this.glanceY = (Math.random() - 0.5) * 0.4;
      this.nextGlance = 1.5 + Math.random() * 3;
    }

    // Speaking: the mouth opens and closes in syllables, bigger on each new word.
    let mouthTarget = 0;
    if (mood === "speaking") {
      this.syllable += dt * this.syllableSpeed;
      if (this.syllable > Math.PI) {
        this.syllable -= Math.PI;
        this.syllableSpeed = 20 + Math.random() * 14;
        this.syllableSize = 0.45 + Math.random() * 0.55;
      }
      mouthTarget = (0.15 + 0.85 * Math.sin(this.syllable)) * this.syllableSize * (0.75 + 0.35 * this.wordKick);
    }
    this.wordKick = Math.max(0, this.wordKick - dt * 3);
    this.mouth = approach(this.mouth, mouthTarget, 22, dt);

    // Targets for each mood.
    let smile = 0.6;
    let brow = 0;
    let open = 1;
    let yaw = 0.16 * Math.sin(t * 0.35) + 0.05 * Math.sin(t * 0.93);
    let pitch = 0.04 * Math.sin(t * 0.5);
    let roll = 0.035 * Math.sin(t * 0.27);
    let gazeX = this.glanceX;
    let gazeY = this.glanceY;

    if (mood === "listening") {
      smile = 0.35;
      brow = 1;
      open = 1.15;
      yaw *= 0.4;
      roll = 0.1; // head tilted, paying attention
      pitch = 0.05 * Math.max(0, Math.sin(t * 2.6)); // slow "mm-hm" nods
      gazeX = 0;
      gazeY = 0;
    } else if (mood === "thinking") {
      smile = 0.1;
      brow = 0.6;
      yaw = 0.22;
      pitch = -0.14; // looks up
      roll = -0.05;
      gazeX = 0.7;
      gazeY = -0.7;
    } else if (mood === "speaking") {
      smile = 0.4;
      brow = 0.45 * this.wordKick;
      yaw *= 0.6;
      gazeX *= 0.2;
      gazeY *= 0.2;
    }

    this.smile = approach(this.smile, smile, 4, dt);
    this.browUp = approach(this.browUp, brow, 8, dt);
    this.eyeWide = approach(this.eyeWide, open, 6, dt);
    this.eyeOpen = this.eyeWide * (1 - blinkShape) + 0.08 * blinkShape;
    this.yaw = approach(this.yaw, yaw * calm, 3, dt);
    this.pitch = approach(this.pitch, pitch * calm, 4, dt);
    this.roll = approach(this.roll, roll * calm, 3, dt);
    this.nod = approach(this.nod, this.wordKick * 0.05 * calm, 10, dt); // small nod on each word
    this.gazeX = approach(this.gazeX, gazeX, 9, dt);
    this.gazeY = approach(this.gazeY, gazeY, 9, dt);

    const target = MOOD_COLOR[mood];
    for (let c = 0; c < 3; c++) {
      this.color[c] = approach(this.color[c], mix(BASE_COLOR[c], target[c], 0.55), 3, dt);
    }
  }

  /** How far a point moves up/down for the current expression. */
  private lift(p: { jaw: number; lowerLip: number; upperLip: number; corner: number; brow: number }) {
    return (
      -this.mouth * (0.13 * p.jaw + 0.06 * p.lowerLip) +
      this.mouth * 0.03 * p.upperLip +
      this.smile * 0.025 * p.corner +
      this.browUp * 0.05 * p.brow
    );
  }

  private draw(now: number) {
    const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0.016);
    this.last = now;
    this.animate(dt);

    // Match the canvas to its size on screen (sharp on high-DPI screens).
    const canvas = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = this.ctx;
    // Light or dark page? (read from CSS now and then, it rarely changes)
    if (this.themeCheck-- <= 0) {
      this.light = getComputedStyle(canvas).getPropertyValue("--holo-light").trim() === "1";
      this.themeCheck = 30;
    }
    const glow: GlobalCompositeOperation = this.light ? "source-over" : "lighter";
    const scale = Math.min(w * 0.45, h * 0.37);
    const cx = w / 2;
    const cy = h * 0.47;
    // On a light page the hologram is drawn in a deeper shade so it stays visible.
    const [r, g, b] = this.color.map((c) => Math.round(this.light ? c * 0.42 : c));
    const rgba = (a: number) => `rgba(${r},${g},${b},${a})`;
    // A hologram flickers a tiny bit.
    const flicker = this.reduced ? 1 : 0.93 + 0.07 * Math.sin(this.time * 37) * Math.sin(this.time * 11);

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = glow;

    // Light from the projector below.
    const baseY = cy + scale * 1.3;
    const beam = ctx.createLinearGradient(0, baseY, 0, cy - scale);
    beam.addColorStop(0, rgba(this.light ? 0.12 : 0.2));
    beam.addColorStop(1, rgba(0));
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(cx - scale * 0.35, baseY);
    ctx.lineTo(cx + scale * 0.35, baseY);
    ctx.lineTo(cx + scale * 1.1, cy - scale);
    ctx.lineTo(cx - scale * 1.1, cy - scale);
    ctx.fill();
    const pad = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, scale * 0.7);
    pad.addColorStop(0, rgba(0.7));
    pad.addColorStop(1, rgba(0));
    ctx.fillStyle = pad;
    ctx.beginPath();
    ctx.ellipse(cx, baseY, scale * 0.7, scale * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dust floating up in the light.
    for (const mote of this.motes) {
      mote.y += mote.speed * dt;
      if (mote.y > 1.2) Object.assign(mote, this.newMote());
      const a = 0.5 * ramp(-1.5, -1.1, mote.y) * ramp(1.2, 0.8, mote.y);
      ctx.fillStyle = rgba(a);
      ctx.fillRect(cx + mote.x * scale * (0.6 + 0.4 * (1.2 - mote.y)), cy - mote.y * scale, mote.size * dpr, mote.size * dpr);
    }

    // --- Turn the head and project points to the screen ---
    const cyaw = Math.cos(this.yaw), syaw = Math.sin(this.yaw);
    const pitch = this.pitch + this.nod;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cr = Math.cos(this.roll), sr = Math.sin(this.roll);
    const camera = 3.4;
    const bob = this.reduced ? 0 : 0.03 * Math.sin(this.time * 1.1);

    const rotate = (x: number, y: number, z: number): Vec3 => {
      const x1 = x * cyaw + z * syaw;
      const z1 = -x * syaw + z * cyaw;
      const y1 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;
      return [x1 * cr - y1 * sr, x1 * sr + y1 * cr, z2];
    };
    const project = ([x, y, z]: Vec3): Vec3 => {
      const p = camera / (camera - z);
      return [cx + x * p * scale, cy - (y + bob) * p * scale, p];
    };
    /** A face point with the current expression, on screen. */
    const toScreen = (p: FacePoint): Vec3 => {
      const dz = -this.mouth * 0.03 * p.jaw;
      return project(rotate(p.pos[0], p.pos[1] + this.lift(p), p.pos[2] + dz));
    };

    const head = this.head;
    for (let i = 0; i < COUNT; i++) {
      const k = i * 3;
      const lift = this.lift({
        jaw: head.jaw[i],
        lowerLip: head.lowerLip[i],
        upperLip: head.upperLip[i],
        corner: head.corner[i],
        brow: head.brow[i],
      });
      const dz = -this.mouth * 0.03 * head.jaw[i];
      const [px, py] = project(rotate(head.pos[k], head.pos[k + 1] + lift, head.pos[k + 2] + dz));
      this.screenX[i] = px;
      this.screenY[i] = py;
      const n = rotate(head.normal[k], head.normal[k + 1], head.normal[k + 2]);
      const facing = Math.max(0, n[2]);
      const lit = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
      this.bright[i] = Math.min(1, head.fade[i] * (0.06 + 0.35 * facing + 0.75 * lit * lit) * flicker);
    }

    // Lines along each ring, grouped by brightness (one stroke per group).
    const paths = Array.from({ length: ALPHA_STEPS }, () => new Path2D());
    for (let ring = 0; ring < RINGS; ring++) {
      const start = ring * SEGMENTS;
      for (let s = 0; s < SEGMENTS; s++) {
        const a = start + s;
        const b2 = start + ((s + 1) % SEGMENTS);
        const level = Math.min(this.bright[a], this.bright[b2]);
        if (level < 0.04) continue;
        const path = paths[Math.min(ALPHA_STEPS - 1, Math.floor(level * ALPHA_STEPS))];
        path.moveTo(this.screenX[a], this.screenY[a]);
        path.lineTo(this.screenX[b2], this.screenY[b2]);
      }
    }
    ctx.lineWidth = Math.max(1, dpr * 0.9);
    paths.forEach((path, level) => {
      ctx.strokeStyle = rgba(((level + 0.5) / ALPHA_STEPS) * 0.8);
      ctx.stroke(path);
    });

    // Sparkling points on the brightest parts.
    ctx.fillStyle = rgba(0.9);
    const dot = Math.max(1, dpr);
    for (let i = 0; i < COUNT; i += 2) {
      if (this.bright[i] > 0.8) ctx.fillRect(this.screenX[i] - dot / 2, this.screenY[i] - dot / 2, dot, dot);
    }

    // --- Mouth opening: dark between the inner edges of the lips ---
    const top = MOUTH_TOP_POINTS.map(toScreen);
    const bottom = MOUTH_BOTTOM_POINTS.map(toScreen);
    if (this.mouth > 0.03) {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(2, 8, 16, 0.8)";
      ctx.beginPath();
      top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      [...bottom].reverse().forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.fill();
      ctx.globalCompositeOperation = glow;
    }

    // --- Bright contour lines: brows, nose, lips ---
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = rgba(0.85);
    ctx.lineWidth = 1.6 * dpr;
    const strokeLine = (points: Vec3[]) => {
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    };
    CONTOURS.forEach((line) => strokeLine(line.map(toScreen)));
    strokeLine(top);
    if (this.mouth > 0.03) strokeLine(bottom);

    // --- Eyes: almond outline, glowing iris, dark pupil ---
    EYES.forEach((eye, index) => {
      const side = index === 0 ? -1 : 1;
      const [sx, sy, p] = toScreen({ ...eye, pos: [eye.pos[0], eye.pos[1] + this.browUp * 0.01, eye.pos[2] + 0.02] });
      const eyeW = 0.12 * scale * p * Math.max(0.35, Math.abs(cyaw) - side * syaw * 0.3);
      const eyeH = 0.055 * scale * p * this.eyeOpen;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(this.roll);
      ctx.beginPath();
      ctx.moveTo(-eyeW, 0);
      ctx.quadraticCurveTo(0, -eyeH * 2, eyeW, 0);
      ctx.quadraticCurveTo(0, eyeH * 1.6, -eyeW, 0);
      ctx.closePath();
      ctx.strokeStyle = rgba(0.95);
      ctx.lineWidth = 1.6 * dpr;
      ctx.stroke();
      ctx.clip();

      const irisR = eyeW * 0.5;
      const ix = this.gazeX * eyeW * 0.35;
      const iy = this.gazeY * eyeH * 0.6;
      const iris = ctx.createRadialGradient(ix, iy, 0, ix, iy, irisR);
      iris.addColorStop(0, rgba(1));
      iris.addColorStop(0.7, rgba(0.55));
      iris.addColorStop(1, rgba(0.1));
      ctx.fillStyle = iris;
      ctx.beginPath();
      ctx.arc(ix, iy, irisR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(2, 8, 16, 0.85)";
      ctx.beginPath();
      ctx.arc(ix, iy, irisR * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = glow;

      // Eyelid crease above the eye.
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(this.roll);
      ctx.beginPath();
      ctx.moveTo(-eyeW * 0.9, -eyeH * 0.4);
      ctx.quadraticCurveTo(0, -eyeH * 2.6 - 0.02 * scale, eyeW * 0.95, -eyeH * 0.3);
      ctx.strokeStyle = rgba(0.4);
      ctx.lineWidth = 1.1 * dpr;
      ctx.stroke();
      ctx.restore();
    });

    ctx.globalCompositeOperation = "source-over";
  }
}
