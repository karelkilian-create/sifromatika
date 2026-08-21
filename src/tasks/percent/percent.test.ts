import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { gradeProfile } from '../../core/constraints/index.js'
import type { Grade, OperationTag } from '../../core/model/index.js'
import { REQUIRE_WHOLE_RESULTS } from '../../core/model/index.js'
import { createRng } from '../../core/rng/index.js'
import { evaluateExpression } from '../../core/verify/index.js'
import { percentGenerator } from './index.js'

const ALL: Partial<Record<OperationTag, number>> = { add: 1, sub: 1, mul: 1, div: 1 }

function context(grade: Grade, mix = ALL) {
  return {
    profile: gradeProfile(grade),
    mix,
    usedExpressions: new Set<string>(),
    rules: REQUIRE_WHOLE_RESULTS,
  }
}

describe('percentGenerator', () => {
  it('nabízí se až od sedmé třídy — dřív nejsou procenta v učivu', () => {
    expect(percentGenerator.supports(gradeProfile(5))).toBe(false)
    expect(percentGenerator.supports(gradeProfile(6))).toBe(false)
    expect(percentGenerator.supports(gradeProfile(7))).toBe(true)
    expect(percentGenerator.supports(gradeProfile(8))).toBe(true)
  })

  it('píše procenta tak, jak se sázejí na český list', () => {
    const rng = createRng('percent-zapis')
    for (const target of [20, 30, 12, 7, 45]) {
      const task = percentGenerator.generateForValue(target, context(7), rng)
      expect(task, `cíl ${target}`).not.toBeNull()
      // Mezera před značkou, předložka „z", celý základ.
      expect(task?.prompt.text).toMatch(/^\d+ % z \d+$/u)
    }
  })

  it('vyrobí úlohu, jejíž text dává právě zadaný cíl', () => {
    const rng = createRng('percent-cil')
    for (const target of [5, 12, 20, 21, 36, 60, 150]) {
      const task = percentGenerator.generateForValue(target, context(7), rng)
      expect(task, `cíl ${target}`).not.toBeNull()
      if (task === null) continue
      expect(evaluateExpression(task.prompt.text)).toBeCloseTo(target, 9)
      expect(task.value).toBe(target)
    }
  })

  it('základ preferuje kulatý — „25 % z 80" se čte líp než „25 % z 28"', () => {
    const rng = createRng('percent-kulate')
    let round = 0
    let total = 0
    for (let target = 2; target <= 60; target++) {
      const task = percentGenerator.generateForValue(target, context(7), rng)
      if (task === null) continue
      total++
      const base = Number(/z (\d+)$/u.exec(task.prompt.text)?.[1])
      if (base % 10 === 0) round++
    }
    expect(total).toBeGreaterThan(20)
    expect(round / total).toBeGreaterThan(0.9)
  })

  it('bez povoleného násobení nevyrobí nic — procento je v jádru násobení', () => {
    const rng = createRng('percent-mix')
    const withoutMul = context(7, { add: 1, sub: 1 })
    expect(percentGenerator.generateForValue(20, withoutMul, rng)).toBeNull()
    expect(percentGenerator.reachableValues(gradeProfile(7), { add: 1 }, REQUIRE_WHOLE_RESULTS).size).toBe(0)
  })

  it('slibuje jen hodnoty, které opravdu vyrobí', () => {
    const reachable = percentGenerator.reachableValues(gradeProfile(7), ALL, REQUIRE_WHOLE_RESULTS)
    const rng = createRng('percent-sliby')
    for (const target of [...reachable].slice(0, 60)) {
      const task = percentGenerator.generateForValue(target, context(7), rng)
      expect(task, `slíbená hodnota ${target}`).not.toBeNull()
    }
  })

  it('základ nepřeteče do velkých čísel, i když by to matematicky šlo', () => {
    const rng = createRng('percent-strop')
    for (let target = 2; target <= 200; target++) {
      const task = percentGenerator.generateForValue(target, context(8), rng)
      if (task === null) continue
      const base = Number(/z (\d+)$/u.exec(task.prompt.text)?.[1])
      expect(base, task.prompt.text).toBeLessThanOrEqual(1000)
    }
  })

  it('výsledek je vždy kladné celé číslo — je to kód políčka', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 400 }), fc.string({ minLength: 1 }), (target, seed) => {
        const task = percentGenerator.generateForValue(target, context(7), createRng(seed))
        if (task === null) return true
        const computed = evaluateExpression(task.prompt.text)
        return Math.abs(computed - target) < 1e-9 && Number.isInteger(target)
      }),
      { numRuns: 200 },
    )
  })
})
