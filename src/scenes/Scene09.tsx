/**
 * ESCENA 9 · 0:41.6 - 0:51.6
 * Pantalla dividida: el Estrecho a la izquierda, el Parlamento a la derecha.
 *
 * El lado parlamentario gana espacio progresivamente. El cambio de proporcion
 * ES el cambio de tesis: la pregunta militar no desaparece, pero deja de ser
 * la unica.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { MapCanvas, Landmass, MapLabel } from '../components/maps/MapCanvas';
import { ParliamentDiagram } from '../components/ParliamentDiagram';
import { Headline } from '../components/Typography';
import { SceneShell, Vignette } from '../components/Chrome';
import { CAM_STRAIT_PANEL, PLACES } from '../data/geography';
import { CONTENT_BOX, HEIGHT, sec, WIDTH } from '../data/timing';
import { COLOR, FONT, STROKE, TRACKING, TYPE } from '../theme';
import { at, easeInOutCubic, easeOutExpo } from '../anim';

const PANEL_TOP = 236;
const PANEL_BOTTOM = 1345;
const PANEL_HEIGHT = PANEL_BOTTOM - PANEL_TOP;

export const Scene09: React.FC = () => {
  const frame = useCurrentFrame();
  const total = sec(10.0);

  // El titular de transicion cede paso al split.
  const introOut = at(frame, [34, 58], [1, 0]);
  const splitIn = at(frame, [38, 74], [0, 1], easeOutExpo);

  // La mitad derecha crece: de reparto igual a predominio parlamentario.
  const shift = at(frame, [168, 262], [0, 1], easeInOutCubic);
  const leftWidth = Math.round(540 - 176 * shift);
  const rightWidth = WIDTH - leftWidth;
  // Los lienzos interiores siguen al panel, de modo que ni el mapa ni el
  // hemiciclo queden cortados por el separador.
  const leftInner = leftWidth;
  const rightInner = rightWidth;
  const hemiOuter = Math.min(250, rightInner * 0.4);

  const leftQuestion = at(frame, [78, 104], [0, 1]);
  const rightQuestion = at(frame, [182, 212], [0, 1]);

  return (
    <SceneShell>
      {/* --- Titular de transicion --- */}
      <AbsoluteFill
        style={{
          padding: `${CONTENT_BOX.top}px ${CONTENT_BOX.left}px`,
          opacity: introOut,
          pointerEvents: 'none',
        }}
      >
        <Headline frame={frame} start={2} size={TYPE.display} weight={800} color={COLOR.white}>
          Y ESO CAMBIA
          <br />
          LA HISTORIA
        </Headline>
      </AbsoluteFill>

      <AbsoluteFill style={{ opacity: splitIn }}>
        {/* ---------------- IZQUIERDA · el Estrecho ---------------- */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: PANEL_TOP,
            width: leftWidth,
            height: PANEL_HEIGHT,
            overflow: 'hidden',
          }}
        >
          {/* El lienzo adopta el ancho real del panel: al estrecharse, el
              mapa se reencuadra en vez de recortarse. */}
          <div style={{ position: 'absolute', left: 0, top: 0, width: leftInner }}>
            <MapCanvas
              camera={CAM_STRAIT_PANEL}
              width={leftInner}
              height={PANEL_HEIGHT}
              graticuleStep={1}
              graticuleOpacity={0.5}
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
                    position={PLACES.taiwan.position}
                    color={COLOR.text}
                    size={24}
                    anchor="middle"
                    opacity={0.9}
                    weight={700}
                  >
                    TAIWÁN
                  </MapLabel>
                  <MapLabel
                    projection={projection}
                    position={[119.62, 25.15]}
                    color={COLOR.faint}
                    size={17}
                    anchor="middle"
                    opacity={0.85}
                    weight={600}
                  >
                    ESTRECHO
                  </MapLabel>
                </>
              )}
            </MapCanvas>
          </div>

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to bottom, rgba(7,9,12,0) 40%, rgba(7,9,12,0.93) 78%)',
            }}
          />

          <div
            style={{
              position: 'absolute',
              left: 38,
              bottom: 46,
              width: Math.max(180, leftWidth - 76),
              opacity: leftQuestion,
              fontFamily: FONT.sans,
              fontSize: 38,
              fontWeight: 700,
              lineHeight: 1.16,
              letterSpacing: TRACKING.tight,
              color: COLOR.text,
            }}
          >
            ¿PUEDE
            <br />
            RESISTIR
            <br />
            UN ATAQUE?
          </div>
        </div>

        {/* ---------------- DERECHA · el Parlamento ---------------- */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: PANEL_TOP,
            width: rightWidth,
            height: PANEL_HEIGHT,
            overflow: 'hidden',
            background: COLOR.bgLift,
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: rightInner,
              height: PANEL_HEIGHT,
            }}
          >
            <svg width={rightInner} height={PANEL_HEIGHT}>
              <ParliamentDiagram
                cx={rightInner / 2}
                cy={PANEL_HEIGHT * 0.42}
                innerRadius={hemiOuter * 0.36}
                outerRadius={hemiOuter}
                rows={6}
                seatRadius={8}
                morph={1}
                color={COLOR.civic}
                dimColor={COLOR.civicDim}
                opacity={at(frame, [70, 110], [0, 1])}
              />
            </svg>
          </div>

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to bottom, rgba(11,15,20,0) 40%, rgba(11,15,20,0.94) 78%)',
            }}
          />

          <div
            style={{
              position: 'absolute',
              right: 38,
              bottom: 46,
              width: Math.max(200, rightWidth - 76),
              opacity: rightQuestion,
              textAlign: 'right',
              fontFamily: FONT.sans,
              fontSize: 38,
              fontWeight: 800,
              lineHeight: 1.16,
              letterSpacing: TRACKING.tight,
              color: COLOR.white,
            }}
          >
            ¿PUEDE
            <br />
            PAGAR LA
            <br />
            DISUASIÓN?
          </div>
        </div>

        {/* Separador que se desplaza con el reparto. */}
        <div
          style={{
            position: 'absolute',
            left: leftWidth - 1,
            top: PANEL_TOP,
            width: 2,
            height: PANEL_HEIGHT,
            background: COLOR.carbonLine,
          }}
        />
      </AbsoluteFill>

      <Vignette strength={0.42} />
    </SceneShell>
  );
};
