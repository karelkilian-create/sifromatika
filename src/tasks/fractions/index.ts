/**
 * Generátor úloh se zlomky: zlomek v zadání i zlomek jako výsledek.
 *
 * Zápis je `3/4 z 80`, tedy lomítko a předložka `z`. Obojí je záměr:
 *
 *   • **Lomítko** je ve vygenerovaném zadání volné, protože dělení se na
 *     českém listu píše dvojtečkou (`36 : 4`). Tokenizer `/` zná jako dělení
 *     a `3/4` mu dá 0,75 — přesně tu hodnotu, kterou zlomek má. Verifikace
 *     proto zlomky umí, aniž by se jí musel psát nový druh výrazu.
 *   • **Předložka `z`** existuje kvůli procentům a váže stejně těsně jako
 *     tečka, takže `80 − 1/4 z 80` je `80 − 20`.
 *
 * Zlomek a procento jsou tu sourozenci: `25 % z 80` a `1/4 z 80` je táž úloha
 * dvěma zápisy, takže i kostra modulu je stejná jako v `tasks/percent`.
 *
 * Od 23. 8. 2026 umí modul obojí:
 *
 *   • **zlomek v ZADÁNÍ** (`3/4 z 80 = 60`) — výsledek je celé číslo, takže
 *     se tenhle tvar vejde do všech pěti aktivit včetně šifry;
 *   • **zlomek jako VÝSLEDEK** (`1/2 + 1/4 = 3/4`) — jen tam, kde si o to list
 *     řekne (`TaskRules.fractionResults`). Šifra ne: její výsledek je kód
 *     políčka v mřížce a zlomek nemá kam ukázat. Rozvaha je
 *     v `docs/navrh-zlomkovy-vysledek.md`.
 *
 * ⚠ Druhý tvar je jediné místo v projektu, kde se výsledek netiskne jako
 *   číslo. `Task.value` proto dál nese číslo (0,75) a vedle něj stojí
 *   `printedValue` s tím, co uvidí dítě (`3/4`) — u `1/3` je to jediná
 *   možnost, desetinný zápis té hodnoty neexistuje.
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
import type { Rng } from '../../core/rng/index.js'
import { evaluateExpression } from '../../core/verify/index.js'

/**
 * Jmenovatelé, které dítě dělí z hlavy.
 *
 * Sedmina a devítina tu schválně nejsou: `3/7 z 84` je správně, ale dělení
 * sedmi je počítání na papíře a úloha o zlomcích se změní v cvičení na
 * dělení. Je to stejná úvaha, jaká u procent vybrala násobky pěti.
 */
const DENOMINATORS = [2, 3, 4, 5, 6, 8, 10]

/**
 * Strop pro základ.
 *
 * Bez něj vzniká `1/10 z 4200`: v oboru osmého ročníku, ale mimo čísla,
 * ve kterých dítě o zlomcích přemýšlí. Táž mez a týž důvod jako u procent.
 */
const MAX_BASE = 1000

/**
 * Strop pro MEZIVÝSLEDEK, tedy pro podíl `základ : jmenovatel`.
 *
 * Sám o sobě je základ špatná míra náročnosti: `9/10 z 710` je z hlavy, kdežto
 * `2/3 z 897` není, a přitom jsou obě čísla skoro stejně velká. Rozdíl je
 * v tom, co dítěti vyjde po prvním kroku — 71, nebo 299.
 *
 * ⚠ Ukázal to teprve zkušební tisk pexesa: na kartičkách stálo `2/3 z 897`
 *   a `5/6 z 966`. Do her se to dostalo proto, že jejich cíle jdou do tisíce,
 *   kdežto šifra si říká o kódy políček, tedy nejvýš dvojciferné. Strop
 *   zásobu cílů zkrátil ze 737 na 644 a **cílů šifry se nedotkl vůbec**.
 */
const MAX_QUOTIENT = 100

/** Největší společný dělitel — kvůli zlomkům v základním tvaru. */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/**
 * Zlomky, které se na listu smí objevit: pravé a v základním tvaru.
 *
 * `2/4 z 80` je pro dítě `1/2 z 80` napsané zbytečně složitě, a nepravý
 * zlomek (`5/4 z 80`) je látka až za smíšenými čísly. Pořadí je pevné —
 * losuje se z něj, takže by jeho přeházení změnilo výstup z téhož seedu.
 */
const FRACTIONS: readonly { numerator: number; denominator: number }[] = DENOMINATORS.flatMap(
  (denominator) =>
    Array.from({ length: denominator - 1 }, (_, index) => index + 1)
      .filter((numerator) => gcd(numerator, denominator) === 1)
      .map((numerator) => ({ numerator, denominator })),
)

