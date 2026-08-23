/**
 * ============================================================================
 *  HEMICICLO ABSTRACTO
 * ============================================================================
 *  Los legisladores se representan como formas geometricas neutras. No hay
 *  politicos reales, ni retratos, ni reparto por partidos: el diagrama muestra
 *  una camara, no un recuento de escanos.
 *
 *  El numero de asientos (113) reproduce el tamano real del Yuan Legislativo
 *  para que la geometria sea fiel, pero NO se rotula en pantalla como dato.
 * ============================================================================
 */
import React, { useMemo } from 'react';
import { COLOR } from '../theme';
import { easeInOutCubic, easeOutExpo, hashNoise } from '../anim';

export const SEAT_COUNT = 113;

export interface Seat {
  x: number;
  y: number;
  row: number;
  angle: number;
  index: number;
}

/**
 * Reparte `total` asientos en `rows` arcos concentricos, con una densidad
 * proporcional al radio de cada fila (disposicion clasica de hemiciclo).
 */
export const buildHemicycle = (
  total: number,
  rows: number,
  innerRadius: number,
  outerRadius: number,
  cx: number,
  cy: number,
  span = Math.PI * 0.92
): Seat[] => {
  const radii: number[] = [];
  for (let r = 0; r < rows; r++) {
    radii.push(innerRadius + ((outerRadius - innerRadius) * r) / Math.max(1, rows - 1));
  }
  const weight = radii.reduce((a, r) => a + r, 0);
  const perRow = radii.map((r) => Math.max(1, Math.round((total * r) / weight)));

  // Ajuste fino para cuadrar exactamente el total.
  let diff = total - perRow.reduce((a, b) => a + b, 0);
  for (let i = perRow.length - 1; diff !== 0 && i >= 0; i--) {
    const delta = diff > 0 ? 1 : -1;
    perRow[i] += delta;
    diff -= delta;
  }

  const seats: Seat[] = [];
  let index = 0;
  radii.forEach((radius, row) => {
    const n = perRow[row];
    for (let i = 0; i < n; i++) {
      // Angulo medido desde la izquierda (pi) hasta la derecha (0).
      const t = n === 1 ? 0.5 : i / (n - 1);
      const start = Math.PI / 2 + span / 2;
      const angle = start - t * span;
      seats.push({
        x: cx + Math.cos(angle) * radius,
        y: cy - Math.sin(angle) * radius,
        row,
        angle,
        index: index++,
      });
    }
  });
  return seats;
};

export const ParliamentDiagram: React.FC<{
  /** Centro del hemiciclo en pixeles. */
  cx: number;
  cy: number;
  innerRadius?: number;
  outerRadius?: number;
  rows?: number;
  seatCount?: number;
  seatRadius?: number;
  /** 0 = en las posiciones de origen; 1 = formando el hemiciclo. */
  morph?: number;
  /** Posiciones de partida, en pixeles (p. ej. puntos del mapa de Taiwán). */
  origins?: Array<[number, number]>;
  color?: string;
  dimColor?: string;
  opacity?: number;
  /** Fraccion de asientos resaltados, contada desde el centro hacia fuera. */
  highlight?: number;
  highlightColor?: string;
}> = ({
  cx,
  cy,
  innerRadius = 150,
  outerRadius = 400,
  rows = 6,
  seatCount = SEAT_COUNT,
  seatRadius = 9,
  morph = 1,
  origins,
  color = COLOR.blueGray,
  dimColor = COLOR.blueGrayDim,
  opacity = 1,
  highlight = 0,
  highlightColor = COLOR.civicBright,
}) => {
  const seats = useMemo(
    () => buildHemicycle(seatCount, rows, innerRadius, outerRadius, cx, cy),
    [seatCount, rows, innerRadius, outerRadius, cx, cy]
  );

  const highlightCount = Math.round(seats.length * Math.max(0, Math.min(1, highlight)));

  return (
    <g opacity={opacity}>
      {seats.map((seat, i) => {
        const origin = origins?.[i % (origins?.length || 1)];
        // Desfase por asiento: el enjambre se reordena, no salta de golpe.
        const local = Math.max(
          0,
          Math.min(1, (morph - hashNoise(i + 1) * 0.28) / 0.72)
        );
        const t = easeInOutCubic(local);
        const x = origin ? origin[0] + (seat.x - origin[0]) * t : seat.x;
        const y = origin ? origin[1] + (seat.y - origin[1]) * t : seat.y;
        const isHighlighted = i < highlightCount;
        const r = seatRadius * (origins ? 0.72 + 0.28 * t : 1);
        return (
          <circle
            key={seat.index}
            cx={x}
            cy={y}
            r={r}
            fill={isHighlighted ? highlightColor : t > 0.5 ? color : dimColor}
            opacity={origins ? 0.45 + 0.55 * t : 1}
          />
        );
      })}
    </g>
  );
};

/** Estrado / mesa de la camara: barra sobria bajo el hemiciclo. */
export const ParliamentFloor: React.FC<{
  cx: number;
  cy: number;
  width?: number;
  progress?: number;
  color?: string;
}> = ({ cx, cy, width = 260, progress = 1, color = COLOR.carbonLine }) => {
  const w = width * easeOutExpo(Math.max(0, Math.min(1, progress)));
  return (
    <g>
      <rect x={cx - w / 2} y={cy + 14} width={w} height={5} fill={color} />
      <rect x={cx - w / 6} y={cy + 30} width={w / 3} height={3} fill={color} opacity={0.6} />
    </g>
  );
};
