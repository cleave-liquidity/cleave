import React from "react";
import { AbsoluteFill } from "remotion";
import { Scene, useScene } from "../components/Scene";
import { YieldCurve } from "../components/YieldCurve";
import { ProductFrame } from "../components/ProductFrame";
import { HandNote } from "../components/HandDrawnLine";
import { KineticText } from "../components/KineticText";
import { IllustrativeTag, TechnicalLabel } from "../components/TechnicalLabel";
import { B, C, FONT } from "../styles/tokens";
import { easeInOutCubic, easeOutCubic, lerp, mixHex, seg, snapDecay, tickValue } from "../styles/motion";

// 00:16 – 00:21 · TRADING YIELD
// The fixed line breaks free. The curve moves again, the camera chases it, an active Trading Yield interface forms.

const FX = 240;
const FY = 190;
const FW = 1440;
const FH = 700;

const SCENARIOS = ["RATE DROPS", "RATE NOW", "RATE RISES"] as const;

const TradingWorld: React.FC = () => {
  const { t } = useScene();

  // The line arrives flat (continuing the Fixed scene), kinks at 6 and gets its energy back.
  const energy = easeOutCubic(seg(t, 6, 26));
  const wobble = t < 26 ? 1 + 0.6 * snapDecay((t - 6) / 20, 3, 2.4) : 1;
  const amp = 40 + 170 * energy * wobble;
  const phase = 0.07 * Math.max(0, t) + 0.0009 * Math.max(0, t) * Math.max(0, t) + 2;

  // The curve settles into the interface: from full width to the chart area of the frame.
  const fit = easeInOutCubic(seg(t, 22, 52));
  const x0 = lerp(0, FX + 36, fit);
  const width = lerp(1920, 920, fit);
  const baseY = lerp(560, FY + 330, fit);
  const color = mixHex(C.ice, C.amber, easeOutCubic(seg(t, 6, 24)));
  const colorEnd = mixHex(C.cyan, C.amberPrimary, easeOutCubic(seg(t, 6, 28)));

  // Camera: it chases the curve, then punches in on the beats.
  const punch = (at: number) => Math.exp(-Math.max(0, t - at) / 7) * (t >= at ? 1 : 0);
  const camS = 1 + seg(t, 0, 150) * 0.05 + punch(28) * 0.035 + punch(78) * 0.03;
  const camX = Math.sin(t / 9) * 14;
  const camY = Math.sin(t / 7 + 1) * 10;
  const camR = Math.sin(t / 17) * 0.8;

  const frameDraw = easeOutCubic(seg(t, 8, 40));
  const frameFill = seg(t, 30, 52);

  const active = Math.floor(Math.max(0, t - 44) / 30) % 3;
  const gauge = 0.55 + 0.3 * Math.sin(t / 8);
  const rateNow = tickValue(t, 30, 9999, 4, 13, 8, "tr-rate");
  const exposure = tickValue(t, 30, 9999, 4, 19, 8, "tr-exp");

  const ghostA = seg(t, 40, 56) * 0.45;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 60% at 45% 55%, rgba(239,95,34,0.12), rgba(3,3,4,0) 70%)", opacity: seg(t, 8, 30) }} />

      {/* headline */}
      <div style={{ position: "absolute", left: 96, top: 36 }}>
        <KineticText text="TRADING YIELD." start={8} end={64} size={104} tracking={-0.04} stagger={0.65} glitch={[8, 12]} />
      </div>
      <div style={{ position: "absolute", left: 96, top: 30 }}>
        <KineticText text={"TRADE WHAT YIELD\nDOES NEXT."} start={76} size={64} tracking={-0.035} lineHeight={1.02} stagger={0.5} lineColors={[C.fg, C.amber]} />
      </div>

      <AbsoluteFill style={{ transform: `translate(${camX}px, ${camY}px) rotate(${camR}deg) scale(${camS})`, transformOrigin: "50% 60%" }}>
      {/* the interface forms around the curve */}
      <ProductFrame x={FX} y={FY} width={FW} height={FH} title="Trading Yield" status="EXPOSURE TO FUTURE YIELD" statusColor={C.amber} accent={C.amber} draw={frameDraw} fill={frameFill}>
        {/* scenario pills */}
        <div style={{ position: "absolute", left: 1020, top: 82, display: "flex", gap: 12, opacity: seg(t, 40, 52) }}>
          {SCENARIOS.map((s, i) => (
            <div key={s} style={{ fontFamily: FONT.mono, fontSize: 15, letterSpacing: "0.14em", padding: "10px 14px", border: `1.5px solid ${i === active ? C.amber : C.line}`, background: i === active ? "rgba(239,95,34,0.14)" : "transparent", color: i === active ? C.amber : C.mutedDark }}>
              {s}
            </div>
          ))}
        </div>
        {/* readouts */}
        <div style={{ position: "absolute", left: 1020, top: 170, opacity: seg(t, 46, 58) }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 14, letterSpacing: "0.2em", color: C.faint }}>RATE NOW</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 84, fontWeight: 500, color: C.fg, letterSpacing: "-0.04em", lineHeight: 1.05 }}>{rateNow.toFixed(2)}%</div>
        </div>
        <div style={{ position: "absolute", left: 1020, top: 330, width: 360, opacity: seg(t, 52, 64) }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT.mono, fontSize: 14, letterSpacing: "0.2em", color: C.faint }}>
            <span>EXPOSURE</span>
            <span style={{ color: C.amber }}>{exposure.toFixed(1)}×</span>
          </div>
          <div style={{ position: "relative", marginTop: 18, height: 4, background: "rgba(236,237,234,0.14)" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${gauge * 100}%`, background: C.amber }} />
            <div style={{ position: "absolute", left: `${gauge * 100}%`, top: -9, width: 4, height: 22, background: "#fff", boxShadow: `0 0 18px 3px rgba(239,95,34,0.8)` }} />
          </div>
        </div>
        <div style={{ position: "absolute", left: 1020, top: 470, width: 360, opacity: seg(t, 60, 72), fontFamily: FONT.mono, fontSize: 14, letterSpacing: "0.16em", color: C.mutedDark, lineHeight: 1.9 }}>
          FUTURE-YIELD EXPOSURE
          <br />
          VALUE CAN RISE OR FALL
        </div>
      </ProductFrame>

      {/* scenario curves behind the main one */}
      <YieldCurve id="tr-lo" x0={FX + 36} width={920} baseY={FY + 410} amp={120} phase={phase * 0.8 + 1} seed={21} from="#ffffff" strokeWidth={2} opacity={ghostA} progress={seg(t, 40, 60)} />
      <YieldCurve id="tr-hi" x0={FX + 36} width={920} baseY={FY + 250} amp={120} phase={phase * 1.1 + 3} seed={33} from="#ffffff" strokeWidth={2} opacity={ghostA} progress={seg(t, 44, 64)} />
      <YieldCurve id="tr-main" x0={x0} width={width} baseY={baseY} amp={amp} phase={phase} seed={9} from={color} to={colorEnd} strokeWidth={6} glow={0.9} progress={1} />

      <HandNote text="exposure moves with the rate" x={FX + 60} y={FY + FH - 70} progress={seg(t, 84, 100)} size={40} color={C.amberLight} rotate={-2} />
      <TechnicalLabel text="Rate" x={FX + 36} y={FY + 80} size={16} color={C.faint} opacity={seg(t, 44, 56)} />
      <TechnicalLabel text="Time" x={FX + 956} y={FY + FH - 40} size={16} color={C.faint} align="right" opacity={seg(t, 44, 56)} />

      </AbsoluteFill>
      <IllustrativeTag opacity={0.7 * seg(t, 30, 44)} />
    </AbsoluteFill>
  );
};

export const TradingYieldScene: React.FC = () => (
  <Scene from={B.trading} dur={B.dividend - B.trading} enterScale={1.0} exitScale={1.0}>
    <TradingWorld />
  </Scene>
);

