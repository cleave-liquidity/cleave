import React from "react";
import { AbsoluteFill } from "remotion";
import { Scene, useScene } from "../components/Scene";
import { YieldCurve } from "../components/YieldCurve";
import { ProductFrame } from "../components/ProductFrame";
import { HandDrawnLine, HandNote } from "../components/HandDrawnLine";
import { KineticText } from "../components/KineticText";
import { IllustrativeTag, TechnicalLabel } from "../components/TechnicalLabel";
import { B, C, FONT, H, W } from "../styles/tokens";
import { easeInOutCubic, easeOutBack, easeOutCubic, lerp, seg, snapDecay, tickValue } from "../styles/motion";

// 00:11 – 00:16 · FIXED YIELD
// A moving curve is caught by a strike line and snaps flat. The number stops, the maturity timeline locks.

const STRIKE_Y = 560;
const SNAP_AT = 54;
const AX0 = 300;
const AX1 = 1620;
const AXIS_Y = 880;
const TICKS = 13;

const FixedWorld: React.FC = () => {
  const { t } = useScene();

  const drawn = easeOutCubic(seg(t, -8, 20));
  const sinceSnap = Math.max(0, t - SNAP_AT);
  const amp = t < SNAP_AT ? 190 : 190 * snapDecay(sinceSnap / 20, 4.2, 2.1) * Math.max(0, 1 - sinceSnap / 26);
  const phase = (t < SNAP_AT ? t : SNAP_AT) * 0.12;
  const locked = t >= SNAP_AT + 8;

  const strike = easeOutCubic(seg(t, 34, 52));
  const flash = locked ? Math.max(0, 1 - (t - SNAP_AT - 8) / 14) : 0;

  const rate = tickValue(t, 0, SNAP_AT + 4, 3, 14, 7.2, "fixed-rate");

  // maturity timeline
  const axis = easeOutCubic(seg(t, 62, 88));
  const handle = easeInOutCubic(seg(t, 84, 108));
  const bracket = easeOutBack(seg(t, 106, 120));
  const lockDraw = seg(t, 108, 124);
  const frameDraw = easeOutCubic(seg(t, 66, 90));
  const frameFill = seg(t, 82, 96);

  return (
    <AbsoluteFill>
      {/* cool wash: the Fixed Yield scene lives in blue */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 60% at 50% 55%, rgba(59,134,255,0.1), rgba(3,3,4,0) 70%)", opacity: seg(t, 0, 24) }} />

      {/* headline */}
      <div style={{ position: "absolute", left: 96, top: 92 }}>
        <KineticText text="FIXED YIELD." start={6} end={100} size={100} tracking={-0.04} stagger={0.7} />
      </div>
      <div style={{ position: "absolute", left: 96, top: 92 }}>
        <KineticText text="LOCK THE RATE." start={104} size={100} tracking={-0.04} stagger={0.6} color={C.cyan} glitch={[104, 108]} />
      </div>

      {/* the strike line */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <line x1={0} y1={STRIKE_Y} x2={W * strike} y2={STRIKE_Y} stroke={C.cyan} strokeWidth={2} strokeDasharray="14 10" opacity={0.7} />
      </svg>
      <TechnicalLabel text="Fixed rate" x={1796} y={STRIKE_Y - 42} align="right" size={20} color={C.cyan} progress={seg(t, 48, 58)} marker={C.cyan} />

      {/* the curve: free, then caught */}
      <YieldCurve id="fx-main" width={W} baseY={STRIKE_Y} amp={amp} phase={phase} seed={9} from={C.ice} to={C.cyan} strokeWidth={5} progress={drawn} glow={0.55 + flash} head={t < SNAP_AT} />

      {/* the rate that stops moving */}
      <TechnicalLabel text="Rate" x={940} y={104} size={19} color={C.mutedDark} progress={seg(t, 12, 22)} />
      <div style={{ position: "absolute", left: 936, top: 128, fontFamily: FONT.mono, fontWeight: 500, fontSize: 124, letterSpacing: "-0.04em", color: locked ? C.cyan : C.fg, textShadow: flash > 0 ? `0 0 ${50 * flash}px rgba(103,212,255,${0.8 * flash})` : undefined, opacity: seg(t, 10, 20) }}>
        {rate.toFixed(2)}%
      </div>
      <HandDrawnLine points={[[940, 270], [1180, 276], [1300, 268]]} progress={locked ? easeOutCubic(seg(t, SNAP_AT + 10, SNAP_AT + 22)) : 0} color={C.cyan} width={3} seed="rate-underline" wobble={2} />
      <HandNote text="it stops moving." x={1010} y={296} progress={seg(t, SNAP_AT + 14, SNAP_AT + 28)} size={40} color={C.cyan} rotate={-3} />

      {/* UI fragment */}
      <ProductFrame x={1400} y={92} width={420} height={216} title="Fixed Yield" accent={C.ice} draw={frameDraw} fill={frameFill} headerHeight={52}>
        {[
          ["APY", `${(7.2).toFixed(2)}%`],
          ["MATURITY", "MAR 2027"],
          ["POSITION", "FIXED"],
        ].map(([k, v], i) => (
          <div key={k} style={{ position: "absolute", left: 28, right: 28, top: 70 + i * 46, display: "flex", justifyContent: "space-between", fontFamily: FONT.mono, fontSize: 18, opacity: seg(t, 88 + i * 4, 98 + i * 4) }}>
            <span style={{ color: C.faint, letterSpacing: "0.18em" }}>{k}</span>
            <span style={{ color: i === 0 ? C.cyan : C.fg }}>{v}</span>
          </div>
        ))}
      </ProductFrame>

      {/* maturity timeline */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <line x1={AX0} y1={AXIS_Y} x2={lerp(AX0, AX1, axis)} y2={AXIS_Y} stroke="rgba(236,237,234,0.35)" strokeWidth={2} />
        {Array.from({ length: TICKS }, (_, i) => {
          const x = lerp(AX0, AX1, i / (TICKS - 1));
          const on = seg(t, 66 + i * 1.5, 74 + i * 1.5);
          return <line key={i} x1={x} y1={AXIS_Y - 9 * on} x2={x} y2={AXIS_Y + 9 * on} stroke="rgba(236,237,234,0.4)" strokeWidth={2} />;
        })}
        {/* the locked span */}
        <g opacity={axis > 0.05 ? 1 : 0}>
        <line x1={AX0} y1={AXIS_Y} x2={lerp(AX0, AX1, handle)} y2={AXIS_Y} stroke={C.cyan} strokeWidth={5} strokeLinecap="round" />
        <rect x={lerp(AX0, AX1, handle) - 9} y={AXIS_Y - 9} width={18} height={18} fill={C.cyan} transform={`rotate(45 ${lerp(AX0, AX1, handle)} ${AXIS_Y})`} />
        </g>
        {/* brackets slide onto the ends and close */}
        <g stroke={C.cyan} strokeWidth={4} fill="none" opacity={bracket > 0.02 ? 1 : 0}>
          <path d={`M ${AX0 - lerp(70, 18, bracket)} ${AXIS_Y - 34} L ${AX0 - lerp(70, 18, bracket) + 14} ${AXIS_Y - 34} M ${AX0 - lerp(70, 18, bracket)} ${AXIS_Y - 34} L ${AX0 - lerp(70, 18, bracket)} ${AXIS_Y + 34} L ${AX0 - lerp(70, 18, bracket) + 14} ${AXIS_Y + 34}`} />
          <path d={`M ${AX1 + lerp(70, 18, bracket)} ${AXIS_Y - 34} L ${AX1 + lerp(70, 18, bracket) - 14} ${AXIS_Y - 34} M ${AX1 + lerp(70, 18, bracket)} ${AXIS_Y - 34} L ${AX1 + lerp(70, 18, bracket)} ${AXIS_Y + 34} L ${AX1 + lerp(70, 18, bracket)} ${AXIS_Y + 34} L ${AX1 + lerp(70, 18, bracket) - 14} ${AXIS_Y + 34}`} />
        </g>
        {/* padlock */}
        <g transform={`translate(${(AX0 + AX1) / 2} ${AXIS_Y - 92})`} stroke={C.cyan} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={lockDraw > 0.02 ? 1 : 0}>
          <rect x={-22} y={-4} width={44} height={34} rx={4} pathLength={1} strokeDasharray={`${Math.min(1, lockDraw * 1.15)} 2`} />
          <path d="M -13 -4 L -13 -18 A 13 13 0 0 1 13 -18 L 13 -4" pathLength={1} strokeDasharray={`${Math.min(1, lockDraw * 1.15)} 2`} />
        </g>
      </svg>
      <TechnicalLabel text="Today" x={AX0} y={AXIS_Y + 30} size={19} color={C.fg} align="center" progress={seg(t, 72, 82)} />
      <TechnicalLabel text="Maturity" x={AX1} y={AXIS_Y + 30} size={19} color={C.fg} align="center" progress={seg(t, 76, 86)} />
      <TechnicalLabel text="Locked to maturity" x={(AX0 + AX1) / 2} y={AXIS_Y + 30} size={19} color={C.cyan} align="center" progress={seg(t, 112, 126)} />

      <IllustrativeTag opacity={0.7 * seg(t, 8, 20)} />
    </AbsoluteFill>
  );
};

export const FixedYieldScene: React.FC = () => (
  <Scene from={B.fixed} dur={B.trading - B.fixed} enterScale={1.35} exitScale={1.0}>
    <FixedWorld />
  </Scene>
);
