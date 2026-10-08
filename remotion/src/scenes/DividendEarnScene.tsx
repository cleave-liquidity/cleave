import React from "react";
import { AbsoluteFill } from "remotion";
import { Scene, useScene } from "../components/Scene";
import { YieldCurve } from "../components/YieldCurve";
import { ProductFrame } from "../components/ProductFrame";
import { HandArrow, HandDrawnLine, HandNote } from "../components/HandDrawnLine";
import { KineticText } from "../components/KineticText";
import { TechnicalLabel } from "../components/TechnicalLabel";
import { B, C, FONT, H, W } from "../styles/tokens";
import { easeOutBack, easeOutCubic, easeInOutCubic, lerp, seg } from "../styles/motion";

// 00:21 – 00:25 · DIVIDEND EARN
// Calmer. The Trading Yield position holds the centre. A distribution event travels along a second line and connects to
// it, and a Dividend Earn module unfolds INSIDE the Trading Yield frame. Dividend Earn is an enhancement, never a product
// of its own, and nothing here claims a payout: the real module says "Settlement not enabled · opt-in required".

const FX = 380;
const FY = 232;
const FW = 1160;
const FH = 584;
const RAIL_Y = 906;
const MOD_X = FX + 60;
const MOD_Y = FY + 318;
const MOD_W = FW - 120;
const MOD_H = 222;

/** A four-point sparkle, used as the "✦" of Dividend Earn. */
const Spark: React.FC<{ x: number; y: number; r: number; opacity?: number; color?: string }> = ({ x, y, r, opacity = 1, color = C.amber }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity }}>
    <path d={`M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`} fill={color} />
  </svg>
);

