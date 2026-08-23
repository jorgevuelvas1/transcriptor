/**
 * ============================================================================
 *  CONSTRUCCION DE LA GEOMETRIA REAL DEL ESTRECHO
 * ============================================================================
 *  Descarga (si hace falta) los conjuntos de datos oficiales, recorta la
 *  region del Estrecho de Taiwan, simplifica cada capa a la tolerancia propia
 *  de su escala y escribe `src/data/geo/strait.geo.json`.
 *
 *  NINGUNA coordenada se escribe a mano. La posicion de Kinmen procede de los
 *  limites administrativos publicados por Taiwan; la costa de Fujian y los
 *  distritos de Xiamen proceden de Natural Earth y geoBoundaries.
 *
 *    npm run geo
 * ============================================================================
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Pos = [number, number];
type Ring = Pos[];
/** Primer anillo = contorno exterior; los siguientes, agujeros. */
type Polygon = Ring[];

interface RawSource {
  file: string;
  url: string;
  label: string;
}

const DATA_DIR = resolve(process.cwd(), 'assets/data');
const OUT_FILE = resolve(process.cwd(), 'src/data/geo/strait.geo.json');

const RAW: Record<string, RawSource> = {
  neCountries: {
    file: 'ne_10m_admin_0_countries.geojson',
    url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson',
    label: 'Natural Earth 10m admin 0',
  },
  neMinor: {
    file: 'ne_10m_minor_islands.geojson',
    url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_minor_islands.geojson',
    label: 'Natural Earth 10m minor islands',
  },
  twCounties: {
    file: 'tw_county_g0v.geo.json',
    url: 'https://raw.githubusercontent.com/g0v/twgeojson/master/json/twCounty2010.geo.json',
    label: 'Limites de condado de Taiwán (g0v/twgeojson)',
  },
  chnAdm3: {
    file: 'chn_adm3.geojson',
    url: 'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/gbOpen/CHN/ADM3/geoBoundaries-CHN-ADM3.geojson',
    label: 'geoBoundaries CHN ADM3',
  },
};

// --- Region de interes ------------------------------------------------------
/** Estrecho completo: Fujian, Taiwán, Penghu, Kinmen, Matsu. */
const REGION: [number, number, number, number] = [115.8, 21.4, 124.6, 27.4];
/** Ventana cercana Kinmen / Xiamen. */
const KINMEN_WINDOW: [number, number, number, number] = [117.6, 23.95, 118.95, 25.05];

// ============================================================================
//  Utilidades
// ============================================================================

