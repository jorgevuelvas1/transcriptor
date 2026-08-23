/**
 * Capas de acabado editorial: viñeta, grano fino y contenedor de escena.
 * Discretas por diseño: nunca compiten con la informacion.
 */
import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { COLOR } from '../theme';

/** Oscurecimiento radial suave: concentra la mirada en el centro util. */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(120% 78% at 50% 44%, rgba(0,0,0,0) 42%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: 'none',
    }}
  />
);

/** Degradado inferior: asegura contraste de los subtitulos sobre el mapa. */
export const CaptionScrim: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <AbsoluteFill
    style={{
      background:
        'linear-gradient(to bottom, rgba(7,9,12,0) 58%, rgba(7,9,12,0.72) 74%, rgba(7,9,12,0.9) 100%)',
      opacity,
      pointerEvents: 'none',
    }}
  />
);

/**
 * Grano editorial muy fino, constante en todo el video.
 *
 * Usa una textura pregenerada y repetida (`npx tsx scripts/makeNoise.ts`) en
 * lugar de un filtro `feTurbulence`: calcular ruido a pantalla completa en
 * cada uno de los 1800 fotogramas dispara el tiempo de render por software.
 */
export const Grain: React.FC<{ opacity?: number; tile?: number }> = ({
  opacity = 0.035,
  tile = 512,
}) => (
  <AbsoluteFill
    style={{
      backgroundImage: `url(${staticFile('textures/noise.png')})`,
      backgroundRepeat: 'repeat',
      backgroundSize: `${tile}px ${tile}px`,
      opacity,
      pointerEvents: 'none',
    }}
  />
);

/** Fondo base de escena. */
export const SceneShell: React.FC<
  React.PropsWithChildren<{ background?: string }>
> = ({ children, background = COLOR.bg }) => (
  <AbsoluteFill style={{ background }}>{children}</AbsoluteFill>
);
