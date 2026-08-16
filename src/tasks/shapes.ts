/**
 * Tvary výrazů, které používá víc než jeden generátor.
 *
 * Vzniklo to kvůli mocninám. Ty se do projektu dostaly jako vedlejší varianta
 * aritmetiky (`12² + 7` je pro generátor jen složený výraz jako `4 · 6 + 3`),
 * jenže učitel je chce zaškrtnout jako samostatné téma — a zaškrtnout jde jen
 * to, co je samostatný generátor.
 *
 * ⚠ Tvary se z aritmetiky NEVYJÍMAJÍ, jen stěhují sem. Aritmetika si je
 *   importuje zpátky na tentýž konec `COMPOUND_SHAPES`, ve stejném pořadí.
 *   Pořadí je podstatné: `rng.pick` losuje podle indexu, takže přeházení pole
 *   by změnilo výstup uložených seedů, i kdyby se matematiky nedotklo.
 *
 * Sídlí to v `tasks/`, ne uvnitř některého generátoru, aby nevznikl cyklus —
 * `arithmetic` i `powers` odsud jen čtou.
 */

import type { DifficultyProfile, OperationTag, SkillTag } from '../core/model/index.js'
import type { Rng } from '../core/rng/index.js'

export const SYMBOL: Record<OperationTag, string> = {
  add: '+',
  sub: '−', // U+2212, ne pomlčka
  mul: '·', // U+00B7 MIDDLE DOT — tečka, ne křížek
  div: ':', // školní zápis dělení
}

export const MIN_OPERAND = 2

export function inRange(value: number, profile: DifficultyProfile): boolean {
  return value >= MIN_OPERAND && value <= profile.numberRange.max
}

/**
 * Výrazy o třech operandech a záporná čísla.
 *
 * Od šestého ročníku přestává být `a ∘ b` dostatečná úloha: procvičuje se
 * pořadí operací a závorky, od sedmého i celá čísla. Verifikace je na to
 * připravená — `evaluateExpression` umí prioritu, závorky i unární mínus.
 *
 * ⚠ Výsledek musí zůstat KLADNÉ CELÉ číslo. Ne kvůli matematice, ale kvůli
 *   šifře: výsledek je kód políčka v mřížce. Záporný smí být operand, nikdy
 *   výsledek.
 */
export interface CompoundShape {
  id: string
  /** Operace, které musí být povolené, aby se tvar směl použít. */
  requires: OperationTag[]
  /** Vyžaduje profil povolující záporná čísla? */
  needsNegatives: boolean
  /** Vyžaduje profil povolující mocniny a odmocniny? */
  needsPowers?: boolean
  skills: SkillTag[]
  effort: number
  build(target: number, profile: DifficultyProfile, rng: Rng): string | null
}

/**
 * Meze základů mocnin.
 *
 * Osmák zná zpaměti druhé mocniny do dvaceti a třetí do pěti. Vyšší základ
 * není těžší úloha, jen delší počítání na papíře — a to není, co chceme.
 */
export const MAX_SQUARE_BASE = 20
export const MAX_CUBE_BASE = 5

/**
 * Nejvyšší druhý člen u mocninných tvarů.
 *
 * Bez něj vzniká `18² − 283`: mocnina se vylosuje velká, cíl je malý a rozdíl
 * pak zabere víc počítání než samotná mocnina, kvůli které úloha vznikla.
 */
export const MAX_POWER_REMAINDER = 100

/**
 * Mocninné tvary se druhým členem.
 *
 * Pořadí je součástí zadání, viz varování v hlavičce souboru.
 */
export const POWER_SHAPES: readonly CompoundShape[] = [
  {
    id: 'square-then-add',
    requires: ['mul', 'add'],
    needsNegatives: false,
    needsPowers: true,
    skills: ['moc.druha-mocnina'],
    effort: 3,
    build(target, profile, rng) {
      const base = rng.int(2, MAX_SQUARE_BASE)
      const rest = target - base ** 2
      if (base ** 2 > profile.numberRange.max || !inRange(rest, profile)) return null
      return `${base}² ${SYMBOL.add} ${rest}`
    },
  },
  {
    id: 'square-then-sub',
    requires: ['mul', 'sub'],
    needsNegatives: false,
    needsPowers: true,
    skills: ['moc.druha-mocnina'],
    effort: 3,
    build(target, profile, rng) {
      const base = rng.int(2, MAX_SQUARE_BASE)
      const rest = base ** 2 - target
      if (base ** 2 > profile.numberRange.max || !inRange(rest, profile)) return null
      if (rest > MAX_POWER_REMAINDER) return null
      return `${base}² ${SYMBOL.sub} ${rest}`
    },
  },
  {
    id: 'cube-then-add',
    requires: ['mul', 'add'],
    needsNegatives: false,
    needsPowers: true,
    skills: ['moc.treti-mocnina'],
    effort: 4,
    build(target, profile, rng) {
      const base = rng.int(2, MAX_CUBE_BASE)
      const rest = target - base ** 3
      if (base ** 3 > profile.numberRange.max || !inRange(rest, profile)) return null
      return `${base}³ ${SYMBOL.add} ${rest}`
    },
  },
  {
    id: 'root-then-add',
    requires: ['add'],
    needsNegatives: false,
    needsPowers: true,
    skills: ['moc.druha-odmocnina'],
    effort: 3,
    build(target, profile, rng) {
      const root = rng.int(2, MAX_SQUARE_BASE)
      const rest = target - root
      // Odmocňovat se smí jen z úplného čtverce, jinak vyjde iracionální číslo.
      if (root ** 2 > profile.numberRange.max || !inRange(rest, profile)) return null
      return `√${root ** 2} ${SYMBOL.add} ${rest}`
    },
  },
  {
    id: 'root-then-sub',
    requires: ['sub'],
    needsNegatives: false,
    needsPowers: true,
    skills: ['moc.druha-odmocnina'],
    effort: 4,
    build(target, profile, rng) {
      const root = rng.int(2, MAX_SQUARE_BASE)
      const first = target + root
      if (root ** 2 > profile.numberRange.max || !inRange(first, profile)) return null
      return `${first} ${SYMBOL.sub} √${root ** 2}`
    },
  },
]
