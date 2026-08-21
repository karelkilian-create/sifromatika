/**
 * Generátor úloh s desetinnými čísly.
 *
 * Co smí VYJÍT, si diktuje list, ne tenhle modul: šifra chce celé číslo (je to
 * kód políčka v mřížce), hry snesou jedno desetinné místo. Modul se na to ptá
 * přes `TaskRules` a podle toho nabídne jinou zásobu cílů — `0,3 · 7 = 2,1` je
 * v pexesu úloha jako každá jiná a do šifry se nehodí.
 *
 * ⚠ Všechno se počítá v SETINÁCH jako celá čísla, teprve sazba dělá z 350
 *   text „3,5". Není to puntičkářství: `1,1 + 2,2` vyjde v plovoucí čárce jako
 *   3.3000000000000003 a konstrukce operandů zpětně z takového čísla se
 *   rozjede. Celočíselná aritmetika ten problém nemá vůbec.
 *
 * Zápis odpovídá českému úzu: desetinná čárka, ne tečka. Čárka je pro to
 * volná právě proto, že členy číselné řady odděluje mezera.
 */

import type {
  DidacticMeta,
  DifficultyProfile,
  GenContext,
  OperationTag,
  SkillTag,
  Task,
  TaskGenerator,
  TaskRules,
} from '../../core/model/index.js'
import { formatValue } from '../../core/number/index.js'
import type { Rng } from '../../core/rng/index.js'
import { evaluateExpression } from '../../core/verify/index.js'

/** Kolik setin je jednička. Vnitřní jednotka celého modulu. */
const CENTS = 100

const SYMBOL = {
  add: '+',
  sub: '−', // U+2212
  mul: '·', // U+00B7
} as const

/** Nejmenší a největší činitel u součinu. Ať zůstane úloha počitatelná z hlavy. */
const MIN_FACTOR = 2
const MAX_FACTOR = 10

/**
 * Setiny → text pro list.
 *
 * `350` → „3,5", `325` → „3,25", `300` → „3". Koncová nula se nepíše:
 * „3,50" na listu vypadá jako cena, ne jako číslo z matematiky.
 */
export function formatDecimal(cents: number): string {
  const negative = cents < 0
  const absolute = Math.abs(cents)
  const whole = Math.floor(absolute / CENTS)
  const rest = absolute % CENTS
  const sign = negative ? SYMBOL.sub : ''

  if (rest === 0) return `${sign}${whole}`
  if (rest % 10 === 0) return `${sign}${whole},${rest / 10}`
  return `${sign}${whole},${String(rest).padStart(2, '0')}`
}

/**
 * Cíl v setinách, ve kterých počítá celý modul.
 *
 * ⚠ Zaokrouhlení není opatrnictví: `2,3 * 100` dá v plovoucí čárce
 *   229.99999999999997 a `Number.isInteger` na tom pak selže. Dokud byly cíle
 *   celá čísla, nemohlo se to stát.
 */
function toCents(target: number): number {
  return Math.round(target * CENTS)
}

/** Vejde se hodnota do povoleného počtu desetinných míst? */
function fitsPlaces(cents: number, places: DifficultyProfile['decimals']): boolean {
  if (cents % CENTS === 0) return false // celé číslo není desetinná úloha
  if (places === 0) return false
  if (places === 1) return cents % 10 === 0
  return true
}

/** Je operand v oboru čísel, který profil dovoluje? */
function inRange(cents: number, profile: DifficultyProfile): boolean {
  const value = cents / CENTS
  return value > 0 && value <= profile.numberRange.max
}

/**
 * Zlomkové části, ze kterých se skládají sčítanci.
 *
 * Vybrané, ne losované ze všech setin: `2,5 + 3,5` je úloha, `2,37 + 3,63`
 * je počítání na papíře. Pro desetiny zbydou jen násobky deseti.
 */
const NICE_FRACTIONS = [5, 10, 20, 25, 40, 50, 60, 75, 80, 90]

function fractionsFor(places: DifficultyProfile['decimals']): number[] {
  return places === 1 ? NICE_FRACTIONS.filter((value) => value % 10 === 0) : NICE_FRACTIONS
}

