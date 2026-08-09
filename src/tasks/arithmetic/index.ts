/**
 * Generátor aritmetických úloh.
 *
 * Jediný typ úloh ve verzi 0.1. Jeho smysl pro projekt je ale širší: až přijde
 * bingo nebo domino, použijí tenhle modul beze změny. Proto o šifře, mřížce ani
 * aktivitě nesmí vědět vůbec nic — dostane cílovou hodnotu a profil, vrátí úlohu.
 *
 * Zápis odpovídá českému úzu: `18 + 6`, `30 − 6`, `6 · 4`, `48 : 2`.
 *
 * Násobení se píše TEČKOU, ne křížkem. Křížek je v matematice vyhrazený pro
 * vektorový součin; na papíře pro děti sice ke kolizi nedojde, ale učit je
 * zápis, který budou muset později přeučovat, nemá důvod.
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
import { evaluateExpression } from '../../core/verify/index.js'

const ALL_OPERATIONS: OperationTag[] = ['add', 'sub', 'mul', 'div']

const SYMBOL: Record<OperationTag, string> = {
  add: '+',
  sub: '−', // U+2212, ne pomlčka
  mul: '·', // U+00B7 MIDDLE DOT — tečka, ne křížek
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

/**
 * Nejvyšší rozumný menšenec pro daný výsledek.
 *
 * Bez tohohle stropu se menšenec losuje z celého oboru, takže skoro vždy
 * skončí u jeho horní hranice: pro výsledek 3 v oboru do tisíce vzniká
 * `711 − 708`. Matematicky správně, jako cvičení nesmysl — a v oboru do
 * deseti tisíc by z toho bylo `9998 − 9995`.
 *
 * Menšitel se drží řádově u výsledku; spodní hranice 20 zajistí, že i pro
 * malé výsledky zbude z čeho vybírat.
 */
function subtractionCeiling(target: number, max: number): number {
  return Math.min(max, target + Math.max(20, target * 2))
}

