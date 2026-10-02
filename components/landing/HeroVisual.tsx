"use client";

import React, { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { STAR_NODES } from "./heroStars";

export interface HeroVisualProps {
  activeStage?: number;
  onSelectStage?: (stage: number) => void;
  isSplitLayout?: boolean;
  /**
   * Continuous stage position (0…STAGES-1) driven by scroll on desktop, so the
   * camera glides with the page. `null` → follow `activeStage` (mobile).
   */
  stagePosRef?: React.RefObject<number | null>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering model
// One <canvas> and one rAF loop. Everything that moves — planet lattice,
// constellation, vault core, ring system, mini-planets, camera — is painted in a
// single pass per frame. There is no per-frame DOM work, no CSS animation on
// the scene and no SVG: the previous SVG scene repainted ~1000 nodes (and ~100
// CSS-animated ones) every frame, which is what made the hero feel heavy.
//
// The planet, its rings and the lattice share ONE coordinate frame (equatorial
// plane + axial tilt), so a ring is split exactly where it passes behind the
// planet: back halves are painted before the body, front halves after it.
// ─────────────────────────────────────────────────────────────────────────────

const R = 345; // planet radius (scene units)
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const ROLL = -14 * DEG; // axial roll of the whole planet system (screen space)
const TILT_REST = 17; // resting tilt (deg): how far we look down on the ring plane
const ROT_X_MIN = -45;
const ROT_X_MAX = 50;
const SPIN_DEG_PER_S = 2.4;

const CAMERA_SMOOTH_TIME = 0.5; // seconds to settle (critically damped)
const DRAG_THRESHOLD_PX = 5;
const BASE_FONT = '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
const smootherstep = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
/** Frame-rate independent exponential approach factor. */
const decay = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

/** Critically damped spring (C¹-continuous: no velocity jump when the target moves). */
function smoothDamp(cur: number, target: number, vel: number, smoothTime: number, dt: number): [number, number] {
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = cur - target;
  const temp = (vel + omega * change) * dt;
  return [target + (change + temp) * e, (vel - omega * temp) * e];
}

// ─── Palette (rgb triplets so alpha can be applied per draw) ─────────────────
const ICE = "169,200,238";
const ICE_L = "221,232,248";
const AMBER = "240,168,92";
const AMBER_L = "255,242,214";
const MINT = "52,211,153";
const MINT_L = "167,243,208";
const WHITE = "255,255,255";
const FG = "236,237,234";
const MUTED = "142,146,155";
const WARM = "255,226,196";

const colorCache = new Map<string, string>();
/** Memoised `rgba()` strings (alpha quantised to 1%) — keeps the frame loop allocation-free. */
function rgba(rgb: string, a: number): string {
  const q = Math.round(clamp(a, 0, 1) * 100);
  const key = `${rgb}|${q}`;
  let c = colorCache.get(key);
  if (!c) {
    c = `rgba(${rgb},${q / 100})`;
    colorCache.set(key, c);
  }
  return c;
}

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

// ─── Camera ──────────────────────────────────────────────────────────────────
// A keyframe says: zoom `m` × the base fit, looking at planet-space point
// (fx, fy), which lands at (au·W, av·H) on screen. Because frames are expressed
// as screen fractions, the framing holds on any viewport shape.
interface CamFrame {
  m: number;
  fx: number;
  fy: number;
  au: number;
  av: number;
}
type CamKey = keyof CamFrame;
const CAM_KEYS: readonly CamKey[] = ["m", "fx", "fy", "au", "av"];

/** Mini-planet positions on the disc, planet space (stage 1…4 ↔ index 0…3). */
const PIN_POS: ReadonlyArray<readonly [number, number]> = [
  [-100, 240], // 1 fixed yield (diamond)
  [260, -130], // 2 long yield (bio-particle)
  [0, -190], // 3 split engine (prisms)
  [200, 240], // 4 USDG vault (gyroscope)
];

const CAM_DESKTOP: readonly CamFrame[] = [
  { m: 1.0, fx: 0, fy: 0, au: 0.68, av: 0.5 }, // 0 overview
  { m: 1.62, fx: -100, fy: 240, au: 0.73, av: 0.66 }, // 1 fixed — diamond
  { m: 1.4, fx: 260, fy: -130, au: 0.84, av: 0.42 }, // 2 long — bio-particle
  { m: 1.5, fx: 0, fy: 0, au: 0.72, av: 0.56 }, // 3 split engine — core laser
  { m: 1.62, fx: 200, fy: 240, au: 0.8, av: 0.66 }, // 4 vault — gyroscope
];
const CAM_COMPACT: readonly CamFrame[] = [
  { m: 1.0, fx: 0, fy: 0, au: 0.5, av: 0.5 },
  { m: 1.4, fx: -100, fy: 240, au: 0.5, av: 0.62 },
  { m: 1.4, fx: 260, fy: -130, au: 0.5, av: 0.4 },
  { m: 1.3, fx: 0, fy: 0, au: 0.5, av: 0.5 },
  { m: 1.4, fx: 200, fy: 240, au: 0.5, av: 0.62 },
];

/** Camera pose for a fractional stage position; eases to rest on every keyframe. */
function sampleCamera(frames: readonly CamFrame[], pos: number): CamFrame {
  const p = clamp(pos, 0, frames.length - 1);
  const i = Math.min(frames.length - 2, Math.floor(p));
  const k = smootherstep(p - i);
  const a = frames[i];
  const b = frames[i + 1];
  return {
    m: lerp(a.m, b.m, k),
    fx: lerp(a.fx, b.fx, k),
    fy: lerp(a.fy, b.fy, k),
    au: lerp(a.au, b.au, k),
    av: lerp(a.av, b.av, k),
  };
}

// ─── Static scene data ───────────────────────────────────────────────────────
const BG_STARS = (() => {
  let seed = 1337;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  return Array.from({ length: 150 }, () => ({
    u: rnd(),
    v: rnd(),
    r: 0.35 + rnd() * 0.85,
    a: 0.16 + rnd() * 0.42,
    tw: rnd() < 0.2 ? rnd() * TAU : -1,
    warm: rnd() < 0.2,
  }));
})();

// Shooting stars: the head travels along `ang`, the tail trails behind it.
const METEORS = [
  { u: 0.84, v: 0.12, ang: 148, delay: 0.8, dur: 8.5, len: 170, travel: 560, w: 2.0, halo: ICE },
  { u: 0.34, v: 0.08, ang: 154, delay: 4.8, dur: 10.5, len: 190, travel: 620, w: 1.8, halo: ICE_L },
  { u: 0.7, v: 0.34, ang: 146, delay: 8.2, dur: 12, len: 130, travel: 440, w: 1.4, halo: WHITE },
];

const STAR_RGB = STAR_NODES.map((n) => hexToRgb(n[3]));
const STAR_SIN = STAR_NODES.map((n) => Math.sin(n[0] * DEG));
const STAR_COS = STAR_NODES.map((n) => Math.cos(n[0] * DEG));

// Lattice sample tables (static; only the rotation changes per frame).
const LAT_DEGS = [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75];
const LAT_N = 72;
const LAT_SIN = LAT_DEGS.map((d) => Math.sin(d * DEG));
const LAT_COS = LAT_DEGS.map((d) => Math.cos(d * DEG));
const TH_SIN = Array.from({ length: LAT_N + 1 }, (_, k) => Math.sin((k / LAT_N) * TAU));
const TH_COS = Array.from({ length: LAT_N + 1 }, (_, k) => Math.cos((k / LAT_N) * TAU));
const MER_COUNT = 18;
const MER_N = 36; // 5° steps pole → pole
const MER_PHI_SIN = Array.from({ length: MER_N + 1 }, (_, k) => Math.sin((-90 + (k * 180) / MER_N) * DEG));
const MER_PHI_COS = Array.from({ length: MER_N + 1 }, (_, k) => Math.cos((-90 + (k * 180) / MER_N) * DEG));

/** Depth buckets for lattice shading: far side faint → near side bright. */
const NB = 8;
const BUCKET_ALPHA = Array.from({ length: NB }, (_, b) => 0.04 + 0.6 * Math.pow((b + 0.5) / NB, 1.7));

const CUBE_VERTICES: ReadonlyArray<readonly [number, number, number]> = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
];
const CUBE_EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];
const S_OUTER = 70;
const S_INNER = 36;

