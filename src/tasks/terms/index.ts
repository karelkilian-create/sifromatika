/**
 * Generátor vět s matematickými pojmy — „Kolik je součin čísel 6 a 7?“,
 * „Které číslo je pětkrát menší než 40?“.
 *
 * Procvičuje se FORMULACE, ne počítání: děti umí `5 · 6`, ale nevědí, co je
 * součin, a zaměňují „o kolik“ s „kolikrát“. Nejvíc chybují v obráceném
 * směru — pětkrát menší než 40 je pro ně 200. Pozorováno ve třídě (Karel,
 * 1. 10. 2026); rozvaha je v `docs/navrh-matematicke-pojmy.md`.
 *
 * Čísla proto zůstávají malá v každém ročníku: sčítá se do sta, násobí
 * v malé násobilce. Osmák tu neopakuje počítání, ale slova.
 *
 * Konstrukce je VÝČET, ne losování s opakováním. Všechny platné věty pro
 * daný profil vyrobí `catalogue` a `reachableValues` i `generateForValue`
 * čtou z něj, takže se nemají jak rozejít a nic se nezkouší znovu. Vzorem je
 * `tasks/decomposition`.
 *
 * ⚠ Tabulka pojmů tu stojí sama za sebe a verifikace má vlastní
 *   (`core/phrase`). Nesahat sem odtamtud ani naopak — viz hlavička té
 *   čtečky.
 */

import { ALL_OPERATIONS } from '../../core/model/index.js'
import type {
  DifficultyProfile,
  GenContext,
  OperationTag,
  SkillTag,
  Task,
  TaskGenerator,
  TaskRules,
} from '../../core/model/index.js'
import { readPhrase } from '../../core/phrase/index.js'
import type { Rng } from '../../core/rng/index.js'
import { SYMBOL } from '../shapes.js'

/**
 * Od kterého ročníku se téma nabízí.
 *
 * Druhák čte slabikovaně a věta o padesáti znacích by z úlohy udělala
 * čtení, ne matematiku. Shora meze není: ve vyšších ročnících je to
 * opakování a malá čísla tam nevadí.
 */
export const MIN_GRADE = 3

/**
 * Od kterého ročníku se porovnávají dva pojmy — „O kolik je součet čísel
 * 12 a 4 větší než jejich rozdíl?“.
 *
 * Je to dvoukroková úloha schovaná v souvětí o padesáti znacích: spočítat
 * dvě hodnoty a pak je porovnat. Třeťák má dost na tom, aby pojem přeložil
 * na operaci a nespletl si „o kolik“ s „kolikrát“ (Karel, 2. 10. 2026).
 */
export const PAIR_MIN_GRADE = 4

/**
 * Strop pro sčítání a odčítání, ve všech ročnících stejný. Předmětem je
 * slovo „součet“, ne počítání s tisíci.
 */
const MAX_SUM = 100

/**
 * Malá násobilka: činitelé, dělitelé i násobné číslovky od dvou do deseti.
 *
 * Jednička je venku schválně. „Součin čísel 7 a 1“ a „jednou větší“ nejsou
 * úlohy o pojmu, ale o tom, že se nic nestane.
 */
const MIN_FACTOR = 2
const MAX_FACTOR = 10

/**
 * Nejmenší sčítanec a menšitel. Jednička tu vadí ze stejného důvodu jako
 * u činitelů — „o 1 větší než 35“ se nepočítá, jen přečte.
 */
const MIN_TERM = 2

/** Nejmenší výsledek. Nula ani jednička se nevyrábí. */
const MIN_RESULT = 2

type TermId = 'sum' | 'difference' | 'product' | 'quotient'

interface Term {
  id: TermId
  /** Slovo ve větě. 1. a 4. pád jsou u všech čtyř stejné, takže se neskloňuje. */
  word: string
  operation: OperationTag
  /** Hodnota pojmu pro dvojici čísel, nebo `null`, když ji ročník neumí. */
  value(a: number, b: number, profile: DifficultyProfile): number | null
}

