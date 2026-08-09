/**
 * Generátor číselných řad — „co bude následovat?“ a „které číslo chybí?“.
 *
 * Pro šifru je řada totéž co příklad: zadání s jedním číselným výsledkem.
 * Proto se sem vešla beze změny kontraktu — `generateForValue` dostane cílovou
 * hodnotu a postaví řadu tak, aby na skrytém místě vyšla přesně ona.
 *
 * O šifře, mřížce ani aktivitě modul neví nic, stejně jako aritmetika.
 *
 * ⚠ Řada je jediný typ úlohy v projektu, který může být *matematicky správně
 *   a přesto vadný* — když na čísla sedí druhé pravidlo s jiným výsledkem.
 *   Proto si každý kandidát nechá pravidlo odvodit zpátky z vytištěných čísel
 *   (`core/sequence`) a neprojde-li jednoznačně, zahodí se. Verifikace listu
 *   udělá totéž ještě jednou; tady jde jen o to nepřipravit jí zbytečnou práci.
 */

import type {
  DidacticMeta,
  GenContext,
  DifficultyProfile,
  OperationTag,
  SkillTag,
  Task,
  TaskGenerator,
} from '../../core/model/index.js'
import type { Rng } from '../../core/rng/index.js'
import {
  formatSequence,
  inferMissing,
  MIN_VISIBLE_TERMS,
  type SequenceTerms,
} from '../../core/sequence/index.js'

/**
 * Kolik členů má řada na listu.
 *
 * O jeden víc, než kolik jich musí být vidět — víc členů zabere na dvousloupcové
 * A4 víc místa, než kolik má sloupec šířky.
 */
const LENGTH = MIN_VISIBLE_TERMS + 1

/** Nejmenší povolený obor, aby se pětičlenná řada s krokem 2 vůbec vešla. */
const MIN_RANGE = 1 + 2 * (LENGTH - 1)

// ─────────────────────────────────────────────────────────────────────────────
// Tvary řad
// ─────────────────────────────────────────────────────────────────────────────

type ShapeId = 'step-up' | 'step-down' | 'multiply' | 'divide' | 'alternating' | 'growing'

/** Volné parametry tvaru: krok, podíl, dvojice střídavých kroků… */
type Variant = readonly number[]

interface Shape {
  id: ShapeId
  /** Operace, kterou dítě při řešení použije. Řídí se jí `taskMix`. */
  operation: OperationTag
  /** Od kterého ročníku se smí objevit. */
  minGrade: number
  skill: SkillTag
  effort: number
  /**
   * Všechny přípustné hodnoty parametrů, ve stabilním pořadí.
   *
   * Existuje kvůli hodnotám, které jde vyrobit jedinou kombinací parametrů
   * a pozice. Losování takovou kombinaci najde jen občas, ale šifra na ten
   * kód už umístila písmeno — vzdát to znamená zahodit celý list.
   */
  variants(profile: DifficultyProfile): Variant[]
  /** Náhodná varianta. Rychlá cesta, která drží pestré rozložení řad. */
  randomVariant(profile: DifficultyProfile, rng: Rng): Variant
  /**
   * Postaví všechny členy tak, aby na pozici `hidden` byla hodnota `target`.
   * `null` = tenhle tvar na tuhle kombinaci nesedí.
   */
  build(target: number, hidden: number, variant: Variant, profile: DifficultyProfile): number[] | null
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, offset) => from + offset)
}

const PAIRS_DONE = (index: number) => Math.floor(index / 2)
const IS_ODD = (index: number) => index % 2
const TRIANGULAR = (index: number) => (index * (index - 1)) / 2

/** Horní mez kroku. Třeťák počítá po malých skocích, páťák unese větší. */
function maxStep(profile: DifficultyProfile): number {
  return profile.grade <= 3 ? 9 : 12
}

/**
 * Podíly použitelné pro geometrickou řadu.
 *
 * Omezené na 2–5: čtvrtá mocnina šestky je 1296, takže se pětičlenná řada
 * s vyšším podílem do oboru ročníku stejně nevejde.
 */
