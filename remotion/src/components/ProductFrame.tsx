import React from "react";
import { C, FONT } from "../styles/tokens";
import { clamp01 } from "../styles/motion";

type ProductFrameProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Mono label in the header strip. */
  title?: string;
  /** Right-hand header label. */
  status?: string;
  statusColor?: string;
  accent?: string;
  /** 0..1 how much of the outline has been drawn. */
  draw?: number;
  /** 0..1 opacity of the panel fill and its contents. */
  fill?: number;
  headerHeight?: number;
  opacity?: number;
  children?: React.ReactNode;
};

/**
 * A cropped fragment of the YELTRA interface: thin technical border that draws itself, corner ticks, a mono header
 * strip. Contents are positioned inside it, relative to its top-left corner.
 */
export const ProductFrame: React.FC<ProductFrameProps> = ({
  x,
  y,
  width,
  height,
  title,
  status,
  statusColor = C.mutedDark,
  accent = C.fg,
  draw = 1,
  fill = 1,
  headerHeight = 56,
  opacity = 1,
  children,
}) => {
  const d = clamp01(draw);
  const tick = 22;
  return (
    <div style={{ position: "absolute", left: x, top: y, width, height, opacity }}>
      <div style={{ position: "absolute", inset: 0, background: `rgba(11,11,13,${0.92 * fill})` }} />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <rect x={0.5} y={0.5} width={width - 1} height={height - 1} fill="none" stroke="rgba(236,237,234,0.22)" strokeWidth={1.5} pathLength={1} strokeDasharray={`${d} 2`} />
        {title ? <line x1={0} y1={headerHeight} x2={width * d} y2={headerHeight} stroke="rgba(236,237,234,0.12)" strokeWidth={1} /> : null}
        {d > 0.98 ? (
          <g stroke={accent} strokeWidth={2.5} fill="none">
            <path d={`M 0 ${tick} L 0 0 L ${tick} 0`} />
            <path d={`M ${width - tick} 0 L ${width} 0 L ${width} ${tick}`} />
            <path d={`M 0 ${height - tick} L 0 ${height} L ${tick} ${height}`} />
            <path d={`M ${width - tick} ${height} L ${width} ${height} L ${width} ${height - tick}`} />
          </g>
        ) : null}
      </svg>
      {title ? (
        <div
          style={{
            position: "absolute",
            left: 28,
            top: 0,
            height: headerHeight,
            right: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: FONT.mono,
            fontSize: 17,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: C.mutedDark,
            opacity: fill,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: accent, display: "inline-block" }} />
            {title}
          </span>
          {status ? <span style={{ color: statusColor }}>{status}</span> : null}
        </div>
      ) : null}
      <div style={{ position: "absolute", inset: 0, opacity: fill }}>{children}</div>
    </div>
  );
};
