/**
 * ESCENA 6 · 0:27.2 - 0:32.8
 * El mapa se retira y aparece la cifra del presupuesto de defensa 2027.
 *
 * Nunca se usa "$1T": en espanol "billon" es 10^12. Se muestra la cifra en
 * nuevos dolares taiwaneses y, aparte, la equivalencia aproximada en dolares
 * estadounidenses.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { KinmenMap } from '../components/maps/KinmenMap';
import { CaptionScrim, SceneShell, Vignette } from '../components/Chrome';
import { DataLabel, Kicker, Rule } from '../components/Typography';
import {
  BudgetDomains,
  BudgetHeadline,
  BudgetMetrics,
  BudgetUsdNote,
} from '../components/DefenceBudget';
import { CAM_KINMEN, CAM_FUJIAN, lerpCamera } from '../data/geography';
import { LABELS } from '../data/story';
import { CONTENT_BOX, sec } from '../data/timing';
import { COLOR, TYPE } from '../theme';
import { at, easeInOutQuint, progress } from '../anim';

export const Scene06: React.FC = () => {
  const frame = useCurrentFrame();
  const total = sec(5.6);

  // El mapa sigue vivo mientras se disuelve: nunca un corte plano.
  const camera = lerpCamera(
    CAM_KINMEN,
    CAM_FUJIAN,
    progress(frame, 0, total, easeInOutQuint)
  );
  const mapFade = at(frame, [8, 46], [0.9, 0.3]);

  return (
    <SceneShell>
      <AbsoluteFill style={{ opacity: mapFade }}>
        <KinmenMap
          camera={camera}
          chinaProgress={0.9}
          kinmenProgress={1}
          graticuleOpacity={0.45}
          graticuleStep={0.5}
        />
      </AbsoluteFill>

      <Vignette strength={0.7} />
      <CaptionScrim opacity={0.7} />

      <AbsoluteFill
        style={{
          padding: `280px ${CONTENT_BOX.left}px 0`,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Kicker frame={frame} start={4} color={COLOR.blueGray}>
          Presupuesto propuesto
        </Kicker>

        <div style={{ marginTop: 30 }}>
          <BudgetHeadline frame={frame} start={12} size={92} />
        </div>

        <div style={{ marginTop: 14 }}>
          <Rule frame={frame} start={30} width={CONTENT_BOX.width} thickness={2} />
        </div>

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <div style={{ opacity: at(frame, [32, 48], [0, 1]) }}>
            <DataLabel size={TYPE.label} color={COLOR.white}>
              {LABELS.budgetScope}
            </DataLabel>
          </div>
          <BudgetUsdNote frame={frame} start={40} />
        </div>

        <div style={{ marginTop: 46 }}>
          <BudgetMetrics frame={frame} start={58} />
        </div>

        <div style={{ marginTop: 52 }}>
          <BudgetDomains frame={frame} start={92} iconSize={58} />
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};
