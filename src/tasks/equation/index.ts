/**
 * Generátor rovnic s chybějícím číslem — `? + 15 = 40`, `7 · ? = 56`.
 *
 * Dítě u nich nepočítá příklad, ale hledá číslo, které v něm chybí, a musí
 * kvůli tomu obrátit operaci. Je to tedy jiná dovednost než počítání, ne jeho
 * přebarvení. Rozvaha je v `docs/navrh-chybejici-cislo.md`.
 *
 * ⚠ Zápis s otazníkem drží **od 3. do 7. ročníku**; rovnice s neznámou
 *   (`x + 15 = 40`) je látka osmičky. Až na ni dojde, je to další tvar
 *   tohohle generátoru — písmeno místo otazníku — ne nový modul. Zavést
 *   `x` dřív by šlo proti tomu, jak se to učí.
 *
 * ⚠ Výsledek je holé číslo, takže se tenhle generátor nedotýká ničeho, co
 *   bylo drahé na zlomcích: žádné `printedValue`, žádný nový klíč párování.
 *   Nové je jen to, že zadání obsahuje rovnítko a otazník, a proto má
 *   `PromptNode` vlastní `kind`.
 */

import type {
  DidacticMeta,
  DifficultyProfile,
  GenContext,
  OperationTag,
  Task,
  TaskGenerator,
} from '../../core/model/index.js'
import type { Rng } from '../../core/rng/index.js'
import { formatValue } from '../../core/number/index.js'
import { evaluateExpression } from '../../core/verify/index.js'
import { crossesTenOnAdd, crossesTenOnSub } from '../shapes.js'

/**
 * Nejmenší druhý operand. Jednička je vyloučená schválně: `? · 1 = 7`
 * a `? + 1 = 40` se neřeší obrácením operace, ale přečtením.
 */
const MIN_OPERAND = 2

/**
 * Kolik čísel se nabídne k losování druhého operandu.
 *
 * Nejde o strop oboru — ten je v profilu. Jde o to, že `? + 4783 = 9021` je
 * sice v oboru osmé třídy, ale obrácení operace se na něm neprocvičí, jen se
 * na papíře odečte. Sčítance a menšitele proto zůstávají malé i ve vyšších
 * ročnících; velká čísla dodá druhá strana rovnice.
 */
const MAX_TERM = 100

/**
 * Poslední ročník s rozkladovými tvary.
 *
 * Táž mez jako u samostatného tématu „Desítky a jednotky"
 * (`decompositionAvailable` v `tasks/mix`), jen odsud se na ni nedá sáhnout:
 * `tasks/mix` zná zaškrtávátka a generátor o nich vědět nemá.
 */
const MAX_DECOMPOSITION_GRADE = 3

/**
 * Kolikrát nejvýš smí být druhý operand větší než hledané číslo.
 *
 * Zapsáno po zkušebním tisku 23. 8. 2026: na dominu z rovnic stálo
 * `78 + ? = 80`. Úloha je správně, ale dítě u ní nepočítá — jen přečte
 * rozdíl dvou skoro stejných čísel. Je to táž vada, jakou u odčítání
 * opravila `GENERATOR_VERSION` 2 (`711 − 708 = 3`), jen z druhé strany:
 * generátor hlídal, aby druhý operand nebyl 0 ani 1, ale ne jeho poměr
 * k hledanému číslu.
 *
 * Desetinásobek je řád. `78 + ? = 80` vypadne (2 proti 78),
 * `99 + ? = 1000` zůstane (901 proti 99). Naměřeno na 2160 úlohách: takhle
 * vadných byla zhruba jedna kartička na čtyři až osm dvanáctikamenových
 * domin.
 */
const MAX_OPERAND_RATIO = 10

