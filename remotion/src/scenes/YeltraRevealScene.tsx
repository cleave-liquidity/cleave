import React from "react";
import { AbsoluteFill } from "remotion";
import { Scene, useScene } from "../components/Scene";
import { smoothPath } from "../components/YieldCurve";
import { OrbitSystem } from "../components/OrbitSystem";
import { YeltraMark, YeltraWordmark } from "../components/YeltraLogo";
import { MarketRow } from "../components/MarketRow";
import { TechnicalLabel } from "../components/TechnicalLabel";
import { B, C, H, W } from "../styles/tokens";
import { TAU, easeInExpo, easeInOutCubic, easeOutBack, easeOutCubic, lerp, seg } from "../styles/motion";

// 00:03 – 00:06 · YELTRA REVEAL
// The line bends into an orbit, the orbit holds a point, the point becomes the planet, then the camera pushes through it.

const CX = W / 2;
const CY = 450;
const RX = 396;
const RY = 118;
const ROLL = (-14 * Math.PI) / 180;

/** Point `u` (0..1) on the line as it bends from a straight streak into the orbit ellipse (k = 0..1). */
const bendPoint = (u: number, k: number): [number, number] => {
  const sx = lerp(260, 1660, u);
  const sy = 540;
  const ang = Math.PI + u * TAU;
  const ex = Math.cos(ang) * RX;
  const ey = Math.sin(ang) * RY;
  const rx = ex * Math.cos(ROLL) - ey * Math.sin(ROLL) + CX;
  const ry = ex * Math.sin(ROLL) + ey * Math.cos(ROLL) + CY;
  return [lerp(sx, rx, k), lerp(sy, ry, k)];
};

const GHOST_ROWS = [
  { symbol: "USDG", name: "Global Dollar", initials: "US", maturity: "MAR 2027" },
  { symbol: "NVDA", name: "NVIDIA · Robinhood Token", initials: "NV", maturity: "OCT 2026" },
  { symbol: "PFE", name: "Pfizer · Robinhood Token", initials: "PF", maturity: "DEC 2026" },
  { symbol: "SGOV", name: "iShares 0-3 Month Treasury", initials: "SG", maturity: "NOV 2026" },
];

const RevealWorld: React.FC = () => {
  const { t } = useScene();

  const bend = easeInOutCubic(seg(t, 2, 28));
  const streak = easeOutCubic(seg(t, -8, 4));
  const pts = Array.from({ length: 56 }, (_, i) => bendPoint(i / 55, bend));
  const d = smoothPath(pts);
  // once the orbit system takes over, the bent line is hidden underneath it (same ellipse)
  const bentOpacity = 1 - seg(t, 26, 34);

  const orbitDraw = seg(t, 22, 46);
  const planetIn = easeOutBack(seg(t, 22, 40));
  const dotIn = easeOutBack(seg(t, 8, 20));
  const dotFade = 1 - seg(t, 24, 34);

  const wordmark = easeOutCubic(seg(t, 44, 66));
  const tagline = seg(t, 62, 80);

  // The push: the whole composition rushes toward the camera and through the orbit.
  const push = easeInExpo(seg(t, 66, 90));
  const camS = 1 + push * 26;
  const markFade = 1 - seg(t, 78, 88);

  const ghost = seg(t, 62, 84);

  return (
    <AbsoluteFill>
      {/* rows glimpsed through the orbit */}
      <AbsoluteFill style={{ opacity: ghost * 0.55, filter: `blur(${lerp(14, 3, ghost)}px)`, transform: `scale(${lerp(0.7, 1.25, ghost)}) rotate(-6deg)`, transformOrigin: "50% 45%" }}>
        <div style={{ position: "absolute", left: 340, top: 270, width: 1240 }}>
          {GHOST_ROWS.map((r, i) => (
            <MarketRow key={r.symbol} data={r} y={i * 96} width={1240} height={86} appear={1} rate={`${(4 + i * 2.1).toFixed(1)}%`} liquidity={0.2 + i * 0.12} />
          ))}
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ transform: `scale(${camS})`, transformOrigin: `${CX}px ${CY}px` }}>
        {/* streak → orbit */}
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: bentOpacity }}>
          <path d={d} pathLength={1} fill="none" stroke={C.amber} strokeWidth={12} strokeLinecap="round" strokeDasharray={`${streak} 2`} opacity={0.25} style={{ filter: "blur(8px)" }} />
          <path d={d} pathLength={1} fill="none" stroke={C.amber} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${streak} 2`} />
        </svg>

        <OrbitSystem cx={CX} cy={CY} draw={orbitDraw} fixed={seg(t, 28, 40)} opacity={markFade} clock={t} />

        {/* the point that becomes the planet */}
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: dotFade * seg(t, 8, 12) }}>
          <circle cx={CX} cy={CY} r={26 * dotIn} fill={C.amber} opacity={0.35} />
          <circle cx={CX} cy={CY} r={7 * dotIn} fill="#fff" />
        </svg>
        <YeltraMark x={CX} y={CY} size={470} scale={planetIn} opacity={planetIn > 0.02 ? markFade : 0} glow={seg(t, 28, 46) * markFade} />

        <YeltraWordmark x={CX} y={700} size={116} progress={wordmark} opacity={markFade} />
        <TechnicalLabel text="Yield, made tradable." x={CX} y={850} align="center" size={30} color={C.muted} progress={tagline} tracking={0.3} opacity={markFade} />
      </AbsoluteFill>

      <TechnicalLabel text="Robinhood Chain" x={96} y={96} size={17} color={C.faint} opacity={seg(t, 40, 54) * markFade} marker={C.amber} />
    </AbsoluteFill>
  );
};

export const YeltraRevealScene: React.FC = () => (
  <Scene from={B.reveal} dur={B.markets - B.reveal} enterScale={1.12} exitScale={1.0} exitBlur={0}>
    <RevealWorld />
  </Scene>
);
