/**
 * ============================================================================
 *  TIPOGRAFIA CINETICA
 * ============================================================================
 *  Primitivas de texto animado. El texto entra por revelado enmascarado o por
 *  escalonado de palabras; nunca por efectos decorativos.
 * ============================================================================
 */
import React from 'react';
import { COLOR, FONT, TRACKING, TYPE } from '../theme';
import { at, easeOutCubic, easeOutExpo, stagger } from '../anim';

// ---------------------------------------------------------------------------
//  Revelado enmascarado: el texto sube desde detras de una linea de corte.
// ---------------------------------------------------------------------------
export const Reveal: React.FC<{
  frame: number;
  start: number;
  duration?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  distance?: number;
}> = ({ frame, start, duration = 16, children, style, distance = 1.0 }) => {
  const p = at(frame, [start, start + duration], [0, 1], easeOutExpo);
  return (
    <span style={{ display: 'block', overflow: 'hidden', ...style }}>
      <span
        style={{
          display: 'block',
          transform: `translateY(${(1 - p) * 100 * distance}%)`,
          opacity: at(frame, [start, start + duration * 0.5], [0, 1]),
        }}
      >
        {children}
      </span>
    </span>
  );
};

// ---------------------------------------------------------------------------
//  Escalonado por palabras.
// ---------------------------------------------------------------------------
export const KineticWords: React.FC<{
  frame: number;
  start: number;
  text: string;
  step?: number;
  duration?: number;
  style?: React.CSSProperties;
  wordStyle?: (index: number, word: string) => React.CSSProperties;
}> = ({ frame, start, text, step = 3, duration = 14, style, wordStyle }) => (
  <span style={{ display: 'flex', flexWrap: 'wrap', ...style }}>
    {text.split(' ').map((word, i) => {
      const s = start + stagger(i, step);
      const p = at(frame, [s, s + duration], [0, 1], easeOutExpo);
      return (
        <span
          key={`${word}-${i}`}
          style={{
            display: 'inline-block',
            marginRight: '0.28em',
            opacity: p,
            transform: `translateY(${(1 - p) * 0.35}em)`,
            ...(wordStyle ? wordStyle(i, word) : {}),
          }}
        >
          {word}
        </span>
      );
    })}
  </span>
);

// ---------------------------------------------------------------------------
//  Antetitulo: etiqueta pequena en versales con filete.
// ---------------------------------------------------------------------------
export const Kicker: React.FC<{
  frame: number;
  start: number;
  children: React.ReactNode;
  color?: string;
  ruleColor?: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({
  frame,
  start,
  children,
  color = COLOR.blueGray,
  ruleColor,
  size = TYPE.micro,
  style,
}) => {
  const p = at(frame, [start, start + 14], [0, 1], easeOutCubic);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        opacity: p,
        ...style,
      }}
    >
      <div
        style={{
          width: 44 * p,
          height: 2,
          background: ruleColor ?? color,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: FONT.mono,
          fontSize: size,
          fontWeight: 500,
          letterSpacing: TRACKING.widest,
          color,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
//  Titular editorial.
// ---------------------------------------------------------------------------
export const Headline: React.FC<{
  frame: number;
  start: number;
  children: React.ReactNode;
  size?: number;
  color?: string;
  weight?: number;
  style?: React.CSSProperties;
  lineHeight?: number;
}> = ({
  frame,
  start,
  children,
  size = TYPE.title,
  color = COLOR.white,
  weight = 700,
  style,
  lineHeight = 1.08,
}) => (
  <Reveal frame={frame} start={start} duration={18}>
    <span
      style={{
        display: 'block',
        fontFamily: FONT.sans,
        fontSize: size,
        fontWeight: weight,
        lineHeight,
        letterSpacing: TRACKING.tight,
        color,
        ...style,
      }}
    >
      {children}
    </span>
  </Reveal>
);

// ---------------------------------------------------------------------------
//  Cifra construida: el numero se "arma" hasta su valor final.
// ---------------------------------------------------------------------------
export const BuildNumber: React.FC<{
  frame: number;
  start: number;
  duration?: number;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({
  frame,
  start,
  duration = 30,
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  size = TYPE.display,
  color = COLOR.white,
  style,
}) => {
  const p = at(frame, [start, start + duration], [0, 1], easeOutExpo);
  const shown = (value * p).toFixed(decimals);
  return (
    <span
      style={{
        fontFamily: FONT.mono,
        fontSize: size,
        fontWeight: 600,
        letterSpacing: TRACKING.tight,
        color,
        fontVariantNumeric: 'tabular-nums',
        opacity: at(frame, [start, start + 6], [0, 1]),
        ...style,
      }}
    >
      {prefix}
      {shown}
      {suffix}
    </span>
  );
};

// ---------------------------------------------------------------------------
//  Etiqueta de dato (mono, versales).
// ---------------------------------------------------------------------------
export const DataLabel: React.FC<{
  children: React.ReactNode;
  color?: string;
  size?: number;
  weight?: number;
  style?: React.CSSProperties;
}> = ({ children, color = COLOR.muted, size = TYPE.micro, weight = 500, style }) => (
  <span
    style={{
      fontFamily: FONT.mono,
      fontSize: size,
      fontWeight: weight,
      letterSpacing: TRACKING.wider,
      color,
      textTransform: 'uppercase',
      ...style,
    }}
  >
    {children}
  </span>
);

// ---------------------------------------------------------------------------
//  Marca de ANALISIS: distingue interpretacion de hecho.
// ---------------------------------------------------------------------------
export const AnalysisTag: React.FC<{
  frame: number;
  start: number;
  label?: string;
  style?: React.CSSProperties;
}> = ({ frame, start, label = 'ANÁLISIS', style }) => {
  const p = at(frame, [start, start + 12], [0, 1], easeOutCubic);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 14px',
        border: `1.5px solid ${COLOR.blueGrayDim}`,
        opacity: p * 0.95,
        transform: `translateY(${(1 - p) * 8}px)`,
        ...style,
      }}
    >
      <div
        style={{
          width: 7,
          height: 7,
          background: COLOR.blueGray,
          transform: 'rotate(45deg)',
        }}
      />
      <DataLabel size={TYPE.tiny} color={COLOR.blueGrayBright} weight={600}>
        {label}
      </DataLabel>
    </div>
  );
};

// ---------------------------------------------------------------------------
//  Filete horizontal que se dibuja.
// ---------------------------------------------------------------------------
export const Rule: React.FC<{
  frame: number;
  start: number;
  duration?: number;
  width: number;
  color?: string;
  thickness?: number;
  style?: React.CSSProperties;
}> = ({
  frame,
  start,
  duration = 20,
  width,
  color = COLOR.carbonLine,
  thickness = 2,
  style,
}) => (
  <div
    style={{
      width: at(frame, [start, start + duration], [0, width], easeOutExpo),
      height: thickness,
      background: color,
      ...style,
    }}
  />
);