interface Fraction {
  numerator: number
  denominator: number
}

/** Zlomek v základním tvaru. Vstup nemusí být zkrácený, výstup vždycky je. */
function reduce(numerator: number, denominator: number): Fraction {
  const divisor = gcd(numerator, denominator)
  return { numerator: numerator / divisor, denominator: denominator / divisor }
}

const SYMBOL = { add: '+', sub: '−' } as const // − je U+2212, ne spojovník

/**
 * Jedna úloha rodiny „zlomek jako výsledek", vyrobená dopředu.
 *
 * Zásoba se dá vyjmenovat celá (jmenovatelé jsou ze seznamu a čitatelé menší
 * než jmenovatel), takže se konstruuje jednou při načtení modulu a pak už se
 * jen losuje. Tím odpadá hledání pozpátku, které u části z celku dělá
 * `baseFor` — z hodnoty `3/4` se totiž zpátky k `1/2 + 1/4` dojít nedá
 * jednoznačně.
 *
 * ⚠ `value` se počítá ze ZÁKLADNÍHO tvaru výsledku, ne z operandů. Zní to
 *   jako detail, ale drží pohromadě celé párování: `5/6 − 1/2` a `1/6 + 1/6`
 *   dají v plovoucí čárce dvě různá čísla (0.33333333333333337
 *   a 0.3333333333333333), a kdyby se do zásoby cílů dostala obě, vznikly by
 *   dvě kartičky s toutéž vytištěnou `1/3`.
 */
interface SumCandidate {
  text: string
  operation: 'add' | 'sub'
  /** Výsledek v základním tvaru — přesně tak, jak se vytiskne. */
  result: Fraction
  value: number
}

/**
 * Sečte nebo odečte dva zlomky. `null` = výsledek se na kartičku nehodí.
 *
 * Meze jsou dvě a obě jsou o látce, ne o kódu:
 *
 *   • **výsledek musí být menší než jedna.** `3/4 + 3/4` je `6/4`, tedy nepravý
 *     zlomek nebo smíšené číslo — látka, kterou tenhle krok nedělá.
 *   • **výsledek nesmí být nula ani celé číslo.** `1/4 + 3/4 = 1` o zlomcích
 *     neukáže nic a hodnota 1 se navíc sráží se vším ostatním na listu.
 */
function combine(left: Fraction, right: Fraction, operation: 'add' | 'sub'): SumCandidate | null {
  const common = (left.denominator * right.denominator) / gcd(left.denominator, right.denominator)
  const leftScaled = left.numerator * (common / left.denominator)
  const rightScaled = right.numerator * (common / right.denominator)
  const total = operation === 'add' ? leftScaled + rightScaled : leftScaled - rightScaled
  if (total <= 0 || total >= common) return null

  const result = reduce(total, common)
  return {
    text: `${left.numerator}/${left.denominator} ${SYMBOL[operation]} ${right.numerator}/${right.denominator}`,
    operation,
    result,
    value: result.numerator / result.denominator,
  }
}

/**
 * Sčítání a odčítání se stejným jmenovatelem.
 *
 * ⚠ Operandy tu NEMUSÍ být v základním tvaru: `2/6 + 1/6` je legitimní zadání,
 *   přestože `2/6` je `1/3` napsaná složitě. U společného jmenovatele se to
 *   tak píše i v učebnici a požadavek na základní tvar by tvar skoro vyprázdnil
 *   — u šestin by zbyly jen `1/6` a `5/6`, a ty dají dohromady celou jedničku.
 *   Základní tvar se vyžaduje od VÝSLEDKU, kde na něm záleží párování.
 */
function buildSameDenominator(): SumCandidate[] {
  const candidates: SumCandidate[] = []
  for (const denominator of DENOMINATORS) {
    for (let left = 1; left < denominator; left++) {
      for (let right = 1; right < denominator; right++) {
        for (const operation of ['add', 'sub'] as const) {
          const candidate = combine({ numerator: left, denominator }, { numerator: right, denominator }, operation)
          if (candidate !== null) candidates.push(candidate)
        }
      }
    }
  }
  return candidates
}

/**
 * Dvojice jmenovatelů, kde je jeden násobkem druhého: `1/2 + 1/8`.
 *
 * Společný jmenovatel je pak ten větší a najde se rozšířením jednoho zlomku,
 * bez hledání nejmenšího společného násobku. `1/3 + 1/4` (kde se musí rozšířit
 * oba) je další krok, ne tenhle.
 */
