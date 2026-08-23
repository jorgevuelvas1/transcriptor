/**
 * ============================================================================
 *  ICONOGRAFIA TECNICA ESQUEMATICA
 * ============================================================================
 *  Dibujo de linea, como un despiece tecnico. Sin fotografias, sin modelos 3D
 *  realistas y sin estetica de videojuego o de radar militar.
 * ============================================================================
 */
import React from 'react';
import { COLOR } from '../theme';
import type { BudgetDomainId } from '../data/story';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** 0..1 para dibujar el icono progresivamente. */
  progress?: number;
}

const Frame: React.FC<React.PropsWithChildren<{ size: number }>> = ({
  size,
  children,
}) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    {children}
  </svg>
);

/** Dron: vista cenital de cuadricoptero, trazo tecnico. */
export const DroneIcon: React.FC<IconProps> = ({
  size = 56,
  color = COLOR.blueGrayBright,
  strokeWidth = 1.8,
  progress = 1,
}) => (
  <Frame size={size}>
    <g stroke={color} strokeWidth={strokeWidth} opacity={progress}>
      <line x1="15" y1="15" x2="33" y2="33" />
      <line x1="33" y1="15" x2="15" y2="33" />
      <circle cx="13" cy="13" r="6" />
      <circle cx="35" cy="13" r="6" />
      <circle cx="13" cy="35" r="6" />
      <circle cx="35" cy="35" r="6" />
      <rect x="19" y="19" width="10" height="10" />
    </g>
  </Frame>
);

/** Misil: perfil esquematico con aletas. */
export const MissileIcon: React.FC<IconProps> = ({
  size = 56,
  color = COLOR.blueGrayBright,
  strokeWidth = 1.8,
  progress = 1,
}) => (
  <Frame size={size}>
    <g stroke={color} strokeWidth={strokeWidth} opacity={progress}>
      <path d="M6 24 L28 24 L40 24" />
      <path d="M28 24 L40 24 L34 18 M34 30 L40 24" />
      <path d="M40 24 C 40 24, 34 17, 28 17 L28 31 C 34 31, 40 24, 40 24 Z" />
      <path d="M20 24 L14 15 L22 18" />
      <path d="M20 24 L14 33 L22 30" />
      <line x1="6" y1="20" x2="6" y2="28" />
    </g>
  </Frame>
);

/** Submarino: silueta con vela, trazo tecnico. */
export const SubmarineIcon: React.FC<IconProps> = ({
  size = 56,
  color = COLOR.blueGrayBright,
  strokeWidth = 1.8,
  progress = 1,
}) => (
  <Frame size={size}>
    <g stroke={color} strokeWidth={strokeWidth} opacity={progress}>
      <path d="M7 27 C 7 22, 14 20, 24 20 C 34 20, 42 22, 44 27 C 42 32, 34 34, 24 34 C 14 34, 7 32, 7 27 Z" />
      <path d="M21 20 L21 12 L29 12 L29 20" />
      <line x1="25" y1="12" x2="25" y2="7" />
      <path d="M7 27 L3 23 M7 27 L3 31" />
      <circle cx="17" cy="27" r="1.6" fill={color} stroke="none" />
      <circle cx="24" cy="27" r="1.6" fill={color} stroke="none" />
      <circle cx="31" cy="27" r="1.6" fill={color} stroke="none" />
    </g>
  </Frame>
);

/** Guardia Costera: casco de patrullera sobre linea de agua. */
export const CoastGuardIcon: React.FC<IconProps> = ({
  size = 56,
  color = COLOR.blueGrayBright,
  strokeWidth = 1.8,
  progress = 1,
}) => (
  <Frame size={size}>
    <g stroke={color} strokeWidth={strokeWidth} opacity={progress}>
      <path d="M8 28 L40 28 L35 36 L13 36 Z" />
      <path d="M17 28 L17 21 L31 21 L31 28" />
      <path d="M22 21 L22 15 L27 15" />
      <path d="M4 40 C 9 37, 14 43, 19 40 C 24 37, 29 43, 34 40 C 39 37, 44 43, 44 40" />
    </g>
  </Frame>
);

export const DOMAIN_ICONS: Record<BudgetDomainId, React.FC<IconProps>> = {
  drones: DroneIcon,
  missiles: MissileIcon,
  submarines: SubmarineIcon,
  coastguard: CoastGuardIcon,
};

/** Simbolo institucional abstracto (sin retratos ni banderas). */
export const InstitutionMark: React.FC<IconProps> = ({
  size = 64,
  color = COLOR.blueGrayBright,
  strokeWidth = 2,
  progress = 1,
}) => (
  <Frame size={size}>
    <g stroke={color} strokeWidth={strokeWidth} opacity={progress}>
      <line x1="8" y1="38" x2="40" y2="38" />
      <line x1="11" y1="38" x2="11" y2="20" />
      <line x1="19" y1="38" x2="19" y2="20" />
      <line x1="29" y1="38" x2="29" y2="20" />
      <line x1="37" y1="38" x2="37" y2="20" />
      <path d="M6 20 L24 10 L42 20 Z" />
    </g>
  </Frame>
);
