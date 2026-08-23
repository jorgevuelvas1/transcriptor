/**
 * ============================================================================
 *  GEOGRAFIA
 * ============================================================================
 *  Acceso tipado a la geometria real construida por `npm run geo`, mas las
 *  camaras cartograficas usadas por las escenas.
 *
 *  Todas las posiciones proceden del archivo generado; ninguna se escribe a
 *  mano ni se ajusta "a ojo".
 * ============================================================================
 */

import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import strait from './geo/strait.geo.json';

export type Pos = [number, number];
export type Ring = Pos[];
/** Primer anillo = contorno exterior; los siguientes, agujeros. */
export type Polygon = Ring[];

export interface StraitGeo {
  meta: {
    generatedAt: string;
    crs: string;
    region: [number, number, number, number];
    kinmenWindow: [number, number, number, number];
    sources: Array<{ label: string; url: string }>;
    note: string;
  };
  points: {
    kinmenCentroid: Pos;
    kinmenWesternmost: Pos;
    nearestKinmenPoint: Pos;
    nearestPrcPoint: Pos;
    nearestDistanceKm: number;
  };
  layers: {
    chinaWide: Polygon[];
    chinaDetail: Polygon[];
    taiwanMain: Polygon[];
    kinmen: Polygon[];
    matsu: Polygon[];
    penghu: Polygon[];
  };
}

export const GEO = strait as unknown as StraitGeo;
export const LAYERS = GEO.layers;
export const POINTS = GEO.points;

export type LayerName = keyof StraitGeo['layers'];

/**
 * Convierte poligonos en un objeto GeoJSON que d3-geo pueda dibujar.
 *
 * La orientacion de los anillos ya viene normalizada por `npm run geo`
 * (contorno antihorario, agujeros horarios). Sin eso, d3-geo rellenaria el
 * complemento del poligono sobre la esfera.
 */
export const ringsToGeo = (polygons: Polygon[]): GeoPermissibleObjects =>
  ({
    type: 'MultiPolygon',
    coordinates: polygons,
  }) as unknown as GeoPermissibleObjects;

/** Todos los anillos de una capa, sin distinguir contorno de agujero. */
export const layerRings = (name: LayerName): Ring[] => LAYERS[name].flat();

/** Cacheado: cada capa se convierte una sola vez. */
const geoCache = new Map<LayerName, GeoPermissibleObjects>();
export const layerGeo = (name: LayerName): GeoPermissibleObjects => {
  let cached = geoCache.get(name);
  if (!cached) {
    cached = ringsToGeo(LAYERS[name]);
    geoCache.set(name, cached);
  }
  return cached;
};

// ============================================================================
//  CAMARA CARTOGRAFICA
// ============================================================================

export interface Camera {
  /** Centro geografico [lon, lat]. */
  center: Pos;
  /** Grados de longitud abarcados por el ancho del viewport. */
  spanLon: number;
  /**
   * Grados de LATITUD abarcados por el alto del viewport. Si se indica, manda
   * sobre `spanLon`.
   *
   * En un panel alto y estrecho, encuadrar por longitud deja fuera de escala
   * la vertical (se ve demasiada latitud y el territorio queda diminuto).
   * Encuadrar por altura mantiene el tamano del territorio constante y hace
   * que al estrecharse el panel se vea menos longitud, que es justo lo que
   * debe ocurrir.
   */
  spanLat?: number;
}

/**
 * En una proyeccion Mercator, x = escala * (lambda - lambda0). Por tanto, para
 * abarcar `spanLon` grados a lo ancho de `width` pixeles:
 *
 *     escala = width * 180 / (spanLon * PI)
 *
 * Esto hace que la camara sea exacta y reproducible, en vez de un encuadre
 * ajustado a mano.
 */
export const cameraScale = (spanLon: number, width: number): number =>
  (width * 180) / (spanLon * Math.PI);