const DividendWorld: React.FC = () => {
  const { t } = useScene();

  const frameDraw = easeOutCubic(seg(t, -6, 20));
  const frameFill = seg(t, 4, 22);

  // the rail and the event that travels along it
  const rail = easeOutCubic(seg(t, 14, 34));
  const travel = easeInOutCubic(seg(t, 28, 62));
  const markerX = lerp(FX + 40, W / 2, travel);
  const connect = easeOutCubic(seg(t, 60, 74));

  // the module unfolds inside the Trading Yield frame
  const modDraw = easeOutCubic(seg(t, 66, 90));
  const modFill = seg(t, 74, 92);
  const pill = easeOutBack(seg(t, 90, 100));
  const lockup = seg(t, 70, 84);

  const endBlur = seg(t, 112, 126);

  return (
    <AbsoluteFill style={{ opacity: 1 - endBlur * 0.0 }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 55% at 50% 52%, rgba(239,95,34,0.09), rgba(3,3,4,0) 70%)" }} />

      {/* the lockup: the enhancement hangs under the product it belongs to */}
      <div style={{ position: "absolute", left: FX, top: 40 }}>
        <KineticText text="TRADING YIELD" start={6} size={78} tracking={-0.04} stagger={0.6} />
      </div>
      <HandDrawnLine points={[[FX + 12, 128], [FX + 12, 166], [FX + 44, 166]]} progress={lockup} color={C.amber} width={3} seed="nest" wobble={1.5} double={false} />
      <div style={{ position: "absolute", left: FX + 62, top: 138, opacity: lockup, transform: `translateX(${(1 - lockup) * -14}px)`, display: "flex", alignItems: "center", gap: 18, fontFamily: FONT.sans, fontSize: 48, fontWeight: 400, letterSpacing: "-0.03em", color: C.amber, whiteSpace: "nowrap" }}>
        <span style={{ color: C.fg }}>+</span> DIVIDEND EARN
        <Spark x={0} y={0} r={0} />
      </div>
      <Spark x={FX + 62 + 456} y={164} r={16} opacity={lockup * (0.7 + 0.3 * Math.sin(t / 5))} />

      {/* the Trading Yield position (calm) */}
      <ProductFrame x={FX} y={FY} width={FW} height={FH} title="Trading Yield position" status="ELIGIBLE UNDERLYING" statusColor={C.amber} accent={C.amber} draw={frameDraw} fill={frameFill}>
        <div style={{ position: "absolute", left: 40, top: 80, fontFamily: FONT.mono, fontSize: 14, letterSpacing: "0.2em", color: C.faint, opacity: seg(t, 14, 26) }}>FUTURE-YIELD EXPOSURE</div>
      </ProductFrame>
      <YieldCurve id="dv-main" x0={FX + 40} width={FW - 80} baseY={FY + 190} amp={52} phase={t * 0.045 + 1} seed={9} from={C.amberPrimary} to={C.amber} strokeWidth={5} glow={0.7} progress={easeOutCubic(seg(t, -6, 20))} />

      {/* Dividend Earn, nested inside the frame */}
      <ProductFrame x={MOD_X} y={MOD_Y} width={MOD_W} height={MOD_H} title="Dividend Earn" status="" accent={C.amber} draw={modDraw} fill={modFill} headerHeight={54}>
        <div style={{ position: "absolute", left: 230, top: 0, height: 54, display: "flex", alignItems: "center", opacity: pill }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 15, letterSpacing: "0.16em", padding: "6px 14px", border: `1.5px solid rgba(239,95,34,0.5)`, background: "rgba(239,95,34,0.1)", color: C.amber, transform: `scale(${0.8 + 0.2 * pill})` }}>ELIGIBLE</div>
        </div>
        {[
          ["DISTRIBUTION", "VERIFIED EVENT"],
          ["POSITION", "ELIGIBLE · OPT-IN"],
          ["TYPE", "CASH DIVIDEND"],
        ].map(([k, v], i) => (
          <div key={k} style={{ position: "absolute", left: 28, top: 76 + i * 38, width: MOD_W - 56, display: "flex", justifyContent: "space-between", fontFamily: FONT.mono, fontSize: 17, opacity: seg(t, 82 + i * 4, 92 + i * 4) }}>
            <span style={{ color: C.faint, letterSpacing: "0.18em" }}>{k}</span>
            <span style={{ color: C.fg }}>{v}</span>
          </div>
        ))}
        <div style={{ position: "absolute", left: 28, bottom: 14, fontFamily: FONT.mono, fontSize: 13, letterSpacing: "0.16em", color: C.faint, opacity: seg(t, 96, 106) }}>
          OPT-IN REQUIRED · SETTLEMENT NOT ENABLED
        </div>
      </ProductFrame>

      {/* the second line: where distributions come from */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <line x1={FX} y1={RAIL_Y} x2={lerp(FX, FX + FW, rail)} y2={RAIL_Y} stroke="rgba(236,237,234,0.4)" strokeWidth={2} />
        {[0.18, 0.42, 0.7, 0.9].map((u, i) => {
          const x = FX + FW * u;
          const on = seg(t, 22 + i * 4, 30 + i * 4);
          return <rect key={i} x={x - 6} y={RAIL_Y - 6} width={12} height={12} fill="none" stroke={C.mutedDark} strokeWidth={2} transform={`rotate(45 ${x} ${RAIL_Y})`} opacity={on} />;
        })}
      </svg>
      <TechnicalLabel text="Distribution events" x={FX + FW} y={RAIL_Y + 22} align="right" size={16} color={C.faint} progress={seg(t, 18, 32)} />
      {t >= 28 && t < 70 ? <Spark x={markerX} y={RAIL_Y} r={22} /> : null}
      {t >= 28 && t < 70 ? <TechnicalLabel text="Verified event" x={markerX} y={RAIL_Y - 60} align="center" size={16} color={C.amber} progress={seg(t, 30, 42)} marker={C.amber} /> : null}
      <HandDrawnLine points={[[W / 2, RAIL_Y - 14], [W / 2 + 10, lerp(RAIL_Y, MOD_Y + MOD_H, 0.5)], [W / 2, MOD_Y + MOD_H + 4]]} progress={connect} color={C.amber} width={3.5} seed="connect" wobble={1.5} double={false} />
      <HandNote text="if the underlying distributes" x={FX + FW - 8} y={FY + 110} progress={seg(t, 40, 56)} size={38} color={C.amberLight} rotate={3} align="right" />
      <HandArrow from={[FX + FW - 140, FY + 142]} to={[FX + FW - 110, FY + 312]} progress={seg(t, 54, 66)} color={C.amberLight} width={2.5} bend={0.2} seed="arrow-under" />

      {/* microcopy */}
      <div style={{ position: "absolute", left: 96, top: 944 }}>
        <KineticText text={"ELIGIBLE DISTRIBUTIONS.\nBUILT INTO TRADING YIELD."} start={84} size={26} font="mono" tracking={0.12} lineHeight={1.5} color={C.fg} stagger={0.3} rise={10} />
      </div>
      <TechnicalLabel text="Protocol direction · in development" x={1824} y={1010} align="right" size={15} color={C.faint} opacity={seg(t, 20, 34)} />
    </AbsoluteFill>
  );
};

export const DividendEarnScene: React.FC = () => (
  <Scene from={B.dividend} dur={B.system - B.dividend} enterScale={1.0} exitScale={0.55} exitBlur={3}>
    <DividendWorld />
  </Scene>
);
