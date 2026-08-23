/**
 * ============================================================================
 *  MOTOR CARTOGRAFICO
 * ============================================================================
 *  Todo se dibuja en SVG a partir de la geometria real proyectada con d3-geo.
 *  Dos registros visuales:
 *    - `modern`   : 2026, azul grisaceo sobre casi negro.
 *    - `historic` : 1958, desaturado, calido, con cuadricula cartografica.
 * ============================================================================
 */
import React, { useMemo } from 'react';
import { geoPath } from 'd3-geo';
import {
  layerGeo,
  makeProjection,
  type Camera,
  type LayerName,
  type Pos,
} from '../../data/geography';
import { COLOR, FONT, STROKE, TRACKING, TYPE } from '../../theme';
import { HEIGHT, WIDTH } from '../../data/timing';
import { drawStroke } from '../../anim';

export type MapMode = 'modern' | 'historic';

// ---------------------------------------------------------------------------
//  Proyeccion
// ---------------------------------------------------------------------------
export const useProjection = (
  camera: Camera,
  width = WIDTH,
  height = HEIGHT
) =>
  useMemo(
    () => makeProjection(camera, width, height),
    [camera.center[0], camera.center[1], camera.spanLon, width, height]
  );

export type Projection = ReturnType<typeof useProjection>;

/** Proyecta una posicion geografica a pixeles. */
export const project = (projection: Projection, pos: Pos): [number, number] => {
  const p = projection(pos);
  return p ? [p[0], p[1]] : [0, 0];
};

// ---------------------------------------------------------------------------
//  Paletas por registro
// ---------------------------------------------------------------------------
export const MAP_PALETTE: Record<
  MapMode,
  {
    sea: string;
    grid: string;
    prcFill: string;
    prcEdge: string;
    twFill: string;
    twEdge: string;
    label: string;
    labelDim: string;
  }
> = {
  modern: {
    sea: COLOR.sea,
    grid: COLOR.grid,
    prcFill: COLOR.landPrc,
    prcEdge: COLOR.landPrcEdge,
    twFill: COLOR.landTw,
    twEdge: COLOR.landTwEdge,
    label: COLOR.text,
    labelDim: COLOR.muted,
  },
  historic: {
    sea: COLOR.paper,
    grid: '#241E14',
    prcFill: '#221D15',
    prcEdge: '#6B5B3C',
    twFill: '#2C2519',
    twEdge: COLOR.warm,
    label: COLOR.warmBright,
    labelDim: COLOR.warmDim,
  },
};

// ---------------------------------------------------------------------------
//  Masas de tierra
// ---------------------------------------------------------------------------
export const Landmass: React.FC<{
  projection: Projection;
  layer: LayerName;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  /** 0..1 para dibujar progresivamente el contorno. */
  drawProgress?: number;
  strokeLength?: number;
}> = ({
  projection,
  layer,
  fill,
  stroke,
  strokeWidth = STROKE.thin,
  opacity = 1,
  drawProgress,
  strokeLength = 4200,
}) => {
  const d = useMemo(
    () => geoPath(projection)(layerGeo(layer)) ?? '',
    [projection, layer]
  );
  if (!d) return null;

  const dash =
    drawProgress === undefined ? undefined : drawStroke(strokeLength, drawProgress);

  return (
    <g opacity={opacity}>
      <path d={d} fill={fill} stroke="none" />
      {stroke ? (
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          {...dash}
        />
      ) : null}
    </g>
  );
};

