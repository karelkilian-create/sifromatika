/**
 * Generátor úloh s procenty.
 *
 * Zápis je `25 % z 80` — mezera před značkou a předložka `z`, tak jak se
 * procenta sázejí na českých pracovních listech.
 *
 * Výsledek musí zůstat kladné celé číslo (je to kód políčka v mřížce), takže
 * konstrukce jde pozpátku: pro cíl 20 se hledá základ, ze kterého daný počet
 * procent dá právě 20. Tím zároveň vycházejí čísla, která dítě spočítá
 * z hlavy — `25 % z 80` je čtvrtina z osmdesáti, ne cvičení na kalkulačku.
 */

import type {
  DidacticMeta,
  DifficultyProfile,
  GenContext,
  OperationTag,
  SkillTag,
  Task,
  TaskGenerator,
} from '../../core/model/index.js'
import type { Rng } from '../../core/rng/index.js'
import { evaluateExpression } from '../../core/verify/index.js'

/**
 * Procenta, která dítě zvládne zpaměti: polovina, čtvrtina, desetina, setina.
 * Tahle sada tvoří většinu listu.
 */
const FAMILIAR_PERCENTS = [1, 5, 10, 20, 25, 50, 75]

/** Ostatní násobky pěti. Vyžadují už skutečný výpočet, ne jen úvahu o dělení. */
const OTHER_PERCENTS = [15, 30, 35, 40, 45, 55, 60, 65, 70, 80, 90]

/**
 * Strop pro základ.
 *
 * Bez něj vzniká `1 % z 4200`: matematicky správně, ale základ se vyšplhá
 * mimo obor, ve kterém dítě běžně počítá, a úloha o procentech se změní
 * v cvičení na velká čísla.
 */
const MAX_BASE = 1000

function baseFor(target: number, percent: number): number | null {
  const base = (target * 100) / percent
  if (!Number.isInteger(base)) return null
  if (base <= 0 || base > MAX_BASE) return null
  return base
}

/** Základ jako násobek deseti se čte líp — `25 % z 80`, ne `25 % z 28`. */
function isRoundBase(base: number): boolean {
  return base % 10 === 0
}

interface Shape {
  id: string
  percents: readonly number[]
  skills: SkillTag[]
  effort: number
}

const SHAPES: readonly Shape[] = [
  {
    id: 'familiar-percent',
    percents: FAMILIAR_PERCENTS,
    skills: ['proc.cast-z-celku'],
    effort: 3,
  },
  {
    id: 'other-percent',
    percents: OTHER_PERCENTS,
    skills: ['proc.cast-z-celku'],
    effort: 4,
  },
]

/**
 * Procento je v jádru násobení, takže se řídí zaškrtnutím násobení.
 * Prázdný mix znamená „všechny operace", stejně jako u aritmetiky.
 */
function multiplicationAllowed(mix: Partial<Record<OperationTag, number>>): boolean {
  const chosen = (['add', 'sub', 'mul', 'div'] as OperationTag[]).filter(
    (operation) => (mix[operation] ?? 0) > 0,
  )
  return chosen.length === 0 || chosen.includes('mul')
}

/** Základy, ze kterých daný cíl vyjde. Hezké (násobky deseti) mají přednost. */
function optionsFor(
  target: number,
  shape: Shape,
  profile: DifficultyProfile,
): { percent: number; base: number }[] {
  const options: { percent: number; base: number }[] = []
  for (const percent of shape.percents) {
    const base = baseFor(target, percent)
    if (base === null || base > profile.numberRange.max) continue
    options.push({ percent, base })
  }
  const round = options.filter((option) => isRoundBase(option.base))
  return round.length > 0 ? round : options
}

export const percentGenerator: TaskGenerator = {
  id: 'percent',

  supports: (profile: DifficultyProfile) => profile.percents,

  reachableValues(
    profile: DifficultyProfile,
    mix: Partial<Record<OperationTag, number>>,
  ): Set<number> {
    const values = new Set<number>()
    if (!profile.percents || !multiplicationAllowed(mix)) return values

    const ceiling = Math.min(profile.numberRange.max, MAX_BASE)
    for (let target = 1; target <= ceiling; target++) {
      for (const shape of SHAPES) {
        if (optionsFor(target, shape, profile).length > 0) {
          values.add(target)
          break
        }
      }
    }
    return values
  },

  generateForValue(target: number, ctx: GenContext, rng: Rng): Task | null {
    if (!ctx.profile.percents || !multiplicationAllowed(ctx.mix)) return null

    for (let attempt = 0; attempt < 8; attempt++) {
      const shape = rng.pick(SHAPES)
      const options = optionsFor(target, shape, ctx.profile)
      if (options.length === 0) continue

      const { percent, base } = rng.pick(options)
      const text = `${percent} % z ${base}`
      if (ctx.usedExpressions.has(text)) continue

      // Přepočet z hotového textu — tímtéž kódem, který ho bude verifikovat.
      // Hodnota vznikla konstrukcí ze základu, tady se čte z toho, co bude
      // na papíře; rozejít se ty dvě cesty nesmí.
      let computed: number
      try {
        computed = evaluateExpression(text)
      } catch {
        continue
      }
      if (Math.abs(computed - target) > 1e-9) continue

      ctx.usedExpressions.add(text)
      return {
        id: `percent:${text}`,
        generatorId: 'percent',
        value: target,
        prompt: { kind: 'expr', text },
        solutionSteps: [{ kind: 'expr', text: `${text} = ${target}` }],
        didactic: {
          grade: ctx.profile.grade,
          difficulty: Math.min(5, Math.max(1, shape.effort)) as DidacticMeta['difficulty'],
          effort: shape.effort,
          operations: ['mul'],
          skills: shape.skills,
        },
      }
    }
    return null
  },
}
