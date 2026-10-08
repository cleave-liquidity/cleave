import React from "react";
import { H, W, C } from "../styles/tokens";
import { TAU, clamp01 } from "../styles/motion";
import { useScene } from "./Scene";

type OrbitProps = {
  cx?: number;
  cy?: number;
  /** Overall size multiplier. */
  scale?: number;
  /** 0..1 how much of each ring has been drawn. */
  draw: number;
  /** Overall opacity. */
  opacity?: number;
  /** Rotation of the whole system (the site rolls its planet by -14°). */
  roll?: number;
  /** Seconds-equivalent clock; defaults to the scene frame. */
  clock?: number;
  /** Show the blue (Fixed) ring. */
  fixed?: number;
  /** Show the orange (Trading) ring. */
  trading?: number;
};

/**
 * YELTRA's ring system as a drawing: an inner blue ring (Fixed Yield), an outer orange ring (Trading Yield) and a
 * faint far orbit, with a small body riding each. The same vocabulary as the website hero.
 */
export const OrbitSystem: React.FC<OrbitProps> = ({ cx = W / 2, cy = H / 2, scale = 1, draw, opacity = 1, roll = -14, clock, fixed = 1, trading = 1 }) => {
  const scene = useScene();
  const t = clock ?? scene.t;
  const rings = [
    { rx: 300, ry: 88, color: C.ice, w: 3, a: 0.95, show: fixed, dash: undefined as string | undefined, speed: 0.021, dot: 7 },
    { rx: 396, ry: 118, color: C.amber, w: 3, a: 0.95, show: trading, dash: undefined as string | undefined, speed: -0.013, dot: 8 },
    { rx: 396, ry: 118, color: "#FFE9D2", w: 5, a: 0.9, show: trading, dash: "120 80 40 80", speed: 0, dot: 0 },
    { rx: 520, ry: 154, color: C.fg, w: 1.5, a: 0.25, show: 1, dash: "3 14", speed: 0.007, dot: 4 },
  ];
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity, overflow: "visible" }}>
      <g transform={`translate(${cx} ${cy}) rotate(${roll}) scale(${scale})`}>
        {rings.map((r, i) => {
          const p = clamp01(draw * r.show);
          const angle = t * r.speed * TAU + i * 1.7;
          return (
            <g key={i}>
              <ellipse
                cx={0}
                cy={0}
                rx={r.rx}
                ry={r.ry}
                fill="none"
                stroke={r.color}
                strokeWidth={r.w}
                opacity={r.a}
                pathLength={r.dash ? undefined : 1}
                strokeDasharray={r.dash ? undefined : `${p} 2`}
                style={r.dash ? { strokeDasharray: r.dash, strokeDashoffset: -t * 4, opacity: r.a * p } : undefined}
                strokeLinecap="butt"
              />
              {r.dot > 0 && p > 0.98 ? (
                <g transform={`translate(${Math.cos(angle) * r.rx} ${Math.sin(angle) * r.ry})`}>
                  <circle r={r.dot * 3.4} fill={r.color} opacity={0.22} />
                  <circle r={r.dot * 0.7} fill="#fff" />
                </g>
              ) : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
};