/** y de Mercator para una latitud dada, en radios de esfera unidad. */
const mercatorY = (lat: number): number =>
  Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

/** Escala necesaria para que `spanLat` grados de latitud llenen `height`. */
export const cameraScaleFromLat = (
  centerLat: number,
  spanLat: number,
  height: number
): number =>
  height /
  (mercatorY(centerLat + spanLat / 2) - mercatorY(centerLat - spanLat / 2));

export const resolveScale = (
  camera: Camera,
  width: number,
  height: number
): number =>
  camera.spanLat !== undefined
    ? cameraScaleFromLat(camera.center[1], camera.spanLat, height)
    : cameraScale(camera.spanLon, width);

export const makeProjection = (camera: Camera, width: number, height: number) =>
  geoMercator()
    .center(camera.center)
    .scale(resolveScale(camera, width, height))
    .translate([width / 2, height / 2]);

export const makePath = (camera: Camera, width: number, height: number) =>
  geoPath(makeProjection(camera, width, height));

/** Interpola dos camaras. La escala se interpola en espacio logaritmico. */
export const lerpCamera = (a: Camera, b: Camera, t: number): Camera => {
  const logLerp = (x: number, y: number) =>
    Math.exp(Math.log(x) + (Math.log(y) - Math.log(x)) * t);
  return {
    center: [
      a.center[0] + (b.center[0] - a.center[0]) * t,
      a.center[1] + (b.center[1] - a.center[1]) * t,
    ],
    spanLon: logLerp(a.spanLon, b.spanLon),
    spanLat:
      a.spanLat !== undefined && b.spanLat !== undefined
        ? logLerp(a.spanLat, b.spanLat)
        : undefined,
  };
};

// --- Camaras nombradas ------------------------------------------------------
// Los centros se derivan de la geometria real (centroides / puntos medidos).

/**
 * Apertura de la escena 1: la costa de Fujian y Kinmen entran en cuadro.
 * El centro es el punto medio entre el centroide real de Kinmen y el punto
 * de territorio controlado por la RPC mas proximo a la isla.
 */
export const CAM_KINMEN_WIDE: Camera = {
  center: [118.28, 24.45],
  spanLon: 1.05,
};

/** Cierre de la escena 1: encuadre de la cota de distancia. */
export const CAM_KINMEN_GAP: Camera = {
  center: [118.30, 24.47],
  spanLon: 0.62,
};

/** Kinmen entera frente a la costa de Fujian. */
export const CAM_KINMEN: Camera = {
  center: [POINTS.kinmenCentroid[0] - 0.08, POINTS.kinmenCentroid[1] + 0.03],
  spanLon: 1.2,
};

/** Kinmen + Xiamen + costa continental. */
export const CAM_FUJIAN: Camera = {
  center: [118.16, 24.47],
  spanLon: 2.4,
};

/**
 * Estrecho completo: costa de Fujian a la izquierda, Taiwán a la derecha.
 * Con 5.4 grados de longitud entran lon 117.2-122.6, que cubre ambas orillas.
 */
export const CAM_STRAIT: Camera = {
  center: [119.9, 23.9],
  spanLon: 5.4,
};

/** Solo Taiwán, encuadre para la transformacion en hemiciclo. */
export const CAM_TAIWAN: Camera = {
  center: [120.98, 23.72],
  spanLon: 3.9,
};

/** Panel vertical estrecho (mitad de pantalla) para el split de la escena 9. */
export const CAM_STRAIT_PANEL: Camera = {
  center: [121.0, 23.62],
  spanLon: 4.7,
  spanLat: 6.2,
};

/** Recuadro del Estrecho al final de la cadena causal (escena 10). */
export const CAM_STRAIT_INSET: Camera = {
  center: [120.0, 23.9],
  spanLon: 5.6,
  spanLat: 5.6,
};

// ============================================================================
//  MEDIDAS
// ============================================================================

const R_KM = 6371.0088;