// ─────────────────────────────────────────────────────────────────────────────
// Tvary úloh
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `3,5 · 4` — desetinné číslo krát celé.
 *
 * Konstrukce jde pozpátku od výsledku: hledá se činitel, po dělení kterým
 * zbude číslo s povoleným počtem desetinných míst. Cíl přitom celý být nemusí:
 * `2,5` vyjde z `0,5 · 5`.
 */
function decimalTimesWhole(target: number, profile: DifficultyProfile, rng: Rng): string | null {
  const factors = rng.shuffle(
    Array.from({ length: MAX_FACTOR - MIN_FACTOR + 1 }, (_, index) => index + MIN_FACTOR),
  )

  for (const factor of factors) {
    const cents = toCents(target) / factor
    if (!Number.isInteger(cents)) continue
    if (!fitsPlaces(cents, profile.decimals)) continue
    if (!inRange(cents, profile)) continue
    return `${formatDecimal(cents)} ${SYMBOL.mul} ${factor}`
  }
  return null
}

/**
 * `2,5 + 3,5` — dva desetinné sčítance.
 *
 * Celá část prvního sčítance se losuje ze středních dvou třetin, ne z celého
 * rozsahu. Bez toho vzniká `0,2 + 45,8`: matematicky správně, ale na listu to
 * vypadá jako chyba a podkopává důvěru v celý list dřív, než si ho učitel
 * přečte. Je to stejné pravidlo, jaké u odčítání hlídá `subtractionCeiling`.
 */
function decimalPlusDecimal(target: number, profile: DifficultyProfile, rng: Rng): string | null {
  const totalCents = toCents(target)
  const fractions = fractionsFor(profile.decimals)
  if (fractions.length === 0 || target < 2) return null

  // U malých cílů se meze slijí; `Math.min` zaručí, že rozsah zůstane platný.
  const lowest = Math.min(Math.floor(target / 3), target - 1)
  const highest = Math.max(lowest, Math.ceil((target * 2) / 3) - 1)

  for (let attempt = 0; attempt < 8; attempt++) {
    const fraction = rng.pick(fractions)
    const wholePart = rng.int(lowest, highest)
    const firstCents = wholePart * CENTS + fraction
    const secondCents = totalCents - firstCents

    if (firstCents <= 0 || secondCents <= 0) continue
    if (!fitsPlaces(firstCents, profile.decimals)) continue
    if (!fitsPlaces(secondCents, profile.decimals)) continue
    if (!inRange(firstCents, profile) || !inRange(secondCents, profile)) continue

    return `${formatDecimal(firstCents)} ${SYMBOL.add} ${formatDecimal(secondCents)}`
  }
  return null
}

interface Shape {
  id: string
  /** Operace, která musí být povolená, aby se tvar směl použít. */
  requires: OperationTag
  skills: SkillTag[]
  effort: number
  build(target: number, profile: DifficultyProfile, rng: Rng): string | null
}

const SHAPES: readonly Shape[] = [
  {
    id: 'decimal-times-whole',
    requires: 'mul',
    skills: ['des.nasobeni-delenim'],
    effort: 3,
    build: decimalTimesWhole,
  },
  {
    id: 'decimal-plus-decimal',
    requires: 'add',
    skills: ['des.scitani-odcitani'],
    effort: 2,
    build: decimalPlusDecimal,
  },
]

function shapesFor(mix: Partial<Record<OperationTag, number>>): Shape[] {
  const enabled = (operation: OperationTag) => (mix[operation] ?? 0) > 0
  // Prázdný mix znamená „všechny operace", stejně jako u aritmetiky.
  const noneChosen = !enabled('add') && !enabled('sub') && !enabled('mul') && !enabled('div')
  return SHAPES.filter((shape) => noneChosen || enabled(shape.requires))
}

// ─────────────────────────────────────────────────────────────────────────────
// Generátor
// ─────────────────────────────────────────────────────────────────────────────

