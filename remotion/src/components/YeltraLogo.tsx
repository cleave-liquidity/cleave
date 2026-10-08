import React from "react";
import { Img, staticFile } from "remotion";
import { C, FONT } from "../styles/tokens";

type LogoProps = {
  /** Centre of the planet mark. */
  x: number;
  y: number;
  /** Width of the mark in px. */
  size: number;
  opacity?: number;
  scale?: number;
  /** 0..1 orange bloom behind the planet. */
  glow?: number;
  rotate?: number;
};

/** The real YELTRA planet / orbital mark (public/logo.png of the web app, unchanged). */
export const YeltraMark: React.FC<LogoProps> = ({ x, y, size, opacity = 1, scale = 1, glow = 0, rotate = 0 }) => (
  <div
    style={{
      position: "absolute",
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      opacity,
      transform: `scale(${scale}) rotate(${rotate}deg)`,
    }}
  >
    {glow > 0 ? (
      <div
        style={{
          position: "absolute",
          inset: -size * 0.45,
          background: `radial-gradient(circle, rgba(240,122,43,${0.5 * glow}) 0%, rgba(239,95,34,${0.16 * glow}) 38%, rgba(239,95,34,0) 70%)`,
        }}
      />
    ) : null}
    <Img src={staticFile("logo.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
  </div>
);

type WordmarkProps = {
  x: number;
  y: number;
  size: number;
  /** 0..1: letters spread from tight to the brand tracking as it appears. */
  progress: number;
  align?: "center" | "left";
  opacity?: number;
};

/** "YELTRA" in the web app's wordmark treatment: Geist 500, wide tracking. */
export const YeltraWordmark: React.FC<WordmarkProps> = ({ x, y, size, progress, align = "center", opacity = 1 }) => {
  const tracking = 0.08 + 0.34 * progress;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: align === "center" ? "translateX(-50%)" : undefined,
        fontFamily: FONT.sans,
        fontWeight: 500,
        fontSize: size,
        letterSpacing: `${tracking}em`,
        // the trailing tracking would push a centred word off-centre
        paddingLeft: align === "center" ? `${tracking}em` : 0,
        color: C.fg,
        opacity: opacity * Math.min(1, progress * 2.2),
        whiteSpace: "nowrap",
      }}
    >
      YELTRA
    </div>
  );
};
