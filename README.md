# Taiwán · La primera batalla por la disuasión

Vídeo geopolítico vertical (TikTok) en español, de 60 segundos exactos, sobre la
visita de Lai Ching-te a Kinmen el **23 de agosto de 2026**, en el 68 aniversario
del inicio de la crisis del Estrecho de 1958.

**Tesis del vídeo:** la primera batalla por la disuasión de Taiwán podría librarse
dentro de su propio Parlamento, mucho antes que en el Estrecho.

---

## Entregable

```
output/taiwan_disuasion_2026-08-23_tiktok.mp4
60.054 s · 1080×1920 · 30 fps · H.264 · AAC · 13.0 MB · -14.3 LUFS
```

Se incluye también un render sin narración:
`output/taiwan_disuasion_2026-08-23_sin_voz.mp4`.

### Sobre la voz de esta versión

No había ninguna credencial de TTS en el entorno **y además la salida de red
hacia `api.openai.com` y la API de Gemini está bloqueada**, así que ni con una
clave se podría llamar a esas APIs desde aquí.

La narración se generó con una **voz neuronal local**: Kokoro v1.0
multilingüe vía sherpa-onnx, locutor `em_alex` (sid 29) — masculina, español,
F0 ≈ 135 Hz. Se eligió midiendo el tono fundamental de las candidatas y
comparando cuánta compresión de ritmo necesitaba cada una.

**Limitación conocida.** Kokoro no admite instrucciones de entonación, así que
el registro de «analista internacional» está aproximado solo por ritmo (el giro
y las tres frases finales van más lentos). Además, el guion es denso —332
sílabas— y hay que comprimir la locución un 18 % para que quepa en la ventana.
Ambas cosas se notan. Para la versión definitiva conviene rehacerla con OpenAI
o Gemini, que sí aceptan dirección de voz.

### Por qué esta voz y no otra

| Opción | Compresión necesaria | Resultado |
|---|---|---|
| piper `es_MX-ald-medium` | ×1.27 | descartada: modelo más simple y más compresión |
| Kokoro `em_alex` (sid 29) | **×1.18** | elegida |

Medido con reconocimiento de voz sobre la misma voz y el mismo ASR, la
cobertura de palabras cae al comprimir: 61.8 % a ×1.0, 56.4 % a ×1.18 y 50.9 %
a ×1.27. El techo del ASR (whisper-tiny) es ese ~62 %, así que la cifra sirve
para comparar, no como medida absoluta.

Para bajar la compresión se recortaron los huecos no editoriales al mínimo
—conservando las tres pausas que pide el guion— y se apuró la ventana de voz
hasta 59.2 s.

### Para rehacer la voz con OpenAI o Gemini

En una máquina con salida de red hacia esas APIs:

1. Copia `.env.example` a `.env` y rellena **una** variable:

   ```
   OPENAI_API_KEY=...     # primera opción
   GEMINI_API_KEY=...     # alternativa
   ```

2. Ejecuta:

   ```bash
   npm run voice      # sintetiza, mide y monta la pista de 60 s a -14 LUFS
   npm run captions   # re-sincroniza los subtítulos con el audio real
   npm run render     # regenera el MP4 final
   npm run validate   # comprueba duración, resolución, fps, códecs
   ```

El pipeline detecta la credencial y usa la nube automáticamente; la voz local
solo actúa como respaldo. Nada más del proyecto cambia.

### Reproducir la voz local

```bash
pip install sherpa-onnx
bash scripts/fetchLocalVoice.sh   # ~349 MB, desde GitHub releases
npm run voice
```

---

## Cómo se sincroniza la voz

La narración **no** se sintetiza de una sola vez. `npm run voice`:

1. genera cada uno de los 13 segmentos por separado, con instrucciones de
   entonación propias (ritmo base, cambio de tono en el giro, cierre más lento);
2. mide su duración real con `ffprobe`;
3. los coloca en la línea de tiempo respetando las pausas editoriales
   (tras «Porque Kinmen no es solo historia.», antes de «Pero quizá Beijing…»,
   tras «Y eso cambia la historia.») sin solapar nunca dos segmentos;
4. calibra el ritmo: mide una pasada y deduce la velocidad que da el ritmo
   objetivo (tope 1.08 en la nube, para no acelerar de forma artificial);
