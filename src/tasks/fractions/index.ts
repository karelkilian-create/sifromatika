/**
 * Generátor úloh se zlomky: zlomek v zadání i zlomek jako výsledek.
 *
 * Zápis je `3/4 z 80`, tedy lomítko a předložka `z`. Obojí je záměr:
 *
 *   • **Lomítko** je ve vygenerovaném zadání volné, protože dělení se na
 *     českém listu píše dvojtečkou (`36 : 4`). Tokenizer čte `3/4` jako
 *     JEDNO číslo, tedy 0,75 — přesně tu hodnotu, kterou zlomek má.
 *     Verifikace proto zlomky umí, aniž by se jí musel psát nový druh výrazu.
 *
 *     ⚠ Do verze 10 to bylo dělení a u sčítání i násobení to vycházelo
 *       nastejno. Dělení zlomků to ale rozbilo (`1/2 : 1/4` čtené zleva
 *       doprava dá 0,125, ne 2), takže zlomková čára je od verze 11 vlastní
 *       číslo — a čte se týmž vzorem, jakým ho sazba kreslí.
 *   • **Předložka `z`** existuje kvůli procentům a váže stejně těsně jako
 *     tečka, takže `80 − 1/4 z 80` je `80 − 20`.
 *
 * Zlomek a procento jsou tu sourozenci: `25 % z 80` a `1/4 z 80` je táž úloha
 * dvěma zápisy, takže i kostra modulu je stejná jako v `tasks/percent`.
 *
 * Modul umí dvě rodiny úloh:
 *
 *   • **zlomek v ZADÁNÍ** (`3/4 z 80 = 60`) — výsledek je celé číslo, takže
 *     se tenhle tvar vejde do všech pěti aktivit včetně šifry;
 *   • **zlomek na OBOU stranách rovnítka** — sčítání a odčítání
 *     (`1/2 + 1/4 = 3/4`, od 23. 8. 2026), násobení a dělení
 *     (`2/3 · 3/5 = 2/5`, `1/2 : 1/4 = 2`, od 24. 8. 2026). Jen tam, kde si
 *     o to list řekne (`TaskRules.fractionResults`). Šifra ne: její výsledek
 *     je kód políčka v mřížce a zlomek nemá kam ukázat. Rozvahy jsou
 *     v `docs/navrh-zlomkovy-vysledek.md`
 *     a `docs/navrh-nasobeni-deleni-zlomku.md`.
 *
 * ⚠ Druhá rodina je jediné místo v projektu, kde se výsledek netiskne jako
 *   číslo. `Task.value` proto dál nese číslo (0,75) a vedle něj stojí
 *   `printedValue` s tím, co uvidí dítě (`3/4`) — u `1/3` je to jediná
 *   možnost, desetinný zápis té hodnoty neexistuje.
 *
 * ⚠ Dělení je v té rodině jediná operace, která smí dát CELÉ číslo:
 *   `1/2 : 1/4 = 2` je kanonická úloha na to, „kolik čtvrtin se vejde do
 *   poloviny". Taková úloha `printedValue` nepotřebuje — dvojka se vytiskne
 *   jako dvojka.
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

/** − je U+2212 (ne spojovník), · a : jsou české znaky pro krát a děleno. */
const SYMBOL = { add: '+', sub: '−', mul: '·', div: ':' } as const

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
interface ResultCandidate {
  text: string
  operation: OperationTag
  /**
   * Výsledek v základním tvaru — přesně tak, jak se vytiskne.
   *
   * Jmenovatel 1 znamená celé číslo (`1/2 : 1/4 = 2`) a tiskne se jako číslo,
   * bez `printedValue`.
   */
  result: Fraction
  value: number
}

