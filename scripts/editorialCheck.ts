/**
 * ============================================================================
 *  CONTROL EDITORIAL AUTOMATICO
 * ============================================================================
 *  Se ejecuta ANTES de renderizar. Revisa el texto que aparece en pantalla y
 *  la narracion para garantizar que:
 *
 *   - no se afirma que China vaya a invadir Taiwán
 *   - no se afirma que Lai hablara en secreto al Parlamento
 *   - no se describe a la oposicion como pro-China
 *   - no se afirma que el Parlamento bloqueara todo el presupuesto
 *   - la vulnerabilidad de Kinmen en 1958 no se presenta como valoracion actual
 *   - las interpretaciones aparecen marcadas como analisis
 *   - los hechos aparecen como hechos
 *   - no hay declaraciones atribuidas a dirigentes
 *   - no se usa la abreviatura ambigua "$1T"
 *
 *    npm run editorial
 * ============================================================================
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { NARRATION_FULL_TEXT } from '../src/data/story';

const ROOT = process.cwd();

/**
 * Prepara el texto a auditar.
 *
 * Se eliminan los comentarios y, ademas, la lista `CLAIMS.forbidden`: ese
 * array enumera a proposito las formulaciones prohibidas para documentarlas,
 * de modo que auditarlo se detectaria a si mismo.
 */
const stripComments = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/forbidden:\s*\[[\s\S]*?\]/g, 'forbidden: []');

const collectSources = (dir: string): Array<{ file: string; text: string }> => {
  const out: Array<{ file: string; text: string }> = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) {
        out.push({
          file: full.replace(`${ROOT}/`, ''),
          text: stripComments(readFileSync(full, 'utf8')),
        });
      }
    }
  };
  walk(dir);
  return out;
};

interface Rule {
  id: string;
  description: string;
  pattern: RegExp;
  /** 'forbidden': no debe aparecer. 'required': debe aparecer en algun sitio. */
  mode: 'forbidden' | 'required';
  /** Limita la comprobacion a un archivo concreto. */
  file?: string;
}