5. mezcla todo sobre una base de 60.000 s y normaliza a **-14 LUFS** en dos
   pasadas, sin recorte.

El resultado se escribe en `src/data/voiceTimeline.json` con
`source: "measured"`, y los subtítulos se regeneran a partir de esos tiempos
reales.

En la versión entregada ese archivo ya es **medido**: la calibración convergió
en `speed = 1.269` y la narración termina en **58.63 s**, dentro de la ventana
58.0–59.3 s. La voz local parte de un ritmo más lento que el registro pedido,
así que el script mide una pasada y deduce la velocidad que da el ritmo
objetivo; para la nube el margen está limitado a 1.08 para no acelerar de
forma artificial.

### Selección del modelo de voz

El script **no fija un identificador de modelo en el código**. Consulta el
endpoint de modelos del proveedor en tiempo de ejecución y elige el mejor modelo
de voz que la cuenta declare disponible, según una lista de preferencia. Así no
depende de un nombre que pueda quedar obsoleto.

---

## Estructura

```
src/
  data/
    story.ts          Cifras, fechas, guion y separación HECHO / ANÁLISIS
    timing.ts         60 s = 1800 frames, escenas, ajuste de la línea de tiempo
    geography.ts      Acceso a la geometría real y cámaras cartográficas
    sources.ts        Fuentes editoriales y procedencia de los datos
    output.ts         Nombres de los archivos de salida
    geo/strait.geo.json   Geometría generada (314 KB)
    voiceTimeline.json    Tiempos de cada segmento de narración
    captions.json         Subtítulos sincronizados
  components/
    maps/MapCanvas.tsx    Motor cartográfico (proyección, cuadrícula, cotas)
    maps/KinmenMap.tsx    Vista corta Kinmen / Xiamen
    maps/TaiwanMap.tsx    Vista amplia del Estrecho
    HistoricalMap.tsx     Registro documental de 1958
    ParliamentDiagram.tsx Hemiciclo abstracto
    BudgetFlow.tsx        Circuito presupuestario
    DefenceBudget.tsx     Cifra de defensa 2027
    Captions.tsx          Subtítulos
    Typography.tsx        Tipografía cinética
    Icons.tsx             Iconografía técnica esquemática
    Chrome.tsx            Viñeta, grano, contenedor de escena
  scenes/Scene01..Scene10.tsx
  Video.tsx, Root.tsx, theme.ts, anim.ts
scripts/
  buildGeography.ts  Descarga y recorta la geometría real
  planTimeline.ts    Línea de tiempo estimada
  generateVoice.ts   TTS por segmentos, medición y montaje
  localTts.py        Voz neuronal local de respaldo (sherpa-onnx)
  fetchLocalVoice.sh Descarga del modelo de voz local
  generateCaptions.ts Subtítulos de 4-7 palabras
  render.ts          Render del MP4
  validate.ts        Control técnico
  editorialCheck.ts  Control editorial
  stills.ts          Fotogramas sueltos para revisión
```

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run geo` | Reconstruye la geometría desde las fuentes originales |
| `bash scripts/fetchLocalVoice.sh` | Descarga la voz neuronal local de respaldo |
| `npm run editorial` | Control editorial (bloquea el render si falla) |
| `npm run render -- --silent` | Render sin narración |
| `npm run render` | Render final |
| `npm run validate` | Control técnico del MP4 |
| `npm run studio` | Abre Remotion Studio |
| `npx tsx scripts/stills.ts` | Un fotograma por escena en `output/stills/` |

---

## Los mapas: geometría real, verificada

Todos los mapas usan coordenadas reales. **Ninguna posición se ha colocado a
ojo.** Fuentes:

| Capa | Fuente |
|---|---|
| Costa de China continental y Fujian | Natural Earth 10m (dominio público) |
| Isla de Taiwán, Kinmen, Penghu, Matsu | Límites administrativos de Taiwán (g0v/twgeojson) |
| Distritos de Xiamen (Siming, Huli, Xiang'an) | geoBoundaries CHN ADM3 |

`npm run validate` comprueba la geometría con `geoContains`: que el mar sea mar y
la tierra sea tierra en nueve sondeos. Las áreas esféricas resultantes coinciden
con la realidad, lo que confirma que la proyección es correcta:

| Capa | Área calculada | Real |
|---|---|---|
| Taiwán | 36 300 km² | ~36 193 km² |
| Condado de Kinmen | 151 km² | ~151.7 km² |
| Matsu | 29 km² | ~29 km² |

> **Nota técnica.** d3-geo interpreta los polígonos sobre la esfera y exige el
> contorno exterior en sentido **horario** — la orientación contraria a la de
> RFC 7946. Los datos de condados de Taiwán venían invertidos, lo que hacía que
> d3 rellenara el *complemento* del polígono y pintara el mar como tierra.
> `scripts/buildGeography.ts` normaliza la orientación de cada anillo y
> `scripts/validate.ts` lo comprueba en cada ejecución.

### Sobre la cota «< 2 KM»

La cifra editorial corresponde a la separación entre los islotes más próximos:
el sector occidental de Lieyu (Pequeño Kinmen, administrado por Taiwán) y los
islotes controlados por la RPC frente a Xiamen (Jiaoyu / área de Dadeng).

Esos islotes son demasiado pequeños para figurar en los conjuntos de datos
abiertos accesibles. Medida sobre la geometría realmente disponible, la distancia
mínima entre el condado de Kinmen y territorio controlado por la RPC es de
**3.559 km** (hasta el distrito de Xiang'an) y de 3.814 km hasta la isla de
Xiamen.

En consecuencia: la línea de cota se dibuja entre **puntos reales** de la
geometría, la etiqueta refleja el dato editorial y **no se ha desplazado ni
alterado ninguna geografía** para forzar la cifra. Queda documentado en
`src/data/sources.ts` (`DISTANCE_PROVENANCE`).

---

## Control editorial

`npm run editorial` se ejecuta antes del render y bloquea la salida si falla.
18 comprobaciones automáticas sobre el texto en pantalla y la narración:

- no se afirma que China vaya a invadir Taiwán, ni que la invasión sea inminente;
- no se describe a la oposición como pro-China, anti-Taiwán ni contraria a la
  defensa nacional;
- no se afirma que el Parlamento bloqueara *todo* el presupuesto — se muestra
  «≈ 2/3 APROBADO»;
- no se afirma que Lai hablara en secreto o en clave al Parlamento; el giro se
  formula como hipótesis («Pero quizá Beijing no sea el único destinatario») y
  aparece marcado como **ANÁLISIS** en pantalla;
- la valoración estadounidense de 1958 sobre la vulnerabilidad de las islas se
  rotula como «valoración de aquel momento, no la posición actual de Estados
  Unidos»;
- «Paz mediante fortaleza» se presenta como *síntesis de su argumento*, no como
  verdad objetiva;
- no se usa la abreviatura ambigua `$1T`: se muestra `1.1225 BILLONES NT$` y,
  aparte, `≈ US$31.4 MIL MILLONES`;
- la distancia se muestra siempre como `< 2 KM`, nunca como 2 km exactos.

No hay imágenes generadas de personas, políticos, armas, soldados ni
explosiones, ni falso metraje de archivo. El lenguaje visual es exclusivamente
cartográfico, tipográfico y diagramático.

---

## Fuentes editoriales

1. **Reuters, 23 de agosto de 2026** — visita de Lai Ching-te a Kinmen y
   aniversario de la crisis de 1958.
2. **Reuters, 20 de agosto de 2026** — propuesta de presupuesto de defensa de
   Taiwán para 2027.
3. **U.S. Department of State, Office of the Historian** — documentación
   histórica de la crisis del Estrecho de Taiwán de 1958.

Registradas en `src/data/sources.ts` y embebidas como metadatos del MP4.

---

## Especificaciones técnicas

- 60.000 s exactos · 1800 frames · 30 fps
- 1080×1920 (9:16), `yuv420p`, BT.709
- Vídeo H.264 (CRF 20, preset `slow`) · Audio AAC 192 kbps
- Narración normalizada a -14 LUFS (medido: -14.4 LUFS, LRA 1.7 LU, pico -4.0 dBFS)
- Subtítulos en español: 4–7 palabras por bloque, máximo 2 líneas
- Safe area de TikTok: 10 % superior, 18 % inferior, columna derecha libre
