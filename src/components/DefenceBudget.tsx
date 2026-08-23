/**
 * ============================================================================
 *  PRESUPUESTO DE DEFENSA 2027
 * ============================================================================
 *  La cifra se construye en pantalla. Se evita siempre la abreviatura "$1T":
 *  en espanol "billon" es 10^12, y la equivalencia en dolares se muestra
 *  aparte para que no haya confusion de moneda.
 * ============================================================================
 */
import React from 'react';
import { COLOR, FONT, TRACKING, TYPE } from '../theme';
import { at, easeOutExpo, stagger } from '../anim';
import { BUDGET_DOMAINS, LABELS, STORY_DATA } from '../data/story';
import { DOMAIN_ICONS } from './Icons';
import { DataLabel } from './Typography';

/** Cifra principal: 1.1225 BILLONES NT$ */
export const BudgetHeadline: React.FC<{
  frame: number;
  start: number;
  size?: number;
}> = ({ frame, start, size = 96 }) => {
  const p = at(frame, [start, start + 34], [0, 1], easeOutExpo);
  const value = (STORY_DATA.defenceBudget2027TWDTrillion * p).toFixed(4);
  const unitOpacity = at(frame, [start + 16, start + 30], [0, 1]);

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, flexWrap: 'wrap' }}>
      <span
        style={{
          fontFamily: FONT.mono,
          fontSize: size,
          fontWeight: 600,
          color: COLOR.white,
          letterSpacing: TRACKING.tight,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: FONT.sans,
          fontSize: size * 0.42,
          fontWeight: 700,
          color: COLOR.blueGrayBright,
          letterSpacing: TRACKING.wide,
          opacity: unitOpacity,
        }}
      >
        BILLONES NT$
      </span>
    </div>
  );
};

/** Cifras secundarias: +18%, >3% del PIB, equivalencia en dolares. */
export const BudgetMetrics: React.FC<{
  frame: number;
  start: number;
  step?: number;
}> = ({ frame, start, step = 9 }) => {
  const items = [
    { label: LABELS.budgetIncrease, sub: 'INTERANUAL', accent: COLOR.white },
    { label: LABELS.budgetGdp, sub: 'POR PRIMERA VEZ', accent: COLOR.white },
  ];

  return (
    <div style={{ display: 'flex', gap: 26, alignItems: 'stretch' }}>
      {items.map((item, i) => {
        const s = start + stagger(i, step);
        const p = at(frame, [s, s + 16], [0, 1], easeOutExpo);
        return (
          <div
            key={item.label}
            style={{
              flex: 1,
              padding: '18px 20px',
              borderLeft: `3px solid ${COLOR.blueGray}`,
              background: COLOR.panel,
              opacity: p,
              transform: `translateY(${(1 - p) * 14}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: 46,
                fontWeight: 600,
                color: item.accent,
                letterSpacing: TRACKING.tight,
                lineHeight: 1.1,
              }}
            >
              {item.label}
            </div>
            <DataLabel size={TYPE.tiny} color={COLOR.muted}>
              {item.sub}
            </DataLabel>
          </div>
        );
      })}
    </div>
  );
};

/** Equivalencia en dolares, para desambiguar la moneda. */
export const BudgetUsdNote: React.FC<{ frame: number; start: number }> = ({
  frame,
  start,
}) => {
  const p = at(frame, [start, start + 16], [0, 1], easeOutExpo);
  return (
    <div style={{ opacity: p, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 26, height: 2, background: COLOR.faint }} />
      <DataLabel size={TYPE.micro} color={COLOR.muted}>
        {LABELS.budgetUsd}
      </DataLabel>
    </div>
  );
};

/** Fila de iconos tecnicos de las areas contempladas. */
export const BudgetDomains: React.FC<{
  frame: number;
  start: number;
  step?: number;
  iconSize?: number;
  /** Areas que deben aparecer atenuadas (p. ej. el programa excluido). */
  dimmed?: string[];
}> = ({ frame, start, step = 6, iconSize = 58, dimmed = [] }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 14,
    }}
  >
    {BUDGET_DOMAINS.map((domain, i) => {
      const Icon = DOMAIN_ICONS[domain.id];
      const s = start + stagger(i, step);
      const p = at(frame, [s, s + 15], [0, 1], easeOutExpo);
      const isDim = dimmed.includes(domain.id);
      const color = isDim ? COLOR.faint : COLOR.blueGrayBright;
      return (
        <div
          key={domain.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            padding: '16px 6px 14px',
            border: `1.5px solid ${isDim ? COLOR.carbon : COLOR.carbonLine}`,
            opacity: p * (isDim ? 0.5 : 1),
            transform: `translateY(${(1 - p) * 12}px)`,
          }}
        >
          <Icon size={iconSize} color={color} progress={p} />
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 19,
              fontWeight: 500,
              letterSpacing: TRACKING.wide,
              color: isDim ? COLOR.faint : COLOR.muted,
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            {domain.label}
          </span>
        </div>
      );
    })}
  </div>
);