interface Shape {
  id: string
  /** Kde chybí číslo — určuje i to, jak se úloha napíše. */
  build: (target: number, other: number) => { text: string; step: string } | null
  /** Které operace se úlohy týkají: napsaná i ta, kterou dítě použije. */
  operations: OperationTag[]
  minGrade: number
  /**
   * Poslední ročník, kde se tvar smí objevit. Bez něj platí „až nahoru".
   *
   * Existuje kvůli rozkladu: `? · 10 + 7 = 47` je úloha o desítkách
   * a jednotkách, tedy látka druhé třídy. V osmičce by to nebyla rovnice,
   * ale hádanka o zápisu.
   */
  maxGrade?: number
  effort: number
  /**
   * Vlastní zásoba druhých operandů.
   *
   * Bez ní se pool odvodí z operací tvaru: násobilkové tvary dostanou
   * činitele z profilu, ostatní čísla od `MIN_OPERAND` nahoru. Rozkladovým
   * tvarům nesedí ani jedno — jejich druhý operand je CIFRA, ne činitel.
   */
  operands?: (profile: DifficultyProfile) => number[]
  /**
   * Přechází tahle rovnice přes desítku?
   *
   * Ptá se na to jen druhá třída s odškrtnutým přechodem — nikde jinde není
   * `crossesTen` v profilu `false`. Tvary s násobením a dělením pole nemají:
   * přechod přes desítku se u nich nesleduje ani v aritmetice.
   *
   * ⚠ Stačí JEDNA kontrola na tvar, ne obě strany rovnice. Když se `? + b = c`
   *   sečte bez přechodu, odečte se `c − b` bez přechodu taky — jednotky
   *   součtu jsou pak vždy aspoň tak velké jako jednotky sčítance.
   */
  crossesTen?: (target: number, other: number) => boolean
}

/**
 * Sedm tvarů z návrhu §3. Pořadí je závazné — losuje se z něj, takže by jeho
 * přeházení změnilo výstup z téhož seedu.
 *
 * ⚠ Druhá pozice u součtu a součinu (`15 + ?`, `? · 7`) tu schválně není
 *   dvakrát: `7 · ? = 56` a `? · 7 = 56` je pro dítě táž úloha, protože obě
 *   operace jsou komutativní. U rozdílu a podílu to neplatí a tam jsou obě.
 */
