/**
 * ESCENA 5 · 0:23.9 - 0:27.2
 * "1958" se transforma en "2026" y vuelve el lenguaje grafico contemporaneo.
 *
 * No se muestra retrato del presidente: solo texto, mapa y un marcador
 * institucional abstracto. "PAZ MEDIANTE FORTALEZA" se presenta como sintesis
 * del argumento de Lai, no como verdad objetiva.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { KinmenMap } from '../components/maps/KinmenMap';
import { MapMarker } from '../components/maps/MapCanvas';
import { DataLabel, Headline } from '../components/Typography';
import { CaptionScrim, SceneShell, Vignette } from '../components/Chrome';
import { InstitutionMark } from '../components/Icons';
import { CAM_KINMEN, POINTS } from '../data/geography';
import { STORY_DATA } from '../data/story';
import { CONTENT_BOX, sec } from '../data/timing';
import { COLOR, FONT, TRACKING, TYPE } from '../theme';
import { at, easeOutExpo } from '../anim';

/** Transformacion cifra a cifra de 1958 a 2026. */
const YearMorph: React.FC<{ frame: number; start: number; size?: number }> = ({
  frame,
  start,
  size = 118,
}) => {
  const from = '1958';
  const to = '2026';
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {from.split('').map((digit, i) => {
        const s = start + i * 4;
        const p = at(frame, [s, s + 18], [0, 1], easeOutExpo);
        const changed = digit !== to[i];
        return (
          <div
            key={i}
            style={{
              position: 'relative',
              width: size * 0.58,
              height: size * 1.12,
              overflow: 'hidden',
            }}
          >
            {/* Cifra de 1958 saliendo */}
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONT.mono,
                fontSize: size,
                fontWeight: 600,
                color: COLOR.warm,
                transform: `translateY(${-p * 100}%)`,
                opacity: changed ? 1 - p : 1,
              }}
            >
              {digit}
            </span>
            {/* Cifra de 2026 entrando */}
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONT.mono,
                fontSize: size,
                fontWeight: 600,
                color: COLOR.white,
                transform: `translateY(${(1 - p) * 100}%)`,
                opacity: changed ? p : p,
              }}
            >
              {to[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const Scene05: React.FC = () => {
  const frame = useCurrentFrame();
  const total = sec(3.3);

  // Recuperacion inmediata del registro contemporaneo.
  const modernIn = at(frame, [6, 34], [0, 1]);

  return (
    <SceneShell>
      <AbsoluteFill style={{ opacity: modernIn }}>
        <KinmenMap
          camera={CAM_KINMEN}
          chinaProgress={0.85}
          kinmenProgress={1}
          graticuleOpacity={0.6}
          graticuleStep={0.25}
        >
          {(projection) => (
            <MapMarker
              projection={projection}
              position={POINTS.kinmenCentroid}
              radius={16}
              color={COLOR.blueGrayBright}
              scale={at(frame, [40, 62], [0, 1])}
              crosshair
            />
          )}
        </KinmenMap>
      </AbsoluteFill>

      <Vignette strength={0.66} />
      <CaptionScrim />

      <AbsoluteFill
        style={{
          padding: `${CONTENT_BOX.top}px ${CONTENT_BOX.left}px`,
          pointerEvents: 'none',
        }}
      >
        <YearMorph frame={frame} start={2} />

        <div style={{ marginTop: 16, opacity: at(frame, [22, 40], [0, 1]) }}>
          <DataLabel size={TYPE.micro} color={COLOR.blueGray}>
            {STORY_DATA.visitDateLabel} · {STORY_DATA.anniversaryYears} años después
          </DataLabel>
        </div>

        <div style={{ marginTop: 30 }}>
          <Headline
            frame={frame}
            start={40}
            size={TYPE.title}
            weight={800}
            color={COLOR.white}
          >
            LAI VUELVE
            <br />A KINMEN
          </Headline>
        </div>

        {/* Marcador institucional abstracto: sin retratos ni banderas. */}
        <div
          style={{
            marginTop: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            opacity: at(frame, [66, 86], [0, 1]),
          }}
        >
          <InstitutionMark size={54} color={COLOR.blueGray} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span
              style={{
                fontFamily: FONT.sans,
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: TRACKING.wide,
                color: COLOR.blueGrayBright,
              }}
            >
              «PAZ MEDIANTE FORTALEZA»
            </span>
            <DataLabel size={TYPE.tiny} color={COLOR.faint}>
              Síntesis de su argumento
            </DataLabel>
          </div>
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};
