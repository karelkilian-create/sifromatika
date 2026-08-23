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

interface Shape {
  id: string
  /** Kde chybí číslo — určuje i to, jak se úloha napíše. */
  build: (target: number, other: number) => { text: string; step: string } | null
  /** Které operace se úlohy týkají: napsaná i ta, kterou dítě použije. */
  operations: OperationTag[]
  minGrade: number
  effort: number
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
    operations: ['add', 'sub'],
    minGrade: 3,
    effort: 2,
  },
  {
    id: 'missing-second-addend',
    // a + ? = c
    build: (target, other) => ({
      text: `${other} + ? = ${target + other}`,
      step: `${formatValue(target + other)} − ${other} = ${formatValue(target)}`,
    }),
    operations: ['add', 'sub'],
    minGrade: 3,
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
    operations: ['add', 'sub'],
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
    minGrade: 4,
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
    minGrade: 4,
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
    minGrade: 5,
    effort: 4,
  },
]

/** Prázdný mix znamená „všechny operace", stejně jako u aritmetiky. */
function shapeAllowed(
  shape: Shape,
  profile: DifficultyProfile,
  mix: Partial<Record<OperationTag, number>>,
): boolean {
  if (profile.grade < shape.minGrade) return false
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
 * Druhý operand pro daný tvar a cíl — všechny, ze kterých úloha zůstane
 * v oboru ročníku.
 */
function optionsFor(target: number, shape: Shape, profile: DifficultyProfile): number[] {
  return operandPool(shape, profile).filter((other) => fitsRange(target, other, shape, profile))
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
        pools[index]!.some((other) => fitsRange(target, other, shape, profile)),
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