/** Distancia en kilometros entre dos posiciones (formula del haversine). */
export const distanceKm = (a: Pos, b: Pos): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(s));
};

/**
 * Devuelve `count` posiciones REALES de una capa, escogidas entre las mas
 * proximas a `target` y separadas al menos `minSeparationDeg` entre si.
 *
 * Se usa para anclar trayectorias y marcadores en puntos que existen en la
 * geometria, en lugar de inventar coordenadas.
 */
export const sampleNearestPoints = (
  layer: LayerName,
  target: Pos,
  count: number,
  minSeparationDeg = 0.03
): Pos[] => {
  const scored: Array<{ p: Pos; d: number }> = [];
  for (const ring of layerRings(layer)) {
    for (const p of ring) {
      scored.push({ p, d: (p[0] - target[0]) ** 2 + (p[1] - target[1]) ** 2 });
    }
  }
  scored.sort((a, b) => a.d - b.d);

  const picked: Pos[] = [];
  for (const { p } of scored) {
    if (picked.length >= count) break;
    const farEnough = picked.every(
      (q) => Math.hypot(q[0] - p[0], q[1] - p[1]) >= minSeparationDeg
    );
    if (farEnough) picked.push(p);
  }
  return picked;
};

/** Test de punto en poligono (ray casting) sobre un conjunto de anillos. */
const pointInRings = (rings: Ring[], p: Pos): boolean => {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (
        yi > p[1] !== yj > p[1] &&
        p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }
  }
  return inside;
};

/**
 * Muestrea posiciones REALES dentro de una capa (rechazo sobre su bbox).
 * Determinista: la misma semilla produce siempre el mismo conjunto.
 *
 * Se usa para la transformacion del mapa de Taiwán en el hemiciclo: los puntos
 * de partida son lugares del territorio, no posiciones inventadas.
 */
export const samplePointsInLayer = (
  layer: LayerName,
  count: number,
  seed = 1
): Pos[] => {
  const rings = layerRings(layer);
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const ring of rings)
    for (const [x, y] of ring) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }

  // PRNG determinista (mulberry32).
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const out: Pos[] = [];
  for (let tries = 0; tries < count * 400 && out.length < count; tries++) {
    const p: Pos = [x0 + rand() * (x1 - x0), y0 + rand() * (y1 - y0)];
    if (pointInRings(rings, p)) out.push(p);
  }
  return out;
};

/**
 * Anclajes de rotulacion.
 *
 * Son puntos de COLOCACION DE TEXTO sobre el mapa, no geometria: definen donde
 * se apoya cada etiqueta. La geometria en si (y el centroide de Kinmen, que se
 * toma de los datos) nunca se ajusta a ojo.
 */
export interface PlaceLabel {
  id: string;
  label: string;
  position: Pos;
  anchor?: 'start' | 'middle' | 'end';
}

export const PLACES: Record<string, PlaceLabel> = {
  // --- vista corta (Kinmen / Xiamen) ---
  chinaClose: {
    id: 'chinaClose',
    label: 'CHINA',
    position: [118.075, 24.735],
    anchor: 'start',
  },
  xiamen: { id: 'xiamen', label: 'XIAMEN', position: [118.13, 24.462], anchor: 'end' },
  kinmen: {
    id: 'kinmen',
    label: 'KINMEN',
    position: POINTS.kinmenCentroid,
    anchor: 'start',
  },
  // --- vista amplia del Estrecho ---
  chinaWide: { id: 'chinaWide', label: 'CHINA', position: [118.05, 25.6], anchor: 'start' },
  fujian: { id: 'fujian', label: 'FUJIAN', position: [117.9, 24.75], anchor: 'start' },
  taiwan: { id: 'taiwan', label: 'TAIWÁN', position: [120.95, 23.62], anchor: 'middle' },
  strait: {
    id: 'strait',
    label: 'ESTRECHO DE TAIWÁN',
    position: [119.55, 24.35],
    anchor: 'middle',
  },
};