const RELATED_DENOMINATORS: readonly (readonly [number, number])[] = DENOMINATORS.flatMap(
  (small) =>
    DENOMINATORS.filter((big) => big > small && big % small === 0).map(
      (big) => [small, big] as const,
    ),
)

/**
 * Sčítání a odčítání s násobným jmenovatelem.
 *
 * Tady operandy v základním tvaru být MUSÍ — `2/4 + 1/8` by dítě nejdřív
 * zkrátilo a řešilo by jinou úlohu, než která je napsaná. Oba pořádky se
 * vyrábějí schválně: `1/2 + 1/8` i `1/8 + 1/2` jsou různá zadání a u odčítání
 * dá kladný výsledek pokaždé jen jedno z nich.
 */
function buildRelatedDenominator(): SumCandidate[] {
  const candidates: SumCandidate[] = []
  for (const [small, big] of RELATED_DENOMINATORS) {
    const smaller = FRACTIONS.filter((fraction) => fraction.denominator === small)
    const bigger = FRACTIONS.filter((fraction) => fraction.denominator === big)
    for (const left of smaller) {
      for (const right of bigger) {
        for (const operation of ['add', 'sub'] as const) {
          for (const [first, second] of [
            [left, right],
            [right, left],
          ] as const) {
            const candidate = combine(first, second, operation)
            if (candidate !== null) candidates.push(candidate)
          }
        }
      }
    }
  }
  return candidates
}

/**
 * Tvar úlohy. Dvě rodiny, které spolu sdílejí jen zaškrtávátko „Zlomky":
 *
 *   • `part-of-whole` počítá pozpátku z cílové hodnoty (`3/4 z 80`),
 *   • `sum` losuje z předem vyjmenované zásoby (`1/2 + 1/4`).
 */
interface PartShape {
  id: string
  /** Které zlomky tvar používá. */
  fractions: readonly Fraction[]
  skills: SkillTag[]
  effort: number
}

interface SumShape {
  id: string
  candidates: readonly SumCandidate[]
  skills: SkillTag[]
  effort: number
}

/**
 * Jednotkový zlomek je jeden krok (vyděl), ostatní dva (vyděl a vynásob).
 * Rozdíl je v námaze, ne v látce, takže dovednost je u obou tatáž.
 */
const PART_SHAPES: readonly PartShape[] = [
  {
    id: 'unit-fraction',
    fractions: FRACTIONS.filter((fraction) => fraction.numerator === 1),
    skills: ['zlom.cast-z-celku'],
    effort: 3,
  },
  {
    id: 'proper-fraction',
    fractions: FRACTIONS.filter((fraction) => fraction.numerator > 1),
    skills: ['zlom.cast-z-celku'],
    effort: 4,
  },
]

const SUM_SHAPES: readonly SumShape[] = [
  {
    id: 'same-denominator',
    candidates: buildSameDenominator(),
    skills: ['zlom.scitani-odcitani'],
    effort: 4,
  },
  {
    id: 'related-denominator',
    candidates: buildRelatedDenominator(),
    // Společný jmenovatel navíc: nejdřív rozšířit, pak teprve sčítat.
    skills: ['zlom.scitani-odcitani'],
    effort: 5,
  },
]

/**
 * Základ, ze kterého daný zlomek dá právě `target`.
 *
 * Konstrukce jde pozpátku od výsledku, stejně jako u procent: pro cíl 60
 * a zlomek `3/4` vyjde základ 80. Musí být celý — `3/4 z 79` není úloha,
 * kterou by šlo spočítat z hlavy, a hlavně by nedala celý výsledek.
 */
function baseFor(target: number, numerator: number, denominator: number): number | null {
  const base = (target * denominator) / numerator
  if (!Number.isInteger(base)) return null
  if (base <= 0 || base > MAX_BASE) return null
  // Co dítěti vyjde po prvním kroku, tedy po dělení jmenovatelem.
  if (base / denominator > MAX_QUOTIENT) return null
  return base
}


/**
 * Zlomek z celku je dělení i násobení dohromady: `1/4 z 80` je dělení čtyřmi,
 * `3/4 z 80` k tomu ještě násobení třemi. Stačí proto, aby byla povolená
 * jedna z těch dvou operací.
 *
 * Procenta mají přísnější pravidlo (jen násobení) a zůstávají na něm — jejich
 * zápis dělení nikde neukazuje, kdežto zlomková čára je dělení napsané.
 * Prázdný mix znamená „všechny operace", stejně jako u aritmetiky.
 */
function multiplicationOrDivisionAllowed(mix: Partial<Record<OperationTag, number>>): boolean {
  const chosen = chosenOperations(mix)
  return chosen.length === 0 || chosen.includes('mul') || chosen.includes('div')
}

