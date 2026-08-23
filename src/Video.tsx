/**
 * ============================================================================
 *  COMPOSICION PRINCIPAL
 * ============================================================================
 *  60.000 s · 1800 frames · 30 fps · 1080x1920.
 *
 *  Las escenas se encadenan segun `SCENES`; los subtitulos y el grano van por
 *  encima de todas ellas. La narracion se monta solo si existe la pista de voz.
 * ============================================================================
 */
import React, { useEffect, useState } from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  continueRender,
  delayRender,
  staticFile,
} from 'remotion';
import { Captions } from './components/Captions';
import { Grain } from './components/Chrome';
import { COLOR, FONTS_TO_PRELOAD, fontFaceCss } from './theme';
import { DURATION_FRAMES, SCENES, sec } from './data/timing';
import audioState from './data/audioState.json';

import { Scene01 } from './scenes/Scene01';
import { Scene02 } from './scenes/Scene02';
import { Scene03 } from './scenes/Scene03';
import { Scene04 } from './scenes/Scene04';
import { Scene05 } from './scenes/Scene05';
import { Scene06 } from './scenes/Scene06';
import { Scene07 } from './scenes/Scene07';
import { Scene08 } from './scenes/Scene08';
import { Scene09 } from './scenes/Scene09';
import { Scene10 } from './scenes/Scene10';

const SCENE_COMPONENTS: Record<string, React.FC> = {
  Scene01,
  Scene02,
  Scene03,
  Scene04,
  Scene05,
  Scene06,
  Scene07,
  Scene08,
  Scene09,
  Scene10,
};

/**
 * Las fuentes se sirven desde `public/fonts` (sin red en tiempo de render).
 * Se retrasa la captura del primer frame hasta que estan realmente cargadas,
 * para que ningun fotograma salga con tipografia de reserva.
 */
const useLocalFonts = (): boolean => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const handle = delayRender('Cargando tipografías locales');

    const style = document.createElement('style');
    style.textContent = fontFaceCss((file) => staticFile(file));
    document.head.appendChild(style);

    Promise.all(FONTS_TO_PRELOAD.map((spec) => document.fonts.load(spec)))
      .then(() => document.fonts.ready)
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch(() => {
        // Ante un fallo de carga se continua: mejor un frame con fuente de
        // reserva que un render bloqueado.
        setReady(true);
        continueRender(handle);
      });

    return () => {
      style.remove();
    };
  }, []);

  return ready;
};

export const TaiwanDeterrenceVideo: React.FC = () => {
  const fontsReady = useLocalFonts();

  return (
    <AbsoluteFill style={{ background: COLOR.bg }}>
      {fontsReady ? (
        <>
          {SCENES.map((scene) => {
            const Component = SCENE_COMPONENTS[scene.id];
            return (
              <Sequence
                key={scene.id}
                from={sec(scene.start)}
                durationInFrames={sec(scene.duration)}
                name={`${scene.index}. ${scene.title}`}
                layout="none"
              >
                <Component />
              </Sequence>
            );
          })}

          <Captions />
          <Grain opacity={0.03} />
        </>
      ) : null}

      {audioState.hasNarration ? (
        <Audio src={staticFile(audioState.file)} volume={1} />
      ) : null}
    </AbsoluteFill>
  );
};

export const VIDEO_ID = 'TaiwanDisuasion';
export const VIDEO_DURATION = DURATION_FRAMES;
