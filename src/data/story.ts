/**
 * ============================================================================
 *  DATOS EDITORIALES CENTRALIZADOS
 * ============================================================================
 *  Unica fuente de verdad para cifras, fechas y etiquetas del video.
 *  NINGUN componente debe escribir un numero a mano: todos leen de aqui.
 *
 *  Separacion explicita entre HECHO y ANALISIS (ver `CLAIMS`).
 * ============================================================================
 */

export const STORY_DATA = {
  publicationDate: '2026-08-23',

  // --- Kinmen -------------------------------------------------------------
  kinmenDistanceLabel: '< 2 KM',
  kinmenAdministeredBy: 'TAIWÁN',

  // --- Crisis de 1958 -----------------------------------------------------
  crisisStartDate: '1958-08-23',
  crisisStartLabel: '23 AGO 1958',
  anniversaryYears: 68,

  // --- Visita 2026 --------------------------------------------------------
  visitDateLabel: '23 AGO 2026',

  // --- Presupuesto de defensa 2027 ---------------------------------------
  defenceBudget2027TWDTrillion: 1.1225,
  defenceBudget2027USDApproxBillion: 31.4,
  defenceIncreasePercent: 18,
  defenceGDPShareLabel: '>3%',

  // --- Politica interna ---------------------------------------------------
  previousAdditionalPackageApprovedApprox: 0.67,
  previousPackageDateLabel: 'MAYO 2026',
} as const;

/**
 * Etiquetas de cifras ya formateadas.
 *
 * NOTA LINGUISTICA IMPORTANTE:
 * En espanol "billon" = 10^12 (un millon de millones). Para evitar la
 * ambiguedad con el "trillion" ingles y con el dolar estadounidense,
 * NUNCA se usa la abreviatura "$1T" en pantalla.
 */
export const LABELS = {
  budgetPrimary: `${STORY_DATA.defenceBudget2027TWDTrillion.toFixed(4)} BILLONES NT$`,
  budgetAlternate: `NT$${STORY_DATA.defenceBudget2027TWDTrillion.toFixed(4)} BILLONES`,
  budgetUsd: `≈ US$${STORY_DATA.defenceBudget2027USDApproxBillion.toFixed(1)} MIL MILLONES`,
  budgetIncrease: `+${STORY_DATA.defenceIncreasePercent}%`,
  budgetGdp: `${STORY_DATA.defenceGDPShareLabel} DEL PIB`,
  budgetScope: 'DEFENSA · 2027',
  approvedShare: `≈ ${Math.round(
    STORY_DATA.previousAdditionalPackageApprovedApprox * 3
  )}/3 APROBADO`,
  approvedShareExact: '≈ 2/3 APROBADO',
  additionalPackage: `PAQUETE ADICIONAL · ${STORY_DATA.previousPackageDateLabel}`,
} as const;

/** Areas contempladas en el presupuesto. Iconografia esquematica, sin fotos. */
export const BUDGET_DOMAINS = [
  { id: 'drones', label: 'DRONES' },
  { id: 'missiles', label: 'MISILES' },
  { id: 'submarines', label: 'SUBMARINOS' },
  { id: 'coastguard', label: 'GUARDIA COSTERA' },
] as const;

export type BudgetDomainId = (typeof BUDGET_DOMAINS)[number]['id'];

/**
 * ============================================================================
 *  HECHOS vs ANALISIS
 * ============================================================================
 *  `scripts/editorialCheck.ts` valida que el texto en pantalla y la narracion
 *  respeten esta separacion antes de permitir el render.
 */
export const CLAIMS = {
  facts: [
    'Kinmen esta administrada por Taiwan y se encuentra frente a la costa de Fujian, controlada por la RPC.',
    'El 23 de agosto de 1958 fuerzas de la RPC iniciaron un intenso bombardeo contra Kinmen.',
    'La crisis de 1958 produjo enfrentamientos navales y aereos y termino sin que China tomara Kinmen.',
    'Documentos historicos estadounidenses muestran que en 1958 autoridades de Washington debatian el valor estrategico de las islas costeras y reconocian su vulnerabilidad militar.',
    'El 23 de agosto de 2026 el presidente Lai Ching-te visito Kinmen, coincidiendo con el 68 aniversario del inicio de la crisis.',
    'Taiwan propuso para 2027 gasto relacionado con defensa por NT$1.1225 billones (~US$31.4 mil millones), aproximadamente +18% interanual y por encima del 3% del PIB por primera vez.',
    'El Parlamento de Taiwan esta controlado por partidos de oposicion.',
    'En mayo de 2026 los legisladores aprobaron aproximadamente dos terceras partes de una solicitud adicional de gasto en defensa y dejaron fuera algunos programas, incluidos componentes relacionados con drones.',
  ],
  analysis: [
    'La capacidad de Taiwan para sostener una estrategia de disuasion depende tambien de producir consensos politicos internos suficientes para financiarla.',
    'La visita de Lai a Kinmen puede interpretarse no solamente como una senal hacia Beijing, sino tambien como un argumento politico dirigido a la sociedad y a actores internos taiwaneses.',
  ],
  /** Afirmaciones prohibidas. Verificadas por el control editorial automatico. */
  forbidden: [
    'China va a invadir Taiwan',
    'Lai hablaba en secreto al Parlamento',
    'La oposicion apoya a China / es pro-China',
    'El Parlamento bloqueo todo el presupuesto',
    'La vulnerabilidad de Kinmen en 1958 es la evaluacion actual de EE.UU.',
  ],
} as const;

