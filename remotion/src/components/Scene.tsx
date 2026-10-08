import React, { createContext, useContext } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { C, LEAD } from "../styles/tokens";
import { easeInCubic, easeOutCubic, lerp, seg } from "../styles/motion";
import { TechGrid } from "./TechGrid";

type SceneTime = {
  /** Frames since the scene's nominal start. Negative while the scene is still arriving over the previous one. */
  t: number;
  /** Nominal length of the scene in frames. */
  dur: number;
};

const SceneContext = createContext<SceneTime>({ t: 0, dur: 0 });
export const useScene = () => useContext(SceneContext);

type SceneProps = {
  /** Nominal start frame (a boundary from `B`). */
  from: number;
  /** Nominal length in frames. */
  dur: number;
  /** Frames this scene is visible before `from` (arrival over the previous scene). 0 for the first scene. */
  lead?: number;
  /** Frames this scene stays underneath the next one after its nominal end. */
  tail?: number;
  /** Scale it arrives at (1 = none). > 1 reads as passing through the previous scene. */
  enterScale?: number;
  /** Scale it leaves at (1 = none). */
  exitScale?: number;
  /** Where the arrival / departure zoom is anchored, in % of the frame. */
  origin?: [number, number];
  exitBlur?: number;
  grid?: boolean;
  children: React.ReactNode;
};

/**
 * One scene of the film. It owns the overlap with its neighbours: it fades in over the previous scene while
 * easing from `enterScale` to 1, and zooms away (with motion blur) as the next one takes over. The previous
 * scene never fades out, so a transition never dips toward black.
 */
export const Scene: React.FC<SceneProps> = ({
  from,
  dur,
  lead = LEAD,
  tail = LEAD,
  enterScale = 1,
  exitScale = 1,
  origin = [50, 50],
  exitBlur = 0,
  grid = true,
  children,
}) => {
  return (
    <Sequence from={from - lead} durationInFrames={dur + lead + tail} layout="none">
      <SceneInner dur={dur} lead={lead} tail={tail} enterScale={enterScale} exitScale={exitScale} origin={origin} exitBlur={exitBlur} grid={grid}>
        {children}
      </SceneInner>
    </Sequence>
  );
};

const SceneInner: React.FC<Required<Omit<SceneProps, "from" | "children">> & { children: React.ReactNode }> = ({
  dur,
  lead,
  tail,
  enterScale,
  exitScale,
  origin,
  exitBlur,
  grid,
  children,
}) => {
  const frame = useCurrentFrame();
  const t = frame - lead;
  const pIn = lead > 0 ? easeOutCubic(seg(t, -lead, 0)) : 1;
  const pOut = tail > 0 ? easeInCubic(seg(t, dur, dur + tail)) : 0;
  const scale = lerp(enterScale, 1, pIn) * lerp(1, exitScale, pOut);
  const blur = exitBlur * pOut;

  return (
    <SceneContext.Provider value={{ t, dur }}>
      <AbsoluteFill style={{ backgroundColor: C.bg, opacity: pIn, overflow: "hidden" }}>
        <AbsoluteFill
          style={{
            transform: `scale(${scale})`,
            transformOrigin: `${origin[0]}% ${origin[1]}%`,
            filter: blur > 0.1 ? `blur(${blur}px)` : undefined,
          }}
        >
          {grid ? <TechGrid /> : null}
          {children}
        </AbsoluteFill>
      </AbsoluteFill>
    </SceneContext.Provider>
  );
};
