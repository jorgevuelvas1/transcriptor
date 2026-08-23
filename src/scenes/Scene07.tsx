/**
 * ESCENA 7 · 0:32.8 - 0:36.2
 * EL GIRO.
 *
 * Hasta aqui todo apuntaba a China. Ahora China desaparece del plano y queda
 * Taiwán solo. La revelacion es analitica, no un truco visual: se marca de
 * forma explicita como interpretacion.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { TaiwanMap } from '../components/maps/TaiwanMap';
import { MapLabel } from '../components/maps/MapCanvas';
import { AnalysisTag, Headline } from '../components/Typography';
import { CaptionScrim, SceneShell, Vignette } from '../components/Chrome';
import { CAM_STRAIT, CAM_TAIWAN, lerpCamera, PLACES } from '../data/geography';
import { CONTENT_BOX, sec } from '../data/timing';
import { COLOR, TYPE } from '../theme';
import { at, easeInOutQuint, easeOutExpo, progress } from '../anim';

export const Scene07: React.FC = () => {
  const frame = useCurrentFrame();
  const total = sec(3.4);

  const camera = lerpCamera(
    CAM_STRAIT,
    CAM_TAIWAN,
    progress(frame, 0, total, easeInOutQuint)
  );

  // China se retira del plano: el mensaje deja de tener un solo destinatario.
  const chinaOpacity = at(frame, [4, 42], [1, 0], easeOutExpo);

  return (
    <SceneShell>
      <TaiwanMap
        camera={camera}
        chinaOpacity={chinaOpacity}
        taiwanOpacity={1}
        kinmenOpacity={at(frame, [4, 42], [1, 0.28])}
        outerIslandsOpacity={at(frame, [4, 42], [0.7, 0.35])}
        graticuleOpacity={at(frame, [0, 40], [0.6, 0.32])}
      >
        {(projection) => (
          <>
            <MapLabel
              projection={projection}
              position={PLACES.chinaWide.position}
              color={COLOR.muted}
              opacity={chinaOpacity * 0.85}
              size={TYPE.title}
              anchor="start"
              weight={700}
            >
              CHINA
            </MapLabel>
            <MapLabel
              projection={projection}
              position={PLACES.taiwan.position}
              color={COLOR.blueGrayBright}
              opacity={at(frame, [30, 56], [0, 1])}
              size={TYPE.headline}
              anchor="middle"
              weight={800}
            >
              TAIWÁN
            </MapLabel>
          </>
        )}
      </TaiwanMap>

      <Vignette strength={0.6} />
      <CaptionScrim />

      <AbsoluteFill
        style={{
          padding: `${CONTENT_BOX.top}px ${CONTENT_BOX.left}px`,
          pointerEvents: 'none',
        }}
      >
        <Headline
          frame={frame}
          start={10}
          size={TYPE.hero}
          weight={800}
          color={COLOR.white}
        >
          PERO...
        </Headline>

        <div style={{ marginTop: 30, maxWidth: CONTENT_BOX.width * 0.94 }}>
          <Headline
            frame={frame}
            start={48}
            size={54}
            weight={700}
            color={COLOR.blueGrayBright}
            lineHeight={1.14}
          >
            ¿Y SI EL MENSAJE
            <br />
            NO ES SOLO
            <br />
            PARA BEIJING?
          </Headline>
        </div>

        <div style={{ marginTop: 28 }}>
          <AnalysisTag frame={frame} start={76} />
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};