/** Je číslo v malé násobilce tohohle ročníku? */
function inTable(factor: number, profile: DifficultyProfile): boolean {
  return profile.multiplicationTables.includes(factor)
}

function isFactor(n: number): boolean {
  return n >= MIN_FACTOR && n <= MAX_FACTOR
}

/** Strop oboru: sto, a v nižším ročníku jeho vlastní mez, je-li nižší. */
function ceiling(profile: DifficultyProfile): number {
  return Math.min(MAX_SUM, profile.numberRange.max)
}

/**
 * Pořadí je závazné — dvojice pojmů se z něj skládají a losuje se podle
 * indexu.
 */
const TERMS: readonly Term[] = [
  {
    id: 'sum',
    word: 'součet',
    operation: 'add',
    value: (a, b, profile) => (a >= MIN_TERM && b >= MIN_TERM && a + b <= ceiling(profile) ? a + b : null),
  },
  {
    id: 'difference',
    word: 'rozdíl',
    operation: 'sub',
    value: (a, b, profile) => (b >= MIN_TERM && a > b && a <= ceiling(profile) ? a - b : null),
  },
  {
    id: 'product',
    word: 'součin',
    operation: 'mul',
    // Aspoň jeden činitel z násobilky ročníku, druhý do desíti — stejně jako
    // v aritmetice. Od trojky je to celá malá násobilka.
    value: (a, b, profile) =>
      isFactor(a) && isFactor(b) && (inTable(a, profile) || inTable(b, profile)) && a * b <= ceiling(profile)
        ? a * b
        : null,
  },
  {
    id: 'quotient',
    word: 'podíl',
    operation: 'div',
    // Obrácená malá násobilka: dělitel i podíl od dvou do deseti.
    value: (a, b, profile) => {
      if (!isFactor(b) || a % b !== 0 || a > ceiling(profile)) return null
      const quotient = a / b
      return isFactor(quotient) && (inTable(b, profile) || inTable(quotient, profile)) ? quotient : null
    },
  },
]

/** Násobné číslovky slovem. Číslice („5krát“) by dítě přečetlo jako „5 · …“. */
const TIMES_WORDS: Readonly<Record<number, string>> = {
  2: 'dvakrát',
  3: 'třikrát',
  4: 'čtyřikrát',
  5: 'pětkrát',
  6: 'šestkrát',
  7: 'sedmkrát',
  8: 'osmkrát',
  9: 'devětkrát',
  10: 'desetkrát',
}

/**
 * Tři druhy vět. Liší se tím, co dítě dělá:
 *
 *  1. přeloží jeden pojem na operaci („součin“ → násobím),
 *  2. spočítá dva pojmy a porovná je („o kolik“ odečítá, „kolikrát“ dělí),
 *  3. jde obráceným směrem („pětkrát menší“ dělí, ne násobí).
 */
type Kind = 1 | 2 | 3

/**
 * Rodina vět — a s ní id generátoru. Viz `termsGenerators` na konci souboru.
 *
 *  - `terms`: „o kolik“ — součet, rozdíl, o kolik větší a menší,
 *  - `terms-products`: násobení — součin, kolikrát větší číslo,
 *  - `terms-quotients`: dělení — podíl, kolikrát menší číslo, „kolikrát je…“.
 */
type Family = 'terms' | 'terms-products' | 'terms-quotients'

/** Rodina podle operace, kterou věta dítěti ukládá. */
const FAMILY_OF: Record<OperationTag, Family> = {
  add: 'terms',
  sub: 'terms',
  mul: 'terms-products',
  div: 'terms-quotients',
}

interface Candidate {
  kind: Kind
  family: Family
  /** Id šablony z návrhu §3 — losuje se nejdřív šablona, pak čísla. */
  template: string
  text: string
  value: number
  /** Operace, které dítě opravdu použije. Úloha projde jen se všemi. */
  operations: OperationTag[]
  /** Výpočet pro učitele. */
  step: string
}

