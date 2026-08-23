/**
 * ============================================================================
 *  FUENTES EDITORIALES
 * ============================================================================
 *  Nunca inventar una fuente. Este archivo es la referencia citable del video
 *  y se incrusta como metadata del MP4 durante el render.
 */

export interface Source {
  id: string;
  publisher: string;
  date: string;
  title: string;
  covers: string[];
}

export const SOURCES: Source[] = [
  {
    id: 'reuters-kinmen-2026-08-23',
    publisher: 'Reuters',
    date: '2026-08-23',
    title:
      'Visita del presidente Lai Ching-te a Kinmen y aniversario del inicio de la crisis del Estrecho de 1958.',
    covers: [
      'Visita de Lai a Kinmen el 23 de agosto de 2026',
      '68 aniversario del inicio de la crisis de 1958',
      'Argumento de paz mediante una defensa suficientemente fuerte',
      'Respaldo a un aumento del gasto militar',
    ],
  },
  {
    id: 'reuters-budget-2026-08-20',
    publisher: 'Reuters',
    date: '2026-08-20',
    title: 'Propuesta de presupuesto de defensa de Taiwán para 2027.',
    covers: [
      'NT$1.1225 billones de gasto relacionado con defensa para 2027',
      'Equivalencia aproximada de US$31.4 mil millones',
      'Aumento aproximado del 18% interanual',
      'Superación del 3% del PIB por primera vez',
      'Areas: drones, misiles, modernización, submarinos, Guardia Costera',
    ],
  },
  {
    id: 'state-dept-historian-1958',
    publisher: 'U.S. Department of State, Office of the Historian',
    date: '1958',
    title:
      'Documentos históricos sobre la crisis del Estrecho de Taiwán de 1958 (Foreign Relations of the United States).',
    covers: [
      'Bombardeo de Kinmen iniciado el 23 de agosto de 1958',
      'Enfrentamientos navales y aéreos; apoyo de Estados Unidos',
      'Debate interno en Washington sobre el valor estratégico y la vulnerabilidad militar de las islas costeras',
    ],
  },
];

/**
 * Procedencia de la geometria usada en los mapas.
 * Los mapas del video NO usan posiciones aproximadas a ojo: toda la geometria
 * proviene de los conjuntos de datos listados aqui.
 */
export const GEO_SOURCES = [
  {
    id: 'natural-earth-10m',
    publisher: 'Natural Earth (dominio publico)',
    dataset: 'ne_10m_admin_0_countries, ne_10m_minor_islands',
    usedFor: 'Costa de China continental, Fujian y contexto regional del Estrecho.',
  },
  {
    id: 'tw-gov-counties',
    publisher: 'Datos de limites administrativos de Taiwán (via g0v/twgeojson)',
    dataset: 'twCounty2010.geo.json',
    usedFor:
      'Contorno de la isla de Taiwán y geometria de alta resolucion del condado de Kinmen (incluye Lieyu / Pequeno Kinmen).',
  },
  {
    id: 'geoboundaries-chn-adm3',
    publisher: 'geoBoundaries (gbOpen), William & Mary geoLab',
    dataset: 'geoBoundaries-CHN-ADM3',
    usedFor:
      'Detalle de los distritos de Xiamen (Siming, Huli, Xiang’an) controlados por la RPC, frente a Kinmen.',
  },
] as const;

/**
 * NOTA DE PRECISION SOBRE LA DISTANCIA "< 2 KM".
 *
 * La cifra editorial "< 2 km" corresponde a la separacion entre los islotes
 * mas proximos: el sector occidental de Lieyu (Pequeno Kinmen, administrado
 * por Taiwan) y los islotes controlados por la RPC frente a Xiamen
 * (Jiaoyu / area de Dadeng).
 *
 * Esos islotes son demasiado pequenos para figurar en los conjuntos de datos
 * abiertos disponibles en este entorno. Medida sobre la geometria realmente
 * disponible, la distancia minima entre el condado de Kinmen y territorio
 * controlado por la RPC es de 3.56 km (Kinmen -> distrito de Xiang’an) y
 * de 3.81 km hasta la isla de Xiamen (distrito de Siming).
 *
 * En consecuencia:
 *  - la linea de distancia se dibuja entre puntos REALES de la geometria,
 *  - la etiqueta "< 2 KM" refleja el dato editorial de la separacion minima,
 *  - no se altera ni se desplaza ninguna geometria para forzar la cifra.
 */
export const DISTANCE_PROVENANCE = {
  editorialLabel: '< 2 KM',
  measuredWithAvailableData: {
    kinmenToXiangAnKm: 3.559,
    kinmenToXiamenIslandKm: 3.814,
  },
  note:
    'Los islotes mas proximos (Jiaoyu / Dadeng) no estan presentes en los datasets abiertos accesibles; la etiqueta editorial se mantiene y la geometria no se modifica.',
} as const;
