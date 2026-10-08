import React from "react";
import { C, FONT } from "../styles/tokens";
import { clamp01 } from "../styles/motion";

type TechnicalLabelProps = {
  text: string;
  x: number;
  y: number;
  /** 0..1 typewriter progress. */
  progress?: number;
  color?: string;
  size?: number;
  align?: "left" | "right" | "center";
  /** A small coloured square before the text. */
  marker?: string;
  opacity?: number;
  tracking?: number;
  weight?: number;
  /** Uppercase the text (default). Turn off for addresses and domains, which are case-sensitive to the eye. */
  uppercase?: boolean;
};

/** Monospace uppercase metadata label that types itself on. */
export const TechnicalLabel: React.FC<TechnicalLabelProps> = ({
  text,
  x,
  y,
  progress = 1,
  color = C.mutedDark,
  size = 20,
  align = "left",
  marker,
  opacity = 1,
  tracking = 0.2,
  weight = 400,
  uppercase = true,
}) => {
  const shown = text.slice(0, Math.round(clamp01(progress) * text.length));
  const tx = align === "left" ? "0%" : align === "right" ? "-100%" : "-50%";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translateX(${tx})`,
        display: "flex",
        alignItems: "center",
        gap: size * 0.55,
        fontFamily: FONT.mono,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: `${tracking}em`,
        textTransform: uppercase ? "uppercase" : "none",
        color,
        whiteSpace: "pre",
        opacity,
      }}
    >
      {marker && shown.length > 0 ? <span style={{ width: size * 0.38, height: size * 0.38, background: marker, display: "inline-block", flexShrink: 0 }} /> : null}
      <span>{shown}</span>
    </div>
  );
};

/** Bottom-left note that keeps decorative numbers honest. It is shown in every scene that animates rates. */
export const IllustrativeTag: React.FC<{ opacity?: number }> = ({ opacity = 0.75 }) => (
  <TechnicalLabel text="Illustrative rates · not live data" x={96} y={1010} size={15} color={C.faint} tracking={0.22} opacity={opacity} />
);