const SHAPES: readonly Shape[] = [
  {
    id: 'missing-addend',
    // ? + b = c
    build: (target, other) => ({
      text: `? + ${other} = ${target + other}`,
      step: `${formatValue(target + other)} − ${other} = ${formatValue(target)}`,
    }),
    crossesTen: (target, other) => crossesTenOnAdd(target, other),
    operations: ['add', 'sub'],
    // Od druhé třídy: `? + 5 = 13` je běžné cvičení druhého ročníku a bez něj
    // by dvojka měla zaškrtnuté téma, ze kterého nic nevypadne.
    minGrade: 2,
    effort: 2,
  },
  {
    id: 'missing-second-addend',
    // a + ? = c
    build: (target, other) => ({
      text: `${other} + ? = ${target + other}`,
      step: `${formatValue(target + other)} − ${other} = ${formatValue(target)}`,
    }),
    crossesTen: (target, other) => crossesTenOnAdd(target, other),
    operations: ['add', 'sub'],
    minGrade: 2,
    effort: 2,
  },
  {
    id: 'missing-minuend',
    // ? − b = c
    build: (target, other) => {
      if (other >= target) return null // rozdíl musí zůstat kladný
      return {
        text: `? − ${other} = ${target - other}`,
        step: `${formatValue(target - other)} + ${other} = ${formatValue(target)}`,
      }
    },
    crossesTen: (target, other) => crossesTenOnSub(target, other),
    operations: ['add', 'sub'],
    // ⚠ Zůstává na trojce, i když dva tvary nad ním klesly na dvojku:
    //   obrátit odčítání je o krok dál než obrátit sčítání a druhá třída má
    //   z čeho brát i bez toho.
    minGrade: 3,
    effort: 3,
  },
  {
    id: 'missing-subtrahend',
    // a − ? = c, kde `a` je součet cíle a zbytku
    build: (target, other) => ({
      text: `${target + other} − ? = ${other}`,
      step: `${formatValue(target + other)} − ${other} = ${formatValue(target)}`,
    }),
    crossesTen: (target, other) => crossesTenOnSub(target + other, other),
    operations: ['add', 'sub'],
    minGrade: 4,
    effort: 3,
  },
  {
    id: 'missing-factor',
    // a · ? = c
    build: (target, other) => ({
      text: `${other} · ? = ${target * other}`,
      step: `${formatValue(target * other)} : ${other} = ${formatValue(target)}`,
    }),
    operations: ['mul', 'div'],
    // Obrácená násobilka je látka třetí třídy — Školákov má „Procvičování
    // násobilky a dělení" u každé řady od šestky výš (31. 8. 2026).
    minGrade: 3,
    effort: 3,
  },
  {
    id: 'missing-dividend',
    // ? : b = c
    build: (target, other) => {
      if (target % other !== 0) return null // dělení musí vyjít beze zbytku
      return {
        text: `? : ${other} = ${target / other}`,
        step: `${formatValue(target / other)} · ${other} = ${formatValue(target)}`,
      }
    },
    operations: ['mul', 'div'],
    minGrade: 3,
    effort: 3,
  },
  {
    id: 'missing-divisor',
    // a : ? = c
    build: (target, other) => ({
      text: `${target * other} : ? = ${other}`,
      step: `${formatValue(target * other)} : ${other} = ${formatValue(target)}`,
    }),
    operations: ['mul', 'div'],
    /*
     * `72 : ? = 9` do třetí třídy (Karel, 31. 8. 2026). Do té doby to byla
     * pátá, takže se tenhle tvar ve trojce ani ve čtyřce neobjevil ani
     * jednou ze 120 semínek.
     *
     * Čísla přitom zůstávají uvnitř malé násobilky — dítě si vybaví spoj,
     * který zná, jen z druhé strany. Že je to nejtěžší ze sedmi tvarů, nese
     * `effort`, ne ročníková brána.
     *
     * ⚠ Drží to pohromadě s plnou násobilkou ve trojce: operandy si tenhle
     *   tvar bere z `multiplicationTables` (`operandPool` níž), takže bez ní
     *   by uměl jen `? = 2` až `? = 5`.
     */
    minGrade: 3,
    effort: 4,
  },
  /*
   * Rozklad s otazníkem — dva poslední tvary, a schválně na konci pole.
   * `rng.pick` losuje podle indexu, takže vsunutí doprostřed by přepsalo
   * výstup uložených seedů.
   *
   * Hledané číslo je v obou jednociferné, protože otazník stojí na desítkách
   * nebo na jednotkách. Pro větší cíl tvar vrátí `null` a generátor sáhne po
   * jiném — na kód 4 tedy vyjde `? · 10 + 7 = 47`, na kód 47 přímý rozklad
   * z `tasks/decomposition`. Dávkuje se to samo, nic se nenastavuje.
   *
   * ⚠ Vypadá to jako vada „dítě odpověď jen přečte" — tady je to ale ta
   *   procvičovaná dovednost: poznat v 47 čtyři desítky. Až se ten poměr
   *   mezi hledaným číslem a operandem bude ladit, musí být oba tvary vyňaté.
   */
  {
    id: 'missing-tens',
    // ? · 10 + b = c
    build: (target, other) => {
      if (target < 1 || target > 9) return null // otazník je na desítkách
      const whole = target * 10 + other
      return {
        text: `? · 10 + ${other} = ${whole}`,
        step: `${formatValue(whole)} = ${formatValue(target)} · 10 + ${other}`,
      }
    },
    operations: ['mul', 'add'],
    minGrade: 2,
    maxGrade: MAX_DECOMPOSITION_GRADE,
    // Jednotky, tedy 1 až 9. Nula ne: `? · 10 + 0 = 40` je zápis, ne úloha.
    operands: () => [1, 2, 3, 4, 5, 6, 7, 8, 9],
    effort: 3,
  },
  {
    id: 'missing-units',
    // a · 10 + ? = c
    build: (target, other) => {
      if (target < 1 || target > 9) return null // otazník je na jednotkách
      const whole = other * 10 + target
      return {
        text: `${other} · 10 + ? = ${whole}`,
        step: `${formatValue(whole)} = ${other} · 10 + ${formatValue(target)}`,
      }
    },
    operations: ['mul', 'add'],
    minGrade: 2,
    maxGrade: MAX_DECOMPOSITION_GRADE,
    // Desítky. Nula by dala `0 · 10 + ? = 7`, což o rozkladu neučí nic.
    operands: () => [1, 2, 3, 4, 5, 6, 7, 8, 9],
    effort: 3,
  },
]

