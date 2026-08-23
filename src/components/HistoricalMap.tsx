/**
 * ============================================================================
 *  REGISTRO HISTORICO · 1958
 * ============================================================================
 *  Paleta desaturada y calida, textura sutil de papel, cuadricula cartografica
 *  y trazos finos de trayectoria.
 *
 *  NO imita metraje de archivo. NO hay explosiones, artilleria realista ni
 *  figuras humanas: solo cartografia documental.
 * ============================================================================
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { COLOR, FONT, STROKE, TRACKING } from '../theme';
import {
  Landmass,
  MapCanvas,
  Trajectory,
  ImpactTick,
  MAP_PALETTE,
  type Projection,
} from './maps/MapCanvas';
import {
  POINTS,
  sampleNearestPoints,
  type Camera,
  type Pos,
} from '../data/geography';

/**
 * Textura de papel: grano discreto sobre el registro historico.
 *
 * Igual que el grano general, se apoya en la textura pregenerada en vez de en
 * un filtro SVG por fotograma.
 */
export const PaperTexture: React.FC<{
  opacity?: number;
  tile?: number;
  offset?: number;
}> = ({ opacity = 0.055, tile = 420, offset = 96 }) => (
  <AbsoluteFill
    style={{
      backgroundImage: `url(${staticFile('textures/noise.png')})`,
      backgroundRepeat: 'repeat',
      backgroundSize: `${tile}px ${tile}px`,
      // Desplazamiento propio para que no coincida con el grano general.
      backgroundPosition: `${offset}px ${offset}px`,
      mixBlendMode: 'overlay',
      opacity,
      pointerEvents: 'none',
    }}
  />
);

/**
 * Origenes y destinos de las trayectorias.
 *
 * Se toman de la geometria real: puntos de la costa controlada por la RPC
 * mas proximos a Kinmen, y puntos reales del litoral de Kinmen.
 */
export const useTrajectoryPairs = (count = 5) =>
  useMemo(() => {
    const origins = sampleNearestPoints(
      'chinaDetail',
      POINTS.kinmenCentroid,
      count,
      0.035
    );
    const targets = sampleNearestPoints(
      'kinmen',
      POINTS.nearestPrcPoint,
      count,
      0.028
    );
    return origins.map((from, i) => ({
      from,
      to: targets[Math.min(i, targets.length - 1)] as Pos,
    }));
  }, [count]);

export const HistoricalMap: React.FC<{
  camera: Camera;
  /** 0..1 de avance global del trazado de trayectorias. */
  trajectoryProgress?: number;
  /** Numero de trayectorias visibles. */
  trajectoryCount?: number;
  /** Desfase entre trayectorias, en fraccion de progreso. */
  stagger?: number;
  graticuleOpacity?: number;
  showImpacts?: boolean;
  children?: (
    projection: Projection,
    palette: (typeof MAP_PALETTE)['historic']
  ) => React.ReactNode;
}> = ({
  camera,
  trajectoryProgress = 0,
  trajectoryCount = 5,
  stagger = 0.11,
  graticuleOpacity = 1,
  showImpacts = true,
  children,
}) => {
  const pairs = useTrajectoryPairs(trajectoryCount);

  return (
    <MapCanvas
      camera={camera}
      mode="historic"
      graticuleStep={0.25}
      graticuleOpacity={graticuleOpacity}
      graticuleLabels
    >
      {(projection, palette) => (
        <>
          <Landmass
            projection={projection}
            layer="chinaDetail"
            fill={palette.prcFill}
            stroke={palette.prcEdge}
            strokeWidth={STROKE.thin}
          />
          <Landmass
            projection={projection}
            layer="kinmen"
            fill={palette.twFill}
            stroke={palette.twEdge}
            strokeWidth={STROKE.regular}
          />

          {pairs.map((pair, i) => {
            const local = Math.max(
              0,
              Math.min(1, (trajectoryProgress - i * stagger) / (1 - stagger * (pairs.length - 1) || 1))
            );
            return (
              <g key={`t${i}`}>
                <Trajectory
                  projection={projection}
                  from={pair.from}
                  to={pair.to}
                  progress={local}
                  color={COLOR.warm}
                  width={1.5}
                  curvature={0.16 + (i % 3) * 0.035}
                />
                {showImpacts ? (
                  <ImpactTick
                    projection={projection}
                    position={pair.to}
                    progress={Math.max(0, (local - 0.86) / 0.14)}
                    color={COLOR.warmBright}
                    maxRadius={30}
                  />
                ) : null}
              </g>
            );
          })}

          {children?.(projection, palette)}
        </>
      )}
    </MapCanvas>
  );
};

/** Cartela documental con aspecto de ficha de archivo (no de fotograma). */
export const ArchiveSlug: React.FC<{
  children: React.ReactNode;
  opacity?: number;
  style?: React.CSSProperties;
}> = ({ children, opacity = 1, style }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 14,
      padding: '10px 18px',
      border: `1.5px solid ${COLOR.warmDim}`,
      background: 'rgba(16,14,11,0.72)',
      fontFamily: FONT.mono,
      fontSize: 24,
      letterSpacing: TRACKING.widest,
      color: COLOR.warmBright,
      textTransform: 'uppercase',
      opacity,
      ...style,
    }}
  >
    {children}
  </div>
);