export const decimalGenerator: TaskGenerator = {
  id: 'decimal',

  supports: (profile: DifficultyProfile) => profile.decimals > 0,

  /**
   * ⚠ Zásoba je s desetinnými cíli ZÁMĚRNĚ nevyvážená: na každé celé číslo
   *   připadá devět desetin, takže z pexesa na desetinná čísla vyjdou
   *   převážně desetinné výsledky. Je to v pořádku — téma si učitel zaškrtl
   *   a hra na jedno téma je legitimní zadání (viz poznámka u zaškrtávátek
   *   v `EditorPanel`). Kdyby se to mělo míchat v daném poměru, patří to
   *   sem, ne do aktivit: ty už jednou tuhle lekci dostaly, když poměr témat
   *   na kartičkách určovala velikost zásoby (`GENERATOR_VERSION` 5).
   */
  reachableValues(
    profile: DifficultyProfile,
    mix: Partial<Record<OperationTag, number>>,
    rules: TaskRules,
  ): Set<number> {
    const values = new Set<number>()
    if (profile.decimals === 0) return values

    const shapes = shapesFor(mix)
    if (shapes.length === 0) return values

    const hasMultiplication = shapes.some((shape) => shape.requires === 'mul')
    const hasAddition = shapes.some((shape) => shape.requires === 'add')
    const fractions = fractionsFor(profile.decimals)

    // Krok v setinách: 100 pro celé výsledky (šifra), 10 pro desetiny (hry).
    // Přesnost výsledku nesouvisí s přesností operandů — `2,25 + 0,25 = 2,5`
    // má dvě místa vlevo a jedno vpravo.
    const step = CENTS / 10 ** rules.maxResultPlaces

    for (let cents = CENTS; cents <= profile.numberRange.max * CENTS; cents += step) {
      const target = cents / CENTS
      if (hasMultiplication && reachableByProduct(target, profile)) {
        values.add(target)
        continue
      }
      // Sčítání potřebuje jen dost velký cíl a jednu použitelnou zlomkovou část.
      if (hasAddition && target >= 2 && fractions.length > 0) {
        values.add(target)
      }
    }
    return values
  },

  generateForValue(target: number, ctx: GenContext, rng: Rng): Task | null {
    const shapes = shapesFor(ctx.mix)
    if (shapes.length === 0 || ctx.profile.decimals === 0) return null

    for (let attempt = 0; attempt < 8; attempt++) {
      const shape = rng.pick(shapes)
      const text = shape.build(target, ctx.profile, rng)
      if (text === null || ctx.usedExpressions.has(text)) continue

      // Přepočet z hotového textu, stejně jako u složených výrazů aritmetiky:
      // hodnota vznikla konstrukcí ze setin, kdežto tady se čte z toho, co
      // bude vytištěné. Kdyby se ty dvě cesty rozešly, pozná se to hned tady.
      let computed: number
      try {
        computed = evaluateExpression(text)
      } catch {
        continue
      }
      if (Math.abs(computed - target) > 1e-9) continue

      ctx.usedExpressions.add(text)
      return {
        id: `decimal:${text}`,
        generatorId: 'decimal',
        value: target,
        prompt: { kind: 'expr', text },
        // `formatValue`, ne `${target}`: dokud byly výsledky celé, byl v tom
        // rozdíl žádný — u desetinného by `String` vytiskl tečku.
        solutionSteps: [{ kind: 'expr', text: `${text} = ${formatValue(target)}` }],
        didactic: {
          grade: ctx.profile.grade,
          difficulty: Math.min(5, Math.max(1, shape.effort)) as DidacticMeta['difficulty'],
          effort: shape.effort,
          operations: [shape.requires],
          skills: shape.skills,
        },
      }
    }
    return null
  },
}

/** Existuje činitel, po dělení kterým zbude povolené desetinné číslo? */
function reachableByProduct(target: number, profile: DifficultyProfile): boolean {
  for (let factor = MIN_FACTOR; factor <= MAX_FACTOR; factor++) {
    const cents = toCents(target) / factor
    if (!Number.isInteger(cents)) continue
    if (fitsPlaces(cents, profile.decimals) && inRange(cents, profile)) return true
  }
  return false
}