/**
 * ============================================================================
 *  NARRACION
 * ============================================================================
 *  Guion definitivo, dividido en segmentos. Cada segmento se sintetiza por
 *  separado para poder MEDIR su duracion real y sincronizar con precision.
 *
 *  - `text`      : texto canonico (base de los subtitulos).
 *  - `ttsText`   : variante para el sintetizador (numeros expandidos).
 *  - `pauseAfter`: pausa editorial requerida, en segundos.
 *  - `pace`      : 'base' | 'slow' | 'shift' -> guia de ritmo y entonacion.
 *  - `anchor`    : instante deseado de inicio (s). Es una preferencia suave:
 *                  el ajustador nunca solapa segmentos.
 */
export type Pace = 'base' | 'slow' | 'shift';

export interface NarrationSegment {
  id: string;
  scene: number;
  text: string;
  ttsText?: string;
  pauseAfter: number;
  pace: Pace;
  anchor: number;
}

export const NARRATION: NarrationSegment[] = [
  {
    id: 's01',
    scene: 1,
    text: '¿Por qué el presidente de Taiwán eligió una pequeña isla a menos de dos kilómetros de China para hablar de fuerza militar?',
    pauseAfter: 0.14,
    pace: 'base',
    anchor: 0.3,
  },
  {
    id: 's02',
    scene: 2,
    text: 'Porque Kinmen no es solo historia.',
    ttsText: 'Porque Kinmen no es solo historia.',
    // Pausa editorial explicitamente pedida tras esta frase.
    pauseAfter: 0.42,
    pace: 'base',
    anchor: 7.45,
  },
  {
    id: 's03',
    scene: 3,
    text: 'Es una advertencia sobre la disuasión.',
    pauseAfter: 0.13,
    pace: 'base',
    anchor: 10.05,
  },
  {
    id: 's04',
    scene: 3,
    text: 'En 1958, fuerzas chinas bombardearon estas islas',
    ttsText: 'En mil novecientos cincuenta y ocho, fuerzas chinas bombardearon estas islas',
    pauseAfter: 0.12,
    pace: 'base',
    anchor: 12.35,
  },
  {
    id: 's05',
    scene: 4,
    text: 'y arrastraron a Estados Unidos a una crisis por un territorio que incluso funcionarios estadounidenses consideraban militarmente vulnerable.',
    pauseAfter: 0.2,
    pace: 'base',
    anchor: 16.1,
  },
  {
    id: 's06',
    scene: 5,
    text: 'Sesenta y ocho años después, Lai Ching-te volvió a Kinmen',
    pauseAfter: 0.13,
    pace: 'base',
    anchor: 24.15,
  },
  {
    id: 's07',
    scene: 6,
    text: 'mientras Taiwán propone un presupuesto de defensa récord, superior a un billón de dólares taiwaneses.',
    pauseAfter: 0.45,
    pace: 'base',
    anchor: 27.45,
  },
  {
    id: 's08',
    scene: 7,
    // Cambio de tono: aqui gira la tesis del video.
    text: 'Pero quizá Beijing no sea el único destinatario.',
    pauseAfter: 0.28,
    pace: 'shift',
    anchor: 33.1,
  },
  {
    id: 's09',
    scene: 8,
    text: 'El Parlamento, controlado por la oposición, ya ha frenado partes del gasto militar adicional.',
    pauseAfter: 0.18,
    pace: 'base',
    anchor: 36.45,
  },
  {
    id: 's10',
    scene: 9,
    text: 'Y eso cambia la historia.',
    // Pausa editorial explicitamente pedida tras esta frase.
    pauseAfter: 0.48,
    pace: 'slow',
    anchor: 41.9,
  },
  {
    id: 's11',
    scene: 9,
    text: 'La pregunta no es solo si Taiwán puede resistir un ataque.',
    pauseAfter: 0.16,
    pace: 'slow',
    anchor: 43.9,
  },
  {
    id: 's12',
    scene: 9,
    text: 'Es si su democracia puede financiar la disuasión antes de que ocurra.',
    pauseAfter: 0.18,
    pace: 'slow',
    anchor: 47.6,
  },
  {
    id: 's13',
    scene: 10,
    text: 'Porque la primera batalla por la seguridad de Taiwán podría librarse en el Parlamento, mucho antes que en el Estrecho.',
    pauseAfter: 0.0,
    pace: 'slow',
    anchor: 51.5,
  },
];

/** Guion completo, para control editorial y para `sources`/metadata. */
export const NARRATION_FULL_TEXT = NARRATION.map((s) => s.text).join(' ');

/** Texto que realmente se envia al sintetizador. */
export const ttsTextOf = (s: NarrationSegment): string => s.ttsText ?? s.text;

/**
 * Direccion de voz enviada al motor TTS (parametro `instructions` en OpenAI).
 * Voz masculina, espanol latinoamericano neutro, registro de analista.
 */
export const VOICE_DIRECTION = [
  'Idioma: español latinoamericano neutro.',
  'Voz masculina, edad percibida entre 30 y 40 años.',
  'Registro: analista internacional explicando una conclusión que no era evidente al principio.',
  'Tono analítico, inteligente, seguro y natural, ligeramente intrigante.',
  'Ritmo dinámico pero sin prisa; articulación clara.',
  'NO usar tono solemne, propagandístico, de tráiler de cine, de locutor comercial',
  'ni de presentador de noticiero tradicional.',
  'Sin música ni efectos: solo voz limpia.',
].join(' ');

/** Matices de entonacion por segmento. */
export const PACE_DIRECTION: Record<Pace, string> = {
  base: 'Ritmo dinámico y natural.',
  shift: 'Baja ligeramente el tono y marca un giro: aquí cambia el sentido de la historia.',
  slow: 'Ritmo ligeramente más lento y reflexivo, cerrando el argumento.',
};
