import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { gradeProfile } from '../../core/constraints/index.js'
import type { GenContext, OperationTag } from '../../core/model/index.js'
import { REQUIRE_WHOLE_RESULTS } from '../../core/model/index.js'
import { createRng } from '../../core/rng/index.js'
import { evaluateExpression } from '../../core/verify/index.js'
import { arithmeticGenerator } from './index.js'

function context(overrides: Partial<GenContext> = {}): GenContext {
  return {
    profile: gradeProfile(4),
    mix: { add: 1, sub: 1, mul: 1, div: 1 },
    usedExpressions: new Set(),
    rules: REQUIRE_WHOLE_RESULTS,
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
    // Požadavek ze zadání: 24 = 18+6 = 30−6 = 6·4 = 48:2
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
      expect(task.prompt.text).toContain('·')
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

  it('nevyrábí triviální příklady, když existuje lepší varianta', () => {
    const rng = createRng('netrivialni')
    // Pro 6 existuje 4+2 i 3+3; pro 1 existuje jen n − (n−1), tam ústupek platí.
    for (let target = 6; target <= 100; target++) {
      const task = arithmeticGenerator.generateForValue(target, context(), rng)
      if (task === null) continue
      const [left, , right] = task.prompt.text.split(' ')
      const smaller = Math.min(Number(left), Number(right))
      expect(smaller, task.prompt.text).toBeGreaterThanOrEqual(2)
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
        const reachable = arithmeticGenerator.reachableValues(profile, mix, REQUIRE_WHOLE_RESULTS)
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
    const vse = arithmeticGenerator.reachableValues(profile, { add: 1, sub: 1, mul: 1, div: 1 }, REQUIRE_WHOLE_RESULTS)
    const jenNasobeni = arithmeticGenerator.reachableValues(profile, { mul: 1 }, REQUIRE_WHOLE_RESULTS)

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

describe('arithmeticGenerator — druhý stupeň', () => {
  /** Kolik čísel výraz obsahuje. Tři a víc = složený výraz. */
  function operandCount(text: string): number {
    return (text.match(/\d+/gu) ?? []).length
  }

  it('šestý a sedmý ročník dostanou i složené výrazy', () => {
    for (const grade of [6, 7] as const) {
      const rng = createRng(`slozene-${grade}`)
      const ctx = context({ profile: gradeProfile(grade) })
      const texts: string[] = []

      for (let target = 11; target <= 99; target++) {
        const task = arithmeticGenerator.generateForValue(target, ctx, rng)
        if (task !== null) texts.push(task.prompt.text)
      }

      expect(texts.length).toBeGreaterThan(50)
      expect(texts.filter((text) => operandCount(text) >= 3).length).toBeGreaterThan(10)
    }
  })

  it('třetí až pátý ročník složené výrazy nikdy nedostanou', () => {
    for (const grade of [3, 4, 5] as const) {
      const rng = createRng(`bez-slozenych-${grade}`)
      const ctx = context({ profile: gradeProfile(grade) })

      for (let target = 11; target <= 99; target++) {
        const task = arithmeticGenerator.generateForValue(target, ctx, rng)
        if (task === null) continue
        expect(operandCount(task.prompt.text), task.prompt.text).toBe(2)
        expect(task.prompt.text).not.toContain('(')
      }
    }
  })

  it('záporné operandy se objeví od sedmého ročníku, dřív nikdy', () => {
    const hasNegativeOperand = (text: string) => /(^|[(\s])[−-]\d/u.test(text)

    const collect = (grade: 3 | 4 | 5 | 6 | 7) => {
      const rng = createRng(`zaporna-${grade}`)
      const ctx = context({ profile: gradeProfile(grade) })
      const texts: string[] = []
      for (let target = 11; target <= 99; target++) {
        const task = arithmeticGenerator.generateForValue(target, ctx, rng)
        if (task !== null) texts.push(task.prompt.text)
      }
      return texts
    }

    for (const grade of [3, 4, 5, 6] as const) {
      expect(collect(grade).some(hasNegativeOperand), `${grade}. ročník`).toBe(false)
    }
    expect(collect(7).some(hasNegativeOperand)).toBe(true)
  })

  it('každý složený výraz se nezávisle přepočítá na cílovou hodnotu', () => {
    for (const grade of [6, 7] as const) {
      const rng = createRng(`prepocet-${grade}`)
      const ctx = context({ profile: gradeProfile(grade) })

      for (let target = 11; target <= 99; target++) {
        const task = arithmeticGenerator.generateForValue(target, ctx, rng)
        if (task === null) continue
        expect(evaluateExpression(task.prompt.text), task.prompt.text).toBe(target)
        expect(task.value).toBe(target)
      }
    }
  })

  it('výsledek zůstává kladný — je to kód políčka v šifře', () => {
    const rng = createRng('kladny-vysledek')
    const ctx = context({ profile: gradeProfile(7) })

    for (let target = 11; target <= 99; target++) {
      const task = arithmeticGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      expect(task.value).toBeGreaterThan(0)
    }
  })
})

describe('arithmeticGenerator — strop menšence', () => {
  it('nevyrábí příklady typu 711 − 708, kde se odečítají skoro stejná čísla', () => {
    for (const grade of [5, 6] as const) {
      const profile = gradeProfile(grade)
      const rng = createRng(`strop-${grade}`)
      const ctx = context({ profile, mix: { sub: 1 } })

      for (const target of [1, 3, 7, 10, 25]) {
        const task = arithmeticGenerator.generateForValue(target, ctx, rng)
        if (task === null) continue

        const numbers = (task.prompt.text.match(/\d+/gu) ?? []).map(Number)
        const minuend = numbers[0] ?? 0
        // Menšenec se musí držet řádově u výsledku, ne u horní meze oboru.
        expect(minuend, task.prompt.text).toBeLessThanOrEqual(target + Math.max(20, target * 2))
      }
    }
  })

  it('reachableValues zůstává poctivé i se stropem', () => {
    for (const grade of [5, 6, 7] as const) {
      const profile = gradeProfile(grade)
      const mix: Partial<Record<OperationTag, number>> = { sub: 1 }
      const reachable = [...arithmeticGenerator.reachableValues(profile, mix, REQUIRE_WHOLE_RESULTS)]
      expect(reachable.length).toBeGreaterThan(10)

      for (const target of reachable.slice(0, 60)) {
        const ctx = context({ profile, mix })
        const task = arithmeticGenerator.generateForValue(target, ctx, createRng(`p-${target}`))
        expect(task, `${grade}. ročník, hodnota ${target}`).not.toBeNull()
      }
    }
  })
})

describe('arithmeticGenerator — mocniny a odmocniny (8. ročník)', () => {
  const hasPowerOrRoot = (text: string) => /[²³√]/u.test(text)

  const collect = (grade: 3 | 4 | 5 | 6 | 7 | 8) => {
    const rng = createRng(`mocniny-${grade}`)
    const ctx = context({ profile: gradeProfile(grade) })
    const texts: string[] = []
    for (let target = 11; target <= 99; target++) {
      const task = arithmeticGenerator.generateForValue(target, ctx, rng)
      if (task !== null) texts.push(task.prompt.text)
    }
    return texts
  }

  it('osmý ročník dostane mocniny i odmocniny', () => {
    const texts = collect(8)
    expect(texts.filter(hasPowerOrRoot).length).toBeGreaterThan(10)
    expect(texts.some((text) => text.includes('²'))).toBe(true)
    expect(texts.some((text) => text.includes('√'))).toBe(true)
  })

  it('do sedmého ročníku se mocnina ani odmocnina neobjeví', () => {
    for (const grade of [3, 4, 5, 6, 7] as const) {
      expect(collect(grade).some(hasPowerOrRoot), `${grade}. ročník`).toBe(false)
    }
  })

  it('každý výraz s mocninou se nezávisle přepočítá na cílovou hodnotu', () => {
    const rng = createRng('prepocet-8')
    const ctx = context({ profile: gradeProfile(8) })

    for (let target = 11; target <= 99; target++) {
      const task = arithmeticGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      expect(evaluateExpression(task.prompt.text), task.prompt.text).toBe(target)
    }
  })

  it('odmocňuje se jen z úplných čtverců — na listu nesmí být iracionální číslo', () => {
    const rng = createRng('ctverce')
    const ctx = context({ profile: gradeProfile(8) })

    for (let target = 11; target <= 99; target++) {
      const task = arithmeticGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue

      for (const match of task.prompt.text.matchAll(/√(\d+)/gu)) {
        const radicand = Number(match[1])
        expect(Number.isInteger(Math.sqrt(radicand)), task.prompt.text).toBe(true)
      }
    }
  })

  it('mocniny se řídí zaškrtnutým násobením, odmocniny ne', () => {
    // Druhá mocnina JE opakované násobení, takže bez násobení nedává smysl.
    const rng = createRng('bez-nasobeni-8')
    const ctx = context({ profile: gradeProfile(8), mix: { add: 1, sub: 1 } })

    for (let target = 11; target <= 99; target++) {
      const task = arithmeticGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      expect(task.prompt.text, task.prompt.text).not.toMatch(/[²³]/u)
    }
  })
})