/** Prázdný mix znamená „všechny operace", stejně jako u aritmetiky. */
function shapeAllowed(
  shape: Shape,
  profile: DifficultyProfile,
  mix: Partial<Record<OperationTag, number>>,
): boolean {
  if (profile.grade < shape.minGrade) return false
  if (shape.maxGrade !== undefined && profile.grade > shape.maxGrade) return false
  const chosen = (['add', 'sub', 'mul', 'div'] as OperationTag[]).filter(
    (operation) => (mix[operation] ?? 0) > 0,
  )
  return chosen.length === 0 || shape.operations.some((operation) => chosen.includes(operation))
}

/**
 * Kandidáti na druhý operand pro daný tvar. Na cíli nezávisí, takže se dají
 * spočítat jednou a projít pro každý cíl znovu — viz `reachableValues`.
 */
function operandPool(shape: Shape, profile: DifficultyProfile): number[] {
  if (shape.operands !== undefined) return shape.operands(profile)
  const ceiling = Math.min(MAX_TERM, profile.numberRange.max)
  const factors = profile.multiplicationTables.filter((factor) => factor >= MIN_OPERAND)
  return shape.operations.includes('mul')
    ? factors
    : Array.from({ length: ceiling - MIN_OPERAND + 1 }, (_, index) => index + MIN_OPERAND)
}

/**
 * Vejde se rovnice s tímhle druhým operandem do oboru ročníku?
 *
 * ⚠ Hlídají se obě strany rovnice, ne jen ta hledaná. `? + 15 = 4030` je
 *   v oboru osmé třídy podle výsledku, ale to velké číslo v zadání je přesně
 *   to, čemu se `MAX_TERM` brání.
 */
function fitsRange(target: number, other: number, shape: Shape, profile: DifficultyProfile): boolean {
  const built = shape.build(target, other)
  if (built === null) return false
  const numbers = built.text.match(/\d+/gu)?.map(Number) ?? []
  return !numbers.some((value) => value > profile.numberRange.max)
}

/**
 * Smí se přes desítku, nebo si to učitel odškrtl?
 *
 * Vrací `true` všude, kde profil přechod povoluje — tedy ve všech ročnících
 * kromě druhé třídy s odškrtnutým zaškrtávátkem. Vyšší ročníky tím projdou
 * beze změny chování.
 */
function crossingAllowed(
  target: number,
  other: number,
  shape: Shape,
  profile: DifficultyProfile,
): boolean {
  if (profile.crossesTen) return true
  return shape.crossesTen === undefined || !shape.crossesTen(target, other)
}

/**
 * Počítá u téhle rovnice dítě, nebo jen čte?
 *
 * `78 + ? = 80` projde oborem i tvarem, a přesto je to špatná úloha — viz
 * `MAX_OPERAND_RATIO`. Poměr se měří k hledanému číslu, ne k číslu na pravé
 * straně: ta je u součtu vždycky velká a nic by neodfiltrovala.
 *
 * ⚠ Rozkladové tvary tudy projdou samy: v `? · 10 + 7 = 47` je hledaná
 *   čtyřka i sedmička jednociferná, takže poměr nikdy nepřekročí desítku.
 *   Kdyby se pravidlo někdy zpřísnilo na „hledané číslo pod deset" (což byl
 *   jeden z měřených tvarů vady), **musí se pro ně udělat výjimka** —
 *   jednociferné hledané číslo je tam celý smysl úlohy, ne vada.
 */
