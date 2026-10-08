import React from "react";
import { C, FONT } from "../styles/tokens";
import { easeInCubic, easeOutExpo, seg, srand } from "../styles/motion";
import { useScene } from "./Scene";

type KineticTextProps = {
  text: string; // "\n" starts a new line
  /** Scene frame (0 = the scene's nominal start) at which the first letter starts to rise. */
  start: number;
  /** Frame at which the text starts leaving (rises out upward). Leave undefined to stay. */
  end?: number;
  size: number;
  color?: string;
  weight?: number;
  tracking?: number; // em
  lineHeight?: number;
  font?: "sans" | "mono";
  align?: "left" | "center" | "right";
  stagger?: number; // frames between letters
  /** Frames of the rise itself. */
  rise?: number;
  /** A short RGB-split impulse [from, to] in scene frames. */
  glitch?: readonly [number, number];
  /** Used to colour individual lines, e.g. ["#fff", C.amber]. */
  lineColors?: readonly string[];
  style?: React.CSSProperties;
};

/**
 * Letter-by-letter reveal from behind a mask, with a quick optional glitch. Short lines only: it is made for the
 * headline hits of the film, never for sentences.
 */
export const KineticText: React.FC<KineticTextProps> = ({
  text,
  start,
  end,
  size,
  color = C.fg,
  weight = 400,
  tracking = -0.035,
  lineHeight = 1.0,
  font = "sans",
  align = "left",
  stagger = 0.9,
  rise = 14,
  glitch,
  lineColors,
  style,
}) => {
  const { t: frame } = useScene();
  const lines = text.split("\n");
  let index = 0;
  const glitching = glitch ? frame >= glitch[0] && frame <= glitch[1] : false;
  const dx = glitching ? srand(`glitch-${frame}`) * (size * 0.045) : 0;
  const split = glitching ? Math.abs(srand(`split-${frame}`)) * (size * 0.05) + 2 : 0;

  return (
    <div
      style={{
        fontFamily: font === "sans" ? FONT.sans : FONT.mono,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: `${tracking}em`,
        lineHeight,
        color,
        textAlign: align,
        textShadow: glitching ? `${split}px 0 rgba(239,95,34,0.85), ${-split}px 0 rgba(103,212,255,0.85)` : undefined,
        transform: glitching ? `translateX(${dx}px)` : undefined,
        ...style,
      }}
    >
      {lines.map((line, li) => (
        <div key={li} style={{ overflow: "hidden", paddingBottom: size * 0.12, marginBottom: -size * 0.12, whiteSpace: "pre" }}>
          {[...line].map((ch, ci) => {
            const k = index++;
            const inP = easeOutExpo(seg(frame, start + k * stagger, start + k * stagger + rise));
            const outP = end === undefined ? 0 : easeInCubic(seg(frame, end + k * stagger * 0.55, end + k * stagger * 0.55 + 10));
            const y = (1 - inP) * 112 - outP * 112;
            return (
              <span
                key={ci}
                style={{
                  display: "inline-block",
                  transform: `translateY(${y}%)`,
                  color: lineColors?.[li] ?? color,
                  opacity: inP > 0.001 && outP < 0.999 ? 1 : 0,
                }}
              >
                {ch === " " ? " " : ch}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

type DecodeTextProps = {
  text: string;
  /** 0..1 progress of the decode (0 = noise, 1 = resolved). Pass 1 → 0 to scramble a text away. */
  progress: number;
  size: number;
  color?: string;
  weight?: number;
  tracking?: number;
  font?: "sans" | "mono";
  align?: "left" | "center" | "right";
  lineHeight?: number;
  style?: React.CSSProperties;
};

const NOISE = "▒░/\\|+-*0123456789%.";

/** Characters resolve from noise one by one (or dissolve into it when progress runs backwards). */
export const DecodeText: React.FC<DecodeTextProps> = ({ text, progress, size, color = C.fg, weight = 400, tracking = -0.035, font = "sans", align = "left", lineHeight = 1, style }) => {
  const { t: frame } = useScene();
  const lines = text.split("\n");
  const total = [...text.replace(/\n/g, "")].length;
  let n = 0;
  return (
    <div style={{ fontFamily: font === "sans" ? FONT.sans : FONT.mono, fontSize: size, fontWeight: weight, letterSpacing: `${tracking}em`, color, textAlign: align, lineHeight, whiteSpace: "pre", ...style }}>
      {lines.map((line, li) => (
        <div key={li}>
          {[...line].map((ch, ci) => {
            const k = n++;
            const at = (k / Math.max(1, total - 1)) * 0.7;
            const resolved = progress >= at + 0.3;
            const hidden = progress <= at;
            const glyph = ch === " " ? " " : resolved ? ch : NOISE[Math.floor(Math.abs(srand(`decode-${k}-${Math.floor(frame / 2)}`)) * NOISE.length) % NOISE.length];
            return (
              <span key={ci} style={{ opacity: hidden ? 0 : resolved ? 1 : 0.55 }}>
                {glyph}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
