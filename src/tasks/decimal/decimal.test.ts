import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { gradeProfile } from '../../core/constraints/index.js'
import type { Grade, OperationTag } from '../../core/model/index.js'
import { createRng } from '../../core/rng/index.js'
import { evaluateExpression } from '../../core/verify/index.js'
import { decimalGenerator, formatDecimal } from './index.js'

const ALL: Partial<Record<OperationTag, number>> = { add: 1, sub: 1, mul: 1, div: 1 }

function context(grade: Grade, mix = ALL) {
  return { profile: gradeProfile(grade), mix, usedExpressions: new Set<string>() }
}

describe('formatDecimal', () => {
  it.each([
    [350, '3,5'],
    [325, '3,25'],
    [300, '3'],
    [5, '0,05'],
    [50, '0,5'],
    [1005, '10,05'],
  ])('%i setin → %s', (cents, expected) => {
    expect(formatDecimal(cents)).toBe(expected)
  })

  it('nepíše koncovou nulu — „3,50" vypadá na listu jako cena', () => {
    expect(formatDecimal(350)).not.toContain('50')
  })
})

describe('decimalGenerator', () => {
  it('do páté třídy se nenabízí, od páté ano', () => {
    expect(decimalGenerator.supports(gradeProfile(4))).toBe(false)
    expect(decimalGenerator.supports(gradeProfile(5))).toBe(true)
    expect(decimalGenerator.supports(gradeProfile(7))).toBe(true)
  })

  it('vyrobí úlohu, jejíž text dává právě zadaný cíl', () => {
    const rng = createRng('decimal-cil')
    for (const target of [4, 6, 14, 20, 21, 35, 42]) {
      const task = decimalGenerator.generateForValue(target, context(6), rng)
      expect(task, `cíl ${target}`).not.toBeNull()
      if (task === null) continue
      expect(evaluateExpression(task.prompt.text)).toBeCloseTo(target, 9)
      expect(task.value).toBe(target)
    }
  })

  it('v zadání je vždy desetinné číslo, jinak by to nebyla desetinná úloha', () => {
    const rng = createRng('decimal-carka')
    for (const target of [4, 6, 9, 14, 25, 42]) {
      const task = decimalGenerator.generateForValue(target, context(6), rng)
      expect(task?.prompt.text, `cíl ${target}`).toMatch(/,/u)
    }
  })

  it('pátá třída dostane jen desetiny, ne setiny', () => {
    const rng = createRng('decimal-patka')
    const ctx = context(5)
    for (let target = 2; target <= 40; target++) {
      const task = decimalGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      for (const match of task.prompt.text.matchAll(/,(\d+)/gu)) {
        expect(match[1]!.length, task.prompt.text).toBe(1)
      }
    }
  })

  it('respektuje vypnuté operace', () => {
    const rng = createRng('decimal-mix')
    const onlyAdd = context(6, { add: 1 })
    for (let target = 2; target <= 30; target++) {
      const task = decimalGenerator.generateForValue(target, onlyAdd, rng)
      if (task === null) continue
      expect(task.prompt.text, 'při zapnutém jen sčítání nesmí vzniknout součin').not.toContain('·')
    }
  })

  it('neopakuje tentýž výraz', () => {
    const rng = createRng('decimal-opakovani')
    const ctx = context(6)
    const texts = new Set<string>()
    for (let target = 2; target <= 40; target++) {
      const task = decimalGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      expect(texts.has(task.prompt.text)).toBe(false)
      texts.add(task.prompt.text)
    }
  })

  it('slibuje jen hodnoty, které opravdu vyrobí', () => {
    const profile = gradeProfile(6)
    const reachable = decimalGenerator.reachableValues(profile, ALL)
    const rng = createRng('decimal-sliby')

    for (const target of [...reachable].slice(0, 60)) {
      const task = decimalGenerator.generateForValue(target, context(6), rng)
      expect(task, `slíbená hodnota ${target}`).not.toBeNull()
    }
  })

  it('výsledek je vždy kladné celé číslo — je to kód políčka', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 500 }), fc.string({ minLength: 1 }), (target, seed) => {
        const task = decimalGenerator.generateForValue(target, context(6), createRng(seed))
        if (task === null) return true
        const computed = evaluateExpression(task.prompt.text)
        return Number.isInteger(Math.round(computed)) && Math.abs(computed - target) < 1e-9 && target > 0
      }),
      { numRuns: 200 },
    )
  })
})

describe('decimalGenerator — sčítanci jsou srovnatelní', () => {
  it('nevyrábí „0,2 + 45,8" — jeden sčítanec skoro roven výsledku', () => {
    const rng = createRng('decimal-podstatnost')
    const ctx = context(7, { add: 1 })

    for (let target = 6; target <= 80; target++) {
      const task = decimalGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      const parts = task.prompt.text.split(' + ')
      if (parts.length !== 2) continue

      const values = parts.map((part) => Number(part.replace(',', '.')))
      const smaller = Math.min(...values)
      // Menší sčítanec musí být aspoň pětina výsledku, jinak je úloha
      // opticky „skoro nic plus skoro všechno".
      expect(smaller / target, task.prompt.text).toBeGreaterThan(0.2)
    }
  })
})