/** Zaškrtnuté operace. Prázdný seznam znamená „všechny", jako u aritmetiky. */
function chosenOperations(mix: Partial<Record<OperationTag, number>>): OperationTag[] {
  return (['add', 'sub', 'mul', 'div'] as OperationTag[]).filter(
    (operation) => (mix[operation] ?? 0) > 0,
  )
}

function operationAllowed(
  operation: OperationTag,
  mix: Partial<Record<OperationTag, number>>,
): boolean {
  const chosen = chosenOperations(mix)
  return chosen.length === 0 || chosen.includes(operation)
}

/** Úlohy tvaru, které se vejdou do zaškrtnutých operací. */
function candidatesFor(
  shape: SumShape,
  mix: Partial<Record<OperationTag, number>>,
): readonly SumCandidate[] {
  return shape.candidates.filter((candidate) => operationAllowed(candidate.operation, mix))
}

/**
 * Základy, ze kterých daný cíl vyjde — každý zlomek nejvýš jeden, protože
 * `base` je z cíle a zlomku určený jednoznačně.
 *
 * ⚠ Procenta na tomhle místě dávají přednost základům dělitelným deseti
 *   (`25 % z 80`, ne `25 % z 84`). Zlomky ji mít NESMÍ, i když to vypadá jako
 *   totéž: základ desetiny je `cíl · 10`, tedy kulatý VŽDY, takže by desetina
 *   vyhrála skoro každé losování. Naměřeno na cílech šifry: s preferencí
 *   vyšlo 51 desetin a 22 pětin z 88 úloh, ale jen tři poloviny a jedna
 *   čtvrtina — a to jsou zlomky, o které v sedmé třídě jde nejvíc. Bez ní
 *   je rozdělení rovnoměrné (7 až 17 na jmenovatele).
 *
 *   Nic se tím neztratí: `1/3 z 66` je hezká úloha, i když 66 kulaté není.
 *   Dělitelnost je zaručená konstrukcí, takže dítě dělí vždycky beze zbytku.
 */
function optionsFor(
  target: number,
  shape: PartShape,
  profile: DifficultyProfile,
): { numerator: number; denominator: number; base: number }[] {
  const options: { numerator: number; denominator: number; base: number }[] = []
  for (const { numerator, denominator } of shape.fractions) {
    const base = baseFor(target, numerator, denominator)
    if (base === null || base > profile.numberRange.max) continue
    options.push({ numerator, denominator, base })
  }
  return options
}

/**
 * Zlomek v zadání: `3/4 z 80 = 60`. Umí ho každá aktivita včetně šifry.
 */
export const fractionsGenerator: TaskGenerator = {
  id: 'fractions',

  supports: (profile: DifficultyProfile) => profile.fractions,

  reachableValues(
    profile: DifficultyProfile,
    mix: Partial<Record<OperationTag, number>>,
  ): Set<number> {
    const values = new Set<number>()
    if (!profile.fractions || !multiplicationOrDivisionAllowed(mix)) return values

    const ceiling = Math.min(profile.numberRange.max, MAX_BASE)
    for (let target = 1; target <= ceiling; target++) {
      for (const shape of PART_SHAPES) {
        if (optionsFor(target, shape, profile).length > 0) {
          values.add(target)
          break
        }
      }
    }
    return values
  },

  generateForValue(target: number, ctx: GenContext, rng: Rng): Task | null {
    if (!ctx.profile.fractions || !multiplicationOrDivisionAllowed(ctx.mix)) return null

    for (let attempt = 0; attempt < 8; attempt++) {
      const task = partOfWhole(target, rng.pick(PART_SHAPES), ctx, rng)
      if (task !== null) return task
    }
    return null
  },
}

/**
 * Zlomek jako výsledek: `1/2 + 1/4 = 3/4`.
 *
 * ⚠ Samostatné id, přestože je to v editoru totéž zaškrtávátko „Zlomky".
 *   Není to kosmetika, je to jediný způsob, jak udržet poměr obou tvarů:
 *   zásoba cílů části z celku má pro sedmý ročník přes šest set hodnot,
 *   kdežto pravých zlomků se dvěma až deseti ve jmenovateli existuje
 *   devatenáct. V jednom pytli vycházel zlomkový výsledek na jednu kartičku
 *   z dvanácti — a to je táž vada, kterou u témat opravila
 *   `GENERATOR_VERSION` 5: poměr nesmí záviset na tom, jak široký obor čísel
 *   který tvar náhodou pokrývá. Vlastní id znamená vlastní zásobu a vlastní
 *   váhu při losování, tedy zhruba půl na půl.
 *
 * Překlad zaškrtávátka na obě id dělá `generatorMixFromTopics`; šifra tudy
 * nechodí a zlomkový výsledek nedostane ani omylem.
 */
