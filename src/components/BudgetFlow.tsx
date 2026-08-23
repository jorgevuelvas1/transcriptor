/**
 * ============================================================================
 *  FLUJO PRESUPUESTARIO
 * ============================================================================
 *  GOBIERNO -> SOLICITA PRESUPUESTO -> PARLAMENTO -> AUTORIZA
 *
 *  El caudal que sale del Parlamento es menor que el que entra: refleja el
 *  hecho verificado de que en mayo de 2026 se aprobo aproximadamente dos
 *  tercios de una solicitud adicional, dejando fuera algunos programas.
 *
 *  No se insinua traicion ni colaboracion con China: el diagrama describe un
 *  procedimiento presupuestario, no una intencion.
 * ============================================================================
 */
import React from 'react';
import { COLOR, FONT, TRACKING, TYPE } from '../theme';
import { at, easeOutCubic, easeOutExpo } from '../anim';

export interface FlowNodeSpec {
  id: string;
  label: string;
  y: number;
  kind?: 'actor' | 'action';
}

/** Caja de nodo del diagrama. */
export const FlowNode: React.FC<{
  x: number;
  y: number;
  width: number;
  label: string;
  frame: number;
  start: number;
  kind?: 'actor' | 'action';
  color?: string;
  textColor?: string;
  height?: number;
}> = ({
  x,
  y,
  width,
  label,
  frame,
  start,
  kind = 'actor',
  color = COLOR.carbonLine,
  textColor = COLOR.text,
  height = 74,
}) => {
  const p = at(frame, [start, start + 14], [0, 1], easeOutExpo);
  const isAction = kind === 'action';
  return (
    <g opacity={p} transform={`translate(${x} ${y + (1 - p) * 14})`}>
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill={isAction ? 'none' : COLOR.panel}
        stroke={color}
        strokeWidth={isAction ? 1.5 : 2}
        strokeDasharray={isAction ? '7 6' : undefined}
      />
      <text
        x={0}
        y={7}
        textAnchor="middle"
        fill={textColor}
        fontFamily={isAction ? FONT.mono : FONT.sans}
        fontSize={isAction ? TYPE.micro : TYPE.label}
        fontWeight={isAction ? 500 : 700}
        letterSpacing={isAction ? TRACKING.wider : TRACKING.wide}
      >
        {label}
      </text>
    </g>
  );
};

/**
 * Canal vertical por el que desciende el caudal presupuestario.
 * `fill` es la fraccion del canal recorrida; `widthRatio` estrecha el caudal
 * a partir del punto de decision parlamentaria.
 */
export const FlowChannel: React.FC<{
  x: number;
  y0: number;
  y1: number;
  width: number;
  fill: number;
  color?: string;
  trackColor?: string;
  /** Fraccion de anchura al final del tramo (1 = sin perdida). */
  widthRatio?: number;
}> = ({
  x,
  y0,
  y1,
  width,
  fill,
  color = COLOR.blueGray,
  trackColor = COLOR.carbon,
  widthRatio = 1,
}) => {
  const h = y1 - y0;
  const filled = h * Math.max(0, Math.min(1, fill));
  const wEnd = width * widthRatio;

  // Canal completo (traza) y caudal efectivo (relleno), ambos trapezoidales.
  const trackPath = `M ${x - width / 2} ${y0} L ${x + width / 2} ${y0} L ${
    x + wEnd / 2
  } ${y1} L ${x - wEnd / 2} ${y1} Z`;

  const tEnd = h === 0 ? 0 : filled / h;
  const wAt = width + (wEnd - width) * tEnd;
  const fillPath = `M ${x - width / 2} ${y0} L ${x + width / 2} ${y0} L ${
    x + wAt / 2
  } ${y0 + filled} L ${x - wAt / 2} ${y0 + filled} Z`;

  return (
    <g>
      <path d={trackPath} fill={trackColor} opacity={0.55} />
      {filled > 0.5 ? <path d={fillPath} fill={color} opacity={0.9} /> : null}
    </g>
  );
};

/** Rama que se separa del caudal principal (programa excluido). */
export const FlowBranch: React.FC<{
  x: number;
  y: number;
  toX: number;
  toY: number;
  label: string;
  progress: number;
  color?: string;
}> = ({ x, y, toX, toY, label, progress: p, color = COLOR.faint }) => {
  const t = Math.max(0, Math.min(1, p));
  const mx = x + (toX - x) * t;
  const my = y + (toY - y) * t;
  const dir = toX > x ? 1 : -1;
  return (
    <g opacity={t}>
      <path
        d={`M ${x} ${y} Q ${x + (toX - x) * 0.55} ${y} ${mx} ${my}`}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray="6 5"
      />
      <circle cx={mx} cy={my} r={5} fill={color} />
      <text
        x={mx + dir * 16}
        y={my + 9}
        textAnchor={dir > 0 ? 'start' : 'end'}
        fill={color}
        fontFamily={FONT.mono}
        fontSize={TYPE.micro}
        fontWeight={600}
        letterSpacing={TRACKING.wider}
        opacity={at(t * 100, [40, 100], [0, 1], easeOutCubic)}
      >
        {label}
      </text>
    </g>
  );
};

/** Flecha vertical fina entre nodos. */
export const FlowArrow: React.FC<{
  x: number;
  y0: number;
  y1: number;
  progress: number;
  color?: string;
}> = ({ x, y0, y1, progress: p, color = COLOR.blueGrayDim }) => {
  const t = Math.max(0, Math.min(1, p));
  const y = y0 + (y1 - y0) * t;
  return (
    <g opacity={t > 0 ? 1 : 0}>
      <line x1={x} y1={y0} x2={x} y2={y} stroke={color} strokeWidth={2} />
      {t > 0.92 ? (
        <path
          d={`M ${x - 8} ${y1 - 11} L ${x} ${y1} L ${x + 8} ${y1 - 11}`}
          fill="none"
          stroke={color}
          strokeWidth={2}
        />
      ) : null}
    </g>
  );
};
