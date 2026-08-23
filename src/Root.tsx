import React from 'react';
import { Composition } from 'remotion';
import { TaiwanDeterrenceVideo, VIDEO_ID } from './Video';
import { DURATION_FRAMES, FPS, HEIGHT, WIDTH } from './data/timing';

export const RemotionRoot: React.FC = () => (
  <Composition
    id={VIDEO_ID}
    component={TaiwanDeterrenceVideo}
    durationInFrames={DURATION_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
