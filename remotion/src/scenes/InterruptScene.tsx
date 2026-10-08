import React from "react";
import { AbsoluteFill } from "remotion";
import { Scene, useScene } from "../components/Scene";
import { smoothPath } from "../components/YieldCurve";
import { HandDrawnLine, HandNote, handCirclePoints } from "../components/HandDrawnLine";
import { DecodeText, KineticText } from "../components/KineticText";
import { IllustrativeTag, TechnicalLabel } from "../components/TechnicalLabel";
import { B, C, H, W } from "../styles/tokens";
import { easeInCubic, easeInOutCubic, easeOutBack, easeOutCubic, lerp, seg, srand } from "../styles/motion";

// 00:00 – 00:03 · THE INTERRUPT
// One orange line behaves like a yield chart, freezes, and the headline breaks in. Then the line breaks out.

type Pt = [number, number];
const DY = 90;
/** The chart. The last four points are the exit: the line leaves the frame at the vertical centre. */
const CHART: Pt[] = [
  [140, 760], [260, 700], [380, 690], [470, 610], [540, 540],
  [610, 585], [690, 660], [760, 705],
  [850, 676], [960, 666], [1060, 676],
  [1160, 606], [1260, 520], [1350, 450],
  [1420, 400], [1500, 350], [1580, 322],
].map(([x, y]) => [x, y + DY - 60] as Pt);
const EXIT: Pt[] = [[1700, 340], [1830, 410], [1990, 500], [2400, 540]];
const ALL: Pt[] = [...CHART, ...EXIT];