function single(term: Term, a: number, b: number, profile: DifficultyProfile): Candidate | null {
  const value = term.value(a, b, profile)
  if (value === null || value < MIN_RESULT) return null
  return {
    kind: 1,
    family: FAMILY_OF[term.operation],
    template: `T1-${term.id}`,
    text: `Kolik je ${term.word} čísel ${a} a ${b}?`,
    value,
    operations: [term.operation],
    step: `${a} ${SYMBOL[term.operation]} ${b} = ${value}`,
  }
}

/**
 * Dva pojmy ze stejné dvojice čísel ve vztahu — „O kolik je součet čísel
 * 12 a 4 větší než jejich rozdíl?“.
 *
 * „Kolikrát“ se drží v malé násobilce: menší z obou hodnot i výsledek jsou
 * od dvou do deseti. Jinak by se z úlohy o pojmech stalo dělení `96 : 12`.
 */
function pair(
  first: Term,
  second: Term,
  a: number,
  b: number,
  profile: DifficultyProfile,
): Candidate[] {
  const left = first.value(a, b, profile)
  const right = second.value(a, b, profile)
  if (left === null || right === null || left === right) return []

  const firstBigger = left > right
  const [bigger, smaller] = firstBigger ? [left, right] : [right, left]
  const direction = firstBigger ? 'větší' : 'menší'
  const which = firstBigger ? 'vetsi' : 'mensi'
  const subject = `${first.word} čísel ${a} a ${b} ${direction} než jejich ${second.word}`
  const operations = (relation: OperationTag) =>
    ALL_OPERATIONS.filter((operation) =>
      [first.operation, second.operation, relation].includes(operation),
    )
  // Výpočet pro učitele je obyčejný výraz se závorkami, větší hodnota první:
  // `(12 + 4) − (12 − 4) = 8`.
  const written = (term: Term) => `(${a} ${SYMBOL[term.operation]} ${b})`
  const [biggerTerm, smallerTerm] = firstBigger ? [first, second] : [second, first]
  const step = (relation: OperationTag, value: number) =>
    `${written(biggerTerm)} ${SYMBOL[relation]} ${written(smallerTerm)} = ${value}`

  const found: Candidate[] = []
  const difference = bigger - smaller
  if (difference >= MIN_RESULT) {
    found.push({
      kind: 2,
      // Rodinu určuje vztah, ne pojmy: „o kolik je součin větší než součet“
      // je otázka na rozdíl, i když se v ní násobí.
      family: 'terms',
      template: `T2-o-${which}`,
      text: `O kolik je ${subject}?`,
      value: difference,
      operations: operations('sub'),
      step: step('sub', difference),
    })
  }
  if (bigger % smaller === 0 && isFactor(smaller) && isFactor(bigger / smaller)) {
    const ratio = bigger / smaller
    found.push({
      kind: 2,
      family: 'terms-quotients',
      template: `T2-krat-${which}`,
      text: `Kolikrát je ${subject}?`,
      value: ratio,
      operations: operations('div'),
      step: step('div', ratio),
    })
  }
  return found
}

