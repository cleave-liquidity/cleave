import { random } from "remotion";

export const TAU = Math.PI * 2;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const clamp01 = (v: number) => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0 → 1 as `f` travels from `a` to `b` (clamped). */
export const seg = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number) => t * t * t;
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInExpo = (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Damped oscillation that starts at 1 and settles on 0 (a "snap"): used to lock a moving curve onto a line. */
export const snapDecay = (t: number, damping = 5.5, freq = 3.2) => Math.exp(-damping * t) * Math.cos(TAU * freq * t);

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Linear colour mix between two #rrggbb colours. */
export const mixHex = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return `rgb(${Math.round(lerp(r1, r2, t))},${Math.round(lerp(g1, g2, t))},${Math.round(lerp(b1, b2, t))})`;
};

/** Deterministic pseudo random in [-1, 1) from any seed (Remotion's `random` is seeded, never `Math.random`). */
export const srand = (seed: string | number) => random(seed) * 2 - 1;

/**
 * A number that spins through random values until `lockFrame`, then settles on `final`.
 * Used for every ticking rate in the film. Decorative: it never represents a measured YELTRA metric.
 */
export const tickValue = (
  frame: number,
  startFrame: number,
  lockFrame: number,
  min: number,
  max: number,
  final: number,
  seed: string,
) => {
  if (frame < startFrame) return min;
  if (frame >= lockFrame) return final;
  const step = Math.floor(frame / 2); // new value every 2 frames
  return lerp(min, max, random(`${seed}-${step}`));
};
