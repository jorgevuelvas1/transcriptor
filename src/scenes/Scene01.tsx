/**
 * ESCENA 1 · 0:00 - 0:07.2
 * Pantalla oscura -> costa de Fujian -> Kinmen -> cota "< 2 KM" -> "¿POR QUÉ AQUÍ?"
 *
 * Todavia NO se muestra Taiwán completo: la intriga nace de la escala.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { KinmenMap } from '../components/maps/KinmenMap';
import { DistanceLine, MapLabel } from '../components/maps/MapCanvas';
import { Headline, Kicker } from '../components/Typography';
import { CaptionScrim, SceneShell, Vignette } from '../components/Chrome';
import {
  CAM_KINMEN_GAP,
  CAM_KINMEN_WIDE,
  lerpCamera,
  PLACES,
  POINTS,
} from '../data/geography';
import { STORY_DATA } from '../data/story';
import { CONTENT_BOX, sec } from '../data/timing';
import { COLOR, TYPE } from '../theme';
import { at, easeInOutQuint, easeOutExpo, progress } from '../anim';

export const Scene01: React.FC = () => {
  const frame = useCurrentFrame();
  const total = sec(7.2);

  // Aproximacion lenta y continua: el plano nunca se queda quieto.
  const camera = lerpCamera(
    CAM_KINMEN_WIDE,
    CAM_KINMEN_GAP,
    progress(frame, 0, total, easeInOutQuint)
  );

  const chinaProgress = at(frame, [6, 48], [0, 1]);
  const kinmenProgress = at(frame, [40, 76], [0, 1]);
  const chinaLabel = at(frame, [54, 72], [0, 1]);
  const kinmenLabel = at(frame, [78, 96], [0, 1]);
  const lineProgress = at(frame, [104, 142], [0, 1], easeOutExpo);
  const distanceLabel = at(frame, [138, 156], [0, 1]);

  // Apertura desde negro absoluto.
  const openFromBlack = at(frame, [0, 20], [0, 1]);

  return (
    <SceneShell>
      <AbsoluteFill style={{ opacity: openFromBlack }}>
        <KinmenMap
          camera={camera}
          chinaProgress={chinaProgress}
          kinmenProgress={kinmenProgress}
          graticuleOpacity={at(frame, [12, 60], [0, 0.9])}
          graticuleStep={0.25}
        >
          {(projection, palette) => (
            <>
              <MapLabel
                projection={projection}
                position={PLACES.chinaClose.position}
                color={palette.labelDim}
                opacity={chinaLabel}
                size={TYPE.headline}
                anchor="start"
                weight={700}
              >
                {PLACES.chinaClose.label}
              </MapLabel>

              <MapLabel
                projection={projection}
                position={PLACES.xiamen.position}
                color={palette.labelDim}
                opacity={at(frame, [64, 84], [0, 0.75])}
                size={TYPE.micro}
                anchor="end"
                dx={-14}
                weight={500}
              >
                {PLACES.xiamen.label}
              </MapLabel>

              <MapLabel
                projection={projection}
                position={PLACES.kinmen.position}
                color={COLOR.white}
                opacity={kinmenLabel}
                size={TYPE.headline}
                anchor="start"
                dx={26}
                dy={54}
                weight={800}
                leader
              >
                {PLACES.kinmen.label}
              </MapLabel>

              {/* Cota entre los dos puntos mas proximos de la geometria real. */}
              {lineProgress > 0 ? (
                <DistanceLine
                  projection={projection}
                  from={POINTS.nearestKinmenPoint}
                  to={POINTS.nearestPrcPoint}
                  label={STORY_DATA.kinmenDistanceLabel}
                  color={COLOR.alertBright}
                  progress={lineProgress}
                  labelOpacity={distanceLabel}
                  labelSize={TYPE.label}
                  labelOffset={64}
                />
              ) : null}
            </>
          )}
        </KinmenMap>
      </AbsoluteFill>

      <Vignette strength={0.6} />
      <CaptionScrim />

      {/* --- Rotulacion editorial --- */}
      <AbsoluteFill style={{ padding: `${CONTENT_BOX.top}px ${CONTENT_BOX.left}px` }}>
        <Kicker frame={frame} start={18} color={COLOR.blueGray}>
          Estrecho de Taiwán
        </Kicker>

        <div style={{ marginTop: 26 }}>
          <Headline
            frame={frame}
            start={170}
            size={TYPE.hero}
            weight={800}
            color={COLOR.white}
          >
            ¿POR QUÉ AQUÍ?
          </Headline>
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};