/** Obrácený směr — „Které číslo je o 7 větší než 35?“, „…pětkrát menší než 40?“. */
function reverse(profile: DifficultyProfile): Candidate[] {
  const top = ceiling(profile)
  const found: Candidate[] = []

  for (let base = MIN_TERM; base <= top; base++) {
    for (let by = MIN_TERM; by <= top; by++) {
      if (base + by <= top) {
        found.push({
          kind: 3,
          family: 'terms',
          template: 'T3-o-vice',
          text: `Které číslo je o ${by} větší než ${base}?`,
          value: base + by,
          operations: ['add'],
          step: `${base} ${SYMBOL.add} ${by} = ${base + by}`,
        })
      }
      if (base - by >= MIN_RESULT) {
        found.push({
          kind: 3,
          family: 'terms',
          template: 'T3-o-mene',
          text: `Které číslo je o ${by} menší než ${base}?`,
          value: base - by,
          operations: ['sub'],
          step: `${base} ${SYMBOL.sub} ${by} = ${base - by}`,
        })
      }
    }
  }

  for (let times = MIN_FACTOR; times <= MAX_FACTOR; times++) {
    for (let base = MIN_FACTOR; base <= MAX_FACTOR; base++) {
      if (!inTable(times, profile) && !inTable(base, profile)) continue
      const product = times * base
      if (product > top) continue
      found.push({
        kind: 3,
        family: 'terms-products',
        template: 'T3-krat-vice',
        text: `Které číslo je ${TIMES_WORDS[times]} větší než ${base}?`,
        value: product,
        operations: ['mul'],
        step: `${base} ${SYMBOL.mul} ${times} = ${product}`,
      })
      // Tatáž dvojice obráceně: pětkrát menší než 40 je 8.
      found.push({
        kind: 3,
        family: 'terms-quotients',
        template: 'T3-krat-mene',
        text: `Které číslo je ${TIMES_WORDS[times]} menší než ${product}?`,
        value: base,
        operations: ['div'],
        step: `${product} ${SYMBOL.div} ${times} = ${base}`,
      })
    }
  }
  return found
}

/** Všechny platné věty pro profil, seskupené podle výsledku. */
function build(profile: DifficultyProfile): Map<number, Candidate[]> {
  const all: Candidate[] = []
  const top = ceiling(profile)

  for (let a = MIN_TERM; a <= top; a++) {
    for (let b = MIN_TERM; b <= top; b++) {
      for (const term of TERMS) {
        const candidate = single(term, a, b, profile)
        if (candidate !== null) all.push(candidate)
      }
      if (profile.grade < PAIR_MIN_GRADE) continue
      for (const first of TERMS) {
        for (const second of TERMS) {
          if (first !== second) all.push(...pair(first, second, a, b, profile))
        }
      }
    }
  }
  all.push(...reverse(profile))

  const byValue = new Map<number, Candidate[]>()
  for (const candidate of all) {
    const list = byValue.get(candidate.value) ?? []
    list.push(candidate)
    byValue.set(candidate.value, list)
  }
  return byValue
}

/**
 * Výčet se staví jednou na profil. Klíčem jsou jen pole, na kterých závisí —
 * šifra se ptá desetkrát za list a pokaždé s novým objektem profilu.
 */
const cache = new Map<string, Map<number, Candidate[]>>()

function catalogue(profile: DifficultyProfile): Map<number, Candidate[]> {
  const key = `${ceiling(profile)}|${profile.multiplicationTables.join(',')}|${profile.grade >= PAIR_MIN_GRADE}`
  let built = cache.get(key)
  if (built === undefined) {
    built = build(profile)
    cache.set(key, built)
  }
  return built
}

function supportsGrade(profile: DifficultyProfile): boolean {
  return profile.grade >= MIN_GRADE
}

/**
 * Smí tahle věta na list při zaškrtnutých operacích?
 *
 * Jen když učitel zaškrtl **všechny** operace, které dítě u věty použije.
 * Kdo odškrtne dělení, nedostane podíl ani „kolikrát“, ale téma mu zůstane.
 *
 * ⚠ Ne „aspoň jednu“ jako u rovnic. `reachableValues` se ptá i po JEDNÉ
 *   operaci zvlášť a šifra podle toho rozmisťuje písmena; kdyby věta
 *   o součtu a podílu odpověděla na dotaz „co umíš sčítáním?“, šifra by
 *   na ni spoléhala i tam, kde je dělení odškrtnuté.
 */
function allowed(
  candidate: Candidate,
  mix: Partial<Record<OperationTag, number>>,
  rules: TaskRules,
): boolean {
  if (rules.maxPromptLength !== undefined && candidate.text.length > rules.maxPromptLength) return false
  const chosen = ALL_OPERATIONS.filter((operation) => (mix[operation] ?? 0) > 0)
  // Prázdný mix znamená „všechny operace“, stejně jako u aritmetiky.
  return chosen.length === 0 || candidate.operations.every((operation) => chosen.includes(operation))
}

