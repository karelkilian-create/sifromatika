/**
 * Zámky na rovnice s chybějícím číslem.
 *
 * Nejdůležitější z nich je jednoznačnost: `? · 0 = 0` splní každé číslo
 * a dítě by mohlo odpovědět správně a dostat křížek. Je to táž past, jakou
 * má číselná řada, jen z druhé strany.
 */

import { describe, expect, it } from 'vitest'
import { gradeProfile } from '../../core/constraints/index.js'
import type { Grade, OperationTag } from '../../core/model/index.js'
import { ALLOW_DECIMAL_RESULTS, REQUIRE_WHOLE_RESULTS } from '../../core/model/index.js'
import { createRng } from '../../core/rng/index.js'
import { solveEquation, verifyTasks } from '../../core/verify/index.js'
import { equationGenerator } from './index.js'

const ALL: Partial<Record<OperationTag, number>> = { add: 1, sub: 1, mul: 1, div: 1 }

function context(grade: Grade, mix = ALL) {
  return {
    profile: gradeProfile(grade),
    mix,
    usedExpressions: new Set<string>(),
    rules: REQUIRE_WHOLE_RESULTS,
  }
}

/** Všechny úlohy, které generátor pro ročník a mix vyrobí. */
function every(grade: Grade, mix = ALL, limit = 60) {
  const rng = createRng(`rovnice-${grade}`)
  const ctx = context(grade, mix)
  const tasks = []
  for (const target of [...equationGenerator.reachableValues(gradeProfile(grade), mix, REQUIRE_WHOLE_RESULTS)].slice(0, limit)) {
    const task = equationGenerator.generateForValue(target, { ...ctx, usedExpressions: new Set() }, rng)
    if (task !== null) tasks.push(task)
  }
  return tasks
}

describe('equationGenerator', () => {
  it('umí už třetí třídu — na rozdíl od všeho, co přibylo letos', () => {
    expect(equationGenerator.supports(gradeProfile(3))).toBe(true)
    expect(every(3).length).toBeGreaterThan(10)
  })

  it('vyrobí zadání, které po dosazení cíle sedí', () => {
    for (const task of every(5)) {
      expect(solveEquation(task.prompt.text), task.prompt.text).toBe(task.value)
    }
  })

  it('každá úloha projde verifikací listu', () => {
    const slots = every(5).map((task) => ({
      taskText: task.prompt.text,
      declaredValue: task.value,
      kind: task.prompt.kind,
    }))
    expect(verifyTasks(slots, REQUIRE_WHOLE_RESULTS)).toEqual({ ok: true })
  })

  it('nevyrobí úlohu, kterou splní víc čísel', () => {
    // `? · 0 = 0` a spol. Druhý operand nikdy nesmí být 0 ani 1: nula dá víc
    // řešení, jednička úlohu změní na přečtení.
    for (const task of every(5)) {
      expect(task.prompt.text, task.prompt.text).not.toMatch(/[·:+−] 0 |[·:+−] 1 /u)
    }
  })

  it('drží se oboru ročníku na OBOU stranách rovnice', () => {
    const max = gradeProfile(3).numberRange.max
    for (const task of every(3)) {
      for (const number of task.prompt.text.match(/\d+/gu) ?? []) {
        expect(Number(number), task.prompt.text).toBeLessThanOrEqual(max)
      }
    }
  })

  it('tvar se řídí zaškrtnutými operacemi', () => {
    // Samotné sčítání nesmí dát podíl ani součin — a naopak.
    for (const task of every(5, { add: 1 })) {
      expect(task.prompt.text, task.prompt.text).not.toMatch(/[·:]/u)
    }
    for (const task of every(5, { mul: 1 })) {
      expect(task.prompt.text, task.prompt.text).not.toMatch(/[+−]/u)
    }
  })

  it('krok řešení ukazuje obrácenou operaci', () => {
    // U `? + 15 = 40` má v řešení stát `40 − 15 = 25`, ne opsané zadání:
    // učitel podle toho pozná, jestli dítě uvažovalo správně.
    const task = every(5).find((candidate) => candidate.prompt.text.includes('+'))
    expect(task).toBeDefined()
    expect(task?.solutionSteps[0]?.text).toMatch(/−/u)
  })

  it('vyšší ročník nedostane obří čísla v zadání', () => {
    // Obor osmé třídy je deset tisíc, ale `? + 4783 = 9021` se neřeší
    // obrácením operace, jen odečtením na papíře.
    for (const task of every(8, ALL, 200)) {
      const numbers = (task.prompt.text.match(/\d+/gu) ?? []).map(Number)
      expect(Math.min(...numbers), task.prompt.text).toBeLessThanOrEqual(100)
    }
  })

  it('ve hrách smí i desetinný cíl, pokud ho pravidla listu pustí', () => {
    // Sem se dostane jen přes cíl, který si vyžádá aktivita; generátor sám
    // desetinná čísla nevyrábí (viz „co se odchýlilo" v návrhu).
    const task = equationGenerator.generateForValue(
      12,
      { ...context(6), rules: ALLOW_DECIMAL_RESULTS },
      createRng('rovnice-hry'),
    )
    expect(task?.value).toBe(12)
  })
})
