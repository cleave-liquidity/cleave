import React from "react";
import { random } from "remotion";
import { H, W } from "../styles/tokens";
import { TAU, lerp } from "../styles/motion";

export type CurveSpec = {
  /** Horizontal extent in px. */
  x0?: number;
  width: number;
  /** Resting height of the curve. */
  baseY: number;
  /** Peak-to-peak energy of the curve (px). 0 = a flat line. */
  amp: number;
  /** Phase of the moving waves (radians). Advance it with the frame to make the curve move. */
  phase: number;
  /** Changes the personality of the curve. */
  seed: number;
  /** 0 = free curve, 1 = fully pulled onto `lockY`. */
  lock?: number;
  lockY?: number;
  samples?: number;
};

/** A yield curve: three incommensurate waves so it moves like a rate, not like a sine. */
export const curvePoints = ({
  x0 = 0,
  width,
  baseY,
  amp,
  phase,
  seed,
  lock = 0,
  lockY,
  samples = 96,
}: CurveSpec): [number, number][] => {
  const s1 = random(`curve-a-${seed}`) * TAU;
  const s2 = random(`curve-b-${seed}`) * TAU;
  const s3 = random(`curve-c-${seed}`) * TAU;
  const target = lockY ?? baseY;
  const pts: [number, number][] = [];
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const wave =
      0.56 * Math.sin(TAU * (u * 1.35) + phase + s1) +
      0.3 * Math.sin(TAU * (u * 3.1) + phase * 1.7 + s2) +
      0.14 * Math.sin(TAU * (u * 6.4) + phase * 2.4 + s3);
    const free = baseY + amp * wave;
    pts.push([x0 + u * width, lerp(free, target, lock)]);
  }
  return pts;
};

/** Catmull-Rom → cubic Bézier, so a point list becomes a smooth SVG path. */
export const smoothPath = (pts: readonly (readonly [number, number])[]) => {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
};

type YieldCurveProps = CurveSpec & {
  /** Colour at the left end and at the right end (a gradient along the curve). */
  from: string;
  to?: string;
  strokeWidth?: number;
  /** 0..1 portion of the curve that is drawn. */
  progress?: number;
  /** Where the drawn portion starts (0..1). Together with `progress` it is a sliding window. */
  start?: number;
  glow?: number;
  opacity?: number;
  /** Draw a bright dot where the drawn portion ends. */
  head?: boolean;
  id: string;
};

export const YieldCurve: React.FC<YieldCurveProps> = ({
  from,
  to = from,
  strokeWidth = 4,
  progress = 1,
  start = 0,
  glow = 0,
  opacity = 1,
  head = false,
  id,
  ...spec
}) => {
  const pts = curvePoints(spec);
  const d = smoothPath(pts);
  const visible = Math.max(0, progress - start);
  const x0 = spec.x0 ?? 0;
  const headIndex = Math.min(pts.length - 1, Math.max(0, Math.round(progress * (pts.length - 1))));
  const [hx, hy] = pts[headIndex];

  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity, overflow: "visible" }}>
      <defs>
        <linearGradient id={`grad-${id}`} gradientUnits="userSpaceOnUse" x1={x0} y1={0} x2={x0 + spec.width} y2={0}>
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      {glow > 0 ? (
        <path
          d={d}
          pathLength={1}
          fill="none"
          stroke={`url(#grad-${id})`}
          strokeWidth={strokeWidth * 3.4}
          strokeLinecap="round"
          strokeDasharray={`${visible} 2`}
          strokeDashoffset={-start}
          opacity={0.16 * glow}
          style={{ filter: `blur(${10 * glow}px)` }}
        />
      ) : null}
      <path
        d={d}
        pathLength={1}
        fill="none"
        stroke={`url(#grad-${id})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${visible} 2`}
        strokeDashoffset={-start}
      />
      {head && progress > 0.005 && progress < 0.999 ? (
        <g>
          <circle cx={hx} cy={hy} r={strokeWidth * 3.4} fill={to} opacity={0.28} />
          <circle cx={hx} cy={hy} r={strokeWidth * 1.15} fill="#fff" />
        </g>
      ) : null}
    </svg>
  );
};

/** y of a curve at a normalised x (0..1), for placing labels on it. */
export const curveYAt = (spec: CurveSpec, u: number) => {
  const pts = curvePoints({ ...spec, samples: 96 });
  return pts[Math.min(pts.length - 1, Math.max(0, Math.round(u * (pts.length - 1))))][1];
};