const SKILLS: Record<Kind, SkillTag[]> = {
  1: ['pojm.nazvy-vysledku'],
  2: ['pojm.nazvy-vysledku', 'pojm.o-kolik-kolikrat'],
  3: ['pojm.o-kolik-kolikrat'],
}

/**
 * Generátor jedné rodiny vět.
 *
 * Proč tři id a ne jedno, když učitel vidí jedno zaškrtávátko: hra losuje
 * výsledek rovnoměrně ze zásoby generátoru, a „kolikrát“, „pětkrát menší“
 * i podíl dávají jen čísla od dvou do deseti, kdežto součet a rozdíl
 * pokrývají celou stovku. S jediným id vyšlo pexeso z dvanácti dvojic bez
 * jediného dělení — a právě „pětkrát menší“ je to, co děti pletou nejvíc.
 * Každá rodina proto má vlastní zásobu a váha tématu se mezi ně dělí,
 * stejně jako u zlomků (`generatorMixFromTopics` v `tasks/mix`).
 */
function familyGenerator(family: Family): TaskGenerator {
  const ofFamily = (candidates: readonly Candidate[]) =>
    candidates.filter((candidate) => candidate.family === family)

  return {
    id: family,

    supports: supportsGrade,

    reachableValues(profile, mix, rules): Set<number> {
      const values = new Set<number>()
      if (!supportsGrade(profile)) return values
      for (const [value, candidates] of catalogue(profile)) {
        if (ofFamily(candidates).some((candidate) => allowed(candidate, mix, rules))) values.add(value)
      }
      return values
    },

    generateForValue(target: number, ctx: GenContext, rng: Rng): Task | null {
      if (!supportsGrade(ctx.profile)) return null
      const fresh = ofFamily(catalogue(ctx.profile).get(target) ?? []).filter(
        (candidate) => allowed(candidate, ctx.mix, ctx.rules) && !ctx.usedExpressions.has(candidate.text),
      )
      if (fresh.length === 0) return null

      // Nejdřív druh věty, pak šablona, teprve pak čísla. Losovat rovnou ze
      // všech vět by list zaplavilo porovnáváním dvou pojmů: „o kolik je
      // součet větší než rozdíl“ sedí na skoro každou dvojici čísel a vět
      // téhle šablony jsou tisíce, kdežto násobných číslovek jen pár desítek.
      const kind = rng.pick([...new Set(fresh.map((candidate) => candidate.kind))].sort((x, y) => x - y))
      const ofKind = fresh.filter((candidate) => candidate.kind === kind)
      const template = rng.pick([...new Set(ofKind.map((candidate) => candidate.template))])
      const chosen = rng.pick(ofKind.filter((candidate) => candidate.template === template))

      // Sebekontrola z hotového textu čtečkou, kterou bude list ověřován.
      const reading = readPhrase(chosen.text)
      if (reading.kind !== 'value' || reading.value !== target) return null

      ctx.usedExpressions.add(chosen.text)
      return {
        id: `${family}:${chosen.text}`,
        generatorId: family,
        value: target,
        prompt: { kind: 'phrase', text: chosen.text },
        solutionSteps: [{ kind: 'expr', text: chosen.step }],
        didactic: {
          grade: ctx.profile.grade,
          difficulty: chosen.kind === 1 ? 2 : 3,
          effort: chosen.kind === 2 ? 4 : 2,
          operations: chosen.operations,
          skills: SKILLS[chosen.kind],
        },
      }
    },
  }
}

/** „O kolik“: součet, rozdíl, o kolik větší a menší. */
export const termsGenerator = familyGenerator('terms')
/** Násobení: součin, kolikrát větší číslo. */
export const termProductsGenerator = familyGenerator('terms-products')
/** Dělení: podíl, kolikrát menší číslo, „kolikrát je…“. */
export const termQuotientsGenerator = familyGenerator('terms-quotients')
