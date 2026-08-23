/**
 * Vista amplia del Estrecho: costa de China continental, Kinmen, Penghu,
 * Matsu y la isla de Taiwán. Sirve para las escenas de escala y de giro.
 */
import React from 'react';
import { STROKE } from '../../theme';
import {
  Landmass,
  MapCanvas,
  MAP_PALETTE,
  type MapMode,
  type Projection,
} from './MapCanvas';
import type { Camera } from '../../data/geography';

export const TaiwanMap: React.FC<{
  camera: Camera;
  mode?: MapMode;
  /** 0..1: presencia de China. Bajarlo a 0 "retira" a China del plano. */
  chinaOpacity?: number;
  taiwanOpacity?: number;
  kinmenOpacity?: number;
  outerIslandsOpacity?: number;
  graticuleOpacity?: number;
  graticuleStep?: number;
  /** Contorno progresivo de Taiwán (0..1). */
  taiwanDraw?: number;
  children?: (
    projection: Projection,
    palette: (typeof MAP_PALETTE)['modern']
  ) => React.ReactNode;
}> = ({
  camera,
  mode = 'modern',
  chinaOpacity = 1,
  taiwanOpacity = 1,
  kinmenOpacity = 1,
  outerIslandsOpacity = 0.75,
  graticuleOpacity = 0.7,
  graticuleStep = 1,
  taiwanDraw,
  children,
}) => (
  <MapCanvas
    camera={camera}
    mode={mode}
    graticuleStep={graticuleStep}
    graticuleOpacity={graticuleOpacity}
  >
    {(projection, palette) => (
      <>
        {chinaOpacity > 0 ? (
          <Landmass
            projection={projection}
            layer="chinaWide"
            fill={palette.prcFill}
            stroke={palette.prcEdge}
            strokeWidth={STROKE.thin}
            opacity={chinaOpacity}
          />
        ) : null}

        {outerIslandsOpacity > 0 ? (
          <>
            <Landmass
              projection={projection}
              layer="penghu"
              fill={palette.twFill}
              stroke={palette.twEdge}
              strokeWidth={STROKE.hairline}
              opacity={outerIslandsOpacity * taiwanOpacity}
            />
            <Landmass
              projection={projection}
              layer="matsu"
              fill={palette.twFill}
              stroke={palette.twEdge}
              strokeWidth={STROKE.hairline}
              opacity={outerIslandsOpacity * taiwanOpacity}
            />
          </>
        ) : null}

        <Landmass
          projection={projection}
          layer="taiwanMain"
          fill={palette.twFill}
          stroke={palette.twEdge}
          strokeWidth={STROKE.thin}
          opacity={taiwanOpacity}
          drawProgress={taiwanDraw}
          strokeLength={5200}
        />

        <Landmass
          projection={projection}
          layer="kinmen"
          fill={palette.twFill}
          stroke={palette.twEdge}
          strokeWidth={STROKE.thin}
          opacity={kinmenOpacity}
        />

        {children?.(projection, palette)}
      </>
    )}
  </MapCanvas>
);
