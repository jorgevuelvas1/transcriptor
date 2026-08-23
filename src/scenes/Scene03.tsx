/**
 * ESCENA 3 · 0:09.8 - 0:15.8
 * Cambio de sistema grafico: registro documental de 1958.
 * Mapa desaturado, textura de papel, cuadricula y lineas de trayectoria.
 *
 * Sin explosiones, sin artilleria realista, sin figuras humanas.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ArchiveSlug, HistoricalMap, PaperTexture } from '../components/HistoricalMap';
import { MapLabel } from '../components/maps/MapCanvas';
import { Headline } from '../components/Typography';
import { SceneShell, Vignette } from '../components/Chrome';
import { CAM_KINMEN_WIDE, lerpCamera, POINTS } from '../data/geography';
import { STORY_DATA } from '../data/story';
import { CONTENT_BOX, sec, WIDTH } from '../data/timing';
import { COLOR, FONT, TRACKING, TYPE } from '../theme';
import { at, easeInOutQuint, easeOutExpo, progress } from '../anim';

const CAM_1958_END = { center: [118.28, 24.45] as [number, number], spanLon: 0.86 };

export const Scene03: React.FC = () => {
  const frame = useCurrentFrame();
  const total = sec(6.0);

  const camera = lerpCamera(
    CAM_KINMEN_WIDE,
    CAM_1958_END,
    progress(frame, 0, total, easeInOutQuint)
  );

  // Barrido de cambio de sistema grafico.
  const wipe = at(frame, [0, 14], [0, 1], easeOutExpo);
  const trajectories = at(frame, [46, 156], [0, 1]);

  return (
    <SceneShell background={COLOR.paper}>
      <AbsoluteFill
        style={{
          clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`,
        }}
      >
        <HistoricalMap
          camera={camera}
          trajectoryProgress={trajectories}
          trajectoryCount={5}
          graticuleOpacity={at(frame, [8, 44], [0, 1])}
        >
          {(projection, palette) => (
            <>
              <MapLabel
                projection={projection}
                position={POINTS.kinmenCentroid}
                color={palette.label}
                opacity={at(frame, [30, 52], [0, 1])}
                size={TYPE.label}
                anchor="start"
                dx={22}
                dy={46}
                weight={700}
              >
                KINMEN
              </MapLabel>
              <MapLabel
                projection={projection}
                position={[118.02, 24.72]}
                color={palette.labelDim}
                opacity={at(frame, [30, 52], [0, 0.9])}
                size={TYPE.label}
                anchor="start"
                weight={700}
              >
                CHINA
              </MapLabel>
            </>
          )}
        </HistoricalMap>

        <PaperTexture opacity={0.07} />
      </AbsoluteFill>

      <Vignette strength={0.62} />

      <AbsoluteFill
        style={{
          padding: `${CONTENT_BOX.top}px ${CONTENT_BOX.left}px`,
          pointerEvents: 'none',
        }}
      >
        <ArchiveSlug opacity={at(frame, [10, 30], [0, 1])}>
          <span style={{ letterSpacing: TRACKING.widest }}>
            {STORY_DATA.crisisStartLabel}
          </span>
          <span
            style={{
              width: 1,
              height: 20,
              background: COLOR.warmDim,
              display: 'inline-block',
            }}
          />
          <span style={{ opacity: 0.75 }}>ARCHIVO</span>
        </ArchiveSlug>

        <div style={{ marginTop: 30, maxWidth: WIDTH * 0.78 }}>
          <Headline
            frame={frame}
            start={62}
            size={TYPE.title}
            weight={700}
            color={COLOR.warmBright}
            style={{ fontFamily: FONT.serif }}
          >
            SEGUNDA CRISIS
            <br />
            DEL ESTRECHO
          </Headline>

          <div style={{ marginTop: 18 }}>
            <Headline
              frame={frame}
              start={112}
              size={TYPE.headline}
              weight={600}
              color={COLOR.warm}
              style={{ fontFamily: FONT.serif, letterSpacing: TRACKING.wide }}
            >
              BOMBARDEO DE KINMEN
            </Headline>
          </div>
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};