function balanced(target: number, other: number): boolean {
  return target * MAX_OPERAND_RATIO >= other
}

/** Všechny podmínky najednou. Ptá se na ně `optionsFor` i `reachableValues`. */
function usable(target: number, other: number, shape: Shape, profile: DifficultyProfile): boolean {
  return (
    fitsRange(target, other, shape, profile) &&
    crossingAllowed(target, other, shape, profile) &&
    balanced(target, other)
  )
}

/**
 * Druhý operand pro daný tvar a cíl — všechny, ze kterých úloha zůstane
 * v oboru ročníku.
 */
function optionsFor(target: number, shape: Shape, profile: DifficultyProfile): number[] {
  return operandPool(shape, profile).filter((other) => usable(target, other, shape, profile))
}

export const equationGenerator: TaskGenerator = {
  id: 'equation',

  // Od třetí třídy, tedy od nejnižšího ročníku, který projekt umí.
  supports: () => true,

  reachableValues(
    profile: DifficultyProfile,
    mix: Partial<Record<OperationTag, number>>,
  ): Set<number> {
    const values = new Set<number>()
    const shapes = SHAPES.filter((shape) => shapeAllowed(shape, profile, mix))
    if (shapes.length === 0) return values

    // Jde jen o to, JESTLI nějaký operand existuje, ne o to který — proto se
    // hledá první a dál se nepočítá. V osmé třídě je cílů deset tisíc a sedm
    // tvarů po stovce operandů z toho dělalo sedm milionů zbytečných pokusů:
    // list se šifrou se generoval tři sekundy, a šestkrát za sebou, protože
    // `generateCipherGrid` zkouší víc semínek.
    const pools = shapes.map((shape) => operandPool(shape, profile))

    for (let target = 1; target <= profile.numberRange.max; target++) {
      const reachable = shapes.some((shape, index) =>
        pools[index]!.some((other) => usable(target, other, shape, profile)),
      )
      if (reachable) values.add(target)
    }
    return values
  },

  generateForValue(target: number, ctx: GenContext, rng: Rng): Task | null {
    const shapes = SHAPES.filter((shape) => shapeAllowed(shape, ctx.profile, ctx.mix))
    if (shapes.length === 0) return null

    for (let attempt = 0; attempt < 8; attempt++) {
      const shape = rng.pick(shapes)
      const options = optionsFor(target, shape, ctx.profile)
      if (options.length === 0) continue

      const built = shape.build(target, rng.pick(options))
      if (built === null) continue
      if (ctx.usedExpressions.has(built.text)) continue

      // Nezávislý přepočet z hotového textu, stejně jako u ostatních
      // generátorů: dosadit cíl a ověřit, že se obě strany rovnají. Kdyby se
      // konstrukce a text rozešly, spadne to tady, ne až u dítěte.
      const [left, right] = built.text.split('=') as [string, string]
      try {
        const filled = evaluateExpression(left.replace('?', formatValue(target)))
        if (Math.abs(filled - evaluateExpression(right)) > 1e-9) continue
      } catch {
        continue
      }

      ctx.usedExpressions.add(built.text)
      return {
        id: `equation:${built.text}`,
        generatorId: 'equation',
        value: target,
        prompt: { kind: 'equation', text: built.text },
        // Krok řešení je obrácená operace — přesně to, co má dítě udělat,
        // a co učitel potřebuje vidět při opravování.
        solutionSteps: [{ kind: 'expr', text: built.step }],
        didactic: {
          grade: ctx.profile.grade,
          difficulty: Math.min(5, Math.max(1, shape.effort)) as DidacticMeta['difficulty'],
          effort: shape.effort,
          // Obě operace: napsaná i ta, kterou dítě použije. Vybrat jednu by
          // znamenalo, že se téma buď schová učiteli, který si zaškrtl
          // sčítání, nebo ho dostane ten, kdo si ho odškrtl.
          operations: shape.operations,
          skills: ['rov.chybejici-cislo'],
        },
      }
    }
    return null
  },
}