// ---------------------------------------------------------------------------
//  Cuadricula cartografica
// ---------------------------------------------------------------------------
export const Graticule: React.FC<{
  projection: Projection;
  step?: number;
  color: string;
  strokeWidth?: number;
  opacity?: number;
  labels?: boolean;
  viewWidth?: number;
  viewHeight?: number;
}> = ({
  projection,
  step = 1,
  color,
  strokeWidth = 1,
  opacity = 1,
  labels = false,
  viewWidth = WIDTH,
  viewHeight = HEIGHT,
}) => {
  const lines = useMemo(() => {
    const inv = projection.invert;
    if (!inv) return { meridians: [], parallels: [] as number[] };
    const tl = inv([0, 0]);
    const br = inv([viewWidth, viewHeight]);
    if (!tl || !br) return { meridians: [], parallels: [] as number[] };
    const [lon0, lat1] = tl;
    const [lon1, lat0] = br;
    const snap = (v: number, dir: 1 | -1) =>
      dir === 1 ? Math.ceil(v / step) * step : Math.floor(v / step) * step;
    const meridians: number[] = [];
    for (let x = snap(lon0, 1); x <= lon1; x += step) meridians.push(x);
    const parallels: number[] = [];
    for (let y = snap(lat0, 1); y <= lat1; y += step) parallels.push(y);
    return { meridians, parallels };
  }, [projection, step, viewWidth, viewHeight]);

  return (
    <g opacity={opacity}>
      {lines.meridians.map((lon) => {
        const a = project(projection, [lon, -85]);
        const b = project(projection, [lon, 85]);
        return (
          <line
            key={`m${lon}`}
            x1={a[0]}
            y1={0}
            x2={b[0]}
            y2={viewHeight}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      })}
      {lines.parallels.map((lat) => {
        const a = project(projection, [-180, lat]);
        return (
          <line
            key={`p${lat}`}
            x1={0}
            y1={a[1]}
            x2={viewWidth}
            y2={a[1]}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      })}
      {labels
        ? lines.parallels.map((lat) => {
            const a = project(projection, [-180, lat]);
            return (
              <text
                key={`pl${lat}`}
                x={18}
                y={a[1] - 10}
                fill={color}
                fontFamily={FONT.mono}
                fontSize={18}
                letterSpacing={TRACKING.wide}
                opacity={0.9}
              >
                {lat.toFixed(0)}°N
              </text>
            );
          })
        : null}
    </g>
  );
};

// ---------------------------------------------------------------------------
//  Marcador sobre una posicion real
// ---------------------------------------------------------------------------
/**
 * Cuando un accidente es demasiado pequeno para verse a la escala del plano,
 * se marca con este simbolo SOBRE SU POSICION REAL. Nunca se agranda ni se
 * desplaza la geometria.
 */
export const MapMarker: React.FC<{
  projection: Projection;
  position: Pos;
  radius?: number;
  color: string;
  ringOpacity?: number;
  scale?: number;
  crosshair?: boolean;
}> = ({
  projection,
  position,
  radius = 14,
  color,
  ringOpacity = 1,
  scale = 1,
  crosshair = false,
}) => {
  const [x, y] = project(projection, position);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={scale > 0 ? 1 : 0}>
      {crosshair ? (
        <>
          <line x1={-radius * 2.2} y1={0} x2={-radius * 1.1} y2={0} stroke={color} strokeWidth={1.6} />
          <line x1={radius * 1.1} y1={0} x2={radius * 2.2} y2={0} stroke={color} strokeWidth={1.6} />
          <line x1={0} y1={-radius * 2.2} x2={0} y2={-radius * 1.1} stroke={color} strokeWidth={1.6} />
          <line x1={0} y1={radius * 1.1} x2={0} y2={radius * 2.2} stroke={color} strokeWidth={1.6} />
        </>
      ) : null}
      <circle r={radius} fill="none" stroke={color} strokeWidth={2.2} opacity={ringOpacity} />
      <circle r={radius * 0.3} fill={color} />
    </g>
  );
};

// ---------------------------------------------------------------------------
//  Rotulo sobre el mapa
// ---------------------------------------------------------------------------
export const MapLabel: React.FC<{
  projection: Projection;
  position: Pos;
  children: string;
  color: string;
  size?: number;
  anchor?: 'start' | 'middle' | 'end';
  dx?: number;
  dy?: number;
  opacity?: number;
  weight?: number;
  tracking?: string;
  leader?: boolean;
}> = ({
  projection,
  position,
  children,
  color,
  size = TYPE.label,
  anchor = 'start',
  dx = 0,
  dy = 0,
  opacity = 1,
  weight = 600,
  tracking = TRACKING.wider,
  leader = false,
}) => {
  const [x, y] = project(projection, position);
  const sign = anchor === 'end' ? -1 : 1;
  return (
    <g opacity={opacity}>
      {leader ? (
        <line
          x1={x}
          y1={y}
          x2={x + dx - sign * 12}
          y2={y + dy + size * 0.32}
          stroke={color}
          strokeWidth={1.4}
          opacity={0.55}
        />
      ) : null}
      <text
        x={x + dx}
        y={y + dy}
        fill={color}
        textAnchor={anchor}
        fontFamily={FONT.sans}
        fontSize={size}
        fontWeight={weight}
        letterSpacing={tracking}
        style={{ textTransform: 'uppercase' }}
      >
        {children}
      </text>
    </g>
  );
};

// ---------------------------------------------------------------------------
//  Linea de distancia acotada
// ---------------------------------------------------------------------------
export const DistanceLine: React.FC<{
  projection: Projection;
  from: Pos;
  to: Pos;
  label: string;
  color: string;
  progress: number;
  labelOpacity?: number;
  labelSize?: number;
  /** Desplazamiento perpendicular del rotulo, en pixeles. */
  labelOffset?: number;
}> = ({
  projection,
  from,
  to,
  label,
  color,
  progress: p,
  labelOpacity = 1,
  labelSize = TYPE.label,
  labelOffset = -34,
}) => {
  const a = project(projection, from);
  const b = project(projection, to);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const ex = a[0] + dx * p;
  const ey = a[1] + dy * p;
  const mx = (a[0] + b[0]) / 2 + nx * labelOffset;
  const my = (a[1] + b[1]) / 2 + ny * labelOffset;
  const tick = 13;

  return (
    <g>
      <line x1={a[0]} y1={a[1]} x2={ex} y2={ey} stroke={color} strokeWidth={2.4} />
      {/* Topes de cota */}
      <line
        x1={a[0] + nx * tick}
        y1={a[1] + ny * tick}
        x2={a[0] - nx * tick}
        y2={a[1] - ny * tick}
        stroke={color}
        strokeWidth={2.4}
      />
      {p > 0.985 ? (
        <line
          x1={b[0] + nx * tick}
          y1={b[1] + ny * tick}
          x2={b[0] - nx * tick}
          y2={b[1] - ny * tick}
          stroke={color}
          strokeWidth={2.4}
        />
      ) : null}
      <text
        x={mx}
        y={my}
        fill={color}
        textAnchor="middle"
        fontFamily={FONT.mono}
        fontSize={labelSize}
        fontWeight={600}
        letterSpacing={TRACKING.wide}
        opacity={labelOpacity}
      >
        {label}
      </text>
    </g>
  );
};

// ---------------------------------------------------------------------------
//  Trayectoria curva (1958). Sin explosiones ni artilleria realista.
// ---------------------------------------------------------------------------
export const Trajectory: React.FC<{
  projection: Projection;
  from: Pos;
  to: Pos;
  progress: number;
  color: string;
  width?: number;
  curvature?: number;
  showHead?: boolean;
}> = ({
  projection,
  from,
  to,
  progress: p,
  color,
  width = 1.6,
  curvature = 0.22,
  showHead = true,
}) => {
  const a = project(projection, from);
  const b = project(projection, to);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  // Punto de control desplazado perpendicularmente: arco tenso, no decorativo.
  const cx = (a[0] + b[0]) / 2 - (dy / len) * len * curvature;
  const cy = (a[1] + b[1]) / 2 + (dx / len) * len * curvature;
  const d = `M ${a[0]} ${a[1]} Q ${cx} ${cy} ${b[0]} ${b[1]}`;
  const approxLen = len * (1 + curvature * 0.8);

  // Posicion del extremo sobre la curva cuadratica.
  const t = Math.max(0, Math.min(1, p));
  const hx = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * cx + t ** 2 * b[0];
  const hy = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * cy + t ** 2 * b[1];

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        {...drawStroke(approxLen, t)}
      />
      {showHead && t > 0.02 && t < 0.999 ? (
        <circle cx={hx} cy={hy} r={2.6} fill={color} />
      ) : null}
    </g>
  );
};

