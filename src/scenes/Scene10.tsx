/**
 * ESCENA 10 · 0:51.6 - 1:00.0
 * Cierre. Una linea nace en el hemiciclo y se convierte sucesivamente en
 * PRESUPUESTO -> CAPACIDAD -> DISUASIÓN, hasta alcanzar el mapa del Estrecho.
 *
 * La sorpresa queda explicada antes del final: la cadena muestra POR QUE la
 * decision parlamentaria precede a la capacidad militar.
 *
 * El relevo entre la cadena y el titular de cierre es secuencial, nunca un
 * fundido cruzado: dos capas superpuestas a media opacidad serian ilegibles.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { MapCanvas, Landmass, MapLabel } from '../components/maps/MapCanvas';
import { ParliamentDiagram } from '../components/ParliamentDiagram';
import { SceneShell, Vignette } from '../components/Chrome';
import { DataLabel } from '../components/Typography';
import { CAM_STRAIT_INSET, PLACES } from '../data/geography';
import { STORY_DATA } from '../data/story';
import { CONTENT_BOX, HEIGHT, sec, WIDTH } from '../data/timing';
import { COLOR, FONT, STROKE, TRACKING, TYPE } from '../theme';
import { at, easeOutExpo, easeInOutCubic } from '../anim';

const CX = WIDTH / 2;

const HEMI_CY = 306;
const LINE_TOP = 396;
const INSET = { x: 280, y: 1000, w: 520, h: 372 };

/** Eslabon de la cadena causal. */
const ChainNode: React.FC<{
  y: number;
  label: string;
  frame: number;
  start: number;
}> = ({ y, label, frame, start }) => {
  const p = at(frame, [start, start + 18], [0, 1], easeOutExpo);
  return (
    <g opacity={p} transform={`translate(${CX} ${y + (1 - p) * 14})`}>
      <rect
        x={-232}
        y={-32}
        width={464}
        height={64}
        fill={COLOR.panel}
        stroke={COLOR.blueGray}
        strokeWidth={2}
      />
      <text
        x={0}
        y={11}
        textAnchor="middle"
        fill={COLOR.blueGrayBright}
        fontFamily={FONT.sans}
        fontSize={34}
        fontWeight={800}
        letterSpacing={TRACKING.wide}
      >
        {label}
      </text>
    </g>
  );
};