function ratiosFor(profile: DifficultyProfile): number[] {
  return profile.multiplicationTables.filter((table) => table >= 2 && table <= 5)
}

const MAX_ALTERNATING_STEP = 9
const MAX_GROWTH = 4
const MAX_FIRST_STEP = 8

const SHAPES: readonly Shape[] = [
  {
    id: 'step-up',
    operation: 'add',
    minGrade: 3,
    skill: 'rady.konstantni-krok',
    effort: 2,
    variants: (profile) => range(2, maxStep(profile)).map((step) => [step]),
    randomVariant: (profile, rng) => [rng.int(2, maxStep(profile))],
    build(target, hidden, variant) {
      const step = variant[0]!
      return fill((index) => target + (index - hidden) * step)
    },
  },
  {
    id: 'step-down',
    operation: 'sub',
    minGrade: 3,
    skill: 'rady.konstantni-krok',
    effort: 2,
    variants: (profile) => range(2, maxStep(profile)).map((step) => [step]),
    randomVariant: (profile, rng) => [rng.int(2, maxStep(profile))],
    build(target, hidden, variant) {
      const step = variant[0]!
      return fill((index) => target - (index - hidden) * step)
    },
  },
  {
    id: 'alternating',
    operation: 'add',
    minGrade: 4,
    skill: 'rady.stridavy-krok',
    effort: 3,
    variants(profile) {
      const limit = Math.min(MAX_ALTERNATING_STEP, maxStep(profile))
      return range(2, limit).flatMap((first) =>
        range(2, limit)
          .filter((second) => second !== first)
          .map((second) => [first, second]),
      )
    },
    randomVariant(profile, rng) {
      const limit = Math.min(MAX_ALTERNATING_STEP, maxStep(profile))
      return [rng.int(2, limit), rng.int(2, limit)]
    },
    build(target, hidden, variant) {
      const first = variant[0]!
      const second = variant[1]!
      if (first === second) return null // shodné kroky jsou obyčejná řada

      const pairSum = first + second
      const base = target - (PAIRS_DONE(hidden) * pairSum + IS_ODD(hidden) * first)
      return fill((index) => base + PAIRS_DONE(index) * pairSum + IS_ODD(index) * first)
    },
  },
  {
    id: 'growing',
    operation: 'add',
    minGrade: 4,
    skill: 'rady.rostouci-krok',
    effort: 4,
    variants: () =>
      range(1, MAX_GROWTH).flatMap((growth) =>
        range(1, MAX_FIRST_STEP).map((firstStep) => [growth, firstStep]),
      ),
    randomVariant: (_profile, rng) => [rng.int(1, MAX_GROWTH), rng.int(1, MAX_FIRST_STEP)],
    build(target, hidden, variant) {
      const growth = variant[0]!
      const firstStep = variant[1]!
      const base = target - firstStep * hidden - growth * TRIANGULAR(hidden)
      return fill((index) => base + firstStep * index + growth * TRIANGULAR(index))
    },
  },
  {
    id: 'multiply',
    operation: 'mul',
    minGrade: 4,
    skill: 'rady.nasobeni-delenim',
    effort: 3,
    variants: (profile) => ratiosFor(profile).map((ratio) => [ratio]),
    randomVariant(profile, rng) {
      const ratios = ratiosFor(profile)
      return ratios.length === 0 ? [] : [rng.pick(ratios)]
    },
    build(target, hidden, variant) {
      const ratio = variant[0]
      if (ratio === undefined) return null

      const power = ratio ** hidden
      if (target % power !== 0) return null // před skrytým členem by vyšly zlomky

      const base = target / power
      return fill((index) => base * ratio ** index)
    },
  },
  {
    id: 'divide',
    operation: 'div',
    minGrade: 5,
    skill: 'rady.nasobeni-delenim',
    effort: 3,
    variants: (profile) => ratiosFor(profile).map((ratio) => [ratio]),
    randomVariant(profile, rng) {
      const ratios = ratiosFor(profile)
      return ratios.length === 0 ? [] : [rng.pick(ratios)]
    },
    build(target, hidden, variant) {
      const ratio = variant[0]
      if (ratio === undefined) return null

      const base = target * ratio ** hidden
      // Klesající řada musí zůstat celočíselná až do posledního členu.
      if (base % ratio ** (LENGTH - 1) !== 0) return null

      return fill((index) => base / ratio ** index)
    },
  },
]