// ─── Ring system ─────────────────────────────────────────────────────────────
// Equatorial plane. Inner ice-blue ring = Fixed yield, outer amber ring = Long
// yield, the dark gap between them = the split.
interface RingBand {
  r: number; // radius (planet units)
  w: number; // line width (screen px) — or band width (planet units) when `band`
  rgb: string;
  a: number; // resting alpha
  dash?: number[];
  flow?: number; // dash travel speed (units/s)
  band?: boolean; // soft translucent band instead of a line
}
const FIXED_RINGS: readonly RingBand[] = [
  { r: 436, w: 26, rgb: ICE, a: 0.075, band: true },
  { r: 418, w: 0.8, rgb: ICE, a: 0.5 },
  { r: 445, w: 1.5, rgb: ICE, a: 0.9 },
  { r: 445, w: 2.4, rgb: WHITE, a: 0.9, dash: [150, 90, 36, 90], flow: -14 },
  { r: 463, w: 0.8, rgb: ICE, a: 0.42 },
  { r: 463, w: 1, rgb: ICE_L, a: 0.55, dash: [1.5, 12], flow: 6 },
];
const LONG_RINGS: readonly RingBand[] = [
  { r: 548, w: 44, rgb: AMBER, a: 0.05, band: true },
  { r: 524, w: 0.8, rgb: AMBER, a: 0.4 },
  { r: 536, w: 2.6, rgb: AMBER, a: 0.85, dash: [44, 7, 16, 7, 70, 7, 11, 7], flow: 10 },
  { r: 548, w: 3.4, rgb: AMBER_L, a: 0.92, dash: [230, 96, 48, 96], flow: -18 },
  { r: 560, w: 2.2, rgb: AMBER, a: 0.75, dash: [80, 10, 26, 10, 120, 10], flow: 7 },
  { r: 572, w: 1.1, rgb: AMBER, a: 0.55, dash: [3, 14], flow: -5 },
  { r: 582, w: 0.8, rgb: AMBER, a: 0.38 },
];
// Faint coplanar orbits: depth, not decoration.
const FAR_ORBITS: readonly RingBand[] = [
  { r: 760, w: 0.9, rgb: ICE, a: 0.15, dash: [2, 14], flow: 4 },
  { r: 960, w: 0.8, rgb: FG, a: 0.1, dash: [8, 22], flow: -3 },
];

// Moons ride the ring plane.
const MOONS = [
  { r: 445, period: 26, phase: 0.6, glow: "ice", rc: 4.2, rg: 24 },
  { r: 548, period: 38, phase: 3.4, glow: "amber", rc: 4.6, rg: 26 },
  { r: 760, period: 64, phase: 1.8, glow: "ice", rc: 2.6, rg: 15 },
] as const;

// ─── Sim state ───────────────────────────────────────────────────────────────
function createSim() {
  return {
    // orientation (degrees)
    currentX: TILT_REST, currentY: 0, targetX: TILT_REST, targetY: 0,
    velocityX: 0, velocityY: 0,
    tiltX: 0, tiltY: 0, hoverTiltX: 0, hoverTiltY: 0,
    // pointer (normalised −1…1) for parallax + orbit bias
    ptrTX: 0, ptrTY: 0, ptrX: 0, ptrY: 0,
    // camera
    cam: { ...CAM_DESKTOP[0] } as CamFrame,
    camV: { m: 0, fx: 0, fy: 0, au: 0, av: 0 } as CamFrame,
    // eased emphasis
    fixedOp: 0.72, longOp: 0.72,
    iceBack: 0.55, amberBack: 0.7,
    engineVis: 0, vaultVis: 0,
    pinVis: [1, 1, 1, 1], pinAct: [0, 0, 0, 0], pinHover: [0, 0, 0, 0],
    stage: 0,
    // drag / tap
    isDragging: false, pressed: false, moved: false, pointerId: -1,
    downX: 0, downY: 0, dragStartX: 0, dragStartY: 0, rotAtDragX: 0, rotAtDragY: 0,
    lastX: 0, lastY: 0, lastT: 0,
    downStage: -1, hoverPin: -1,
    reduced: false,
  };
}
type Sim = ReturnType<typeof createSim>;

/** Where every eased emphasis value is heading for the current stage / pointer. */
function emphasisGoals(s: Sim) {
  const st = s.stage;
  const fixedBias = Math.max(0, -s.ptrX);
  const longBias = Math.max(0, s.ptrX);
  return {
    fixedOp: st === 1 ? 1 : st === 2 ? 0.35 : 0.72 + fixedBias * 0.28,
    longOp: st === 2 ? 1 : st === 1 ? 0.35 : 0.72 + longBias * 0.28,
    iceBack: st === 1 ? 1 : st === 2 ? 0.15 : 0.55,
    amberBack: st === 2 ? 1 : st === 1 ? 0 : 0.7,
    engineVis: st === 3 ? 1 : 0,
    vaultVis: st === 4 ? 1 : 0,
    pinAct: [0, 1, 2, 3].map((i): number => (st === i + 1 ? 1 : 0)),
    pinVis: [0, 1, 2, 3].map((i): number => (st === 0 || st === i + 1 ? 1 : 0.25)),
  };
}

// ─── Gradients (built once, unit-space, reused through translate/scale) ──────
interface Gfx {
  glow: Record<"white" | "ice" | "amber" | "mint", CanvasGradient>;
  body: CanvasGradient;
  atmo: CanvasGradient;
  haloIce: CanvasGradient;
  haloAmber: CanvasGradient;
  rim: CanvasGradient;
  pinBody: CanvasGradient[];
  starSprite: HTMLCanvasElement;
}

function createGfx(ctx: CanvasRenderingContext2D): Gfx {
  const radial = (x0: number, y0: number, r0: number, x1: number, y1: number, r1: number, stops: ReadonlyArray<readonly [number, string]>) => {
    const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    for (const [o, c] of stops) g.addColorStop(o, c);
    return g;
  };
  const glow = (rgb: string) =>
    radial(0, 0, 0, 0, 0, 1, [[0, rgba(rgb, 0.85)], [0.35, rgba(rgb, 0.35)], [1, rgba(rgb, 0)]]);
  const pin = (stops: ReadonlyArray<readonly [number, string]>) => radial(-10.4, -11.4, 0, -10.4, -11.4, 37.4, stops);

  const rim = ctx.createLinearGradient(-0.78, -0.78, 0.78, 0.78);
  rim.addColorStop(0, "rgba(255,255,255,0.95)");
  rim.addColorStop(0.32, "rgba(235,242,255,0.5)");
  rim.addColorStop(0.62, "rgba(169,200,238,0.12)");
  rim.addColorStop(1, "rgba(169,200,238,0.05)");

  // Soft round sprite for stars — drawImage is far cheaper than a gradient per star.
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 64;
  const sctx = sprite.getContext("2d");
  if (sctx) {
    const sg = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    sg.addColorStop(0, "rgba(255,255,255,0.9)");
    sg.addColorStop(0.3, "rgba(255,255,255,0.28)");
    sg.addColorStop(1, "rgba(255,255,255,0)");
    sctx.fillStyle = sg;
    sctx.fillRect(0, 0, 64, 64);
  }

  return {
    glow: { white: glow(WHITE), ice: glow(ICE), amber: glow(AMBER), mint: glow(MINT) },
    // Glassy planet body, lit from the upper left.
    body: radial(-0.34, -0.4, 0, 0, 0, 1.08, [
      [0, "rgba(52,86,138,0.6)"],
      [0.32, "rgba(18,34,58,0.64)"],
      [0.68, "rgba(6,12,22,0.85)"],
      [1, "rgba(2,4,8,0.95)"],
    ]),
    atmo: radial(0, 0, 0.94, 0, 0, 1.26, [
      [0, "rgba(169,200,238,0)"],
      [0.2, "rgba(169,200,238,0.32)"],
      [0.55, "rgba(120,170,235,0.08)"],
      [1, "rgba(120,170,235,0)"],
    ]),
    haloIce: radial(0, 0, 0.5, 0, 0, 2.4, [
      [0, "rgba(106,163,232,0.2)"],
      [0.42, "rgba(60,110,190,0.075)"],
      [1, "rgba(10,20,40,0)"],
    ]),
    haloAmber: radial(0, 0, 0.5, 0, 0, 2.4, [
      [0, "rgba(240,140,60,0.2)"],
      [0.42, "rgba(190,90,35,0.075)"],
      [1, "rgba(40,12,4,0)"],
    ]),
    rim,
    pinBody: [
      pin([[0, "rgba(255,255,255,0.95)"], [0.2, "rgba(200,220,248,0.85)"], [0.55, "rgba(42,75,124,0.92)"], [0.88, "rgba(8,16,30,0.98)"], [1, "rgb(4,7,14)"]]),
      pin([[0, "rgba(255,244,230,0.95)"], [0.2, "rgba(245,166,91,0.85)"], [0.55, "rgba(126,55,16,0.92)"], [0.88, "rgba(30,10,3,0.98)"], [1, "rgb(12,4,1)"]]),
      pin([[0, "rgba(255,255,255,0.95)"], [0.22, "rgba(213,226,242,0.8)"], [0.6, "rgba(34,43,58,0.92)"], [0.9, "rgba(8,12,20,0.98)"], [1, "rgb(3,5,8)"]]),
      pin([[0, "rgba(230,255,250,0.95)"], [0.2, "rgba(52,211,153,0.85)"], [0.55, "rgba(13,83,55,0.92)"], [0.88, "rgba(3,26,16,0.98)"], [1, "rgb(1,10,6)"]]),
    ],
    starSprite: sprite,
  };
}

