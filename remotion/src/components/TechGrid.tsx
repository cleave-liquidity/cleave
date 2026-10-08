import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { H, W } from "../styles/tokens";

/** Thin technical grid + vignette. Drifts a few pixels so the frame never feels like a still. */
export const TechGrid: React.FC<{ opacity?: number; spacing?: number }> = ({ opacity = 1, spacing = 96 }) => {
  const frame = useCurrentFrame();
  const drift = (frame * 0.18) % spacing;
  const lines: React.ReactNode[] = [];
  for (let x = -spacing; x <= W + spacing; x += spacing) {
    lines.push(<line key={`v${x}`} x1={x + drift} y1={0} x2={x + drift} y2={H} />);
  }
  for (let y = -spacing; y <= H + spacing; y += spacing) {
    lines.push(<line key={`h${y}`} x1={0} y1={y + drift * 0.6} x2={W} y2={y + drift * 0.6} />);
  }
  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <g stroke="rgba(236,237,234,0.035)" strokeWidth={1}>
          {lines}
        </g>
      </svg>
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse 75% 70% at 50% 50%, rgba(3,3,4,0) 40%, rgba(3,3,4,0.85) 100%)" }}
      />
    </AbsoluteFill>
  );
};
