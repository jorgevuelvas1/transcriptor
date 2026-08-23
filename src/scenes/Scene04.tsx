/**
 * ESCENA 4 · 0:15.8 - 0:23.9
 * Estados Unidos entra como tercer elemento estrategico, mediante un vinculo
 * esquematico (nada de banderas gigantes).
 *
 * Idea que debe quedar: un territorio puede ser dificil de defender
 * militarmente y, a la vez, demasiado importante politicamente para
 * abandonarlo.
 *
 * AVISO EDITORIAL: la valoracion de vulnerabilidad es de 1958. Se rotula de
 * forma explicita para no presentarla como posicion actual de EE.UU.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { SceneShell, Vignette } from '../components/Chrome';
import { PaperTexture } from '../components/HistoricalMap';
import { DataLabel } from '../components/Typography';
import { CONTENT_BOX, HEIGHT, sec, WIDTH } from '../data/timing';
import { COLOR, FONT, TRACKING, TYPE } from '../theme';
import { at, easeOutCubic, easeOutExpo, pulse } from '../anim';

const CX = WIDTH / 2;

/** Nodo del esquema de vinculos. */
const Node: React.FC<{
  x: number;
  y: number;
  label: string;
  frame: number;
  start: number;
  emphasis?: boolean;
  width?: number;
}> = ({ x, y, label, frame, start, emphasis = false, width = 300 }) => {
  const p = at(frame, [start, start + 16], [0, 1], easeOutExpo);
  return (
    <g opacity={p} transform={`translate(${x} ${y + (1 - p) * 12})`}>
      <rect
        x={-width / 2}
        y={-38}
        width={width}
        height={76}
        fill={emphasis ? 'rgba(44,37,25,0.9)' : 'rgba(24,21,15,0.86)'}
        stroke={emphasis ? COLOR.warm : COLOR.warmDim}
        strokeWidth={emphasis ? 2.4 : 1.6}
      />
      <text
        x={0}
        y={10}
        textAnchor="middle"
        fill={emphasis ? COLOR.warmBright : COLOR.warm}
        fontFamily={FONT.sans}
        fontSize={emphasis ? TYPE.label : 27}
        fontWeight={emphasis ? 800 : 600}
        letterSpacing={TRACKING.wide}
      >
        {label}
      </text>
    </g>
  );
};

/** Flecha esquematica horizontal. */
const Link: React.FC<{
  x0: number;
  x1: number;
  y: number;
  progress: number;
  color?: string;
  dashed?: boolean;
}> = ({ x0, x1, y, progress: p, color = COLOR.warmDim, dashed = false }) => {
  const t = Math.max(0, Math.min(1, p));
  const x = x0 + (x1 - x0) * t;
  const dir = Math.sign(x1 - x0);
  return (
    <g opacity={t > 0 ? 1 : 0}>
      <line
        x1={x0}
        y1={y}
        x2={x}
        y2={y}
        stroke={color}
        strokeWidth={2}
        strokeDasharray={dashed ? '8 6' : undefined}
      />
      {t > 0.9 ? (
        <path
          d={`M ${x1 - dir * 14} ${y - 9} L ${x1} ${y} L ${x1 - dir * 14} ${y + 9}`}
          fill="none"
          stroke={color}
          strokeWidth={2}
        />
      ) : null}
    </g>
  );
};

/**
 * Visualizacion de tension: dos fuerzas opuestas actuando sobre el mismo
 * territorio. No es un grafico de datos, es un diagrama conceptual.
 */
const TensionBeam: React.FC<{ frame: number; start: number; y: number }> = ({
  frame,
  start,
  y,
}) => {
  const p = at(frame, [start, start + 26], [0, 1], easeOutExpo);
  const strain = at(frame, [start + 26, start + 70], [0, 1], easeOutCubic);
  // Vibracion muy leve: la tension no se resuelve.
  const jitter = strain * (pulse(frame, 26) - 0.5) * 3.4;
  const armLength = 300 * p;

  return (
    <g>
      {/* Barra central sometida a traccion */}
      <line
        x1={CX - armLength}
        y1={y + jitter}
        x2={CX + armLength}
        y2={y - jitter}
        stroke={COLOR.warm}
        strokeWidth={3}
      />
      <circle cx={CX} cy={y} r={9} fill={COLOR.warmBright} opacity={p} />

      {/* Fuerza izquierda: importancia politica */}
      <g opacity={strain}>
        <path
          d={`M ${CX - armLength} ${y + jitter} l -26 -11 m 26 11 l -26 11`}
          fill="none"
          stroke={COLOR.warmBright}
          strokeWidth={2.6}
        />
        <text
          x={CX - armLength + 6}
          y={y - 44}
          textAnchor="start"
          fill={COLOR.warmBright}
          fontFamily={FONT.sans}
          fontSize={26}
          fontWeight={700}
          letterSpacing={TRACKING.wide}
        >
          IMPORTANCIA
        </text>
        <text
          x={CX - armLength + 6}
          y={y - 14}
          textAnchor="start"
          fill={COLOR.warmBright}
          fontFamily={FONT.sans}
          fontSize={26}
          fontWeight={700}
          letterSpacing={TRACKING.wide}
        >
          POLÍTICA
        </text>
      </g>

      {/* Fuerza derecha: vulnerabilidad militar */}
      <g opacity={strain}>
        <path
          d={`M ${CX + armLength} ${y - jitter} l 26 -11 m -26 11 l 26 11`}
          fill="none"
          stroke={COLOR.alertBright}
          strokeWidth={2.6}
        />
        <text
          x={CX + armLength - 6}
          y={y + 48}
          textAnchor="end"
          fill={COLOR.alertBright}
          fontFamily={FONT.sans}
          fontSize={26}
          fontWeight={700}
          letterSpacing={TRACKING.wide}
        >
          VULNERABILIDAD
        </text>
        <text
          x={CX + armLength - 6}
          y={y + 78}
          textAnchor="end"
          fill={COLOR.alertBright}
          fontFamily={FONT.sans}
          fontSize={26}
          fontWeight={700}
          letterSpacing={TRACKING.wide}
        >
          MILITAR
        </text>
      </g>
    </g>
  );
};