export const fractionSumsGenerator: TaskGenerator = {
  id: 'fraction-sums',

  supports: (profile: DifficultyProfile) => profile.fractions,

  reachableValues(
    profile: DifficultyProfile,
    mix: Partial<Record<OperationTag, number>>,
    rules: TaskRules,
  ): Set<number> {
    const values = new Set<number>()
    // `supports` na pravidla listu nevidí, takže zákaz padá až sem: šifře
    // vyjde prázdná zásoba a aktivita ji přeskočí.
    if (!profile.fractions || !rules.fractionResults) return values

    for (const shape of SUM_SHAPES) {
      for (const candidate of candidatesFor(shape, mix)) {
        values.add(candidate.value)
      }
    }
    return values
  },

  generateForValue(target: number, ctx: GenContext, rng: Rng): Task | null {
    if (!ctx.profile.fractions || !ctx.rules.fractionResults) return null

    for (let attempt = 0; attempt < 8; attempt++) {
      const task = fractionSum(target, rng.pick(SUM_SHAPES), ctx, rng)
      if (task !== null) return task
    }
    return null
  },
}

/** `3/4 z 80` — zlomek v zadání, celé číslo ve výsledku. */
function partOfWhole(
  target: number,
  shape: PartShape,
  ctx: GenContext,
  rng: Rng,
): Task | null {
  const options = optionsFor(target, shape, ctx.profile)
  if (options.length === 0) return null

  const { numerator, denominator, base } = rng.pick(options)
  const text = `${numerator}/${denominator} z ${base}`
  if (ctx.usedExpressions.has(text)) return null

  // Přepočet z hotového textu — tímtéž kódem, který ho bude verifikovat.
  // Hodnota vznikla konstrukcí ze základu, tady se čte z toho, co bude
  // na papíře; rozejít se ty dvě cesty nesmí.
  let computed: number
  try {
    computed = evaluateExpression(text)
  } catch {
    return null
  }
  if (Math.abs(computed - target) > 1e-9) return null

  ctx.usedExpressions.add(text)
  return {
    id: `fractions:${text}`,
    generatorId: 'fractions',
    value: target,
    prompt: { kind: 'expr', text },
    solutionSteps: [{ kind: 'expr', text: `${text} = ${target}` }],
    didactic: {
      grade: ctx.profile.grade,
      difficulty: Math.min(5, Math.max(1, shape.effort)) as DidacticMeta['difficulty'],
      effort: shape.effort,
      // Dělení i násobení: dítě dělí jmenovatelem a násobí čitatelem.
      // U jednotkového zlomku je ten druhý krok násobení jedničkou, tedy
      // žádný — ale rozlišovat to v metadatech by znamenalo, že se `1/4`
      // a `3/4` chovají v poměru operací jinak, aniž by to učitel čekal.
      operations: ['mul', 'div'],
      skills: shape.skills,
    },
  }
}

/** `1/2 + 1/4 = 3/4` — zlomek v zadání i ve výsledku. */
function fractionSum(
  target: number,
  shape: SumShape,
  ctx: GenContext,
  rng: Rng,
): Task | null {
  const options = candidatesFor(shape, ctx.mix).filter(
    (candidate) => Math.abs(candidate.value - target) < 1e-9,
  )
  if (options.length === 0) return null

  const candidate = rng.pick(options)
  const { text } = candidate
  if (ctx.usedExpressions.has(text)) return null

  const printedValue = `${candidate.result.numerator}/${candidate.result.denominator}`

  // Týž nezávislý přepočet jako u části z celku: hodnota vznikla ze
  // společného jmenovatele, tady se čte z toho, co bude na papíře.
  let computed: number
  try {
    computed = evaluateExpression(text)
  } catch {
    return null
  }
  if (Math.abs(computed - target) > 1e-9) return null

  ctx.usedExpressions.add(text)
  return {
    id: `fraction-sums:${text}`,
    generatorId: 'fraction-sums',
    value: candidate.value,
    printedValue,
    prompt: { kind: 'expr', text },
    solutionSteps: [{ kind: 'expr', text: `${text} = ${printedValue}` }],
    didactic: {
      grade: ctx.profile.grade,
      difficulty: Math.min(5, Math.max(1, shape.effort)) as DidacticMeta['difficulty'],
      effort: shape.effort,
      operations: [candidate.operation],
      skills: shape.skills,
    },
  }
}