// ─── Text ────────────────────────────────────────────────────────────────────
let trackSupported: boolean | null = null;
const glyphW = new Map<string, number>();

/** Tracked (letter-spaced) text — native `letterSpacing` where available, manual otherwise. */
function text(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, spacing: number, align: "left" | "center" | "right" = "left") {
  if (trackSupported === null) trackSupported = "letterSpacing" in ctx;
  if (trackSupported) {
    const c = ctx as CanvasRenderingContext2D & { letterSpacing: string };
    c.letterSpacing = `${spacing}px`;
    ctx.textAlign = align;
    // letterSpacing adds a trailing gap that skews centred/right text; compensate.
    const dx = align === "center" ? spacing / 2 : align === "right" ? spacing : 0;
    ctx.fillText(str, x + dx, y);
    return;
  }
  let total = -spacing;
  const ws: number[] = [];
  for (const ch of str) {
    const k = `${ctx.font}|${ch}`;
    let w = glyphW.get(k);
    if (w === undefined) {
      w = ctx.measureText(ch).width;
      glyphW.set(k, w);
    }
    ws.push(w);
    total += w + spacing;
  }
  let cx = align === "left" ? x : align === "center" ? x - total / 2 : x - total;
  ctx.textAlign = "left";
  let i = 0;
  for (const ch of str) {
    ctx.fillText(ch, cx, y);
    cx += ws[i++] + spacing;
  }
}

// ─── Scene painters ──────────────────────────────────────────────────────────
interface View {
  W: number;
  H: number;
  dpr: number;
  desktop: boolean;
  z0: number; // base zoom: screen px per planet unit at m = 1
}

const alphaRuns: number[][] = Array.from({ length: NB }, () => []);
const equatorRuns: number[][] = Array.from({ length: NB }, () => []);
const outerP = new Float64Array(24);
const innerP = new Float64Array(24);
const bucketOf = (z: number) => clamp(Math.floor((z / R * 0.5 + 0.5) * NB), 0, NB - 1);

/** Build the depth-bucketed lattice polylines for the current orientation. */
function buildLattice(spin: number, sinT: number, cosT: number) {
  for (let b = 0; b < NB; b++) {
    alphaRuns[b].length = 0;
    equatorRuns[b].length = 0;
  }

  for (let li = 0; li < LAT_DEGS.length; li++) {
    const rr = R * LAT_COS[li];
    const Y = R * LAT_SIN[li];
    const runs = LAT_DEGS[li] === 0 ? equatorRuns : alphaRuns;
    let lastB = -1;
    let px = 0;
    let py = 0;
    let pz = 0;
    for (let k = 0; k <= LAT_N; k++) {
      const Z = rr * TH_COS[k];
      const x = rr * TH_SIN[k];
      const y = -(Y * cosT - Z * sinT);
      const z = Y * sinT + Z * cosT;
      if (k > 0) {
        const b = bucketOf((pz + z) * 0.5);
        if (b !== lastB) {
          runs[b].push(NaN, px, py);
          lastB = b;
        }
        runs[b].push(x, y);
      }
      px = x;
      py = y;
      pz = z;
    }
  }

  for (let m = 0; m < MER_COUNT; m++) {
    const th = ((m * 360) / MER_COUNT) * DEG + spin;
    const sTh = Math.sin(th);
    const cTh = Math.cos(th);
    let lastB = -1;
    let px = 0;
    let py = 0;
    let pz = 0;
    for (let k = 0; k <= MER_N; k++) {
      const rc = R * MER_PHI_COS[k];
      const Y = R * MER_PHI_SIN[k];
      const x = rc * sTh;
      const Z = rc * cTh;
      const y = -(Y * cosT - Z * sinT);
      const z = Y * sinT + Z * cosT;
      if (k > 0) {
        const b = bucketOf((pz + z) * 0.5);
        if (b !== lastB) {
          alphaRuns[b].push(NaN, px, py);
          lastB = b;
        }
        alphaRuns[b].push(x, y);
      }
      px = x;
      py = y;
      pz = z;
    }
  }
}

function strokeRuns(ctx: CanvasRenderingContext2D, runs: number[][], from: number, to: number, rgb: string, lw: number, mul: number) {
  ctx.lineWidth = lw;
  for (let b = from; b < to; b++) {
    const a = runs[b];
    if (a.length === 0) continue;
    ctx.strokeStyle = rgba(rgb, BUCKET_ALPHA[b] * mul);
    ctx.beginPath();
    for (let i = 0; i < a.length; ) {
      if (a[i] !== a[i]) {
        ctx.moveTo(a[i + 1], a[i + 2]);
        i += 3;
      } else {
        ctx.lineTo(a[i], a[i + 1]);
        i += 2;
      }
    }
    ctx.stroke();
  }
}

const dashBuf: number[] = [];
const ellipsePerimeter = (a: number, b: number) => Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
const SEAM = 0.004; // rad — halves overlap a hair so no anti-aliasing seam opens at the tips

/**
 * One ring half. `front` = the half that crosses in front of the planet.
 * Dashes are fitted to the full perimeter and the back half is phase-shifted by
 * half of it, so the pattern runs unbroken around the whole ring (no cut at the tips).
 */
function ringHalf(ctx: CanvasRenderingContext2D, ring: RingBand, front: boolean, sinT: number, k: number, inv: number, t: number) {
  const ry = Math.max(0.01, Math.abs(ring.r * sinT));
  const a0 = (sinT >= 0 ? 0 : Math.PI) + (front ? 0 : Math.PI);
  ctx.beginPath();
  ctx.ellipse(0, 0, ring.r, ry, 0, a0 - SEAM, a0 + Math.PI + SEAM);
  ctx.strokeStyle = rgba(ring.rgb, ring.a * k);
  if (ring.band) {
    ctx.lineWidth = ring.w;
    ctx.setLineDash([]);
  } else {
    ctx.lineWidth = ring.w * inv;
    if (ring.dash) {
      const per = ellipsePerimeter(ring.r, ry);
      let pat = 0;
      for (const d of ring.dash) pat += d;
      const fit = per / (Math.max(1, Math.round(per / pat)) * pat);
      dashBuf.length = ring.dash.length;
      for (let i = 0; i < ring.dash.length; i++) dashBuf[i] = ring.dash[i] * fit;
      ctx.setLineDash(dashBuf);
      const startsAtHalf = (sinT >= 0) !== front;
      ctx.lineDashOffset = (ring.flow ?? 0) * t + (startsAtHalf ? per / 2 : 0);
    } else ctx.setLineDash([]);
  }
  ctx.stroke();
}

