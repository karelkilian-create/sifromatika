/**
 * Generátor aritmetických úloh.
 *
 * Jediný typ úloh ve verzi 0.1. Jeho smysl pro projekt je ale širší: až přijde
 * bingo nebo domino, použijí tenhle modul beze změny. Proto o šifře, mřížce ani
 * aktivitě nesmí vědět vůbec nic — dostane cílovou hodnotu a profil, vrátí úlohu.
 *
 * Zápis odpovídá českému školnímu úzu: `18 + 6`, `30 − 6`, `6 × 4`, `48 : 2`.
 */

import type {
  DifficultyProfile,
  DidacticMeta,
  GenContext,
  OperationTag,
  SkillTag,
  Task,
  TaskGenerator,
} from '../../core/model/index.js'
import type { Rng } from '../../core/rng/index.js'

const ALL_OPERATIONS: OperationTag[] = ['add', 'sub', 'mul', 'div']

const SYMBOL: Record<OperationTag, string> = {
  add: '+',
  sub: '−', // U+2212, ne pomlčka
  mul: '×',
  div: ':', // školní zápis dělení
}

interface Operands {
  a: number
  b: number
}

/** Které operace jsou povolené. Prázdný mix = všechny. */
function enabledOperations(mix: Partial<Record<OperationTag, number>>): OperationTag[] {
  const chosen = ALL_OPERATIONS.filter((op) => (mix[op] ?? 0) > 0)
  return chosen.length > 0 ? chosen : ALL_OPERATIONS
}

/**
 * Přechod přes desítku — didakticky zásadní hranice pro 2.–3. ročník.
 * Když ho profil nepovoluje, sčítání ani odčítání ho nesmí obsahovat.
 */
function crossesTenOnAdd(a: number, b: number): boolean {
  return (a % 10) + (b % 10) >= 10
}

function crossesTenOnSub(a: number, b: number): boolean {
  return a % 10 < b % 10
}

// ─────────────────────────────────────────────────────────────────────────────
// Kandidáti operandů pro danou cílovou hodnotu
// ─────────────────────────────────────────────────────────────────────────────

function addCandidates(target: number, profile: DifficultyProfile): Operands[] {
  const { max } = profile.numberRange
  if (target < 0 || target > max) return []
  const out: Operands[] = []
  for (let a = 1; a < target; a++) {
    const b = target - a
    if (b < 1) continue
    if (!profile.crossesTen && crossesTenOnAdd(a, b)) continue
    out.push({ a, b })
  }
  return out
}

function subCandidates(target: number, profile: DifficultyProfile): Operands[] {
  const { max } = profile.numberRange
  if (target < 0 || target > max) return []
  const out: Operands[] = []
  for (let a = target + 1; a <= max; a++) {
    const b = a - target
    if (b < 1) continue
    if (!profile.crossesTen && crossesTenOnSub(a, b)) continue
    out.push({ a, b })
  }
  return out
}

function mulCandidates(target: number, profile: DifficultyProfile): Operands[] {
  const out: Operands[] = []
  for (const table of profile.multiplicationTables) {
    if (target % table !== 0) continue
    const other = target / table
    if (other < 1 || other > 10) continue
    out.push({ a: table, b: other })
    // Obrácené pořadí je jiný příklad — `4 × 6` a `6 × 4` procvičí komutativitu.
    if (other !== table) out.push({ a: other, b: table })
  }
  return out
}

function divCandidates(target: number, profile: DifficultyProfile): Operands[] {
  const { max } = profile.numberRange
  const out: Operands[] = []
  if (target < 1) return out
  for (const table of profile.multiplicationTables) {
    const dividend = target * table
    if (dividend > max) continue
    out.push({ a: dividend, b: table })
  }
  return out
}

/**
 * Odfiltruje triviální varianty jako `4 + 2`, `25 − 24` nebo `16 + 1`.
 *
 * Matematicky jsou v pořádku, ale na listu pro čtvrťáka vypadají jako chyba
 * a podkopávají důvěru v celý vygenerovaný list dřív, než si ho učitel
 * pořádně přečte. Když ale nic lepšího neexistuje (výsledek 3 jde vyrobit
 * jen jako 1 + 2), vrací se původní seznam — žádný příklad je horší.
 */
function isSubstantial(operation: OperationTag, operands: Operands): boolean {
  const floor = operation === 'add' || operation === 'sub' ? 3 : 2
  return Math.min(operands.a, operands.b) >= floor
}

function preferSubstantial(operation: OperationTag, options: Operands[]): Operands[] {
  const substantial = options.filter((operands) => isSubstantial(operation, operands))
  return substantial.length > 0 ? substantial : options
}

function candidatesFor(
  operation: OperationTag,
  target: number,
  profile: DifficultyProfile,
): Operands[] {
  switch (operation) {
    case 'add':
      return addCandidates(target, profile)
    case 'sub':
      return subCandidates(target, profile)
    case 'mul':
      return mulCandidates(target, profile)
    case 'div':
      return divCandidates(target, profile)
  }
}