export const Scene10: React.FC = () => {
  const frame = useCurrentFrame();
  const total = sec(8.4);

  // Relevo limpio: la cadena sale del todo antes de que entre el titular.
  const chainOut = at(frame, [158, 176], [1, 0]);
  const closingIn = at(frame, [178, 196], [0, 1], easeOutExpo);
  const cardIn = at(frame, [234, 240], [0, 1]);

  const nodes = [
    { y: 530, label: 'PRESUPUESTO', start: 16 },
    { y: 700, label: 'CAPACIDAD', start: 44 },
    { y: 870, label: 'DISUASIÓN', start: 72 },
  ];

  // La linea desciende de forma continua del Parlamento al Estrecho.
  const lineProgress = at(frame, [6, 120], [0, 1], easeInOutCubic);
  const lineY = LINE_TOP + (INSET.y - LINE_TOP) * lineProgress;

  return (
    <SceneShell>
      {/* ---------------- FASE A · cadena causal ---------------- */}
      <AbsoluteFill style={{ opacity: chainOut }}>
        {/* Recuadro del Estrecho: destino de la cadena. */}
        <div
          style={{
            position: 'absolute',
            left: INSET.x,
            top: INSET.y,
            width: INSET.w,
            height: INSET.h,
            overflow: 'hidden',
            border: `2px solid ${COLOR.carbonLine}`,
            opacity: at(frame, [96, 128], [0, 1]),
          }}
        >
          <MapCanvas
            camera={CAM_STRAIT_INSET}
            width={INSET.w}
            height={INSET.h}
            graticuleStep={1}
            graticuleOpacity={0.45}
          >
            {(projection, palette) => (
              <>
                <Landmass
                  projection={projection}
                  layer="chinaWide"
                  fill={palette.prcFill}
                  stroke={palette.prcEdge}
                  strokeWidth={STROKE.hairline}
                />
                <Landmass
                  projection={projection}
                  layer="taiwanMain"
                  fill={palette.twFill}
                  stroke={palette.twEdge}
                  strokeWidth={STROKE.thin}
                />
                <Landmass
                  projection={projection}
                  layer="kinmen"
                  fill={palette.twFill}
                  stroke={palette.twEdge}
                  strokeWidth={STROKE.hairline}
                />
                <MapLabel
                  projection={projection}
                  position={PLACES.strait.position}
                  color={COLOR.muted}
                  size={19}
                  anchor="middle"
                  opacity={at(frame, [116, 140], [0, 0.9])}
                  weight={600}
                >
                  ESTRECHO
                </MapLabel>
              </>
            )}
          </MapCanvas>
        </div>

        <svg width={WIDTH} height={HEIGHT} style={{ position: 'absolute', inset: 0 }}>
          <ParliamentDiagram
            cx={CX}
            cy={HEMI_CY}
            innerRadius={56}
            outerRadius={148}
            rows={5}
            seatRadius={5.5}
            morph={1}
            color={COLOR.civic}
            dimColor={COLOR.civicDim}
            opacity={at(frame, [0, 22], [0, 1])}
          />

          {/* Linea continua: del Parlamento al Estrecho */}
          <line
            x1={CX}
            y1={LINE_TOP}
            x2={CX}
            y2={lineY}
            stroke={COLOR.blueGray}
            strokeWidth={2.5}
          />
          <circle cx={CX} cy={lineY} r={5} fill={COLOR.blueGrayBright} />

          {nodes.map((node) => (
            <ChainNode
              key={node.label}
              y={node.y}
              label={node.label}
              frame={frame}
              start={node.start}
            />
          ))}
        </svg>

        <div
          style={{
            position: 'absolute',
            left: CONTENT_BOX.left,
            top: CONTENT_BOX.top,
            opacity: at(frame, [2, 22], [0, 1]),
          }}
        >
          <DataLabel size={TYPE.micro} color={COLOR.civic}>
            Parlamento
          </DataLabel>
        </div>
      </AbsoluteFill>

      {/* ---------------- FASE B · titular de cierre ---------------- */}
      <AbsoluteFill
        style={{
          opacity: closingIn,
          padding: `0 ${CONTENT_BOX.left}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {[
          { text: 'LA PRIMERA BATALLA', start: 178, color: COLOR.muted, size: 52 },
          { text: 'PODRÍA SER POLÍTICA', start: 194, color: COLOR.white, size: 68 },
          { text: 'ANTES QUE MILITAR', start: 210, color: COLOR.white, size: 68 },
        ].map((line) => {
          const p = at(frame, [line.start, line.start + 18], [0, 1], easeOutExpo);
          return (
            <div key={line.text} style={{ overflow: 'hidden', marginBottom: 12 }}>
              <div
                style={{
                  fontFamily: FONT.sans,
                  fontSize: line.size,
                  fontWeight: 800,
                  letterSpacing: TRACKING.tight,
                  lineHeight: 1.1,
                  color: line.color,
                  transform: `translateY(${(1 - p) * 100}%)`,
                  opacity: p,
                }}
              >
                {line.text}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>

      {/* ---------------- FASE C · cartela final (~0.4 s) ---------------- */}
      <AbsoluteFill
        style={{
          opacity: cardIn,
          background: COLOR.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div style={{ width: 62, height: 3, background: COLOR.blueGray }} />
          <span
            style={{
              fontFamily: FONT.sans,
              fontSize: 46,
              fontWeight: 800,
              letterSpacing: TRACKING.wider,
              color: COLOR.white,
            }}
          >
            TAIWÁN · {STORY_DATA.visitDateLabel}
          </span>
        </div>
      </AbsoluteFill>

      <Vignette strength={0.45} />
    </SceneShell>
  );
};