function paintRings(ctx: CanvasRenderingContext2D, s: Sim, front: boolean, sinT: number, inv: number, t: number) {
  const fk = clamp(s.fixedOp / 0.72, 0.4, 1.45);
  const lk = clamp(s.longOp / 0.72, 0.4, 1.45);
  ctx.lineCap = "butt";
  for (const ring of FAR_ORBITS) ringHalf(ctx, ring, front, sinT, 1, inv, t);
  for (const ring of FIXED_RINGS) ringHalf(ctx, ring, front, sinT, fk, inv, t);
  for (const ring of LONG_RINGS) ringHalf(ctx, ring, front, sinT, lk, inv, t);
  ctx.setLineDash([]);
}

function glow(ctx: CanvasRenderingContext2D, g: Gfx, kind: keyof Gfx["glow"], x: number, y: number, r: number, alpha: number) {
  if (alpha <= 0.003) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r, r);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = g.glow[kind];
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, style: string) {
  ctx.fillStyle = style;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function paintMoons(ctx: CanvasRenderingContext2D, g: Gfx, front: boolean, sinT: number, t: number, reduced: boolean) {
  for (const m of MOONS) {
    const a = (reduced ? 0 : (t / m.period) * TAU) + m.phase;
    const sa = Math.sin(a);
    if ((sinT >= 0 ? sa >= 0 : sa < 0) !== front) continue;
    const x = m.r * Math.cos(a);
    const y = m.r * Math.abs(sinT) * sa;
    glow(ctx, g, m.glow, x, y, m.rg, front ? 1 : 0.6);
    dot(ctx, x, y, m.rc, rgba(WHITE, front ? 1 : 0.7));
  }
}

/** Nested vault cube + tesseract struts, PT/YT laser and labels (drawn upright, planet-centred). */
function paintCore(ctx: CanvasRenderingContext2D, g: Gfx, s: Sim, t: number, inv: number) {
  const rx = s.currentX * DEG;
  const ry = s.currentY * DEG;
  const cosRx = Math.cos(rx);
  const sinRx = Math.sin(rx);
  const cosRy = Math.cos(ry);
  const sinRy = Math.sin(ry);

  const project = (out: Float64Array, size: number) => {
    for (let i = 0; i < 8; i++) {
      const v = CUBE_VERTICES[i];
      const x = v[0] * size;
      const y = v[1] * size;
      const z = v[2] * size;
      const x1 = x * cosRy + z * sinRy;
      const z1 = -x * sinRy + z * cosRy;
      out[i * 3] = x1;
      out[i * 3 + 1] = y * cosRx + z1 * sinRx;
      out[i * 3 + 2] = -y * sinRx + z1 * cosRx;
    }
  };
  project(outerP, S_OUTER);
  project(innerP, S_INNER);
  const depth = (z: number) => smooth((z + 40) / 80);

  const edge = (a: Float64Array, i: number, b: Float64Array, j: number, rgb: string, a0: number, a1: number, w0: number, w1: number) => {
    const k = depth((a[i * 3 + 2] + b[j * 3 + 2]) / 2);
    ctx.strokeStyle = rgba(rgb, lerp(a0, a1, k));
    ctx.lineWidth = lerp(w0, w1, k) * inv;
    ctx.beginPath();
    ctx.moveTo(a[i * 3], a[i * 3 + 1]);
    ctx.lineTo(b[j * 3], b[j * 3 + 1]);
    ctx.stroke();
  };

  const engine = s.engineVis;
  ctx.lineCap = "round";

  // Faint orbit hints around the core.
  ctx.setLineDash([8, 10]);
  ctx.lineWidth = 0.65 * inv;
  ctx.strokeStyle = rgba(WHITE, lerp(0.28, 0.85, engine) * 0.8);
  ctx.beginPath();
  ctx.ellipse(0, 0, 115, 115 * 0.42, 35 * DEG, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([5, 8]);
  ctx.lineWidth = 0.6 * inv;
  ctx.strokeStyle = rgba(ICE, lerp(0.3, 0.9, engine) * 0.8);
  ctx.beginPath();
  ctx.ellipse(0, 0, 92, 92 * 0.38, -40 * DEG, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const [i, j] of CUBE_EDGES) edge(outerP, i, outerP, j, FG, 0.35, 0.85, 0.7, 1.2);
  for (let i = 0; i < 8; i++) edge(outerP, i, innerP, i, FG, 0.2, 0.55, 0.75, 0.75);
  for (const [i, j] of CUBE_EDGES) edge(innerP, i, innerP, j, AMBER, 0.25, 0.7, 0.5, 0.9);
  for (let i = 0; i < 8; i++) {
    const k = depth(outerP[i * 3 + 2]);
    glow(ctx, g, "white", outerP[i * 3], outerP[i * 3 + 1], 9, k * 0.8);
    dot(ctx, outerP[i * 3], outerP[i * 3 + 1], lerp(1.4, 2.5, k), rgba(WHITE, lerp(0.4, 0.9, k)));
  }

  // Nucleus
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 0.6 * inv;
  ctx.strokeStyle = rgba(WHITE, 0.35);
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  glow(ctx, g, "white", 0, 0, 26, 0.9);
  glow(ctx, g, "amber", 0, 0, 30, lerp(0.25, 0.5, engine));
  dot(ctx, 0, 0, 5.5, rgba(WHITE, 1));

  ctx.textBaseline = "alphabetic";

  // Laser split vector (stage 3)
  if (engine > 0.01) {
    ctx.save();
    ctx.globalAlpha = engine;
    for (const [sx, rgb, label] of [[-1, ICE, "PT (PRINCIPAL)"], [1, AMBER, "YT (YIELD)"]] as const) {
      ctx.lineWidth = 6;
      ctx.strokeStyle = rgba(rgb, 0.22);
      ctx.beginPath();
      ctx.moveTo(sx * 12, 0);
      ctx.lineTo(sx * 120, 0);
      ctx.stroke();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = rgba(rgb, 1);
      ctx.beginPath();
      ctx.moveTo(sx * 12, 0);
      ctx.lineTo(sx * 120, 0);
      ctx.stroke();
      ctx.fillStyle = rgba(rgb, 1);
      ctx.beginPath();
      ctx.moveTo(sx * 120, -4);
      ctx.lineTo(sx * 130, 0);
      ctx.lineTo(sx * 120, 4);
      ctx.closePath();
      ctx.fill();
      ctx.font = `500 9px ${BASE_FONT}`;
      text(ctx, label, sx * 136, 4, 1.6, sx < 0 ? "right" : "left");
    }
    ctx.restore();
  }

  ctx.fillStyle = rgba(FG, lerp(0.45, 0.9, engine));
  ctx.font = `400 8px ${BASE_FONT}`;
  text(ctx, "USDG · SPLIT VAULT CORE", 0, 98, 1.9, "center");
}

/** Mini-planet geometry (animated by time only). Painted in pin space (r = 26). */
function paintPinGeometry(ctx: CanvasRenderingContext2D, g: Gfx, idx: number, t: number, inv: number) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (idx === 0) {
    // Fixed — crystal octahedron
    const rotY = t * 1.8;
    const cY = Math.cos(rotY);
    const sY = Math.sin(rotY);
    const cX = Math.cos(0.38);
    const sX = Math.sin(0.38);
    const [top, bot, right, left, front, back] = (
      [[0, -15, 0], [0, 15, 0], [12, 0, 0], [-12, 0, 0], [0, 0, 12], [0, 0, -12]] as const
    ).map(([x, y, z]) => {
      const x1 = x * cY + z * sY;
      const z1 = -x * sY + z * cY;
      return [x1, y * cX - z1 * sX];
    });
    const facets = [
      [top, right, front], [top, front, left], [top, left, back], [top, back, right],
      [bot, front, right], [bot, left, front], [bot, back, left], [bot, right, back],
    ];
    facets.forEach((tri, n) => {
      const cp = (tri[1][0] - tri[0][0]) * (tri[2][1] - tri[0][1]) - (tri[1][1] - tri[0][1]) * (tri[2][0] - tri[0][0]);
      const isFront = cp > 0;
      ctx.beginPath();
      ctx.moveTo(tri[0][0], tri[0][1]);
      ctx.lineTo(tri[1][0], tri[1][1]);
      ctx.lineTo(tri[2][0], tri[2][1]);
      ctx.closePath();
      ctx.fillStyle = isFront ? (n % 2 === 0 ? rgba("220,240,255", 0.45) : rgba(ICE, 0.28)) : rgba("80,120,180", 0.08);
      ctx.fill();
      ctx.strokeStyle = isFront ? (n % 2 === 0 ? rgba(WHITE, 1) : rgba(ICE, 1)) : rgba(ICE, 0.2);
      ctx.lineWidth = (isFront ? 1 : 0.6) * inv;
      ctx.stroke();
    });
    glow(ctx, g, "white", 0, 0, 7, 1);
    dot(ctx, 0, 0, 1.8, rgba(WHITE, 1));
  } else if (idx === 1) {
    // Long — undulating membrane + orbiting spores
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const rm = 13 + 2.4 * Math.sin(a * 3 + t * 4.2) + 1.6 * Math.cos(a * 2 - t * 3.1);
      if (i === 0) ctx.moveTo(Math.cos(a) * rm, Math.sin(a) * rm);
      else ctx.lineTo(Math.cos(a) * rm, Math.sin(a) * rm);
    }
    ctx.closePath();
    ctx.fillStyle = rgba(AMBER, 0.32);
    ctx.fill();
    ctx.strokeStyle = rgba(AMBER, 1);
    ctx.lineWidth = 1.1 * inv;
    ctx.stroke();
    glow(ctx, g, "amber", 0, 0, 11, 1);
    dot(ctx, 0, 0, 3.6, rgba(AMBER_L, 0.92));
    dot(ctx, 0, 0, 1.6, rgba(WHITE, 1));
    const spore = (a: number, rx: number, ry: number, skew: number, rFar: number, rNear: number, oFar: number, oNear: number, rgb: string) => {
      const sa = Math.sin(a);
      const k = smooth((sa + 0.25) / 0.5);
      dot(ctx, Math.cos(a) * rx, sa * ry + Math.cos(a) * skew, lerp(rFar, rNear, k), rgba(rgb, lerp(oFar, oNear, k)));
    };
    spore(t * 3.2, 20, 8, -3, 1.1, 1.8, 0.4, 0.95, AMBER);
    spore(-t * 2.6 + 1.8, 23, 10, 5, 1.2, 2.0, 0.35, 0.9, WHITE);
    spore(t * 4.0 + 3.5, 16, 7, -6, 1.0, 1.6, 0.3, 0.9, AMBER);
  } else if (idx === 2) {
    // Split engine — cleaving prisms
    const sRot = t * 2.2;
    const cS = Math.cos(sRot);
    const sS = Math.sin(sRot);
    const pp = (x: number, y: number, z: number) => {
      const z1 = -x * sS + z * cS;
      return [x * cS + z * sS, y * 0.92 - z1 * 0.28];
    };
    const prism = (sign: 1 | -1, rgb: string) => {
      const base = [0, 2.094, 4.188].map((a) => pp(10 * Math.cos(a), sign * 13.2, 10 * Math.sin(a)));
      const apex = pp(0, sign * 2.2, 0);
      ctx.beginPath();
      base.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
      ctx.closePath();
      ctx.fillStyle = rgba(rgb, 0.35);
      ctx.fill();
      ctx.strokeStyle = rgba(rgb, 1);
      ctx.lineWidth = 1 * inv;
      ctx.stroke();
      ctx.beginPath();
      for (const p of base) {
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(apex[0], apex[1]);
      }
      ctx.stroke();
    };
    prism(-1, ICE);
    prism(1, AMBER);
    ctx.lineWidth = 5;
    ctx.strokeStyle = rgba(WHITE, 0.25);
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(15, 0);
    ctx.stroke();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = rgba(WHITE, 1);
    ctx.stroke();
    glow(ctx, g, "white", 0, 0, 8, 1);
    dot(ctx, 0, 0, 2.2, rgba(WHITE, 1));
  } else {
    // Vault — gyroscope + shield cube
    const gT = t * 1.5;
    const ring = (rot: number, rx: number, ry: number, dash: number[], rgb: string, a: number, w: number) => {
      ctx.setLineDash(dash);
      ctx.lineWidth = w * inv;
      ctx.strokeStyle = rgba(rgb, a);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, rot * DEG, 0, TAU);
      ctx.stroke();
    };
    ring((gT * 55) % 360, 18, 7.2, [4, 4], MINT, 0.7, 0.9);
    ring((-gT * 42) % 360, 7.1, 17, [3, 5], MINT_L, 0.65, 0.9);
    ring((gT * 28 + 45) % 360, 16, 8.8, [2, 4], WHITE, 0.5, 0.8);
    ctx.setLineDash([]);
    const cC = Math.cos(t * 1.6);
    const sC = Math.sin(t * 1.6);
    const cv = CUBE_VERTICES.map(([a, b, c]) => {
      const x = a * 9;
      const y = b * 9;
      const z = c * 9;
      const z1 = -x * sC + z * cC;
      return [x * cC + z * sC, y * 0.88 - z1 * 0.32, z1];
    });
    for (const far of [true, false]) {
      ctx.beginPath();
      for (const [i, j] of CUBE_EDGES) {
        if (((cv[i][2] + cv[j][2]) / 2 <= 0) === far) {
          ctx.moveTo(cv[i][0], cv[i][1]);
          ctx.lineTo(cv[j][0], cv[j][1]);
        }
      }
      ctx.strokeStyle = rgba(MINT, far ? 0.35 : 1);
      ctx.lineWidth = (far ? 0.6 : 1) * inv;
      ctx.stroke();
    }
    glow(ctx, g, "white", 0, 0, 8, 1);
    dot(ctx, 0, 0, 2.4, rgba(WHITE, 1));
    dot(ctx, 0, 0, 5, rgba(MINT, 0.35));
  }
}

