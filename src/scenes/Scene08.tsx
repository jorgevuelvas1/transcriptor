/**
 * ESCENA 8 · 0:36.2 - 0:41.6
 * El mapa de Taiwán se transforma en un hemiciclo abstracto y aparece el
 * circuito presupuestario.
 *
 * El caudal que entra es mayor que el que sale: en mayo de 2026 se aprobo
 * aproximadamente dos tercios de una solicitud adicional y quedaron fuera
 * algunos programas, entre ellos componentes de drones.
 *
 * El diagrama describe un PROCEDIMIENTO. No insinua traicion, ni apoyo a
 * China, ni bloqueo total del presupuesto.
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { TaiwanMap } from '../components/maps/TaiwanMap';
import { ParliamentDiagram } from '../components/ParliamentDiagram';
import { FlowBranch, FlowChannel } from '../components/BudgetFlow';
import { CaptionScrim, SceneShell, Vignette } from '../components/Chrome';
import { DataLabel } from '../components/Typography';
import {
  CAM_TAIWAN,
  makeProjection,
  samplePointsInLayer,
} from '../data/geography';
import { LABELS, STORY_DATA } from '../data/story';
import { CONTENT_BOX, HEIGHT, sec, WIDTH } from '../data/timing';
import { COLOR, FONT, TRACKING, TYPE } from '../theme';
import { at, easeOutExpo } from '../anim';
import { SEAT_COUNT } from '../components/ParliamentDiagram';

const HEMI_CX = WIDTH / 2;
const HEMI_CY = 620;

const CHANNEL_TOP = 760;
const CHANNEL_BOTTOM = 1180;
const CHANNEL_WIDTH = 300;

export const Scene08: React.FC = () => {
  const frame = useCurrentFrame();
  const total = sec(5.4);

  // Puntos REALES del territorio de Taiwán, proyectados a pixeles: son el
  // origen de la transformacion en hemiciclo.
  const origins = useMemo(() => {
    const projection = makeProjection(CAM_TAIWAN, WIDTH, HEIGHT);
    return samplePointsInLayer('taiwanMain', SEAT_COUNT, 20260823).map((p) => {
      const xy = projection(p);
      return (xy ? [xy[0], xy[1]] : [HEMI_CX, HEMI_CY]) as [number, number];
    });
  }, []);

  const morph = at(frame, [6, 62], [0, 1]);
  const mapFade = at(frame, [0, 34], [0.55, 0]);
  const channelFill = at(frame, [66, 116], [0, 1], easeOutExpo);
  const branch = at(frame, [96, 128], [0, 1], easeOutExpo);

  // El caudal de salida es la fraccion realmente aprobada.
  const approved = STORY_DATA.previousAdditionalPackageApprovedApprox;

  return (
    <SceneShell>
      {/* El mapa se desvanece mientras el territorio se reordena en camara. */}
      <AbsoluteFill style={{ opacity: mapFade }}>
        <TaiwanMap
          camera={CAM_TAIWAN}
          chinaOpacity={0}
          kinmenOpacity={0.3}
          outerIslandsOpacity={0.25}
          graticuleOpacity={0.28}
        />
      </AbsoluteFill>

      <svg width={WIDTH} height={HEIGHT} style={{ position: 'absolute', inset: 0 }}>
        {/* --- Hemiciclo abstracto: formas geometricas, sin politicos --- */}
        <ParliamentDiagram
          cx={HEMI_CX}
          cy={HEMI_CY}
          innerRadius={112}
          outerRadius={286}
          rows={6}
          seatRadius={9}
          morph={morph}
          origins={origins}
          color={COLOR.blueGray}
          dimColor={COLOR.blueGrayDim}
        />

        {/* --- Circuito presupuestario --- */}
        <g opacity={at(frame, [60, 78], [0, 1])}>
          <FlowChannel
            x={HEMI_CX}
            y0={CHANNEL_TOP}
            y1={CHANNEL_BOTTOM}
            width={CHANNEL_WIDTH}
            fill={channelFill}
            widthRatio={approved}
            color={COLOR.blueGray}
            trackColor={COLOR.carbon}
          />

          {/* Programa que se separa del caudal (componentes de drones). */}
          <FlowBranch
            x={HEMI_CX + CHANNEL_WIDTH * 0.34}
            y={CHANNEL_TOP + (CHANNEL_BOTTOM - CHANNEL_TOP) * 0.62}
            toX={HEMI_CX + 250}
            toY={CHANNEL_TOP + (CHANNEL_BOTTOM - CHANNEL_TOP) * 0.44}
            label="DRONES"
            progress={branch}
            color={COLOR.faint}
          />
        </g>
      </svg>

      <Vignette strength={0.5} />
      <CaptionScrim opacity={0.75} />

      {/* --- Rotulacion --- */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            left: CONTENT_BOX.left,
            top: CONTENT_BOX.top,
            opacity: at(frame, [40, 60], [0, 1]),
          }}
        >
          <DataLabel size={TYPE.micro} color={COLOR.blueGray}>
            Parlamento de Taiwán
          </DataLabel>
          <div
            style={{
              marginTop: 10,
              fontFamily: FONT.sans,
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: TRACKING.tight,
              color: COLOR.white,
            }}
          >
            CONTROLADO POR LA OPOSICIÓN
          </div>
        </div>

        {/* Entrada del circuito */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: WIDTH,
            top: CHANNEL_TOP - 52,
            textAlign: 'center',
            opacity: at(frame, [62, 80], [0, 1]),
          }}
        >
          <DataLabel size={TYPE.micro} color={COLOR.muted}>
            Gobierno · solicita presupuesto
          </DataLabel>
        </div>

        {/* Salida del circuito */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: WIDTH,
            top: CHANNEL_BOTTOM + 22,
            textAlign: 'center',
            opacity: at(frame, [104, 124], [0, 1]),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 52,
              fontWeight: 600,
              letterSpacing: TRACKING.tight,
              color: COLOR.white,
            }}
          >
            {LABELS.approvedShareExact}
          </span>
          <DataLabel size={TYPE.tiny} color={COLOR.faint}>
            {LABELS.additionalPackage}
          </DataLabel>
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};