function fill(valueAt: (index: number) => number): number[] {
  return Array.from({ length: LENGTH }, (_, index) => valueAt(index))
}

// ─────────────────────────────────────────────────────────────────────────────
// Kontrola kandidáta
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Je řada použitelná na listu pro tenhle ročník?
 *
 * Opakovaný člen se vylučuje schválně: `8, 8, 8, ?` sice pravidlo má, ale na
 * pracovním listu vypadá jako chyba sazby.
 */
function isPrintable(terms: readonly number[], profile: DifficultyProfile): boolean {
  const { max } = profile.numberRange
  const seen = new Set<number>()

  for (const term of terms) {
    if (!Number.isInteger(term) || term < 1 || term > max) return false
    if (seen.has(term)) return false
    seen.add(term)
  }
  return true
}

function withGap(terms: readonly number[], hidden: number): SequenceTerms {
  return terms.map((term, index) => (index === hidden ? null : term))
}

// ─────────────────────────────────────────────────────────────────────────────
// Didaktická metadata
// ─────────────────────────────────────────────────────────────────────────────

function describe(shape: Shape, profile: DifficultyProfile): DidacticMeta {
  return {
    grade: profile.grade,
    difficulty: Math.min(5, Math.max(1, shape.effort)) as DidacticMeta['difficulty'],
    effort: shape.effort,
    operations: [shape.operation],
    skills: [shape.skill],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generátor
// ─────────────────────────────────────────────────────────────────────────────

/** Prázdný mix znamená všechny operace — stejná úmluva jako u aritmetiky. */
function allowsOperation(mix: Partial<Record<OperationTag, number>>, operation: OperationTag): boolean {
  const anySet = (['add', 'sub', 'mul', 'div'] as const).some((tag) => (mix[tag] ?? 0) > 0)
  return !anySet || (mix[operation] ?? 0) > 0
}

function shapesFor(
  profile: DifficultyProfile,
  mix: Partial<Record<OperationTag, number>>,
): Shape[] {
  return SHAPES.filter(
    (shape) => profile.grade >= shape.minGrade && allowsOperation(mix, shape.operation),
  )
}

/**
 * Kam schovat hledaný člen.
 *
 * Poslední pozice („co bude následovat?“) je nejčastější, protože je pro děti
 * nejčitelnější. Vnitřní pozice („které číslo chybí?“) se objeví řidčeji —
 * je těžší, protože pravidlo je potřeba ověřit z obou stran.
 */
function pickHidden(rng: Rng): number {
  return rng.weighted([
    [LENGTH - 1, 3],
    [1, 1],
    [2, 1],
    [3, 1],
  ])
}

/**
 * Kolik losování, než se přejde na systematické hledání.
 *
 * Náhodná fáze existuje kvůli pestrosti listu, ne kvůli úspěšnosti — proto
 * jí stačí pár desítek pokusů a zbytek dořeší úplný průchod parametry.
 */
const RANDOM_ATTEMPTS = 24

/**
 * Zkusí jednu konkrétní kombinaci. `null` = nepoužitelná.
 *
 * Kandidát projde, jen když je vytisknutelný, ještě se na listu neobjevil
 * a — to hlavně — když se z jeho čísel dá pravidlo odvodit zpátky jednoznačně.
 */
function tryBuild(
  shape: Shape,
  target: number,
  hidden: number,
  variant: Variant,
  ctx: GenContext,
): Task | null {
  const terms = shape.build(target, hidden, variant, ctx.profile)
  if (terms === null || !isPrintable(terms, ctx.profile)) return null

  const prompt = withGap(terms, hidden)
  const text = formatSequence(prompt)
  if (ctx.usedExpressions.has(text)) return null

  // Poslední a nejdůležitější síto: kandidát, na který sedí druhé pravidlo
  // s jiným výsledkem, je vadné zadání — dítě by mohlo odpovědět správně
  // a dostat křížek.
  const inference = inferMissing(prompt)
  if (inference.kind !== 'unique' || inference.value !== target) return null

  ctx.usedExpressions.add(text)
  return {
    id: `sequence:${text}`,
    generatorId: 'sequence',
    value: target,
    prompt: { kind: 'sequence', text, terms: prompt, hiddenIndex: hidden },
    solutionSteps: [
      { kind: 'expr', text: `${inference.rule.description}: ${formatSequence(terms)}` },
    ],
    didactic: describe(shape, ctx.profile),
  }
}

export const sequenceGenerator: TaskGenerator = {
  id: 'sequence',

  supports: (profile) => profile.numberRange.max >= MIN_RANGE,

  reachableValues(profile, mix): Set<number> {
    const values = new Set<number>()
    const { max } = profile.numberRange
    if (max < MIN_RANGE) return values

    // Slib musí být poctivý: hlásí se jen hodnoty, které opravdu umíme vydat.
    // Proto se vychází z týchž tvarů, jaké má k dispozici `generateForValue` —
    // jinak by se pro 3. ročník slíbila násobící řada, která se v něm nesmí
    // objevit, a šifra by na takový kód umístila písmeno.
    //
    // Započítávají se navíc jen tvary, u kterých je jednoznačnost jistá bez
    // losování: řada s konstantním krokem a čtyřmi viditelnými členy nemůže
    // vyjít dvojznačně, protože konkurenční rodina by musela mít zároveň
    // konstantní rozdíl i podíl — a to umí jen samá stejná čísla, která
    // `isPrintable` nepustí.
    const shapes = new Set(shapesFor(profile, mix).map((shape) => shape.id))

    if (shapes.has('step-up') || shapes.has('step-down')) {
      for (let step = 2; step <= 3; step++) {
        for (let first = 1; first + step * (LENGTH - 1) <= max; first++) {
          for (let hidden = 1; hidden < LENGTH; hidden++) {
            values.add(first + step * hidden)
          }
        }
      }
    }

    if (shapes.has('multiply') || shapes.has('divide')) {
      for (const ratio of ratiosFor(profile)) {
        const span = ratio ** (LENGTH - 1)
        for (let base = 1; base * span <= max; base++) {
          for (let hidden = 1; hidden < LENGTH; hidden++) {
            values.add(base * ratio ** hidden)
          }
        }
      }
    }

    return values
  },

  generateForValue(target: number, ctx: GenContext, rng: Rng): Task | null {
    const shapes = shapesFor(ctx.profile, ctx.mix)
    if (shapes.length === 0) return null

    // Fáze 1 — losování. Drží pestrost: různé tvary, různé pozice mezery.
    for (let attempt = 0; attempt < RANDOM_ATTEMPTS; attempt++) {
      const shape = rng.pick(shapes)
      const hidden = pickHidden(rng)
      const task = tryBuild(shape, target, hidden, shape.randomVariant(ctx.profile, rng), ctx)
      if (task !== null) return task
    }

    // Fáze 2 — úplný průchod. Některé hodnoty jde vyrobit jedinou kombinací:
    // 22 je druhý člen řady 11, 22, 44, 88, 176 a nijak jinak se v malém
    // oboru poskládat nedá. Losování ji trefí zhruba jednou ze sta pokusů,
    // jenže šifra na ten kód už umístila písmeno — vrátit tady `null` by
    // znamenalo zahodit hotový list kvůli jedné úloze.
    //
    // Fáze nepoužívá `rng`, takže je pořadí stabilní a výstup deterministický.
    for (const shape of shapes) {
      for (let hidden = 1; hidden < LENGTH; hidden++) {
        for (const variant of shape.variants(ctx.profile)) {
          const task = tryBuild(shape, target, hidden, variant, ctx)
          if (task !== null) return task
        }
      }
    }
    return null
  },
}
