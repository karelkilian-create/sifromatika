import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { gradeProfile } from '../../core/constraints/index.js'
import type { GenContext, OperationTag } from '../../core/model/index.js'
import { createRng } from '../../core/rng/index.js'
import { evaluateExpression } from '../../core/verify/index.js'
import { arithmeticGenerator } from './index.js'

function context(overrides: Partial<GenContext> = {}): GenContext {
  return {
    profile: gradeProfile(4),
    mix: { add: 1, sub: 1, mul: 1, div: 1 },
    usedExpressions: new Set(),
    ...overrides,
  }
}

describe('arithmeticGenerator.generateForValue', () => {
  it('vyrobí příklad, jehož nezávislý přepočet dá cílovou hodnotu', () => {
    const rng = createRng('aritmetika')
    for (let target = 2; target <= 100; target++) {
      const task = arithmeticGenerator.generateForValue(target, context(), rng)
      expect(task, `hodnota ${target}`).not.toBeNull()
      expect(evaluateExpression(task!.prompt.text)).toBe(target)
      expect(task!.value).toBe(target)
    }
  })

  it('pro stejný výsledek vyrábí různé příklady', () => {
    // Požadavek ze zadání: 24 = 18+6 = 30−6 = 6×4 = 48:2
    const rng = createRng('varianty')
    const ctx = context()
    const texts = new Set<string>()
    for (let i = 0; i < 8; i++) {
      const task = arithmeticGenerator.generateForValue(24, ctx, rng)
      if (task !== null) texts.add(task.prompt.text)
    }
    expect(texts.size).toBeGreaterThanOrEqual(6)
    for (const text of texts) expect(evaluateExpression(text)).toBe(24)
  })

  it('respektuje vypnuté operace', () => {
    const rng = createRng('jen-nasobeni')
    const ctx = context({ mix: { mul: 1 } })
    for (let i = 0; i < 30; i++) {
      const task = arithmeticGenerator.generateForValue(24, ctx, rng)
      if (task === null) continue
      expect(task.didactic.operations).toEqual(['mul'])
      expect(task.prompt.text).toContain('×')
    }
  })

  it('neopakuje již použitý výraz', () => {
    const rng = createRng('bez-duplicit')
    const ctx = context()
    const seen = new Set<string>()
    for (let i = 0; i < 20; i++) {
      const task = arithmeticGenerator.generateForValue(12, ctx, rng)
      if (task === null) break
      expect(seen.has(task.prompt.text)).toBe(false)
      seen.add(task.prompt.text)
    }
  })

  it('vrátí null pro hodnotu, kterou v profilu nelze vyrobit', () => {
    const rng = createRng('mimo-obor')
    const profile = gradeProfile(4) // rozsah do 100
    expect(arithmeticGenerator.generateForValue(9999, context({ profile }), rng)).toBeNull()
  })

  it('dělení vychází vždy beze zbytku', () => {
    const rng = createRng('deleni')
    const ctx = context({ mix: { div: 1 } })
    for (let target = 2; target <= 50; target++) {
      const task = arithmeticGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      expect(Number.isInteger(evaluateExpression(task.prompt.text))).toBe(true)
      expect(task.didactic.skills).toContain('arit.deleni-beze-zbytku')
    }
  })
})

describe('arithmeticGenerator — profil obtížnosti', () => {
  it('bez přechodu přes desítku žádný příklad desítku nepřekračuje', () => {
    const profile = { ...gradeProfile(3), crossesTen: false }
    const rng = createRng('bez-prechodu')
    const ctx = context({ profile, mix: { add: 1, sub: 1 } })

    for (let target = 2; target <= 60; target++) {
      const task = arithmeticGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      const [left, , right] = task.prompt.text.split(' ')
      const a = Number(left)
      const b = Number(right)
      const crosses = task.prompt.text.includes('+') ? (a % 10) + (b % 10) >= 10 : a % 10 < b % 10
      expect(crosses, task.prompt.text).toBe(false)
    }
  })

  it('reachableValues souhlasí s tím, co generátor skutečně vyrobí', () => {
    fc.assert(
      fc.property(fc.constantFrom(3, 4, 5), fc.integer({ min: 1, max: 300 }), (grade, target) => {
        const profile = gradeProfile(grade as 3 | 4 | 5)
        const mix = { add: 1, sub: 1, mul: 1, div: 1 }
        const reachable = arithmeticGenerator.reachableValues(profile, mix)
        const task = arithmeticGenerator.generateForValue(target, context({ profile }), createRng(`s${target}`))
        // Klíčový invariant: co slíbím v reachableValues, to musím umět vyrobit.
        if (reachable.has(target)) expect(task).not.toBeNull()
        if (task !== null) expect(reachable.has(target)).toBe(true)
      }),
      { numRuns: 500 },
    )
  })

  it('reachableValues zohledňuje zaškrtnuté operace', () => {
    const profile = gradeProfile(4)
    const vse = arithmeticGenerator.reachableValues(profile, { add: 1, sub: 1, mul: 1, div: 1 })
    const jenNasobeni = arithmeticGenerator.reachableValues(profile, { mul: 1 })

    // 37 je prvočíslo mimo malou násobilku — sčítáním ano, násobením ne.
    expect(vse.has(37)).toBe(true)
    expect(jenNasobeni.has(37)).toBe(false)
    expect(jenNasobeni.size).toBeLessThan(vse.size)

    // A co slíbí, to musí umět vyrobit — jinak si šifra a úlohy odporují.
    const rng = createRng('mix')
    for (const target of jenNasobeni) {
      const ctx = context({ profile, mix: { mul: 1 } })
      expect(arithmeticGenerator.generateForValue(target, ctx, rng), `${target}`).not.toBeNull()
    }
  })

  it('každá úloha nese didaktická metadata', () => {
    const rng = createRng('metadata')
    const operations: OperationTag[] = ['add', 'sub', 'mul', 'div']
    for (const operation of operations) {
      const task = arithmeticGenerator.generateForValue(24, context({ mix: { [operation]: 1 } }), rng)
      expect(task).not.toBeNull()
      expect(task!.didactic.skills.length).toBeGreaterThan(0)
      expect(task!.didactic.effort).toBeGreaterThan(0)
      expect(task!.didactic.grade).toBe(4)
      for (const skill of task!.didactic.skills) expect(skill).toMatch(/^arit\./)
    }
  })
})