export const Scene04: React.FC = () => {
  const frame = useCurrentFrame();
  const total = sec(8.1);

  const triadY = 450;
  const beamY = 880;

  return (
    <SceneShell background={COLOR.paper}>
      <PaperTexture opacity={0.06} offset={188} />

      <svg
        width={WIDTH}
        height={HEIGHT}
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Cuadricula documental de fondo */}
        <g opacity={at(frame, [0, 24], [0, 0.5])}>
          {Array.from({ length: 13 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={(WIDTH / 12) * i}
              y1={0}
              x2={(WIDTH / 12) * i}
              y2={HEIGHT}
              stroke="#241E14"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: 22 }, (_, i) => (
            <line
              key={`h${i}`}
              x1={0}
              y1={(HEIGHT / 21) * i}
              x2={WIDTH}
              y2={(HEIGHT / 21) * i}
              stroke="#241E14"
              strokeWidth={1}
            />
          ))}
        </g>

        {/* --- Triada esquematica: CHINA -> KINMEN <- APOYO DE EE.UU. --- */}
        <Node x={CX} y={triadY - 150} label="CHINA" frame={frame} start={8} width={280} />
        <g opacity={at(frame, [24, 40], [0, 1])}>
          <path
            d={`M ${CX - 13} ${triadY - 62} L ${CX} ${triadY - 48} L ${CX + 13} ${triadY - 62}`}
            fill="none"
            stroke={COLOR.warmDim}
            strokeWidth={2}
          />
          <line
            x1={CX}
            y1={triadY - 112}
            x2={CX}
            y2={triadY - 48}
            stroke={COLOR.warmDim}
            strokeWidth={2}
          />
        </g>

        <Node
          x={CX}
          y={triadY}
          label="KINMEN"
          frame={frame}
          start={34}
          emphasis
          width={330}
        />

        <Node
          x={CX + 250}
          y={triadY + 150}
          label="APOYO DE EE.UU."
          frame={frame}
          start={54}
          width={360}
        />
        <g opacity={at(frame, [58, 82], [0, 1])}>
          <path
            d={`M ${CX + 250} ${triadY + 112} L ${CX + 250} ${triadY + 40} L ${CX + 180} ${triadY + 40}`}
            fill="none"
            stroke={COLOR.warmDim}
            strokeWidth={2}
            strokeDasharray="8 6"
          />
          <path
            d={`M ${CX + 194} ${triadY + 31} L ${CX + 176} ${triadY + 40} L ${CX + 194} ${triadY + 49}`}
            fill="none"
            stroke={COLOR.warmDim}
            strokeWidth={2}
          />
        </g>

        {/* --- Tension: politica vs militar --- */}
        <TensionBeam frame={frame} start={104} y={beamY} />
      </svg>

      <Vignette strength={0.5} />

      <AbsoluteFill
        style={{
          padding: `${CONTENT_BOX.top}px ${CONTENT_BOX.left}px`,
          pointerEvents: 'none',
        }}
      >
        <div style={{ opacity: at(frame, [4, 22], [0, 1]) }}>
          <DataLabel size={TYPE.micro} color={COLOR.warm}>
            1958 · Crisis del Estrecho
          </DataLabel>
        </div>
      </AbsoluteFill>

      {/* Nota al pie: acota la valoracion a su epoca. */}
      <div
        style={{
          position: 'absolute',
          left: CONTENT_BOX.left,
          top: beamY + 178,
          width: CONTENT_BOX.width,
          opacity: at(frame, [150, 176], [0, 1]),
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: TYPE.micro,
            fontWeight: 600,
            letterSpacing: TRACKING.wider,
            color: COLOR.warm,
            textTransform: 'uppercase',
          }}
        >
          Debate interno en Washington · 1958
        </div>
        <div
          style={{
            fontFamily: FONT.sans,
            fontSize: TYPE.tiny,
            fontWeight: 500,
            letterSpacing: TRACKING.wide,
            color: COLOR.warmDim,
          }}
        >
          Valoración de aquel momento, no la posición actual de Estados Unidos.
        </div>
      </div>
    </SceneShell>
  );
};
