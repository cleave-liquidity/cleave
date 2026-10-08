import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { C } from "./styles/tokens";
import { InterruptScene } from "./scenes/InterruptScene";
import { YeltraRevealScene } from "./scenes/YeltraRevealScene";
import { MarketsScene } from "./scenes/MarketsScene";
import { FixedYieldScene } from "./scenes/FixedYieldScene";
import { TradingYieldScene } from "./scenes/TradingYieldScene";
import { DividendEarnScene } from "./scenes/DividendEarnScene";
import { FinalRevealScene } from "./scenes/FinalRevealScene";

/**
 * YELTRA launch film, 30 s · 1920×1080 · 30 fps · 900 frames.
 *
 *   0–3 s   Interrupt         a yield line freezes, "YIELD SHOULDN'T JUST SIT THERE." → "TRADE IT."
 *   3–6 s   YELTRA reveal     the line bends into an orbit, becomes the planet, the camera pushes through it
 *   6–11 s  Yield Markets     the Market Explorer fills, many markets converge into one layer, a row opens
 *  11–16 s  Fixed Yield       a moving curve snaps onto a strike line, the timeline locks
 *  16–21 s  Trading Yield     the line breaks free, an active interface forms
 *  21–25 s  Dividend Earn     a distribution connects to the position, a module opens INSIDE Trading Yield
 *  25–30 s  The system        everything is one system, collapses into the planet, final lockup
 *
 * Scenes overlap by LEAD frames so every cut is a camera move through shared geometry.
 */
export const YeltraLaunchFilm: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: C.bg }}>
    {/* Synthesised score, placed by frame number: see scripts/make-audio.py */}
    <Audio src={staticFile("audio/yeltra-score.wav")} />
    <InterruptScene />
    <YeltraRevealScene />
    <MarketsScene />
    <FixedYieldScene />
    <TradingYieldScene />
    <DividendEarnScene />
    <FinalRevealScene />
  </AbsoluteFill>
);