/**
 * Výsledek, který se na kartičku hodí — nebo `null`.
 *
 * Jediné místo, kde se rozhoduje, co smí vyjít. Všechny čtyři operace jím
 * chodí, aby se pravidlo nedalo obejít přidáním další:
 *
 *   • **nula ne.** Neukáže o zlomcích nic a sráží se s čímkoli na listu.
 *   • **jednička ne.** `1/4 + 3/4 = 1` je táž úloha jako `2/5 + 3/5 = 1`
 *     a hodnota 1 se navíc sráží se vším ostatním.
 *   • **nepravý zlomek ne.** `3/4 + 3/4` je `6/4`, tedy smíšené číslo —
 *     látka, kterou projekt zatím nedělá (tokenizer neumí `2 1/2`).
 *   • **celé číslo od dvou ANO.** Vzniká jen dělením (`1/2 : 1/4 = 2`) a je
 *     to kanonická úloha na dělení zlomků, ne výjimka z nedbalosti.
 *   • **jmenovatel z `DENOMINATORS`**, tedy z téhož seznamu, jaký smí stát
 *     v zadání. Sčítání ho dodrží samo, násobení ne — `7/8 · 9/10` je
 *     `63/80`, správně spočítaný nesmysl. Jeden seznam pro obě strany
 *     rovnítka je zároveň levnější na vysvětlení než vlastní strop:
 *     nevznikne `4/7` ani `5/9`, tedy zlomek, o kterém modul o řádek výš
 *     tvrdí, že s ním dítě nepočítá.
 *
 * ⚠ Ten seznam drží ještě jedno pravidlo, o kterém tady není nic vidět.
 *   `verifyDistinctValues` porovnává výsledky jako čísla zaokrouhlená na dvě
 *   desetinná místa a spoléhá na to, že se dva různé zlomky nikdy nesejdou
 *   na téže hodnotě — nejtěsnější dvojice ze seznamu (`1/10` a `1/8`) se liší
 *   o 0,025. Volnější jmenovatel to boří: `1/8` a `2/15` se obě vytisknou
 *   jako 0,13, takže by párovací kontrola zahodila jinak správný list.
 */
function resultCandidate(
  text: string,
  operation: OperationTag,
  numerator: number,
  denominator: number,
): ResultCandidate | null {
  if (numerator <= 0) return null
  const result = reduce(numerator, denominator)
  if (result.denominator === 1) {
    if (result.numerator < 2) return null
  } else if (result.numerator > result.denominator || !DENOMINATORS.includes(result.denominator)) {
    return null
  }
  return {
    text,
    operation,
    result,
    value: result.numerator / result.denominator,
  }
}

/** Zápis úlohy: `1/2 + 1/4`, `2/3 · 3/5`, `1/2 : 1/4`. */
function expression(left: Fraction, right: Fraction, operation: OperationTag): string {
  return `${left.numerator}/${left.denominator} ${SYMBOL[operation]} ${right.numerator}/${right.denominator}`
}

/** Sečte nebo odečte dva zlomky přes společného jmenovatele. */
function combine(left: Fraction, right: Fraction, operation: 'add' | 'sub'): ResultCandidate | null {
  const common = (left.denominator * right.denominator) / gcd(left.denominator, right.denominator)
  const leftScaled = left.numerator * (common / left.denominator)
  const rightScaled = right.numerator * (common / right.denominator)
  const total = operation === 'add' ? leftScaled + rightScaled : leftScaled - rightScaled
  return resultCandidate(expression(left, right, operation), operation, total, common)
}

/**
 * Vynásobí dva zlomky: čitatel krát čitatel, jmenovatel krát jmenovatel.
 *
 * Součin dvou pravých zlomků je vždycky menší než jeden, takže tvar nikdy
 * nenarazí na zákaz nepravého zlomku — omezuje ho jen jmenovatel výsledku.
 */
function multiply(left: Fraction, right: Fraction): ResultCandidate | null {
  return resultCandidate(
    expression(left, right, 'mul'),
    'mul',
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  )
}

/**
 * Vydělí dva zlomky: násobení převrácenou hodnotou.
 *
 * Na rozdíl od násobení tu na pořadí záleží a většina dvojic vypadne —
 * `1/2 : 1/3` je `3/2`, tedy smíšené číslo. Co projde, je buď pravý zlomek
 * (`1/2 : 3/4 = 2/3`), nebo celé číslo (`1/2 : 1/4 = 2`).
 */
