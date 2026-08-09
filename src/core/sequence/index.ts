/**
 * Číselné řady — zápis, čtení a nezávislé odvození pravidla.
 *
 * Modul úmyslně NEUMÍ řady vyrábět. Umí jen jedno: dostat vytištěná čísla
 * s jednou mezerou a odvodit, co do ní patří — bez sebemenší znalosti toho,
 * kdo a jak řadu vytvořil. Právě proto smí sloužit jako podklad verifikace
 * (`core/verify`) i jako sebekontrola generátoru (`tasks/sequence`).
 *
 * Klíčová myšlenka je ale ještě jiná než přepočet výsledku:
 *
 *   ⚠ Řada, na kterou sedí DVĚ různá pravidla, je vadné zadání.
 *
 * `2, 4, 8, ?` je učebnicový příklad. Dítě, které vidí násobení dvěma, napíše
 * 16. Dítě, které vidí kroky +2 a +4, napíše 14. Obě uvažují správně, jedno
 * z nich dostane křížek. Takové zadání se nesmí vytisknout — a odhalit ho jde
 * jedině tak, že se pravidlo hledá znovu z čísel, ne že se věří generátoru.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Zápis a čtení
// ─────────────────────────────────────────────────────────────────────────────

/** Znak pro chybějící člen. Na listu ho dítě vidí a nahrazuje číslem. */
export const SEQUENCE_GAP = '?'

/**
 * Členy odděluje MEZERA, ne čárka.
 *
 * V češtině je čárka desetinný oddělovač. Kdyby oddělovala i členy řady,
 * byl by zápis „2,5“ nerozhodnutelný: jedno číslo dvě a půl, nebo dvě čísla?
 * Mezera tenhle konflikt ruší dřív, než vznikne — a druhý stupeň, kde se
 * desetinná čísla objeví, se pak obejde bez přepisování zápisu řad.
 *
 * Na papíře se mezery roztahují přes `word-spacing`, aby členy nesplývaly.
 */
const SEPARATOR = ' '

/** Členy řady v pořadí. `null` je právě jedno místo — hledaný člen. */
export type SequenceTerms = readonly (number | null)[]

export class SequenceError extends Error {}

export function formatSequence(terms: SequenceTerms): string {
  return terms.map((term) => (term === null ? SEQUENCE_GAP : String(term))).join(SEPARATOR)
}

/**
 * Přečte řadu z textu tak, jak je vytištěná na listu.
 *
 * Verifikace musí parsovat tentýž řetězec, který uvidí dítě — kdyby dostala
 * strukturovaná data z generátoru, neodhalila by chybu v sazbě.
 */
