/**
 * Vista corta: Kinmen (administrada por Taiwán) frente a los distritos de
 * Xiamen (controlados por la RPC). Es el plano que sostiene la cota "< 2 KM".
 */
import React from 'react';
import { COLOR, STROKE } from '../../theme';
import {
  Landmass,
  MapCanvas,
  type MapMode,
  type Projection,
} from './MapCanvas';
import type { Camera } from '../../data/geography';
import { MAP_PALETTE } from './MapCanvas';

export const KinmenMap: React.FC<{
  camera: Camera;
  mode?: MapMode;
  /** 0..1: aparicion de la costa continental china. */
  chinaProgress?: number;
  /** 0..1: aparicion de Kinmen. */
  kinmenProgress?: number;
  graticuleOpacity?: number;
  graticuleStep?: number;
  children?: (projection: Projection, palette: (typeof MAP_PALETTE)['modern']) => React.ReactNode;
}> = ({
  camera,
  mode = 'modern',
  chinaProgress = 1,
  kinmenProgress = 1,
  graticuleOpacity = 0.85,
  graticuleStep = 0.25,
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
        {/* Costa de Fujian y distritos de Xiamen: territorio controlado por la RPC */}
        <Landmass
          projection={projection}
          layer="chinaDetail"
          fill={palette.prcFill}
          stroke={palette.prcEdge}
          strokeWidth={STROKE.thin}
          opacity={chinaProgress}
        />
        {/* Kinmen: administrada por Taiwán */}
        <Landmass
          projection={projection}
          layer="kinmen"
          fill={palette.twFill}
          stroke={palette.twEdge}
          strokeWidth={STROKE.regular}
          opacity={kinmenProgress}
        />
        {children?.(projection, palette)}
      </>
    )}
  </MapCanvas>
);