/**
 * Existuje pro tuhle hodnotu vůbec nějaký příklad?
 *
 * Oddělené od `candidatesFor` schválně: `reachableValues` se ptá na celý obor
 * čísel a sestavovat přitom pokaždé úplný seznam operandů je zbytečně drahé.
 * Tady stačí první nález a končíme.
 */
function hasCandidate(
  operation: OperationTag,
  target: number,
  profile: DifficultyProfile,
): boolean {
  const { max } = profile.numberRange
  switch (operation) {
    case 'add':
      if (target < 2 || target > max) return false
      for (let a = 1; a < target; a++) {
        if (profile.crossesTen || !crossesTenOnAdd(a, target - a)) return true
      }
      return false
    case 'sub':
      if (target < 0 || target >= max) return false
      for (let a = target + 1; a <= max; a++) {
        if (profile.crossesTen || !crossesTenOnSub(a, a - target)) return true
      }
      return false
    case 'mul':
      return profile.multiplicationTables.some(
        (table) => target % table === 0 && target / table >= 1 && target / table <= 10,
      )
    case 'div':
      return target >= 1 && profile.multiplicationTables.some((table) => target * table <= max)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Didaktická metadata
// ─────────────────────────────────────────────────────────────────────────────

function describe(
  operation: OperationTag,
  { a, b }: Operands,
  target: number,
  profile: DifficultyProfile,
): DidacticMeta {
  const skills: SkillTag[] = []
  let effort = 1

  switch (operation) {
    case 'add':
      skills.push(target <= 20 ? 'arit.scitani-do-20' : 'arit.scitani-do-100')
      if (crossesTenOnAdd(a, b)) {
        skills.push('arit.prechod-pres-desitku')
        effort = 2
      }
      break
    case 'sub':
      skills.push(a <= 20 ? 'arit.odcitani-do-20' : 'arit.odcitani-do-100')
      if (crossesTenOnSub(a, b)) {
        skills.push('arit.prechod-pres-desitku')
        effort = 2
      }
      break
    case 'mul':
      skills.push('arit.mala-nasobilka')
      effort = 2
      break
    case 'div':
      skills.push('arit.deleni-beze-zbytku')
      effort = 3
      break
  }

  if (Math.max(a, b) > 100) effort += 1

  return {
    grade: profile.grade,
    difficulty: Math.min(5, Math.max(1, effort)) as DidacticMeta['difficulty'],
    effort,
    operations: [operation],
    skills,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generátor
// ─────────────────────────────────────────────────────────────────────────────

export const arithmeticGenerator: TaskGenerator = {
  id: 'arithmetic',

  supports: () => true,

  reachableValues(
    profile: DifficultyProfile,
    mix: Partial<Record<OperationTag, number>>,
  ): Set<number> {
    const values = new Set<number>()
    const operations = enabledOperations(mix)
    const { max } = profile.numberRange
    for (let target = 1; target <= max; target++) {
      for (const operation of operations) {
        if (hasCandidate(operation, target, profile)) {
          values.add(target)
          break
        }
      }
    }
    return values
  },

  generateForValue(target: number, ctx: GenContext, rng: Rng): Task | null {
    const operations = enabledOperations(ctx.mix)

    // Nabídneme jen operace, které tuhle hodnotu vůbec trefí; mezi nimi
    // rozhodne váha z uživatelského nastavení.
    const viable = operations
      .map((operation) => {
        const all = candidatesFor(operation, target, ctx.profile)
        return { operation, options: preferSubstantial(operation, all), degenerate: all }
      })
      .filter((entry) => entry.degenerate.length > 0)
    if (viable.length === 0) return null

    // Preferovat musíme už OPERACI, ne až operandy. Pro výsledek 99 nabízí
    // odčítání jedinou možnost `100 − 1`, zatímco sčítání jich má desítky —
    // kdyby se operace losovala první, `100 − 1` by se na list dostávalo.
    const decent = viable.filter((entry) => isSubstantial(entry.operation, entry.options[0]!))
    const pool = decent.length > 0 ? decent : viable

    // Několik pokusů: první volba může narazit na už použitý výraz.
    for (let attempt = 0; attempt < 12; attempt++) {
      const { operation, options } = rng.weighted(
        pool.map((entry) => [entry, ctx.mix[entry.operation] ?? 1] as const),
      )
      const operands = rng.pick(options)
      const text = `${operands.a} ${SYMBOL[operation]} ${operands.b}`
      if (ctx.usedExpressions.has(text)) continue

      ctx.usedExpressions.add(text)
      return {
        id: `arithmetic:${text}`,
        generatorId: 'arithmetic',
        value: target,
        prompt: { kind: 'expr', text },
        solutionSteps: [{ kind: 'expr', text: `${text} = ${target}` }],
        didactic: describe(operation, operands, target, ctx.profile),
      }
    }
    return null
  },
}