function subCandidates(target: number, profile: DifficultyProfile): Operands[] {
  const { max } = profile.numberRange
  if (target < 0 || target > max) return []
  const out: Operands[] = []
  const ceiling = subtractionCeiling(target, max)
  for (let a = target + 1; a <= ceiling; a++) {
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
    // Obrácené pořadí je jiný příklad — `4 · 6` a `6 · 4` procvičí komutativitu.
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
    case 'sub': {
      if (target < 0 || target >= max) return false
      // Musí platit tentýž strop jako v `subCandidates`, jinak by generátor
      // sliboval hodnoty, pro které pak žádný příklad nevyrobí.
      const ceiling = subtractionCeiling(target, max)
      for (let a = target + 1; a <= ceiling; a++) {
        if (profile.crossesTen || !crossesTenOnSub(a, a - target)) return true
      }
      return false
    }
    case 'mul':
      return profile.multiplicationTables.some(
        (table) => target % table === 0 && target / table >= 1 && target / table <= 10,
      )
    case 'div':
      return target >= 1 && profile.multiplicationTables.some((table) => target * table <= max)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Složené výrazy — druhý stupeň
// ─────────────────────────────────────────────────────────────────────────────

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
interface CompoundShape {
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

/** Druhý činitel do součinu. Malá čísla, ať výraz zůstane počitatelný z hlavy. */
function pickFactor(rng: Rng): number {
  return rng.int(2, 10)
}

const MIN_OPERAND = 2

/**
 * Meze základů mocnin.
 *
 * Osmák zná zpaměti druhé mocniny do dvaceti a třetí do pěti. Vyšší základ
 * není těžší úloha, jen delší počítání na papíře — a to není, co chceme.
 */
const MAX_SQUARE_BASE = 20
const MAX_CUBE_BASE = 5

/**
 * Nejvyšší druhý člen u mocninných tvarů.
 *
 * Bez něj vzniká `18² − 283`: mocnina se vylosuje velká, cíl je malý a rozdíl
 * pak zabere víc počítání než samotná mocnina, kvůli které úloha vznikla.
 */
const MAX_POWER_REMAINDER = 100

function inRange(value: number, profile: DifficultyProfile): boolean {
  return value >= MIN_OPERAND && value <= profile.numberRange.max
}

/** Dělitelé cílové hodnoty, kteří jsou zároveň v povolených tabulkách. */
function tableDivisors(target: number, profile: DifficultyProfile): number[] {
  return profile.multiplicationTables.filter((table) => table >= 2 && target % table === 0)
}

const COMPOUND_SHAPES: readonly CompoundShape[] = [
  {
    id: 'mul-then-add',
    requires: ['mul', 'add'],
    needsNegatives: false,
    skills: ['arit.poradi-operaci'],
    effort: 3,
    build(target, profile, rng) {
      const factor = rng.pick(profile.multiplicationTables)
      const other = pickFactor(rng)
      const product = factor * other
      const rest = target - product
      if (product > profile.numberRange.max || !inRange(rest, profile)) return null
      return `${factor} ${SYMBOL.mul} ${other} ${SYMBOL.add} ${rest}`
    },
  },
  {
    id: 'mul-then-sub',
    requires: ['mul', 'sub'],
    needsNegatives: false,
    skills: ['arit.poradi-operaci'],
    effort: 3,
    build(target, profile, rng) {
      const factor = rng.pick(profile.multiplicationTables)
      const other = pickFactor(rng)
      const product = factor * other
      const rest = product - target
      if (product > profile.numberRange.max || !inRange(rest, profile)) return null
      return `${factor} ${SYMBOL.mul} ${other} ${SYMBOL.sub} ${rest}`
    },
  },
  {
    id: 'add-then-mul',
    requires: ['add', 'mul'],
    needsNegatives: false,
    skills: ['arit.poradi-operaci', 'arit.zavorky'],
    effort: 4,
    build(target, profile, rng) {
      const divisors = tableDivisors(target, profile)
      if (divisors.length === 0) return null

      const multiplier = rng.pick(divisors)
      const sum = target / multiplier
      if (sum < MIN_OPERAND * 2) return null

      const first = rng.int(MIN_OPERAND, sum - MIN_OPERAND)
      return `(${first} ${SYMBOL.add} ${sum - first}) ${SYMBOL.mul} ${multiplier}`
    },
  },
  {
    id: 'sub-then-mul',
    requires: ['sub', 'mul'],
    needsNegatives: false,
    skills: ['arit.poradi-operaci', 'arit.zavorky'],
    effort: 4,
    build(target, profile, rng) {
      const divisors = tableDivisors(target, profile)
      if (divisors.length === 0) return null

      const multiplier = rng.pick(divisors)
      const difference = target / multiplier
      const subtracted = rng.int(MIN_OPERAND, 9)
      const first = difference + subtracted
      if (!inRange(first, profile) || difference < MIN_OPERAND) return null

      return `(${first} ${SYMBOL.sub} ${subtracted}) ${SYMBOL.mul} ${multiplier}`
    },
  },
  {
    id: 'div-then-add',
    requires: ['div', 'add'],
    needsNegatives: false,
    skills: ['arit.poradi-operaci'],
    effort: 4,
    build(target, profile, rng) {
      const divisor = rng.pick(profile.multiplicationTables)
      const quotient = pickFactor(rng)
      const dividend = divisor * quotient
      const rest = target - quotient
      if (!inRange(dividend, profile) || !inRange(rest, profile)) return null
      return `${dividend} ${SYMBOL.div} ${divisor} ${SYMBOL.add} ${rest}`
    },
  },
  {
    id: 'chain-add-sub',
    requires: ['add', 'sub'],
    needsNegatives: false,
    skills: ['arit.poradi-operaci'],
    effort: 3,
    build(target, profile, rng) {
      const subtracted = rng.int(MIN_OPERAND, 30)
      const sum = target + subtracted
      if (!inRange(sum, profile) || sum < MIN_OPERAND * 2) return null

      const first = rng.int(MIN_OPERAND, sum - MIN_OPERAND)
      return `${first} ${SYMBOL.add} ${sum - first} ${SYMBOL.sub} ${subtracted}`
    },
  },
  {
    id: 'negative-add',
    requires: ['add'],
    needsNegatives: true,
    skills: ['cela.scitani-odcitani'],
    effort: 3,
    build(target, profile, rng) {
      const negative = rng.int(MIN_OPERAND, 99)
      const positive = target + negative
      if (!inRange(positive, profile)) return null
      return `${SYMBOL.sub}${negative} ${SYMBOL.add} ${positive}`
    },
  },
  {
    id: 'negative-mul',
    requires: ['mul'],
    needsNegatives: true,
    skills: ['cela.nasobeni-deleni'],
    effort: 4,
    build(target, profile, rng) {
      const divisors = tableDivisors(target, profile)
      if (divisors.length === 0) return null

      const factor = rng.pick(divisors)
      const other = target / factor
      if (other < MIN_OPERAND || other > 12) return null
      // Záporné krát záporné je kladné — přesně to místo, kde se dělají chyby.
      //
      // ⚠ Závorka kolem druhého činitele není okrasa. Dva operátory nesmí stát
      //   vedle sebe, takže `−7 · −2` je špatně zapsaná matematika. Vedoucí
      //   mínus u prvního činitele závorku nepotřebuje.
      return `${SYMBOL.sub}${factor} ${SYMBOL.mul} (${SYMBOL.sub}${other})`
    },
  },
  {
    id: 'negative-subtract',
    requires: ['sub'],
    needsNegatives: true,
    skills: ['cela.scitani-odcitani'],
    effort: 4,
    build(target, profile, rng) {
      const subtracted = rng.int(MIN_OPERAND, 99)
      const first = target - subtracted
      if (!inRange(first, profile)) return null
      // Odčítání záporného čísla — jádro učiva celých čísel v sedmém ročníku.
      return `${first} ${SYMBOL.sub} (${SYMBOL.sub}${subtracted})`
    },
  },
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

/**
 * Podíl složených výrazů na listu.
 *
 * Ne všechny: list samých třísložkových výrazů je pro šesťáka vyčerpávající
 * a mezi nimi se ztratí i ta úloha, na které si má procvičit prioritu.
 */
const COMPOUND_SHARE = 0.55

const COMPOUND_ATTEMPTS = 10

function compoundShapesFor(
  profile: DifficultyProfile,
  mix: Partial<Record<OperationTag, number>>,
): CompoundShape[] {
  const operations = new Set(enabledOperations(mix))
  return COMPOUND_SHAPES.filter((shape) => {
    if (shape.needsPowers === true && !profile.powers) return false
    if (shape.needsNegatives && !profile.allowNegatives) return false
    if (!shape.needsNegatives && shape.needsPowers !== true && profile.maxOperands < 3) return false
    return shape.requires.every((operation) => operations.has(operation))
  })
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

/**
 * Složená úloha pro danou hodnotu.
 *
 * Výraz se před vydáním přepočítá `evaluateExpression` — tedy tímtéž kódem,
 * který ho potom bude verifikovat. Není to obcházení nezávislosti verifikace:
 * hodnota vznikla konstrukcí ze zvolených operandů, kdežto tady se čte
 * z hotového textu. Kdyby se ty dvě cesty rozešly, pozná se to hned tady
 * a rozbitý výraz se na list vůbec nedostane.
 */
function generateCompound(
  target: number,
  shapes: readonly CompoundShape[],
  ctx: GenContext,
  rng: Rng,
): Task | null {
  for (let attempt = 0; attempt < COMPOUND_ATTEMPTS; attempt++) {
    const shape = rng.pick(shapes)
    const text = shape.build(target, ctx.profile, rng)
    if (text === null || ctx.usedExpressions.has(text)) continue

    let computed: number
    try {
      computed = evaluateExpression(text)
    } catch {
      continue
    }
    if (computed !== target) continue

    ctx.usedExpressions.add(text)
    return {
      id: `arithmetic:${text}`,
      generatorId: 'arithmetic',
      value: target,
      prompt: { kind: 'expr', text },
      solutionSteps: [{ kind: 'expr', text: `${text} = ${target}` }],
      didactic: {
        grade: ctx.profile.grade,
        difficulty: Math.min(5, Math.max(1, shape.effort)) as DidacticMeta['difficulty'],
        effort: shape.effort,
        operations: shape.requires,
        skills: shape.skills,
      },
    }
  }
  return null
}

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
    // Složené výrazy se zkoušejí jen tam, kde je profil povoluje. Pro 3.–5.
    // ročník je podmínka nepravdivá, takže se `rng` ani nedotkneme — a listy
    // uložené před druhým stupněm se vytisknou beze změny.
    const compound = compoundShapesFor(ctx.profile, ctx.mix)
    if (compound.length > 0 && rng.chance(COMPOUND_SHARE)) {
      const task = generateCompound(target, compound, ctx, rng)
      if (task !== null) return task
    }

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
