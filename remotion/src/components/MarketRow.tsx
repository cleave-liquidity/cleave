import React from "react";
import { C, FONT } from "../styles/tokens";
import { clamp01, easeOutCubic } from "../styles/motion";

export type MarketRowData = {
  symbol: string;
  name: string;
  /** Initials for the asset ring (the app falls back to the same when it has no icon). */
  initials: string;
  maturity: string;
};

type MarketRowProps = {
  data: MarketRowData;
  /** Top of the row inside its container. */
  y: number;
  width: number;
  height?: number;
  /** 0..1 reveal. */
  appear: number;
  /** Already formatted rate text (ticks while the scene animates it). */
  rate: string;
  /** 0..1 filled share of the liquidity bar. */
  liquidity: number;
  /** 0..1 amber highlight of the selected row. */
  highlight?: number;
  rateColor?: string;
  /** Height used to centre the row's own content (so an expanded row keeps its header at the top). */
  contentHeight?: number;
};

/** One row of the Market Explorer: asset, rate, maturity and a liquidity bar. */
export const MarketRow: React.FC<MarketRowProps> = ({ data, y, width, height = 78, appear, rate, liquidity, highlight = 0, rateColor = C.ice, contentHeight }) => {
  const ch = contentHeight ?? height;
  const a = easeOutCubic(clamp01(appear));
  const colRate = width * 0.52;
  const colMaturity = width * 0.74;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: y,
        width,
        height,
        opacity: a,
        transform: `translateX(${(1 - a) * 40}px)`,
        clipPath: `inset(0 ${(1 - a) * 100}% 0 0)`,
        borderBottom: `1px solid ${C.lineSoft}`,
        background: `rgba(239,95,34,${0.07 * highlight})`,
        outline: highlight > 0.02 ? `1.5px solid rgba(239,95,34,${0.75 * highlight})` : undefined,
        outlineOffset: -1,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 28,
          top: (ch - 46) / 2,
          width: 46,
          height: 46,
          borderRadius: 23,
          border: "1.5px solid rgba(59,134,255,0.45)",
          background: "rgba(59,134,255,0.1)",
          color: C.ice,
          fontFamily: FONT.mono,
          fontSize: 14,
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          letterSpacing: "0.02em",
        }}
      >
        {data.initials}
      </div>
      <div style={{ position: "absolute", left: 94, top: 0, height: ch, display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
        <span style={{ fontFamily: FONT.sans, fontSize: 26, fontWeight: 500, color: C.fg, lineHeight: 1 }}>{data.symbol}</span>
        <span style={{ fontFamily: FONT.sans, fontSize: 15, color: C.mutedDark, lineHeight: 1 }}>{data.name}</span>
      </div>
      <div style={{ position: "absolute", right: width - colRate, top: 0, height: ch, display: "flex", alignItems: "center", fontFamily: FONT.mono, fontSize: 28, fontWeight: 500, color: rateColor }}>{rate}</div>
      <div style={{ position: "absolute", right: width - colMaturity, top: 0, height: ch, display: "flex", alignItems: "center", fontFamily: FONT.mono, fontSize: 19, color: C.fg, letterSpacing: "0.04em" }}>{data.maturity}</div>
      <div style={{ position: "absolute", left: width * 0.79, width: width * 0.17, top: ch / 2 - 1, height: 2, background: "rgba(236,237,234,0.12)" }}>
        <div style={{ width: `${clamp01(liquidity) * 100}%`, height: "100%", background: C.ice, opacity: 0.85 }} />
      </div>
    </div>
  );
};