const PIN_STYLE = [
  { rgb: ICE, bg: "rgba(4,9,18,0.92)", w: 132, title: "FIXED · 6.42%", sub: "SENIOR TRANCHE", orbit: -26, orbitR: 46 },
  { rgb: AMBER, bg: "rgba(16,8,3,0.92)", w: 136, title: "LONG · FLOATING", sub: "JUNIOR TRANCHE", orbit: 32, orbitR: 48 },
  { rgb: FG, bg: "rgba(8,10,16,0.92)", w: 132, title: "SPLIT ENGINE", sub: "TRANCHE CLEAVER", orbit: 0, orbitR: 0 },
  { rgb: MINT, bg: "rgba(3,14,10,0.92)", w: 132, title: "USDG VAULT", sub: "DELTA-NEUTRAL", orbit: 0, orbitR: 0 },
] as const;

const PIN_GLOW = ["ice", "amber", "white", "mint"] as const;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function paintPin(ctx: CanvasRenderingContext2D, g: Gfx, s: Sim, idx: number, x: number, y: number, z: number, t: number) {
  const st = PIN_STYLE[idx];
  const act = s.pinAct[idx];
  const vis = s.pinVis[idx];
  const hov = s.pinHover[idx];
  const zz = z * (1 + 0.12 * hov);
  const inv = 1 / zz;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(zz, zz);
  ctx.globalAlpha = vis;

  // Radar ping (active only)
  if (act > 0.02) {
    const ph = (t % 2.8) / 2.8;
    const e = 1 - Math.pow(1 - ph, 2.2);
    ctx.strokeStyle = rgba(st.rgb, (1 - e) * 0.6 * act);
    ctx.lineWidth = 1.2 * inv;
    ctx.beginPath();
    ctx.arc(0, 0, 44 * lerp(0.8, 2, e), 0, TAU);
    ctx.stroke();
  }

  // Orbit hint behind the body
  if (st.orbit !== 0) {
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = rgba(st.rgb, 0.45);
    ctx.lineWidth = 1 * inv;
    ctx.beginPath();
    ctx.ellipse(0, 0, st.orbitR, st.orbitR * 0.32, st.orbit * DEG, Math.PI, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Soft aura + body
  glow(ctx, g, PIN_GLOW[idx], 0, 0, 46, lerp(0.2, 0.55, act));
  ctx.save();
  ctx.globalAlpha = vis * lerp(0.85, 1, act);
  ctx.fillStyle = g.pinBody[idx];
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgba(st.rgb, 1);
  ctx.lineWidth = 1.2 * inv;
  ctx.stroke();
  ctx.restore();

  // Rim light, upper-left
  ctx.strokeStyle = rgba(WHITE, 0.9);
  ctx.lineWidth = 1.4 * inv;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, 0, 25, 160.8 * DEG, 289.2 * DEG);
  ctx.stroke();

  // Orbit front half + satellite
  if (st.orbit !== 0) {
    ctx.strokeStyle = rgba(idx === 1 ? AMBER_L : WHITE, 0.85);
    ctx.lineWidth = 1.4 * inv;
    ctx.beginPath();
    ctx.ellipse(0, 0, st.orbitR, st.orbitR * 0.32, st.orbit * DEG, 0, Math.PI);
    ctx.stroke();
    const sx = (st.orbitR - 2) * Math.cos(st.orbit * DEG);
    const sy = (st.orbitR - 2) * Math.sin(st.orbit * DEG);
    glow(ctx, g, "white", sx, sy, 6, 1);
    dot(ctx, sx, sy, 2.2, rgba(WHITE, 1));
  }

  paintPinGeometry(ctx, g, idx, t, inv);

  // Badge
  const badgeA = smooth((vis - 0.4) / 0.6);
  if (badgeA > 0.02) {
    ctx.save();
    ctx.translate(32 + 8 * hov, -16);
    ctx.globalAlpha = badgeA;
    roundRect(ctx, 0, 0, st.w, 30, 4);
    ctx.fillStyle = st.bg;
    ctx.fill();
    ctx.strokeStyle = act > 0.5 ? rgba(st.rgb, 1) : rgba(st.rgb, 0.35);
    ctx.lineWidth = lerp(0.9, 1.4, act) * inv;
    ctx.stroke();
    dot(ctx, 10, 11, 2.5, rgba(st.rgb, act > 0.5 ? 0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI)) : 1));
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = rgba(st.rgb, 1);
    ctx.font = `600 9.5px ${BASE_FONT}`;
    text(ctx, st.title, 18, 14, 1.3);
    ctx.fillStyle = rgba(MUTED, 1);
    ctx.font = `400 7.5px ${BASE_FONT}`;
    text(ctx, st.sub, 18, 24, 0.75);
    ctx.restore();
  }

  ctx.restore();
}

