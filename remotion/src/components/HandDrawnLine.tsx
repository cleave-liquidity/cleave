import React from "react";
import { random } from "remotion";
import { H, W, FONT, C } from "../styles/tokens";
import { TAU, clamp01, srand } from "../styles/motion";
import { smoothPath } from "./YieldCurve";

type Pt = readonly [number, number];

/** Nudges every point sideways by a deterministic amount, so a ruled line reads as drawn by hand. */
export const roughen = (pts: readonly Pt[], seed: string, amount: number): Pt[] =>
  pts.map(([x, y], i) => [x + srand(`${seed}-x-${i}`) * amount, y + srand(`${seed}-y-${i}`) * amount] as const);

type HandDrawnLineProps = {
  points: readonly Pt[];
  /** 0..1 how much of the stroke is drawn. */
  progress: number;
  color?: string;
  width?: number;
  seed?: string;
  wobble?: number;
  opacity?: number;
  dash?: string;
  /** Draw the lighter second pass that gives a pencil double stroke. */
  double?: boolean;
};

/** An SVG stroke that draws itself, with a hand-made wobble and a thin second pass. */
export const HandDrawnLine: React.FC<HandDrawnLineProps> = ({
  points,
  progress,
  color = C.fg,
  width = 3,
  seed = "hand",
  wobble = 3,
  opacity = 1,
  dash,
  double = true,
}) => {
  const a = smoothPath(roughen(points, `${seed}-a`, wobble));
  const b = smoothPath(roughen(points, `${seed}-b`, wobble * 1.6));
  const p = clamp01(progress);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity, overflow: "visible" }}>
      <path d={a} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash ?? `${p} 2`} />
      {double ? (
        <path d={b} pathLength={1} fill="none" stroke={color} strokeWidth={Math.max(1, width * 0.45)} strokeLinecap="round" strokeDasharray={`${clamp01(p - 0.04)} 2`} opacity={0.5} />
      ) : null}
    </svg>
  );
};

/** An imperfect circle / ellipse that overshoots its own start, like a quick pen circle. */
export const handCirclePoints = (cx: number, cy: number, rx: number, ry: number, seed: string): Pt[] => {
  const pts: Pt[] = [];
  const steps = 28;
  const turns = 1.12;
  const start = -Math.PI * 0.62 + srand(`${seed}-start`) * 0.3;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const ang = start + u * TAU * turns;
    const grow = 1 + (u > 0.88 ? (u - 0.88) * 0.7 : 0) + srand(`${seed}-r-${i}`) * 0.025;
    pts.push([cx + Math.cos(ang) * rx * grow, cy + Math.sin(ang) * ry * grow] as const);
  }
  return pts;
};

type HandArrowProps = { from: Pt; to: Pt; progress: number; color?: string; width?: number; bend?: number; seed?: string };

/** A slightly curved arrow with a two-stroke head. */
export const HandArrow: React.FC<HandArrowProps> = ({ from, to, progress, color = C.fg, width = 3, bend = 0.18, seed = "arrow" }) => {
  const mx = (from[0] + to[0]) / 2;
  const my = (from[1] + to[1]) / 2;
  const nx = -(to[1] - from[1]);
  const ny = to[0] - from[0];
  const mid: Pt = [mx + nx * bend, my + ny * bend];
  const pts: Pt[] = [from, mid, to];
  const ang = Math.atan2(to[1] - mid[1], to[0] - mid[0]);
  const head = 22;
  const h1: Pt = [to[0] - Math.cos(ang - 0.45) * head, to[1] - Math.sin(ang - 0.45) * head];
  const h2: Pt = [to[0] - Math.cos(ang + 0.45) * head, to[1] - Math.sin(ang + 0.45) * head];
  const headP = clamp01((progress - 0.82) / 0.18);
  return (
    <>
      <HandDrawnLine points={pts} progress={progress} color={color} width={width} seed={seed} wobble={2} />
      <HandDrawnLine points={[h1, to, h2]} progress={headP} color={color} width={width} seed={`${seed}-h`} wobble={1} double={false} />
    </>
  );
};

type HandNoteProps = {
  text: string;
  x: number;
  y: number;
  progress: number;
  size?: number;
  color?: string;
  rotate?: number;
  align?: "left" | "right" | "center";
  opacity?: number;
};

/** A handwritten annotation that writes itself on from left to right. */
export const HandNote: React.FC<HandNoteProps> = ({ text, x, y, progress, size = 40, color = C.fg, rotate = -3, align = "left", opacity = 1 }) => {
  const p = clamp01(progress);
  const tx = align === "left" ? "0%" : align === "right" ? "-100%" : "-50%";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translateX(${tx}) rotate(${rotate}deg)`,
        transformOrigin: "left center",
        fontFamily: FONT.hand,
        fontSize: size,
        lineHeight: 1,
        color,
        whiteSpace: "pre",
        opacity,
        clipPath: `inset(-10% ${(1 - p) * 100}% -10% 0)`,
      }}
    >
      {text}
    </div>
  );
};

/** Small deterministic helper for scribbled hatch marks (used as underline texture). */
export const scribblePoints = (x: number, y: number, width: number, seed: string): Pt[] => {
  const pts: Pt[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    pts.push([x + u * width, y + (i % 2 === 0 ? -1 : 1) * (3 + random(`${seed}-${i}`) * 4)] as const);
  }
  return pts;
};
