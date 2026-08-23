/**
 * ESCENA 2 · 0:07.2 - 0:09.8
 * Alejamiento: aparecen la costa china, Kinmen y Taiwán en el mismo plano.
 * Kinmen debe verse diminuta; su tamano no se exagera, se marca su posicion.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { TaiwanMap } from '../components/maps/TaiwanMap';
import { MapLabel, MapMarker } from '../components/maps/MapCanvas';
import { DataLabel, Kicker } from '../components/Typography';
import { CaptionScrim, SceneShell, Vignette } from '../components/Chrome';
import {
  CAM_KINMEN_GAP,
  CAM_STRAIT,
  lerpCamera,
  PLACES,
  POINTS,
} from '../data/geography';
import { CONTENT_BOX, sec } from '../data/timing';
import { COLOR, FONT, TRACKING, TYPE } from '../theme';
import { at, easeInOutQuint, progress } from '../anim';

export const Scene02: React.FC = () => {
  const frame = useCurrentFrame();
  const total = sec(2.6);

  // Retroceso continuo desde el plano corto anterior hasta el Estrecho entero.
  const camera = lerpCamera(
    CAM_KINMEN_GAP,
    CAM_STRAIT,
    progress(frame, 0, total, easeInOutQuint)
  );

  const zoomOut = progress(frame, 0, total, easeInOutQuint);
  // El marcador aparece cuando Kinmen ya es demasiado pequena para leerse.
  const markerScale = at(frame, [22, 46], [0, 1]);
  const taiwanLabel = at(frame, [30, 52], [0, 1]);

  return (
    <SceneShell>
      <TaiwanMap
        camera={camera}
        graticuleStep={1}
        graticuleOpacity={at(frame, [0, 30], [0.9, 0.55])}
        outerIslandsOpacity={at(frame, [24, 60], [0, 0.7])}
      >
        {(projection, palette) => (
          <>
            {/* Marcador sobre la posicion REAL de Kinmen, sin alterar su tamano. */}
            <MapMarker
              projection={projection}
              position={POINTS.kinmenCentroid}
              radius={17}
              color={COLOR.alertBright}
              scale={markerScale}
              crosshair
            />

            <MapLabel
              projection={projection}
              position={POINTS.kinmenCentroid}
              color={COLOR.white}
              opacity={markerScale}
              size={TYPE.label}
              anchor="end"
              dx={-46}
              dy={9}
              weight={800}
            >
              KINMEN
            </MapLabel>

            <MapLabel
              projection={projection}
              position={PLACES.chinaWide.position}
              color={palette.labelDim}
              opacity={at(frame, [16, 40], [0, 0.85])}
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
              opacity={taiwanLabel}
              size={TYPE.headline}
              anchor="middle"
              weight={800}
            >
              TAIWÁN
            </MapLabel>
          </>
        )}
      </TaiwanMap>

      <Vignette strength={0.55} />
      <CaptionScrim />

      <AbsoluteFill style={{ padding: `${CONTENT_BOX.top}px ${CONTENT_BOX.left}px` }}>
        <Kicker frame={frame} start={2} color={COLOR.blueGray}>
          Kinmen
        </Kicker>

        <div
          style={{
            marginTop: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {[
            { text: 'CONTROLADA POR TAIWÁN', start: 10, color: COLOR.white },
            { text: 'A LAS PUERTAS DE CHINA', start: 34, color: COLOR.alertBright },
          ].map((line) => {
            const p = at(frame, [line.start, line.start + 16], [0, 1]);
            return (
              <div
                key={line.text}
                style={{
                  fontFamily: FONT.sans,
                  fontSize: TYPE.headline,
                  fontWeight: 800,
                  letterSpacing: TRACKING.tight,
                  color: line.color,
                  opacity: p,
                  transform: `translateX(${(1 - p) * -18}px)`,
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20, opacity: at(frame, [44, 62], [0, 0.85]) }}>
          <DataLabel size={TYPE.tiny} color={COLOR.faint}>
            Escala real · sin exageración de tamaño
          </DataLabel>
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};
