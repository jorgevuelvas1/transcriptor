/**
 * ============================================================================
 *  SUBTITULOS
 * ============================================================================
 *  4-7 palabras por bloque, maximo 2 lineas, alto contraste, banda inferior-
 *  media. Sin karaoke: solo los conceptos esenciales reciben enfasis, y el
 *  bloque entra y sale con una transicion breve.
 *
 *  La zona respeta la safe area de TikTok (10% superior, 18% inferior y la
 *  columna derecha de la interfaz).
 * ============================================================================
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLOR, FONT, TRACKING } from '../theme';
import { CAPTION_BASELINE_Y, FPS, SAFE_PX, WIDTH } from '../data/timing';
import captionsData from '../data/captions.json';

interface CaptionToken {
  t: string;
  e?: boolean;
}

interface CaptionBlock {
  start: number;
  end: number;
  lines: CaptionToken[][];
}

const BLOCKS = (captionsData as { blocks: CaptionBlock[] }).blocks;

const FADE = 0.09; // segundos

export const Captions: React.FC<{
  /** Oculta los subtitulos (p. ej. en el frame final de cierre). */
  hidden?: boolean;
}> = ({ hidden = false }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  if (hidden) return null;

  const block = BLOCKS.find((b) => t >= b.start - FADE && t < b.end);
  if (!block) return null;

  const inP = Math.min(1, Math.max(0, (t - (block.start - FADE)) / FADE));
  const outP = Math.min(1, Math.max(0, (block.end - t) / FADE));
  const opacity = Math.min(inP, outP);

  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE_PX.side,
        // Deja libre la columna derecha ocupada por la interfaz de TikTok.
        width: WIDTH - SAFE_PX.side - SAFE_PX.right,
        top: CAPTION_BASELINE_Y,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        opacity,
        transform: `translateY(${(1 - inP) * 10}px)`,
      }}
    >
      {block.lines.map((line, li) => (
        <div
          key={li}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0 0.32em',
            alignItems: 'baseline',
          }}
        >
          {line.map((token, ti) => (
            <span
              key={`${li}-${ti}`}
              style={{
                fontFamily: FONT.sans,
                fontSize: 44,
                fontWeight: token.e ? 800 : 600,
                lineHeight: 1.24,
                letterSpacing: token.e ? TRACKING.normal : TRACKING.tight,
                color: token.e ? COLOR.white : COLOR.text,
                // Contraste garantizado sobre mapas oscuros y claros.
                textShadow:
                  '0 2px 12px rgba(0,0,0,0.92), 0 0 3px rgba(0,0,0,0.85)',
                ...(token.e
                  ? {
                      // Subrayado sobrio para el concepto esencial.
                      boxShadow: `inset 0 -0.12em 0 ${COLOR.blueGray}`,
                    }
                  : {}),
              }}
            >
              {token.t}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};