const download = async (src: RawSource): Promise<void> => {
  const target = resolve(DATA_DIR, src.file);
  if (existsSync(target)) return;
  process.stdout.write(`  descargando ${src.label}...`);
  const res = await fetch(src.url);
  if (!res.ok) throw new Error(`${src.url} -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(target, buf);
  process.stdout.write(` ${(buf.length / 1e6).toFixed(1)} MB\n`);
};

const readJson = (file: string): any =>
  JSON.parse(readFileSync(resolve(DATA_DIR, file), 'utf8'));

const ringBBox = (ring: Ring): [number, number, number, number] => {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const [x, y] of ring) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
};

const intersects = (
  a: [number, number, number, number],
  b: [number, number, number, number]
): boolean => !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);

/** Poligonos (contorno + agujeros) de una geometria. */
const geometryPolygons = (geom: any): Polygon[] => {
  if (!geom) return [];
  if (geom.type === 'Polygon') return [geom.coordinates as Ring[]];
  if (geom.type === 'MultiPolygon') return geom.coordinates as Polygon[];
  return [];
};

/** Extrae poligonos de un FeatureCollection filtrando por bbox y propiedades. */
const collectPolygons = (
  fc: any,
  bbox: [number, number, number, number],
  predicate?: (props: any) => boolean
): Polygon[] => {
  const out: Polygon[] = [];
  for (const f of fc.features ?? []) {
    if (predicate && !predicate(f.properties ?? {})) continue;
    for (const poly of geometryPolygons(f.geometry)) {
      const outer = poly[0];
      if (!outer || outer.length < 4) continue;
      if (!intersects(ringBBox(outer), bbox)) continue;
      out.push(poly);
    }
  }
  return out;
};

/** Todos los puntos de una lista de poligonos, en plano. */
const flattenRings = (polys: Polygon[]): Ring[] => polys.flat();

// --- Simplificacion Douglas-Peucker ----------------------------------------
const perpDist = (p: Pos, a: Pos, b: Pos): number => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const cx = a[0] + t * dx;
  const cy = a[1] + t * dy;
  return Math.hypot(p[0] - cx, p[1] - cy);
};

const simplifyRing = (ring: Ring, tolerance: number): Ring => {
  if (ring.length < 5 || tolerance <= 0) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = 1;
  keep[ring.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, ring.length - 1]];
  while (stack.length) {
    const [lo, hi] = stack.pop()!;
    let best = -1;
    let bestD = tolerance;
    for (let i = lo + 1; i < hi; i++) {
      const d = perpDist(ring[i], ring[lo], ring[hi]);
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best !== -1) {
      keep[best] = 1;
      stack.push([lo, best], [best, hi]);
    }
  }
  const out: Ring = [];
  for (let i = 0; i < ring.length; i++) if (keep[i]) out.push(ring[i]);
  // Un anillo necesita al menos 4 posiciones para seguir siendo poligono.
  return out.length >= 4 ? out : ring;
};

const roundRing = (ring: Ring, decimals: number): Ring => {
  const f = 10 ** decimals;
  const out: Ring = [];
  let prev = '';
  for (const [x, y] of ring) {
    const p: Pos = [Math.round(x * f) / f, Math.round(y * f) / f];
    const key = `${p[0]},${p[1]}`;
    if (key !== prev) {
      out.push(p);
      prev = key;
    }
  }
  if (out.length >= 4) {
    const a = out[0];
    const b = out[out.length - 1];
    if (a[0] !== b[0] || a[1] !== b[1]) out.push([a[0], a[1]]);
  }
  return out;
};

/** Area con signo (formula del zapatero). Positiva = sentido antihorario. */
const signedArea = (ring: Ring): number => {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    s += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return s / 2;
};

/** Area aproximada del anillo en grados cuadrados (para descartar motas). */
const ringArea = (ring: Ring): number => Math.abs(signedArea(ring));

/**
 * Orienta un anillo segun la convencion de d3-geo: contorno exterior en
 * sentido HORARIO y agujeros en sentido antihorario.
 *
 * Ojo: es la orientacion CONTRARIA a la de RFC 7946. d3-geo interpreta los
 * poligonos sobre la esfera y, si el contorno viene al reves, rellena el
 * COMPLEMENTO del poligono: el mar aparece pintado como tierra. Los datos de
 * condados de Taiwán venian con la orientacion invertida, y por eso el mapa
 * se veia como un bloque uniforme con la isla recortada.
 *
 * `scripts/validate.ts` comprueba esta orientacion con `geoContains`.
 */
const orientRing = (ring: Ring, counterClockwise: boolean): Ring => {
  const isCCW = signedArea(ring) > 0;
  return isCCW === counterClockwise ? ring : [...ring].reverse();
};

interface LayerOptions {
  tolerance: number;
  decimals: number;
  minArea?: number;
}

const buildLayer = (polys: Polygon[], opts: LayerOptions): Polygon[] => {
  const out: Polygon[] = [];
  for (const poly of polys) {
    const [outer, ...holes] = poly;
    if (opts.minArea && ringArea(outer) < opts.minArea) continue;

    const simplifiedOuter = roundRing(
      simplifyRing(outer, opts.tolerance),
      opts.decimals
    );
    if (simplifiedOuter.length < 4) continue;

    const simplifiedHoles = holes
      .map((h) => roundRing(simplifyRing(h, opts.tolerance), opts.decimals))
      .filter((h) => h.length >= 4);

    out.push([
      orientRing(simplifiedOuter, false),
      ...simplifiedHoles.map((h) => orientRing(h, true)),
    ]);
  }
  return out;
};

// --- Distancia geodesica aproximada (plano local) ---------------------------
const R_KM = 6371.0088;
const makeProjector = (lat0: number) => {
  const k = Math.cos((lat0 * Math.PI) / 180);
  return ([lon, lat]: Pos): Pos => [
    ((lon * Math.PI) / 180) * k * R_KM,
    ((lat * Math.PI) / 180) * R_KM,
  ];
};

const segDistance = (p: Pos, a: Pos, b: Pos): number => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy))
  );
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
};

/** Par de puntos mas proximos entre dos conjuntos de anillos. */
const nearestPair = (
  a: Ring[],
  b: Ring[],
  lat0: number
): { km: number; from: Pos; to: Pos } => {
  const proj = makeProjector(lat0);
  const bProj = b.map((r) => r.map(proj));
  let best = { km: Infinity, from: [0, 0] as Pos, to: [0, 0] as Pos };
  for (const ra of a) {
    for (const p of ra) {
      const P = proj(p);
      for (let bi = 0; bi < bProj.length; bi++) {
        const rb = bProj[bi];
        for (let i = 0; i < rb.length - 1; i++) {
          const d = segDistance(P, rb[i], rb[i + 1]);
          if (d < best.km) {
            // Recupera el punto original mas cercano del segmento.
            const orig =
              segDistance(P, rb[i], rb[i]) <= segDistance(P, rb[i + 1], rb[i + 1])
                ? b[bi][i]
                : b[bi][i + 1];
            best = { km: d, from: p, to: orig };
          }
        }
      }
    }
  }
  return best;
};

const centroidOf = (rings: Ring[]): Pos => {
  let sx = 0,
    sy = 0,
    n = 0;
  for (const r of rings)
    for (const [x, y] of r) {
      sx += x;
      sy += y;
      n++;
    }
  return [sx / n, sy / n];
};

const westernmost = (rings: Ring[]): Pos => {
  let best: Pos = [Infinity, 0];
  for (const r of rings) for (const p of r) if (p[0] < best[0]) best = [p[0], p[1]];
  return best;
};

// ============================================================================
//  Programa principal
// ============================================================================

const main = async (): Promise<void> => {
  console.log('Geometria del Estrecho de Taiwán');
  mkdirSync(DATA_DIR, { recursive: true });
  for (const src of Object.values(RAW)) await download(src);

  console.log('  procesando capas...');
  const ne = readJson(RAW.neCountries.file);
  const neMinor = readJson(RAW.neMinor.file);
  const tw = readJson(RAW.twCounties.file);
  const chn = readJson(RAW.chnAdm3.file);

  // --- China: costa regional (Natural Earth) -------------------------------
  const chinaWideRaw = collectPolygons(ne, REGION, (p) => p.ADM0_A3 === 'CHN');

  // --- China: detalle de los distritos de Xiamen (geoBoundaries ADM3) ------
  // A nivel ADM3 la zona solo contiene distritos efectivamente controlados
  // por la RPC. Se excluye explicitamente cualquier unidad que corresponda a
  // territorio administrado por Taiwán y unicamente reclamado por Pekin.
  const CLAIMED_BY_PRC_ADMINISTERED_BY_TAIWAN = /jinmen|kinmen|lienchiang|matsu|wuqiu/i;
  const chinaDetailRaw = collectPolygons(
    chn,
    KINMEN_WINDOW,
    (p) => !CLAIMED_BY_PRC_ADMINISTERED_BY_TAIWAN.test(String(p.shapeName ?? ''))
  );

  // --- Taiwán: condados oficiales -----------------------------------------
  const isCounty = (name: string) => (p: any) => p.COUNTYNAME === name;
  const kinmenRaw = collectPolygons(tw, KINMEN_WINDOW, isCounty('金門縣'));
  const matsuRaw = collectPolygons(tw, REGION, isCounty('連江縣'));
  const penghuRaw = collectPolygons(tw, REGION, isCounty('澎湖縣'));
  const taiwanMainRaw = collectPolygons(
    tw,
    REGION,
    (p) => !['金門縣', '連江縣', '澎湖縣'].includes(p.COUNTYNAME)
  );

  // --- Medicion sobre geometria real ---------------------------------------
  console.log('  midiendo distancias reales...');
  const near = nearestPair(
    flattenRings(kinmenRaw),
    flattenRings(chinaDetailRaw),
    24.44
  );

  const layers = {
    chinaWide: buildLayer(chinaWideRaw, {
      tolerance: 0.006,
      decimals: 4,
      minArea: 0.0006,
    }),
    chinaDetail: buildLayer(chinaDetailRaw, { tolerance: 0.0006, decimals: 5 }),
    taiwanMain: buildLayer(taiwanMainRaw, {
      tolerance: 0.004,
      decimals: 4,
      minArea: 0.0004,
    }),
    kinmen: buildLayer(kinmenRaw, { tolerance: 0.00035, decimals: 5 }),
    // Matsu y Penghu son contexto de fondo: se conservan solo las islas con
    // presencia visual real a la escala en que aparecen.
    matsu: buildLayer(matsuRaw, {
      tolerance: 0.0015,
      decimals: 4,
      minArea: 0.00002,
    }),
    penghu: buildLayer(penghuRaw, {
      tolerance: 0.0015,
      decimals: 4,
      minArea: 0.00004,
    }),
  };

  const kinmenCentroid = centroidOf(flattenRings(kinmenRaw));
  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      crs: 'WGS84 (EPSG:4326)',
      region: REGION,
      kinmenWindow: KINMEN_WINDOW,
      sources: Object.values(RAW).map((r) => ({ label: r.label, url: r.url })),
      note: 'Geometria real recortada y simplificada. Ninguna posicion se ha ajustado a mano.',
    },
    /** Puntos notables derivados de la geometria, no escritos a mano. */
    points: {
      kinmenCentroid,
      kinmenWesternmost: westernmost(flattenRings(kinmenRaw)),
      /** Par mas proximo Kinmen <-> territorio controlado por la RPC. */
      nearestKinmenPoint: near.from,
      nearestPrcPoint: near.to,
      nearestDistanceKm: Math.round(near.km * 1000) / 1000,
    },
    layers,
  };

  mkdirSync(resolve(process.cwd(), 'src/data/geo'), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(payload));

  const counts = Object.entries(layers)
    .map(
      ([k, v]) =>
        `${k}=${v.length} pol/${v.reduce(
          (a, poly) => a + poly.reduce((b, r) => b + r.length, 0),
          0
        )} pts`
    )
    .join('  ');
  const bytes = readFileSync(OUT_FILE).length;
  console.log(`  ${counts}`);
  console.log(
    `  distancia minima Kinmen -> RPC (datos disponibles): ${payload.points.nearestDistanceKm} km`
  );
  console.log(`  escrito ${OUT_FILE} (${(bytes / 1024).toFixed(0)} KB)`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
