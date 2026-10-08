import React from "react";
import { Composition } from "remotion";
import { YeltraLaunchFilm } from "./YeltraLaunchFilm";
import { DURATION, FPS, H, W } from "./styles/tokens";

export const RemotionRoot: React.FC = () => (
  <Composition id="YeltraLaunchFilm" component={YeltraLaunchFilm} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
);
