import React from "react";
import { AbsoluteFill } from "remotion";
import { Scene, useScene } from "../components/Scene";
import { ProductFrame } from "../components/ProductFrame";
import { MarketRow } from "../components/MarketRow";
import { YieldCurve } from "../components/YieldCurve";
import { HandArrow, HandDrawnLine, HandNote } from "../components/HandDrawnLine";
import { KineticText } from "../components/KineticText";
import { IllustrativeTag, TechnicalLabel } from "../components/TechnicalLabel";
import { YeltraMark } from "../components/YeltraLogo";
import { B, C, FONT } from "../styles/tokens";
import { easeInExpo, easeOutBack, easeOutCubic, lerp, seg, tickValue } from "../styles/motion";
import { MARKET_ROWS } from "./marketData";

// 00:06 – 00:11 · YIELD MARKETS
// Camera lands in the Market Explorer. Rows populate, many markets converge into one YELTRA layer, then one row
// opens and the camera dives into its curve.

const FX = 700;
const FY = 170;
const FW = 1120;
const FH = 740;
const ROWS_TOP = 118;
const ROW_H = 78;
const EXPAND = 210;

const COLUMNS = ["ASSET", "RATE NOW", "MATURITY", "LIQUIDITY"] as const;

const NODES: [number, number][] = [
  [130, 640], [236, 690], [150, 760], [262, 826], [128, 884], [244, 934],
];
const HUB: [number, number] = [470, 790];