/** Static + slow ambient layer: stars, distant black hole, shooting stars, HUD tag. */
function paintBackdrop(ctx: CanvasRenderingContext2D, s: Sim, L: View, t: number) {
  const { W, H } = L;
  const px = -s.ptrX * 6;
  const py = -s.ptrY * 4;

  for (const st of BG_STARS) {
    let a = st.a;
    if (st.tw >= 0) a *= 0.55 + 0.45 * Math.sin(t * 1.4 + st.tw);
    dot(ctx, st.u * W + px * st.r, st.v * H + py * st.r, st.r, rgba(st.warm ? WARM : FG, a));
  }

  // Distant black hole
  ctx.save();
  ctx.translate(W * 0.11, H * 0.17);
  ctx.globalAlpha = 0.35;
  dot(ctx, 0, 0, 42, "rgb(1,2,4)");
  ctx.rotate(t * 0.074);
  ctx.setLineDash([14, 12]);
  ctx.strokeStyle = "rgba(42,53,70,0.4)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, 52, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([4, 18]);
  ctx.strokeStyle = rgba(ICE, 0.25);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.arc(0, 0, 68, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  dot(ctx, 52, 0, 1.5, rgba(ICE, 0.7));
  ctx.restore();

  // Shooting stars — the head leads, the tail trails behind it.
  if (!s.reduced) {
    const k = Math.min(W, 1600) / 1440;
    ctx.lineCap = "round";
    for (const m of METEORS) {
      const p = ((t + m.delay) % m.dur) / m.dur;
      if (p > 0.1) continue;
      const u = p / 0.1;
      const dx = Math.cos(m.ang * DEG);
      const dy = Math.sin(m.ang * DEG);
      const hx = m.u * W + dx * m.travel * u * k;
      const hy = m.v * H + dy * m.travel * u * k;
      const grad = ctx.createLinearGradient(hx - dx * m.len * k, hy - dy * m.len * k, hx, hy);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.7, "rgba(221,232,248,0.6)");
      grad.addColorStop(1, "rgba(255,255,255,1)");
      ctx.globalAlpha = u < 0.25 ? u / 0.25 : 1 - (u - 0.25) / 0.75;
      ctx.strokeStyle = grad;
      ctx.lineWidth = m.w;
      ctx.beginPath();
      ctx.moveTo(hx - dx * m.len * k, hy - dy * m.len * k);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      dot(ctx, hx, hy, m.w * 2.4, rgba(m.halo, 0.4));
      dot(ctx, hx, hy, m.w * 1.1, "#fff");
    }
    ctx.globalAlpha = 1;
  }

  // HUD tag
  ctx.fillStyle = rgba(MUTED, 0.3);
  ctx.font = `400 8px ${BASE_FONT}`;
  ctx.textBaseline = "alphabetic";
  text(ctx, "ORBITAL PLANE · β-09", W - 26, H - 92, 2, "right");
}

// ─────────────────────────────────────────────────────────────────────────────