const cumulative = (pts: Pt[]) => {
  const out = [0];
  for (let i = 1; i < pts.length; i++) out.push(out[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return out;
};
const LEN = cumulative(ALL);
const TOTAL = LEN[LEN.length - 1];
/** Fraction of the whole path at which point index `i` sits. */
const at = (i: number) => LEN[i] / TOTAL;
const CHART_END = at(CHART.length - 1);

const MARKS = [
  { i: 4, text: "5.2%" },
  { i: 12, text: "7.8%" },
  { i: 16, text: "11.4%" },
] as const;

/** Fraction of the path drawn at scene frame `tt` (0 → 42 is the chart being drawn). */
const drawFrac = (tt: number) => {
  const linear = seg(tt, 0, 42);
  return CHART_END * lerp(linear, easeInOutCubic(linear), 0.45);
};
/** First frame at which the drawn line reaches a point (so each number pops exactly when the line gets there). */
const hitFrame = (hit: number) => {
  for (let f = 0; f <= 42; f++) if (drawFrac(f) >= hit - 0.002) return f;
  return 42;
};

const InterruptWorld: React.FC = () => {
  const { t } = useScene();

  // 0 → 42: the chart line is drawn. 42 → 64: everything is frozen. 64 → 90: the line leaves the frame.
  const draw = drawFrac(t);
  const exit = seg(t, 64, 90);
  const tail = easeInCubic(exit); // where the visible stretch starts
  const headExit = lerp(CHART_END, 1, easeInOutCubic(seg(t, 64, 88)));
  const end = t < 64 ? draw : headExit;
  const startFrac = t < 64 ? 0 : tail * 0.96;

  const frozen = t >= 42 && t < 64;
  const tremor = frozen ? srand(`tremor-${t}`) * 0.8 : 0;
  const pathD = smoothPath(ALL.map(([x, y]) => [x, y + tremor] as const));

  // The chart dims as the headline lands, so the type owns the frame.
  const chartDim = 1 - 0.55 * seg(t, 46, 56);

  // Camera: rushes after the line once it breaks out (follows it to the right edge).
  const follow = easeInCubic(seg(t, 70, 92));
  const camX = -follow * 620;
  const camS = 1 + follow * 0.6;

  // Technical scan as the chart freezes.
  const scanX = lerp(0, W, easeOutCubic(seg(t, 42, 52)));
  const scanOpacity = t >= 42 && t < 54 ? 0.8 * (1 - seg(t, 48, 54)) : 0;

  const headingOut = easeInOutCubic(seg(t, 62, 70));
  const tradeIn = easeOutCubic(seg(t, 66, 74));

  return (
    <AbsoluteFill style={{ transform: `translateX(${camX}px) scale(${camS})`, transformOrigin: "100% 50%" }}>
      {/* chart baseline + axis ticks */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: chartDim * seg(t, 0, 10) }}>
        <g stroke="rgba(236,237,234,0.16)" strokeWidth={1.5}>
          <line x1={140} y1={860} x2={1700} y2={860} />
          <line x1={140} y1={860} x2={140} y2={300} />
        </g>
        <g stroke="rgba(236,237,234,0.1)" strokeWidth={1} strokeDasharray="4 10">
          {[420, 540, 660, 780].map((y) => (
            <line key={y} x1={140} y1={y} x2={1700} y2={y} />
          ))}
        </g>
      </svg>

      {/* the line */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <filter id="int-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <path d={pathD} pathLength={1} fill="none" stroke={C.amber} strokeWidth={14} strokeLinecap="round" strokeDasharray={`${Math.max(0, end - startFrac)} 2`} strokeDashoffset={-startFrac} opacity={0.28 * chartDim} filter="url(#int-glow)" />
        <path d={pathD} pathLength={1} fill="none" stroke={C.amber} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${Math.max(0, end - startFrac)} 2`} strokeDashoffset={-startFrac} opacity={Math.min(1, 0.55 + chartDim * 0.45)} />
      </svg>

      {/* numbers around the line */}
      {MARKS.map((m, k) => {
        const [x, y] = ALL[m.i];
        const hit = at(m.i);
        const p = easeOutBack(seg(t, hitFrame(hit), hitFrame(hit) + 10));
        const above = k !== 1;
        return (
          <React.Fragment key={m.text}>
            <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: p * chartDim }}>
              <circle cx={x} cy={y} r={9} fill="none" stroke="#fff" strokeWidth={2} />
              <line x1={x} y1={y + (above ? -14 : 14)} x2={x} y2={y + (above ? -52 : 52)} stroke="rgba(236,237,234,0.5)" strokeWidth={1.5} />
            </svg>
            <TechnicalLabel text={m.text} x={x} y={y + (above ? -96 : 60)} align="center" size={36} color={C.fg} tracking={0.04} weight={500} opacity={p * chartDim} />
          </React.Fragment>
        );
      })}
      <HandDrawnLine points={handCirclePoints(CHART[16][0], CHART[16][1] - 82, 112, 44, "mark-top")} progress={seg(t, 36, 46)} color={C.amberLight} width={2.5} seed="mark-top" opacity={0.85 * chartDim} />
      <HandNote text="…and then it just sits." x={760} y={760} progress={seg(t, 26, 38)} size={42} color={C.fg} rotate={-4} opacity={0.8 * chartDim} />

      {/* technical scan at the freeze */}
      <div style={{ position: "absolute", left: scanX, top: 0, width: 2, height: H, background: C.amber, opacity: scanOpacity, boxShadow: `0 0 36px 6px rgba(239,95,34,0.55)` }} />

      {/* headline */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 96, display: "flex", justifyContent: "center", opacity: 1 - headingOut, transform: `scale(${1 + headingOut * 0.04})` }}>
        <KineticText text={"YIELD SHOULDN'T\nJUST SIT THERE."} start={44} size={118} align="center" tracking={-0.04} glitch={[44, 48]} stagger={0.28} rise={9} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 150, display: "flex", justifyContent: "center", opacity: seg(t, 66, 71), transform: `scale(${lerp(1.14, 1, tradeIn)})` }}>
        <DecodeText text="TRADE IT." progress={tradeIn} size={250} color={C.amber} weight={500} tracking={-0.05} align="center" />
      </div>
      <TechnicalLabel text="Yield · rate · time" x={140} y={888} size={17} color={C.faint} opacity={seg(t, 6, 16) * chartDim} />
      <IllustrativeTag opacity={0.7 * seg(t, 14, 24) * (1 - seg(t, 80, 90))} />
    </AbsoluteFill>
  );
};

export const InterruptScene: React.FC = () => (
  <Scene from={B.interrupt} dur={B.reveal - B.interrupt} lead={0} exitScale={1.15} origin={[75, 50]} exitBlur={5}>
    <InterruptWorld />
  </Scene>
);