const MarketsWorld: React.FC = () => {
  const { t } = useScene();

  const frameDraw = easeOutCubic(seg(t, -4, 22));
  const frameFill = seg(t, 6, 24);

  // headline swap: DISCOVER YIELD. → YELTRA MARKETS.
  const labels = seg(t, 56, 70);

  // row 0 opens at 98 → 120 and keeps the row highlighted
  const open = easeOutCubic(seg(t, 98, 122));
  const highlight = easeOutCubic(seg(t, 92, 104));

  // the dive
  const dive = easeInExpo(seg(t, 116, 148));
  const camS = 1 + dive * 8;
  const ORIGIN_X = FX + 330;
  const ORIGIN_Y = FY + ROWS_TOP + ROW_H + EXPAND / 2;

  const converge = (k: number) => seg(t, 38 + k * 4, 62 + k * 4);

  return (
    <AbsoluteFill style={{ transform: `scale(${camS})`, transformOrigin: `${ORIGIN_X}px ${ORIGIN_Y}px` }}>
      {/* left column: the message */}
      <div style={{ position: "absolute", left: 96, top: 110 }}>
        <KineticText text={"DISCOVER\nYIELD."} start={4} end={52} size={110} tracking={-0.04} lineHeight={0.98} stagger={0.7} />
      </div>
      <div style={{ position: "absolute", left: 96, top: 110 }}>
        <KineticText text={"YELTRA\nMARKETS."} start={58} size={110} tracking={-0.04} lineHeight={0.98} stagger={0.7} lineColors={[C.fg, C.amber]} glitch={[58, 62]} />
      </div>
      <TechnicalLabel text="Robinhood Chain" x={100} y={468} size={19} color={C.fg} marker={C.ice} progress={labels} />
      <TechnicalLabel text="One discovery layer" x={100} y={506} size={19} color={C.mutedDark} marker={C.amber} progress={seg(t, 64, 78)} />

      {/* many markets → one YELTRA layer */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {NODES.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={11 * easeOutBack(converge(i) * 4 > 1 ? 1 : converge(i) * 4)} fill="none" stroke={C.ice} strokeWidth={2.5} opacity={0.95} />
        ))}
      </svg>
      {NODES.map(([x, y], i) => (
        <HandDrawnLine key={i} points={[[x + 14, y], [lerp(x, HUB[0], 0.55), lerp(y, HUB[1], 0.5) + (i % 2 ? 14 : -14)], [HUB[0] - 46, HUB[1]]]} progress={easeOutCubic(converge(i))} color={C.muted} width={2} seed={`conv-${i}`} wobble={2} opacity={0.8} double={false} />
      ))}
      <div style={{ opacity: easeOutBack(seg(t, 62, 78)) }}>
        <YeltraMark x={HUB[0]} y={HUB[1]} size={96} scale={1} glow={0.5} />
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <circle cx={HUB[0]} cy={HUB[1]} r={64} fill="none" stroke={C.amber} strokeWidth={2.5} pathLength={1} strokeDasharray={`${seg(t, 60, 82)} 2`} opacity={0.9} />
      </svg>
      <HandNote text="many markets" x={110} y={578} progress={seg(t, 44, 58)} size={40} rotate={-5} color={C.muted} />
      <HandNote text="one layer" x={420} y={880} progress={seg(t, 76, 90)} size={44} rotate={-3} color={C.amberLight} />
      <HandArrow from={[560, 906]} to={[HUB[0] + 8, HUB[1] + 78]} progress={seg(t, 80, 92)} color={C.amberLight} width={2.5} bend={-0.25} seed="arrow-layer" />

      {/* the Market Explorer */}
      <ProductFrame x={FX} y={FY} width={FW} height={FH} title="YELTRA Markets" status="ROBINHOOD CHAIN" accent={C.amber} draw={frameDraw} fill={frameFill}>
        {/* column heads */}
        <div style={{ position: "absolute", left: 0, top: 56, width: FW, height: 62, borderBottom: `1px solid ${C.lineSoft}` }}>
          {COLUMNS.map((c, i) => {
            const x = [28, FW * 0.52, FW * 0.74, FW * 0.79][i];
            const style: React.CSSProperties =
              i === 0 || i === 3
                ? { left: x }
                : { right: FW - x };
            return (
              <div key={c} style={{ position: "absolute", top: 0, height: 62, display: "flex", alignItems: "center", fontFamily: FONT.mono, fontSize: 14, letterSpacing: "0.2em", color: C.faint, opacity: seg(t, 8 + i * 3, 18 + i * 3), ...style }}>
                {c}
              </div>
            );
          })}
        </div>
        {/* rows */}
        <div style={{ position: "absolute", left: 0, top: ROWS_TOP, width: FW, height: FH - ROWS_TOP, overflow: "hidden" }}>
          {MARKET_ROWS.map((row, i) => {
            const appear = seg(t, 12 + i * 5, 26 + i * 5);
            const rate = tickValue(t, 12 + i * 5, 34 + i * 5, 1, 14, row.rate, `rate-${i}`);
            const y = i === 0 ? 0 : ROW_H * i + EXPAND * open;
            const dim = i === 0 ? 1 : 1 - 0.65 * open;
            return (
              <div key={row.symbol} style={{ opacity: dim }}>
                <MarketRow
                  data={row}
                  y={y}
                  width={FW}
                  height={i === 0 ? ROW_H + EXPAND * open : ROW_H}
                  contentHeight={ROW_H}
                  appear={appear}
                  rate={`${rate.toFixed(2)}%`}
                  liquidity={row.liquidity * seg(t, 22 + i * 5, 46 + i * 5)}
                  highlight={i === 0 ? highlight : 0}
                />
              </div>
            );
          })}
        </div>
      </ProductFrame>

      {/* the opened row: its curve */}
      <div style={{ position: "absolute", left: FX + 28, top: FY + ROWS_TOP + ROW_H + 22, opacity: open }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 14, letterSpacing: "0.2em", color: C.faint }}>YIELD CURVE · TO MATURITY</div>
      </div>
      <YieldCurve id="mk-mini" x0={FX + 150} width={760} baseY={FY + ROWS_TOP + ROW_H + EXPAND / 2 + 10} amp={34} phase={t * 0.1} seed={5} from={C.ice} to={C.cyan} strokeWidth={3.5} progress={open} opacity={open} />

      <IllustrativeTag opacity={0.7 * seg(t, 16, 30)} />
    </AbsoluteFill>
  );
};

export const MarketsScene: React.FC = () => (
  <Scene from={B.markets} dur={B.fixed - B.markets} enterScale={1.3} exitScale={1.0}>
    <MarketsWorld />
  </Scene>
);