export function HeroVisual({ activeStage = 0, onSelectStage, isSplitLayout = true, stagePosRef }: HeroVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onSelectRef = useRef(onSelectStage);
  const kickRef = useRef<() => void>(() => {});
  const resetRef = useRef<() => void>(() => {});
  const sRef = useRef(createSim());
  const [oriented, setOriented] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelectStage;
  }, [onSelectStage]);

  // Stage change: remember it and make sure the loop is awake (reduced motion sleeps when idle).
  useEffect(() => {
    sRef.current.stage = activeStage;
    kickRef.current();
  }, [activeStage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = sRef.current;
    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopMq = window.matchMedia("(min-width: 1024px)");
    s.reduced = reducedMq.matches;

    const L: View = { W: 1, H: 1, dpr: 1, desktop: true, z0: 1 };
    let gfx = createGfx(ctx);
    let quality = 1; // adaptive resolution scale (only ever lowered)
    const pins = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, z: 1 }));

    const frames = () => (L.desktop ? CAM_DESKTOP : CAM_COMPACT);
    const camGoal = (): CamFrame => {
      const fr = frames();
      const pos = stagePosRef?.current;
      return pos == null || !L.desktop ? fr[Math.min(fr.length - 1, s.stage)] : sampleCamera(fr, pos);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      L.W = Math.max(1, rect.width);
      L.H = Math.max(1, rect.height);
      L.desktop = isSplitLayout && desktopMq.matches;
      // Cap the pixel count so very large / hi-dpi screens stay smooth.
      const wanted = Math.min(window.devicePixelRatio || 1, 2) * quality;
      const cap = Math.sqrt(5_200_000 / (L.W * L.H));
      L.dpr = Math.max(1, Math.min(wanted, cap));
      canvas.width = Math.round(L.W * L.dpr);
      canvas.height = Math.round(L.H * L.dpr);
      L.z0 = L.desktop
        ? Math.min(0.78 * L.H, 0.92 * 0.58 * L.W) / (2 * R)
        : Math.min(0.9 * L.W, 0.52 * L.H) / (2 * R);
      gfx = createGfx(ctx);
    };

    // ─── paint ───────────────────────────────────────────────────────────────
    const paint = (now: number) => {
      // Never let a stray NaN freeze the scene: reset the simulation instead.
      if (!Number.isFinite(s.currentX + s.currentY + s.cam.m + s.cam.fx + s.cam.fy + s.tiltX + s.tiltY)) {
        const keep = s.stage;
        Object.assign(s, createSim(), { stage: keep });
      }
      const { W, H, dpr } = L;
      const t = s.reduced ? 0 : now * 0.001;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.setLineDash([]);
      ctx.textBaseline = "alphabetic";

      paintBackdrop(ctx, s, L, t);

      const z = L.z0 * s.cam.m;
      const ax = s.cam.au * W + clamp(s.ptrX * 5, -6, 6);
      const ay = s.cam.av * H + clamp(s.ptrY * 4, -5, 5);
      const cx = ax - z * s.cam.fx;
      const cy = ay - z * s.cam.fy;

      // ── Planet system (shared tilt, spin and roll) ──
      const tilt = s.currentX * DEG;
      const sinT = Math.sin(tilt);
      const cosT = Math.cos(tilt);
      const spin = s.currentY * DEG;
      const inv = 1 / z;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ROLL);
      ctx.scale(z, z);

      // Back glow (cool ↔ warm depending on the stage)
      ctx.save();
      ctx.scale(R, R);
      ctx.beginPath();
      ctx.arc(0, 0, 2.4, 0, TAU);
      ctx.globalAlpha = clamp(s.iceBack, 0, 1);
      ctx.fillStyle = gfx.haloIce;
      ctx.fill();
      ctx.globalAlpha = clamp(s.amberBack, 0, 1);
      ctx.fillStyle = gfx.haloAmber;
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;

      // 1 · rings + moons behind the planet
      paintRings(ctx, s, false, sinT, inv, t);
      paintMoons(ctx, gfx, false, sinT, t, s.reduced);

      // 2 · atmosphere + glassy body
      ctx.save();
      ctx.scale(R, R);
      ctx.fillStyle = gfx.atmo;
      ctx.beginPath();
      ctx.arc(0, 0, 1.26, 0, TAU);
      ctx.fill();
      ctx.fillStyle = gfx.body;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, TAU);
      ctx.fill();
      ctx.restore();

      // 3 · lattice far side → vault core → lattice near side
      buildLattice(spin, sinT, cosT);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      strokeRuns(ctx, alphaRuns, 0, NB / 2, WHITE, 0.8 * inv, 1);
      strokeRuns(ctx, equatorRuns, 0, NB / 2, WHITE, 1.2 * inv, 1.5);

      ctx.save();
      ctx.rotate(-ROLL);
      paintCore(ctx, gfx, s, t, inv);
      if (s.vaultVis > 0.01) {
        // Stage 4 tactical HUD
        ctx.globalAlpha = s.vaultVis;
        ctx.strokeStyle = rgba(MINT, 0.35);
        ctx.lineWidth = 0.6 * inv;
        ctx.setLineDash([8, 12]);
        ctx.beginPath();
        ctx.arc(0, 0, 220, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = rgba(MINT, 0.6);
        ctx.lineWidth = 1.2 * inv;
        ctx.beginPath();
        ctx.moveTo(-360, 0);
        ctx.lineTo(-330, 0);
        ctx.moveTo(330, 0);
        ctx.lineTo(360, 0);
        ctx.moveTo(0, -360);
        ctx.lineTo(0, -330);
        ctx.moveTo(0, 330);
        ctx.lineTo(0, 360);
        ctx.stroke();
      }
      ctx.restore();

      strokeRuns(ctx, alphaRuns, NB / 2, NB, WHITE, 0.8 * inv, 1);
      strokeRuns(ctx, equatorRuns, NB / 2, NB, WHITE, 1.2 * inv, 1.5);

      // 4 · constellation on the surface
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < STAR_NODES.length; i++) {
        const node = STAR_NODES[i];
        const th = node[1] * DEG + spin;
        const X = R * STAR_COS[i] * Math.sin(th);
        const Y = R * STAR_SIN[i];
        const Z = R * STAR_COS[i] * Math.cos(th);
        const y = -(Y * cosT - Z * sinT);
        const zz = Y * sinT + Z * cosT;
        let op = clamp(((zz + R) / (2 * R)) * 1.15, 0.15, 0.98) * smooth((zz + 70) / 100);
        if (node[4]) op *= 0.55 + 0.45 * Math.sin(t * 1.5 + node[5] * 1.6);
        if (op < 0.02) continue;
        const r = node[2];
        ctx.globalAlpha = op * 0.55;
        ctx.drawImage(gfx.starSprite, X - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
        ctx.globalAlpha = op;
        dot(ctx, X, y, r, rgba(STAR_RGB[i], 1));
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // 5 · limb light
      ctx.save();
      ctx.scale(R, R);
      ctx.strokeStyle = gfx.rim;
      ctx.lineWidth = (1.6 * inv) / R;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, TAU);
      ctx.stroke();
      ctx.restore();

      // 6 · rings + moons in front of the planet
      paintRings(ctx, s, true, sinT, inv, t);
      paintMoons(ctx, gfx, true, sinT, t, s.reduced);
      ctx.restore();

      // ── Mini-planets (planet points) — screen aligned, not rolled ──
      for (let i = 0; i < 4; i++) {
        pins[i].x = ax + z * (PIN_POS[i][0] - s.cam.fx);
        pins[i].y = ay + z * (PIN_POS[i][1] - s.cam.fy);
        pins[i].z = z;
      }
      for (let i = 0; i < 4; i++) paintPin(ctx, gfx, s, i, pins[i].x, pins[i].y, z, t);
    };

    // ─── step ────────────────────────────────────────────────────────────────
    const step = (dt: number) => {
      const reduced = s.reduced;
      if (!s.isDragging) {
        if (!reduced) s.targetY += SPIN_DEG_PER_S * dt;
        // Inertia: 0.92/frame @60Hz, expressed per-second so 120Hz matches.
        const keep = Math.exp(-5 * dt);
        s.velocityX *= keep;
        s.velocityY *= keep;
        s.targetX = clamp(s.targetX + s.velocityX * dt * 25, ROT_X_MIN, ROT_X_MAX);
        s.targetY += s.velocityY * dt * 25;
      }

      // Hover tilt eases in/out (and out of the way while dragging) — never snaps.
      const tiltF = decay(6, dt);
      s.tiltX += ((s.isDragging || reduced ? 0 : s.hoverTiltX) - s.tiltX) * tiltF;
      s.tiltY += ((s.isDragging || reduced ? 0 : s.hoverTiltY) - s.tiltY) * tiltF;

      const rotF = decay(s.isDragging ? 18 : 4.5, dt);
      s.currentX += (s.targetX + s.tiltX - s.currentX) * rotF;
      s.currentY += (s.targetY + s.tiltY - s.currentY) * rotF;

      // Camera: follow the scroll-driven stage position (or the discrete stage on
      // mobile) through a critically damped spring — smooth start, smooth stop,
      // identical at 60 / 120 Hz.
      const goal = camGoal();
      for (const k of CAM_KEYS) {
        if (reduced) {
          s.cam[k] = goal[k];
          s.camV[k] = 0;
        } else {
          [s.cam[k], s.camV[k]] = smoothDamp(s.cam[k], goal[k], s.camV[k], CAMERA_SMOOTH_TIME, dt);
        }
      }

      const ptrF = decay(5, dt);
      s.ptrX += (s.ptrTX - s.ptrX) * ptrF;
      s.ptrY += (s.ptrTY - s.ptrY) * ptrF;

      // Stage emphasis (eased, so nothing ever pops)
      const g = emphasisGoals(s);
      const e = decay(6, dt);
      const hv = decay(10, dt);
      s.fixedOp += (g.fixedOp - s.fixedOp) * e;
      s.longOp += (g.longOp - s.longOp) * e;
      s.iceBack += (g.iceBack - s.iceBack) * e;
      s.amberBack += (g.amberBack - s.amberBack) * e;
      s.engineVis += (g.engineVis - s.engineVis) * e;
      s.vaultVis += (g.vaultVis - s.vaultVis) * e;
      for (let i = 0; i < 4; i++) {
        s.pinAct[i] += (g.pinAct[i] - s.pinAct[i]) * e;
        s.pinVis[i] += (g.pinVis[i] - s.pinVis[i]) * e;
        s.pinHover[i] += ((s.hoverPin === i && !s.isDragging ? 1 : 0) - s.pinHover[i]) * hv;
      }
    };

    const settled = () => {
      const goal = camGoal();
      const g = emphasisGoals(s);
      const emphasis =
        Math.abs(g.fixedOp - s.fixedOp) + Math.abs(g.longOp - s.longOp) +
        Math.abs(g.iceBack - s.iceBack) + Math.abs(g.amberBack - s.amberBack) +
        Math.abs(g.engineVis - s.engineVis) + Math.abs(g.vaultVis - s.vaultVis) +
        g.pinAct.reduce((a, v, i) => a + Math.abs(v - s.pinAct[i]), 0) +
        g.pinVis.reduce((a, v, i) => a + Math.abs(v - s.pinVis[i]), 0) +
        s.pinHover.reduce((a, v, i) => a + Math.abs((s.hoverPin === i ? 1 : 0) - v), 0);
      return (
        !s.isDragging &&
        emphasis < 0.01 &&
        Math.abs(s.targetX + s.tiltX - s.currentX) < 0.005 &&
        Math.abs(s.targetY + s.tiltY - s.currentY) < 0.005 &&
        Math.abs(goal.m - s.cam.m) < 0.0005 &&
        Math.abs(goal.fx - s.cam.fx) + Math.abs(goal.fy - s.cam.fy) < 0.05 &&
        Math.abs(goal.au - s.cam.au) + Math.abs(goal.av - s.cam.av) < 0.0002 &&
        Math.abs(s.velocityX) + Math.abs(s.velocityY) < 0.01 &&
        Math.abs(s.ptrTX - s.ptrX) + Math.abs(s.ptrTY - s.ptrY) < 0.002
      );
    };

    // ─── loop ────────────────────────────────────────────────────────────────
    let raf = 0;
    let last = 0;
    let inView = true;
    let slow = 0;
    const canRun = () => inView && !document.hidden;

    const frame = (now: number) => {
      raf = 0;
      if (!canRun()) return;
      const raw = (now - last) / 1000;
      const dt = clamp(raw, 0, 0.05) || 0.016;
      last = now;
      step(dt);
      paint(now);

      // Adaptive resolution: if the device can't hold ~40 fps, drop the pixel ratio a notch.
      if (!s.reduced && raw > 0.026 && raw < 0.5) {
        if (++slow >= 24 && quality > 0.5) {
          slow = 0;
          quality -= 0.25;
          resize();
        }
      } else if (slow > 0) slow--;

      // Reduced motion: render only while something is actually changing.
      if (s.reduced && settled()) return;
      raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (raf || !canRun()) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    kickRef.current = kick;

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      paint(performance.now());
      kick();
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (canRun()) kick();
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    const onVisibility = () => {
      if (canRun()) kick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const onReducedChange = (e: MediaQueryListEvent) => {
      s.reduced = e.matches;
      kick();
    };
    reducedMq.addEventListener("change", onReducedChange);
    const onDesktopChange = () => {
      resize();
      kick();
    };
    desktopMq.addEventListener("change", onDesktopChange);
    // Scroll drives the camera; wake a sleeping (reduced-motion) loop.
    window.addEventListener("scroll", kick, { passive: true });

    // Labels use the mono face; repaint once it is ready (matters when the loop sleeps).
    if (document.fonts?.load) document.fonts.load(`600 10px "Geist Mono"`).then(kick).catch(() => {});

    // Snap camera to the current stage on mount (also covers remount mid-scroll).
    Object.assign(s.cam, camGoal());
    paint(performance.now());
    kick();

    // ─── pointer input ───────────────────────────────────────────────────────
    const local = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top, rect };
    };
    /** Which mini-planet (0…3) is under the pointer — body or its badge. */
    const pinAt = (x: number, y: number): number => {
      for (let i = 3; i >= 0; i--) {
        const p = pins[i];
        const k = p.z * (1 + 0.12 * s.pinHover[i]);
        const dx = x - p.x;
        const dy = y - p.y;
        if (dx * dx + dy * dy <= (36 * k) ** 2) return i;
        if (s.pinVis[i] > 0.6 && dx >= 30 * k && dx <= (32 + PIN_STYLE[i].w) * k && dy >= -18 * k && dy <= 16 * k) return i;
      }
      return -1;
    };
    const setCursor = (c: string) => {
      if (canvas.style.cursor !== c) canvas.style.cursor = c;
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const { x, y } = local(e);
      const hit = pinAt(x, y);
      s.pressed = true;
      s.moved = false;
      s.pointerId = e.pointerId;
      s.downX = e.clientX;
      s.downY = e.clientY;
      s.downStage = hit >= 0 ? hit + 1 : -1;
    };

    const beginDrag = (e: PointerEvent) => {
      s.isDragging = true;
      s.dragStartX = e.clientX;
      s.dragStartY = e.clientY;
      s.rotAtDragX = s.targetX;
      s.rotAtDragY = s.targetY;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.lastT = performance.now();
      s.velocityX = 0;
      s.velocityY = 0;
      setCursor("grabbing");
      // Capture only once a real drag starts so taps on pins still register.
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
    };

    const onMove = (e: PointerEvent) => {
      if (s.pressed && e.pointerId === s.pointerId) {
        if (!s.isDragging) {
          if (Math.hypot(e.clientX - s.downX, e.clientY - s.downY) < DRAG_THRESHOLD_PX) return;
          s.moved = true;
          beginDrag(e);
        }
        const now = performance.now();
        const dt = Math.max((now - s.lastT) / 1000, 0.001);
        s.targetX = clamp(s.rotAtDragX + (e.clientY - s.dragStartY) * 0.24, ROT_X_MIN, ROT_X_MAX);
        s.targetY = s.rotAtDragY + (e.clientX - s.dragStartX) * 0.38;
        s.velocityX = ((e.clientY - s.lastY) / dt) * 0.015;
        s.velocityY = ((e.clientX - s.lastX) / dt) * 0.022;
        s.lastX = e.clientX;
        s.lastY = e.clientY;
        s.lastT = now;
        kick();
        return;
      }
      if (e.pointerType === "touch") return;
      const { x, y, rect } = local(e);
      const nx = (x / rect.width) * 2 - 1;
      const ny = (y / rect.height) * 2 - 1;
      s.hoverTiltX = ny * 3.8;
      s.hoverTiltY = nx * 4.6;
      s.ptrTX = nx;
      s.ptrTY = ny;
      s.hoverPin = pinAt(x, y);
      setCursor(s.hoverPin >= 0 ? "pointer" : "grab");
      kick();
    };

    const endPress = (e: PointerEvent, cancelled: boolean) => {
      if (!s.pressed || e.pointerId !== s.pointerId) return;
      const wasTap = !s.moved && !cancelled;
      const wasDrag = s.isDragging;
      s.pressed = false;
      s.isDragging = false;
      setCursor(s.hoverPin >= 0 ? "pointer" : "grab");
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
      if (wasTap && s.downStage > 0) onSelectRef.current?.(s.downStage);
      if (wasDrag) setOriented(true);
      s.downStage = -1;
      kick();
    };

    const onLeave = () => {
      s.hoverTiltX = 0;
      s.hoverTiltY = 0;
      s.ptrTX = 0;
      s.ptrTY = 0;
      s.hoverPin = -1;
      setCursor("grab");
      kick();
    };

    const onUp = (e: PointerEvent) => endPress(e, false);
    const onCancel = (e: PointerEvent) => endPress(e, true);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);
    canvas.addEventListener("pointerleave", onLeave);

    resetRef.current = () => {
      s.targetX = TILT_REST;
      // Take the shortest way back (the spin accumulates continuously).
      s.targetY = Math.round(s.currentY / 360) * 360;
      s.velocityX = 0;
      s.velocityY = 0;
      setOriented(false);
      kick();
    };

    return () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      kickRef.current = () => {};
      resetRef.current = () => {};
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMq.removeEventListener("change", onReducedChange);
      desktopMq.removeEventListener("change", onDesktopChange);
      window.removeEventListener("scroll", kick);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [isSplitLayout, stagePosRef]);

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full select-none"
        // Horizontal drags rotate the planet; vertical swipes still scroll the page on touch.
        style={{ touchAction: "pan-y", cursor: "grab" }}
      />
      <div
        aria-hidden="true"
        className="mono pointer-events-none absolute right-3 top-[60%] hidden -translate-y-1/2 select-none text-[9px] tracking-[0.26em] text-muted-dark/55 lg:block"
        style={{ writingMode: "vertical-rl" }}
      >
        DRAG OR MOVE TO EXPLORE PERSPECTIVE
      </div>
      <button
        type="button"
        onClick={() => resetRef.current()}
        aria-label="Reset planet orientation"
        tabIndex={oriented ? 0 : -1}
        className={`absolute bottom-[4.5rem] right-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-background/75 text-foreground/80 transition-[opacity,border-color,color] duration-300 hover:border-white/50 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice ${
          oriented ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