export function parseSequence(input: string): SequenceTerms {
  const pieces = input.trim().split(/\s+/u).filter((piece) => piece !== '')
  if (pieces.length < 2) {
    throw new SequenceError(`Řada ${JSON.stringify(input)} nemá oddělené členy.`)
  }

  return pieces.map((token) => {
    if (token === SEQUENCE_GAP) return null
    if (!/^\d+$/u.test(token)) {
      throw new SequenceError(`Člen ${JSON.stringify(token)} v řadě ${JSON.stringify(input)} není číslo.`)
    }
    return Number(token)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Pravidla
// ─────────────────────────────────────────────────────────────────────────────

export type SequenceRuleId = 'arithmetic' | 'geometric' | 'alternating' | 'quadratic'

export interface SequenceRule {
  id: SequenceRuleId
  /** Popis pro list s řešením: „krok +6“, „násobení 3“. */
  description: string
  /** Hodnota členu na dané pozici podle tohoto pravidla. */
  at(index: number): number
}

interface Point {
  readonly index: number
  readonly value: number
}

/**
 * Kolik členů musí být vidět, aby mělo smysl pravidlo hledat.
 *
 * Pod čtyřmi je nejednoznačná skoro každá řada: rodiny „střídavý krok“
 * a „rostoucí krok“ mají tři parametry, takže třemi body proloží cokoli.
 * Není to omezení generátoru, ale vlastnost úlohy.
 */
export const MIN_VISIBLE_TERMS = 4

function signed(step: number): string {
  return step >= 0 ? `+${step}` : `−${Math.abs(step)}` // U+2212, ne pomlčka
}

function matchesAll(points: readonly Point[], at: (index: number) => number): boolean {
  return points.every((point) => at(point.index) === point.value)
}

/** Konstantní krok: 4, 10, 16, 22 … */
function fitArithmetic(points: readonly Point[]): SequenceRule | null {
  const [first, second] = [points[0], points[1]]
  if (first === undefined || second === undefined) return null

  const span = second.index - first.index
  const delta = second.value - first.value
  if (span === 0 || delta % span !== 0) return null

  const step = delta / span
  if (step === 0) return null // konstantní řada není úloha

  const base = first.value - step * first.index
  const at = (index: number) => base + step * index
  if (!matchesAll(points, at)) return null

  return { id: 'arithmetic', description: `krok ${signed(step)}`, at }
}

const MAX_RATIO = 12

/** Konstantní podíl: 3, 6, 12, 24 … nebo 96, 48, 24, 12 … */
function fitGeometric(points: readonly Point[]): SequenceRule | null {
  const first = points[0]
  if (first === undefined || points.length < 2) return null

  for (let ratio = 2; ratio <= MAX_RATIO; ratio++) {
    // Rostoucí: a_i = base · ratio^i
    const power = ratio ** first.index
    if (first.value % power === 0) {
      const base = first.value / power
      const at = (index: number) => base * ratio ** index
      if (base > 0 && matchesAll(points, at)) {
        return { id: 'geometric', description: `násobení ${ratio}`, at }
      }
    }

    // Klesající: a_i = base / ratio^i. Nedělitelné pozice `matchesAll` zahodí.
    const base = first.value * ratio ** first.index
    const at = (index: number) => base / ratio ** index
    if (matchesAll(points, at)) {
      return { id: 'geometric', description: `dělení ${ratio}`, at }
    }
  }
  return null
}

/**
 * Proloží body modelem `hodnota = a + b·f1(i) + c·f2(i)`.
 *
 * Tři neznámé, tři body, Cramerovo pravidlo. Vstupy jsou celá čísla, takže
 * `Number.isInteger` rozhoduje přesně — žádná tolerance není potřeba ani
 * žádoucí: neceločíselné řešení znamená, že rodina na body nesedí.
 */
function fitLinear(
  points: readonly Point[],
  f1: (index: number) => number,
  f2: (index: number) => number,
): { a: number; b: number; c: number } | null {
  const [p0, p1, p2] = [points[0], points[1], points[2]]
  if (p0 === undefined || p1 === undefined || p2 === undefined) return null

  const a11 = f1(p1.index) - f1(p0.index)
  const a12 = f2(p1.index) - f2(p0.index)
  const a21 = f1(p2.index) - f1(p0.index)
  const a22 = f2(p2.index) - f2(p0.index)

  const determinant = a11 * a22 - a12 * a21
  if (determinant === 0) return null

  const r1 = p1.value - p0.value
  const r2 = p2.value - p0.value
  const b = (r1 * a22 - a12 * r2) / determinant
  const c = (a11 * r2 - r1 * a21) / determinant
  if (!Number.isInteger(b) || !Number.isInteger(c)) return null

  const a = p0.value - b * f1(p0.index) - c * f2(p0.index)
  if (!Number.isInteger(a)) return null

  return { a, b, c }
}

const PAIRS_DONE = (index: number) => Math.floor(index / 2)
const IS_ODD = (index: number) => index % 2

/** Střídavý krok: 5, 8, 12, 15, 19 … (+3, +4, +3, +4) */
function fitAlternating(points: readonly Point[]): SequenceRule | null {
  const solved = fitLinear(points, PAIRS_DONE, IS_ODD)
  if (solved === null) return null

  const { a: base, b: pairSum, c: firstStep } = solved
  const secondStep = pairSum - firstStep
  // Shodné kroky jsou obyčejná aritmetická řada — tu pokrývá `fitArithmetic`
  // a předpověď by vyšla stejná. Duplicitní pravidlo by jen zašumělo popis.
  if (firstStep === secondStep) return null

  const at = (index: number) => base + PAIRS_DONE(index) * pairSum + IS_ODD(index) * firstStep
  if (!matchesAll(points, at)) return null

  return {
    id: 'alternating',
    description: `střídavý krok ${signed(firstStep)} a ${signed(secondStep)}`,
    at,
  }
}

const INDEX = (index: number) => index
const TRIANGULAR = (index: number) => (index * (index - 1)) / 2

/** Rostoucí krok: 3, 4, 6, 9, 13 … (+1, +2, +3, +4) */
function fitQuadratic(points: readonly Point[]): SequenceRule | null {
  const solved = fitLinear(points, INDEX, TRIANGULAR)
  if (solved === null) return null

  const { a: base, b: firstStep, c: growth } = solved
  if (growth === 0) return null // konstantní krok, viz `fitArithmetic`

  const at = (index: number) => base + firstStep * index + growth * TRIANGULAR(index)
  if (!matchesAll(points, at)) return null

  return {
    id: 'quadratic',
    description: growth > 0 ? `krok roste o ${growth}` : `krok klesá o ${Math.abs(growth)}`,
    at,
  }
}

const FAMILIES = [fitArithmetic, fitGeometric, fitAlternating, fitQuadratic] as const

// ─────────────────────────────────────────────────────────────────────────────
// Odvození chybějícího členu
// ─────────────────────────────────────────────────────────────────────────────

export interface SequenceReading {
  value: number
  rule: SequenceRule
}

export type SequenceInference =
  /** Všechna sedící pravidla dávají tutéž hodnotu. Jediný přípustný stav. */
  | { kind: 'unique'; value: number; rule: SequenceRule }
  /** Na čísla sedí víc pravidel s různým výsledkem. Zadání je vadné. */
  | { kind: 'ambiguous'; readings: SequenceReading[] }
  /** Nejde přečíst nebo na to nesedí vůbec nic. */
  | { kind: 'unreadable'; reason: string }

/**
 * Co patří do mezery?
 *
 * Za konkurenční čtení se počítá jen pravidlo, které dá **kladné celé číslo**.
 * Rodina předpovídající 7,5 nebo −3 sice body proloží, ale dítě, které vidí
 * samá kladná celá čísla, se k takové odpovědi nedopracuje — a započítat ji
 * by znamenalo zbytečně zahazovat dobré úlohy.
 */
export function inferMissing(terms: SequenceTerms): SequenceInference {
  const points: Point[] = []
  const gaps: number[] = []

  terms.forEach((term, index) => {
    if (term === null) {
      gaps.push(index)
    } else {
      points.push({ index, value: term })
    }
  })

  if (gaps.length !== 1) {
    return { kind: 'unreadable', reason: `Řada musí mít právě jednu mezeru, má ${gaps.length}.` }
  }
  if (points.length < MIN_VISIBLE_TERMS) {
    return {
      kind: 'unreadable',
      reason: `Řada ukazuje jen ${points.length} čísel, na jednoznačné pravidlo je potřeba ${MIN_VISIBLE_TERMS}.`,
    }
  }

  const hidden = gaps[0]!
  const readings: SequenceReading[] = []
  const seen = new Set<number>()

  for (const fit of FAMILIES) {
    const rule = fit(points)
    if (rule === null) continue

    const value = rule.at(hidden)
    if (!Number.isInteger(value) || value <= 0) continue
    if (seen.has(value)) continue

    seen.add(value)
    readings.push({ value, rule })
  }

  const first = readings[0]
  if (first === undefined) {
    return { kind: 'unreadable', reason: 'Na čísla řady nesedí žádné známé pravidlo.' }
  }
  if (readings.length > 1) return { kind: 'ambiguous', readings }

  return { kind: 'unique', value: first.value, rule: first.rule }
}