/** Marca de impacto: aro fino que se abre. Nunca una explosion. */
export const ImpactTick: React.FC<{
  projection: Projection;
  position: Pos;
  progress: number;
  color: string;
  maxRadius?: number;
}> = ({ projection, position, progress: p, color, maxRadius = 26 }) => {
  if (p <= 0) return null;
  const [x, y] = project(projection, position);
  return (
    <circle
      cx={x}
      cy={y}
      r={maxRadius * p}
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      opacity={1 - p}
    />
  );
};

// ---------------------------------------------------------------------------
//  Lienzo base
// ---------------------------------------------------------------------------
export const MapCanvas: React.FC<{
  camera: Camera;
  mode?: MapMode;
  children?: (projection: Projection, palette: (typeof MAP_PALETTE)['modern']) => React.ReactNode;
  showSea?: boolean;
  graticuleStep?: number;
  graticuleOpacity?: number;
  graticuleLabels?: boolean;
  style?: React.CSSProperties;
  /** Tamano del lienzo. Permite paneles divididos sin deformar la proyeccion. */
  width?: number;
  height?: number;
}> = ({
  camera,
  mode = 'modern',
  children,
  showSea = true,
  graticuleStep = 1,
  graticuleOpacity = 1,
  graticuleLabels = false,
  style,
  width = WIDTH,
  height = HEIGHT,
}) => {
  const projection = useProjection(camera, width, height);
  const palette = MAP_PALETTE[mode];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: 'absolute', inset: 0, ...style }}
    >
      {showSea ? <rect width={width} height={height} fill={palette.sea} /> : null}
      {graticuleOpacity > 0 ? (
        <Graticule
          projection={projection}
          step={graticuleStep}
          color={palette.grid}
          opacity={graticuleOpacity}
          labels={graticuleLabels}
          viewWidth={width}
          viewHeight={height}
        />
      ) : null}
      {children?.(projection, palette)}
    </svg>
  );
};
