import React from "react";
import { AbsoluteFill } from "remotion";
import { Scene, useScene } from "../components/Scene";
import { OrbitSystem } from "../components/OrbitSystem";
import { ProductFrame } from "../components/ProductFrame";
import { HandDrawnLine } from "../components/HandDrawnLine";
import { KineticText } from "../components/KineticText";
import { TechnicalLabel } from "../components/TechnicalLabel";
import { YeltraMark, YeltraWordmark } from "../components/YeltraLogo";
import { B, C, H, REAL_CONTRACTS, W, shortAddress } from "../styles/tokens";
import { easeInCubic, easeOutBack, easeOutCubic, easeInOutCubic, lerp, seg } from "../styles/motion";

// 00:25 – 00:30 · THE YELTRA SYSTEM → FINAL REVEAL
// Zoom out: every earlier sequence is one connected system. Then it collapses into the planet, a beat of near-silence,
// and the clean lockup.

const CX = W / 2;
const CY = 540;

type Node = { x: number; y: number; w: number; h: number; title: string; accent: string; delay: number };
const MARKETS: Node = { x: 740, y: 120, w: 440, h: 130, title: "Yield Markets", accent: C.fg, delay: 4 };
const FIXED: Node = { x: 150, y: 600, w: 450, h: 168, title: "Fixed Yield", accent: C.ice, delay: 12 };
const TRADING: Node = { x: 1320, y: 560, w: 450, h: 292, title: "Trading Yield", accent: C.amber, delay: 18 };