function divide(left: Fraction, right: Fraction): ResultCandidate | null {
  return resultCandidate(
    expression(left, right, 'div'),
    'div',
    left.numerator * right.denominator,
    left.denominator * right.numerator,
  )
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
function buildSameDenominator(): ResultCandidate[] {
  const candidates: ResultCandidate[] = []
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
function buildRelatedDenominator(): ResultCandidate[] {
  const candidates: ResultCandidate[] = []
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
 * Násobení zlomků.
 *
 * Operandy v základním tvaru — na rozdíl od společného jmenovatele tu není
 * důvod psát `2/4 · 1/3`: dítě by zlomek nejdřív zkrátilo a řešilo by jinou
 * úlohu, než která je napsaná.
 *
 * ⚠ Oba pořádky se vyrábějí, ačkoli je násobení komutativní. Na JEDEN list se
 *   obě verze dostat nemůžou (mají tutéž hodnotu a `verifyDistinctValues`
 *   by je zamítl), takže je to jen pestrost mezi seedy — jeden list dostane
 *   `1/2 · 3/4`, druhý `3/4 · 1/2`.
 */
function buildProducts(): ResultCandidate[] {
  const candidates: ResultCandidate[] = []
  for (const left of FRACTIONS) {
    for (const right of FRACTIONS) {
      const candidate = multiply(left, right)
      if (candidate !== null) candidates.push(candidate)
    }
  }
  return candidates
}

/**
 * Dělení zlomků.
 *
 * Stejná dvojitá smyčka jako u násobení, ale pořadí tu nese význam:
 * `1/2 : 3/4` je `2/3`, kdežto `3/4 : 1/2` je `3/2`, tedy smíšené číslo,
 * které vypadne. Vypadne většina dvojic — z 361 jich projde 137.
 */
function buildQuotients(): ResultCandidate[] {
  const candidates: ResultCandidate[] = []
  for (const left of FRACTIONS) {
    for (const right of FRACTIONS) {
      const candidate = divide(left, right)
      if (candidate !== null) candidates.push(candidate)
    }
  }
  return candidates
}

/**
 * Tvar úlohy. Dvě rodiny, které spolu sdílejí jen zaškrtávátko „Zlomky":
 *
 *   • `part-of-whole` počítá pozpátku z cílové hodnoty (`3/4 z 80`),
 *   • zlomek jako výsledek losuje z předem vyjmenované zásoby (`1/2 + 1/4`,
 *     `2/3 · 3/5`, `1/2 : 1/4`).
 */
interface PartShape {
  id: string
  /** Které zlomky tvar používá. */
  fractions: readonly Fraction[]
  skills: SkillTag[]
  effort: number
}

interface ResultShape {
  id: string
  candidates: readonly ResultCandidate[]
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

/**
 * Sčítání a odčítání zlomků.
 *
 * Pořadí tvarů je pevné — losuje se z něj, takže by jeho přeházení změnilo
 * výstup z téhož seedu.
 */
const SUM_SHAPES: readonly ResultShape[] = [
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
 * Násobení zlomků. Dva součiny a krácení — nižší námaha než společný
 * jmenovatel, protože dítě nemusí nic rozšiřovat.
 */
const PRODUCT_SHAPES: readonly ResultShape[] = [
  {
    id: 'product',
    candidates: buildProducts(),
    skills: ['zlom.nasobeni-deleni'],
    effort: 4,
  },
]

/** Dělení zlomků. Krok navíc proti násobení: nejdřív obrátit druhý zlomek. */
const QUOTIENT_SHAPES: readonly ResultShape[] = [
  {
    id: 'quotient',
    candidates: buildQuotients(),
    skills: ['zlom.nasobeni-deleni'],
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
  shape: ResultShape,
  mix: Partial<Record<OperationTag, number>>,
): readonly ResultCandidate[] {
  return shape.candidates.filter((candidate) => operationAllowed(candidate.operation, mix))
}

/** Tvar a jeho úlohy pro jeden konkrétní cíl. Prázdné tvary sem nechodí. */
interface ShapeMatches {
  shape: ResultShape
  candidates: readonly ResultCandidate[]
}

/**
 * Tvary, které pro daný cíl a zaškrtnuté operace opravdu něco mají.
 *
 * ⚠ Vybírá se PŘED losováním, ne osmi pokusy poslepu. Do verze 10 to bylo
 *   naopak a se dvěma tvary to nebylo vidět: cíl, který umí jediný z nich,
 *   měl šanci (1/2)^8, že ho osm pokusů nenajde. U dělení, kde většina cílů
 *   patří právě jednomu tvaru, by to ale znamenalo mizející úlohy.
 */
function matchesFor(
  shapes: readonly ResultShape[],
  target: number,
  mix: Partial<Record<OperationTag, number>>,
): ShapeMatches[] {
  const matches: ShapeMatches[] = []
  for (const shape of shapes) {
    const candidates = candidatesFor(shape, mix).filter(
      (candidate) => Math.abs(candidate.value - target) < 1e-9,
    )
    if (candidates.length > 0) matches.push({ shape, candidates })
  }
  return matches
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
 * Generátor rodiny „zlomek jako výsledek". Tři id, jedna kostra.
 *
 * ⚠ Samostatná id, přestože je to v editoru pořád jedno zaškrtávátko
 *   „Zlomky". Není to kosmetika, je to jediný způsob, jak udržet poměr úloh
 *   na listu — pravidlo, které projekt platí od `GENERATOR_VERSION` 5:
 *   **poměr nesmí záviset na tom, jak široký obor čísel který tvar náhodou
 *   pokrývá.** Zásoby jsou nesouměřitelné:
 *
 *     `fractions`          `3/4 z 80`   644 hodnot (sedmý ročník)
 *     `fraction-sums`      `1/2 + 1/4`   19 hodnot
 *     `fraction-products`  `2/3 · 3/5`   15 hodnot
 *     `fraction-quotients` `1/2 : 1/4`   25 hodnot
 *
 *   Násobení a dělení mají vlastní id každé, ačkoli je to jedna látka
 *   a učebnice je probírá spolu. Naměřeno na jednom pytli: dělení sahá i na
 *   celá čísla (`1/2 : 1/4 = 2`, osm hodnot, kam se součin dvou pravých
 *   zlomků nikdy nedostane), takže mu z dvojice padly dva cíle ze tří —
 *   a násobení zlomků by na dvanácti kartičkách vyšlo jedenkrát. To je
 *   přesně ta vada, kterou u zlomkového výsledku opravila verze 9.
 *
 * Překlad zaškrtávátka na čtyři id dělá `generatorMixFromTopics`; šifra tudy
 * nechodí a zlomkový výsledek nedostane ani omylem.
 */
function resultGenerator(id: string, shapes: readonly ResultShape[]): TaskGenerator {
  return {
    id,

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

      for (const shape of shapes) {
        for (const candidate of candidatesFor(shape, mix)) {
          values.add(candidate.value)
        }
      }
      return values
    },

    generateForValue(target: number, ctx: GenContext, rng: Rng): Task | null {
      if (!ctx.profile.fractions || !ctx.rules.fractionResults) return null

      const matches = matchesFor(shapes, target, ctx.mix)
      if (matches.length === 0) return null

      // Pokusy zůstávají kvůli `usedExpressions`: tvar pro cíl něco má, ale ta
      // konkrétní úloha už na listu být může.
      for (let attempt = 0; attempt < 8; attempt++) {
        const task = fractionResult(id, rng.pick(matches), ctx, rng)
        if (task !== null) return task
      }
      return null
    },
  }
}

/** `1/2 + 1/4 = 3/4` */
export const fractionSumsGenerator: TaskGenerator = resultGenerator('fraction-sums', SUM_SHAPES)

/** `2/3 · 3/5 = 2/5` */
export const fractionProductsGenerator: TaskGenerator = resultGenerator(
  'fraction-products',
  PRODUCT_SHAPES,
)

/** `1/2 : 1/4 = 2`, `3/4 : 5/6 = 9/10` */
export const fractionQuotientsGenerator: TaskGenerator = resultGenerator(
  'fraction-quotients',
  QUOTIENT_SHAPES,
)

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

/**
 * `1/2 + 1/4 = 3/4`, `2/3 · 3/5 = 2/5`, `1/2 : 1/4 = 2` — zlomek v zadání
 * a zlomek (nebo u dělení celé číslo) ve výsledku.
 */
function fractionResult(
  generatorId: string,
  { shape, candidates }: ShapeMatches,
  ctx: GenContext,
  rng: Rng,
): Task | null {
  const candidate = rng.pick(candidates)
  const { text } = candidate
  if (ctx.usedExpressions.has(text)) return null

  // Celý výsledek se tiskne jako číslo, ne jako `2/1`. `printedValue` je pole
  // pro to, co se od `formatValue` LIŠÍ — u dvojky se neliší nic.
  const printedValue =
    candidate.result.denominator === 1
      ? undefined
      : `${candidate.result.numerator}/${candidate.result.denominator}`

  // Týž nezávislý přepočet jako u části z celku: hodnota vznikla ze
  // společného jmenovatele nebo ze součinu, tady se čte z toho, co bude
  // na papíře.
  let computed: number
  try {
    computed = evaluateExpression(text)
  } catch {
    return null
  }
  if (Math.abs(computed - candidate.value) > 1e-9) return null

  ctx.usedExpressions.add(text)
  return {
    id: `${generatorId}:${text}`,
    generatorId,
    value: candidate.value,
    ...(printedValue === undefined ? {} : { printedValue }),
    prompt: { kind: 'expr', text },
    solutionSteps: [
      { kind: 'expr', text: `${text} = ${printedValue ?? formatValue(candidate.value)}` },
    ],
    didactic: {
      grade: ctx.profile.grade,
      difficulty: Math.min(5, Math.max(1, shape.effort)) as DidacticMeta['difficulty'],
      effort: shape.effort,
      operations: [candidate.operation],
      skills: shape.skills,
    },
  }
}