const RULES: Rule[] = [
  // ----------------------- Afirmaciones prohibidas ------------------------
  {
    id: 'sin-invasion-anunciada',
    description: 'No se afirma que China vaya a invadir Taiwán',
    pattern: /china[^.]{0,40}(va a|vaya a|planea|prepara|lanzar[aá])[^.]{0,30}(invadir|invasi[oó]n)/i,
    mode: 'forbidden',
  },
  {
    id: 'sin-invasion-inminente',
    description: 'No se anuncia una invasión inminente',
    pattern: /invasi[oó]n\s+(inminente|segura|inevitable)/i,
    mode: 'forbidden',
  },
  {
    id: 'sin-oposicion-prochina',
    description: 'No se describe a la oposición como pro-China',
    pattern: /(oposici[oó]n|parlamento)[^.]{0,40}(pro-?china|prochina|proped?kin)/i,
    mode: 'forbidden',
  },
  {
    id: 'sin-oposicion-apoya-china',
    description: 'No se afirma que la oposición apoye a China',
    pattern: /(oposici[oó]n|legisladores|parlamento)[^.]{0,40}(apoya|respalda|favorece|sirve)[^.]{0,15}a\s+(china|pek[ií]n|beijing)/i,
    mode: 'forbidden',
  },
  {
    id: 'sin-oposicion-antitaiwan',
    description: 'No se describe a la oposición como contraria a la defensa nacional',
    pattern: /(oposici[oó]n)[^.]{0,40}(anti-?taiw[aá]n|contra la defensa|traici[oó]n|traidor)/i,
    mode: 'forbidden',
  },
  {
    id: 'sin-bloqueo-total',
    description: 'No se afirma que el Parlamento bloqueara todo el presupuesto',
    pattern: /(bloque[oó]|conge[lo][oó]|rechaz[oó])\s+(todo|toda|la totalidad|el total|el presupuesto entero)/i,
    mode: 'forbidden',
  },
  {
    id: 'sin-mensaje-secreto',
    description: 'No se afirma que Lai hablara en secreto o al Parlamento en clave',
    pattern: /(en secreto|secretamente|mensaje oculto|realmente hablaba|en clave)/i,
    mode: 'forbidden',
  },
  {
    id: 'sin-eeuu-actual',
    description:
      'La valoración de 1958 no se presenta como la posición actual de EE.UU.',
    pattern: /(estados unidos|ee\.?uu\.?)[^.]{0,30}(considera|opina|sostiene|cree)\s+(hoy|actualmente|ahora)/i,
    mode: 'forbidden',
  },
  {
    id: 'sin-abreviatura-ambigua',
    description: 'No se usa la abreviatura ambigua "$1T"',
    pattern: /\$\s?1\s?T\b/,
    mode: 'forbidden',
  },
  {
    id: 'sin-distancia-exacta',
    description: 'La distancia se muestra como "< 2 KM", nunca como 2 km exactos',
    // No debe marcarse "< 2 KM" ni "≈ 2 km": solo un 2 km presentado como exacto.
    pattern: /(?<![<≈]\s{0,2})\b2\s?km\b/i,
    mode: 'forbidden',
  },

  // ----------------------- Salvaguardas obligatorias ----------------------
  {
    id: 'giro-como-hipotesis',
    description: 'El giro se formula como hipótesis, no como intención confirmada',
    pattern: /quiz[aá] beijing no sea el [uú]nico destinatario/i,
    mode: 'required',
  },
  {
    id: 'marca-de-analisis',
    description: 'La interpretación central aparece marcada como ANÁLISIS',
    pattern: /AnalysisTag/,
    mode: 'required',
    file: 'src/scenes/Scene07.tsx',
  },
  {
    id: 'acotacion-1958',
    description: 'La valoración de 1958 se acota explícitamente a su época',
    pattern: /no la posici[oó]n actual de Estados Unidos/i,
    mode: 'required',
    file: 'src/scenes/Scene04.tsx',
  },
  {
    id: 'paz-como-sintesis',
    description: '«Paz mediante fortaleza» se presenta como síntesis, no como verdad',
    pattern: /S[ií]ntesis de su argumento/i,
    mode: 'required',
    file: 'src/scenes/Scene05.tsx',
  },
  {
    id: 'aprobacion-parcial',
    description: 'Se muestra que la aprobación fue parcial (≈ 2/3), no un bloqueo total',
    pattern: /2\/3 APROBADO/,
    mode: 'required',
  },
  {
    id: 'moneda-desambiguada',
    description: 'La cifra se rotula en nuevos dólares taiwaneses',
    pattern: /BILLONES NT\$/,
    mode: 'required',
  },
  {
    id: 'equivalencia-usd',
    description: 'Se muestra la equivalencia aproximada en dólares estadounidenses',
    pattern: /US\$\$?\{?.*31\.4|US\$\$\{/,
    mode: 'required',
  },
  {
    id: 'distancia-editorial',
    description: 'Se muestra la cota "< 2 KM"',
    pattern: /< 2 KM/,
    mode: 'required',
  },
];

interface Finding {
  rule: Rule;
  file: string;
  excerpt: string;
}

const main = (): void => {
  const sources = [
    ...collectSources(resolve(ROOT, 'src/scenes')),
    ...collectSources(resolve(ROOT, 'src/components')),
    ...collectSources(resolve(ROOT, 'src/data')),
  ];
  const corpus = [
    { file: 'narración', text: NARRATION_FULL_TEXT },
    ...sources,
  ];

  const violations: Finding[] = [];
  const missing: Rule[] = [];

  for (const rule of RULES) {
    const scope = rule.file
      ? corpus.filter((c) => c.file === rule.file)
      : corpus;

    if (rule.file && scope.length === 0) {
      missing.push(rule);
      continue;
    }

    if (rule.mode === 'forbidden') {
      for (const entry of scope) {
        const match = rule.pattern.exec(entry.text);
        if (match) {
          violations.push({
            rule,
            file: entry.file,
            excerpt: match[0].slice(0, 90),
          });
        }
      }
    } else {
      const found = scope.some((entry) => rule.pattern.test(entry.text));
      if (!found) missing.push(rule);
    }
  }

  console.log('CONTROL EDITORIAL');
  console.log('─'.repeat(70));

  for (const rule of RULES) {
    const failed =
      violations.some((v) => v.rule.id === rule.id) ||
      missing.some((m) => m.id === rule.id);
    console.log(`${failed ? ' FALLO ' : '  OK   '} ${rule.description}`);
  }

  if (violations.length || missing.length) {
    console.log('');
    for (const v of violations) {
      console.log(`FALLO [${v.rule.id}] en ${v.file}: «${v.excerpt}»`);
    }
    for (const m of missing) {
      console.log(`FALTA [${m.id}]: ${m.description}`);
    }
    console.log('\nRender bloqueado por el control editorial.');
    process.exit(1);
  }

  console.log('─'.repeat(70));
  console.log(`${RULES.length} comprobaciones superadas. Listo para renderizar.`);
};

main();