const Glyph: React.FC<{ kind: "rows" | "flat" | "wave"; x: number; y: number; w: number; color: string; opacity: number }> = ({ kind, x, y, w, color, opacity }) => {
  const pts: [number, number][] = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const yy = kind === "flat" ? 0 : kind === "wave" ? Math.sin(u * 11) * 18 + Math.sin(u * 4.2) * 14 : 0;
    pts.push([x + u * w, y + yy]);
  }
  if (kind === "rows") {
    return (
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity }}>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <circle cx={x + 10} cy={y - 18 + i * 18} r={5} fill="none" stroke={C.ice} strokeWidth={1.5} />
            <line x1={x + 28} y1={y - 18 + i * 18} x2={x + w * (0.9 - i * 0.12)} y2={y - 18 + i * 18} stroke="rgba(236,237,234,0.3)" strokeWidth={2} />
          </g>
        ))}
      </svg>
    );
  }
  const d = pts.map(([px, py], i) => `${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity }}>
      <path d={d} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const FinalWorld: React.FC = () => {
  const { t } = useScene();

  // 0 → 14: the zoom out settles (the scene arrives enlarged). 0 → 40: the system forms.
  const orbit = easeOutCubic(seg(t, 0, 30));
  const nodeP = (n: Node) => seg(t, n.delay, n.delay + 22);
  const link = (a: number) => easeOutCubic(seg(t, a, a + 22));

  // collapse
  const collapse = easeInCubic(seg(t, 60, 86));
  const systemScale = 1 - collapse * 0.985;
  const systemOpacity = 1 - seg(t, 78, 88);
  const pulse = Math.exp(-Math.max(0, t - 84) / 5) * (t >= 84 ? 1 : 0);

  // the beat, then the lockup
  const lift = easeInOutCubic(seg(t, 94, 114));
  const markY = lerp(CY, 420, lift);
  const markSize = lerp(330, 360, lift);
  const wordmark = easeOutCubic(seg(t, 100, 120));
  const fadeToBlack = seg(t, 144, 150);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(239,95,34,0.1), rgba(3,3,4,0) 70%)", opacity: systemOpacity * 0.9 + lift * 0.5 }} />

      <AbsoluteFill style={{ opacity: systemOpacity, transform: `scale(${systemScale})`, transformOrigin: `${CX}px ${CY}px` }}>
        <OrbitSystem cx={CX} cy={CY} scale={0.85} draw={orbit} clock={t} />

        {/* links: markets feed YELTRA, YELTRA offers Fixed and Trading */}
        <HandDrawnLine points={[[CX, MARKETS.y + MARKETS.h + 6], [CX + 6, 330], [CX, 408]]} progress={link(12)} color={C.fg} width={3} seed="lk-m" wobble={1.5} double={false} />
        <HandDrawnLine points={[[CX - 150, CY + 30], [FIXED.x + FIXED.w * 0.72, FIXED.y + 20], [FIXED.x + FIXED.w + 6, FIXED.y + FIXED.h / 2 - 20]]} progress={link(22)} color={C.ice} width={3} seed="lk-f" wobble={1.5} double={false} />
        <HandDrawnLine points={[[CX + 150, CY + 30], [TRADING.x + 40, TRADING.y + 30], [TRADING.x - 6, TRADING.y + 70]]} progress={link(26)} color={C.amber} width={3} seed="lk-t" wobble={1.5} double={false} />

        <YeltraMark x={CX} y={CY} size={330} scale={easeOutBack(seg(t, -4, 14))} glow={0.55} />
        <TechnicalLabel text="YELTRA" x={CX} y={CY + 168} align="center" size={20} color={C.fg} tracking={0.4} progress={seg(t, 20, 32)} />

        <ProductFrame x={MARKETS.x} y={MARKETS.y} width={MARKETS.w} height={MARKETS.h} title={MARKETS.title} accent={MARKETS.accent} draw={nodeP(MARKETS)} fill={nodeP(MARKETS)} headerHeight={48} />
        <Glyph kind="rows" x={MARKETS.x + 36} y={MARKETS.y + 92} w={MARKETS.w - 72} color={C.ice} opacity={seg(t, 18, 28)} />
        <ProductFrame x={FIXED.x} y={FIXED.y} width={FIXED.w} height={FIXED.h} title={FIXED.title} accent={FIXED.accent} draw={nodeP(FIXED)} fill={nodeP(FIXED)} headerHeight={48} />
        <Glyph kind="flat" x={FIXED.x + 36} y={FIXED.y + 110} w={FIXED.w - 72} color={C.cyan} opacity={seg(t, 28, 38)} />
        <ProductFrame x={TRADING.x} y={TRADING.y} width={TRADING.w} height={TRADING.h} title={TRADING.title} accent={TRADING.accent} draw={nodeP(TRADING)} fill={nodeP(TRADING)} headerHeight={48} />
        <Glyph kind="wave" x={TRADING.x + 36} y={TRADING.y + 104} w={TRADING.w - 72} color={C.amber} opacity={seg(t, 34, 44)} />
        {/* Dividend Earn lives INSIDE Trading Yield */}
        <ProductFrame x={TRADING.x + 28} y={TRADING.y + 168} width={TRADING.w - 56} height={96} title="Dividend Earn" status="ELIGIBLE" statusColor={C.amber} accent={C.amber} draw={seg(t, 40, 56)} fill={seg(t, 46, 60)} headerHeight={46} />

        {/* the discovery → lock → trade → enhance line */}
        <TechnicalLabel text="Discover · Lock · Trade · Enhance" x={CX} y={900} align="center" size={24} color={C.fg} tracking={0.28} progress={seg(t, 36, 56)} />

        {/* real contract labels as technical texture */}
        {REAL_CONTRACTS.map((c, i) => (
          <TechnicalLabel key={c.name} text={`${c.name} ${shortAddress(c.address)}`} x={96} y={110 + i * 30} size={14} color={C.faint} tracking={0.08} progress={seg(t, 30 + i * 4, 48 + i * 4)} uppercase={false} />
        ))}
        <TechnicalLabel text="Robinhood Chain · 4663" x={W - 96} y={110} align="right" size={14} color={C.faint} progress={seg(t, 30, 46)} marker={C.amber} />
      </AbsoluteFill>

      {/* the planet carries the beat */}
      {t >= 84 ? <YeltraMark x={CX} y={markY} size={markSize} glow={0.5 + pulse * 0.6} scale={1 + pulse * 0.18} /> : null}
      <OrbitSystem cx={CX} cy={markY} scale={0.55} draw={1} opacity={seg(t, 104, 118) * 0.55} clock={t} />

      {/* lockup */}
      <YeltraWordmark x={CX} y={560} size={104} progress={wordmark} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 706, display: "flex", justifyContent: "center" }}>
        <KineticText text="YIELD YOU CAN TRADE." start={108} size={84} weight={300} tracking={-0.035} align="center" stagger={0.55} rise={12} />
      </div>
      <TechnicalLabel text="Lock it. Trade it. Enhance eligible positions." x={CX} y={842} align="center" size={25} color={C.muted} tracking={0.2} progress={seg(t, 118, 138)} />
      <TechnicalLabel text="Robinhood Chain" x={CX - 170} y={950} align="center" size={19} color={C.fg} tracking={0.28} marker={C.amber} progress={seg(t, 128, 138)} />
      <TechnicalLabel text="yeltra.tech" x={CX + 150} y={950} align="center" size={19} color={C.amber} tracking={0.28} progress={seg(t, 130, 140)} weight={500} uppercase={false} />

      <AbsoluteFill style={{ background: "#000", opacity: fadeToBlack }} />
    </AbsoluteFill>
  );
};

export const FinalRevealScene: React.FC = () => (
  <Scene from={B.system} dur={B.end - B.system} enterScale={1.9} tail={0}>
    <FinalWorld />
  </Scene>
);

