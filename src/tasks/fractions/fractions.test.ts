import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { gradeProfile } from '../../core/constraints/index.js'
import type { Grade, OperationTag } from '../../core/model/index.js'
import { REQUIRE_WHOLE_RESULTS } from '../../core/model/index.js'
import { isWholeNumber } from '../../core/number/index.js'
import { createRng } from '../../core/rng/index.js'
import { evaluateExpression } from '../../core/verify/index.js'
import { fractionsGenerator } from './index.js'

const ALL: Partial<Record<OperationTag, number>> = { add: 1, sub: 1, mul: 1, div: 1 }

function context(grade: Grade, mix = ALL) {
  return {
    profile: gradeProfile(grade),
    mix,
    usedExpressions: new Set<string>(),
    rules: REQUIRE_WHOLE_RESULTS,
  }
}

/** `3/4 z 80` → { numerator: 3, denominator: 4, base: 80 } */
function parts(text: string) {
  const match = /^(\d+)\/(\d+) z (\d+)$/u.exec(text)
  if (match === null) throw new Error(`neočekávaný tvar: ${text}`)
  return {
    numerator: Number(match[1]),
    denominator: Number(match[2]),
    base: Number(match[3]),
  }
}

describe('fractionsGenerator', () => {
  it('nabízí se od sedmé třídy, dřív ne', () => {
    // Šestá třída zlomky zavádí, ale počítá s nimi až sedmá — rozhodnuto
    // 22. 8. 2026. Je to týž ročník jako u procent.
    expect(fractionsGenerator.supports(gradeProfile(5))).toBe(false)
    expect(fractionsGenerator.supports(gradeProfile(6))).toBe(false)
    expect(fractionsGenerator.supports(gradeProfile(7))).toBe(true)
    expect(fractionsGenerator.supports(gradeProfile(8))).toBe(true)
  })

  it('vyrobí úlohu, jejíž text dává právě zadaný cíl', () => {
    const rng = createRng('zlomky-cil')
    for (const target of [6, 12, 15, 20, 24, 45, 60]) {
      const task = fractionsGenerator.generateForValue(target, context(7), rng)
      expect(task, `cíl ${target}`).not.toBeNull()
      if (task === null) continue
      expect(evaluateExpression(task.prompt.text)).toBeCloseTo(target, 9)
      expect(task.value).toBe(target)
    }
  })

  it('základ je vždy dělitelný jmenovatelem — jinak nevyjde celý výsledek', () => {
    const ctx = context(7)
    const rng = createRng('zlomky-delitelnost')
    for (let target = 1; target <= 120; target++) {
      const task = fractionsGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      const { denominator, base } = parts(task.prompt.text)
      expect(base % denominator, task.prompt.text).toBe(0)
    }
  })

  it('zlomek je pravý a v základním tvaru', () => {
    // `2/4 z 80` je `1/2 z 80` napsané zbytečně složitě a `5/4 z 80` je
    // látka až za smíšenými čísly.
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
    const ctx = context(7)
    const rng = createRng('zlomky-tvar')

    for (let target = 1; target <= 120; target++) {
      const task = fractionsGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      const { numerator, denominator } = parts(task.prompt.text)
      expect(numerator, task.prompt.text).toBeLessThan(denominator)
      expect(gcd(numerator, denominator), task.prompt.text).toBe(1)
    }
  })

  it('jmenovatel je ten, kterým dítě dělí z hlavy', () => {
    // Sedmina ani devítina ne: `3/7 z 84` je správně, ale dělení sedmi je
    // počítání na papíře a z úlohy o zlomcích se stane úloha o dělení.
    const ctx = context(8)
    const rng = createRng('zlomky-jmenovatele')
    for (let target = 1; target <= 200; target++) {
      const task = fractionsGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      expect([2, 3, 4, 5, 6, 8, 10], task.prompt.text).toContain(parts(task.prompt.text).denominator)
    }
  })

  it('mezivýsledek dělení je číslo, které dítě udrží v hlavě', () => {
    // `2/3 z 897` a `5/6 z 966` stály na vytištěných kartičkách, než tohle
    // pravidlo vzniklo: základ v mezích, ale po vydělení třemi vyjde 299.
    // Šifry se to nedotklo — její cíle jsou kódy políček, tedy dvojciferné.
    const ctx = context(8)
    const rng = createRng('zlomky-mezivysledek')
    for (let target = 1; target <= 400; target++) {
      const task = fractionsGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      const { denominator, base } = parts(task.prompt.text)
      expect(base / denominator, task.prompt.text).toBeLessThanOrEqual(100)
    }
  })

  it('základ zůstává v oboru, ve kterém se o zlomcích přemýšlí', () => {
    // Bez stropu vzniká `1/10 z 4200`: v oboru osmého ročníku, ale mimo
    // čísla, se kterými dítě zachází zpaměti.
    const ctx = context(8)
    const rng = createRng('zlomky-obor')
    for (let target = 1; target <= 200; target++) {
      const task = fractionsGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      expect(parts(task.prompt.text).base, task.prompt.text).toBeLessThanOrEqual(1000)
    }
  })

  it('výsledek je vždy kladné celé číslo — je to kód políčka', () => {
    // ⚠ `isWholeNumber`, ne `Number.isInteger`: `7/10 z 710` vyjde v plovoucí
    //   čárce jako 496.99999999999994. Není to vada generátoru ani důvod
    //   počítat zlomky celočíselně — `Task.value` nese poctivých 497 a na list
    //   se tiskne ono, kdežto tady se počítá znovu z textu. Verifikace na to
    //   má tutéž toleranci (viz `EPSILON` v `core/verify`) a ze stejného
    //   důvodu: `0,07 · 300` dá 21.000000000000004.
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 500 }), fc.string({ minLength: 1 }), (target, seed) => {
        const task = fractionsGenerator.generateForValue(target, context(7), createRng(seed))
        if (task === null) return true
        const computed = evaluateExpression(task.prompt.text)
        return isWholeNumber(computed) && Math.abs(computed - target) < 1e-9
      }),
      { numRuns: 200 },
    )
  })

  it('slibuje jen hodnoty, které opravdu vyrobí', () => {
    const profile = gradeProfile(7)
    const reachable = fractionsGenerator.reachableValues(profile, ALL, REQUIRE_WHOLE_RESULTS)
    expect(reachable.size).toBeGreaterThan(100)

    for (const target of [...reachable].slice(0, 80)) {
      const ctx = context(7)
      expect(
        fractionsGenerator.generateForValue(target, ctx, createRng(`slib-${target}`)),
        `slíbená hodnota ${target}`,
      ).not.toBeNull()
    }
  })

  it('zlomek z celku je dělení i násobení, takže stačí jedna z těch operací', () => {
    // Procenta vyžadují násobení; u zlomku je dělení napsané ve zlomkové
    // čáře, takže by odškrtnuté násobení nemělo zlomky zabít.
    const onlyDiv = context(7, { div: 1 })
    const onlyMul = context(7, { mul: 1 })
    const onlyAdd = context(7, { add: 1 })

    expect(fractionsGenerator.generateForValue(20, onlyDiv, createRng('jen-deleni'))).not.toBeNull()
    expect(fractionsGenerator.generateForValue(20, onlyMul, createRng('jen-nasobeni'))).not.toBeNull()
    expect(fractionsGenerator.generateForValue(20, onlyAdd, createRng('jen-scitani'))).toBeNull()
  })

  it('neopakuje tentýž výraz', () => {
    const ctx = context(7)
    const rng = createRng('zlomky-opakovani')
    const texts = new Set<string>()
    for (let target = 1; target <= 100; target++) {
      const task = fractionsGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      expect(texts.has(task.prompt.text)).toBe(false)
      texts.add(task.prompt.text)
    }
  })

  it('žádný jmenovatel nepohltí list', () => {
    // Zámek proti preferenci kulatého základu, kterou má generátor procent:
    // základ desetiny je `cíl · 10`, tedy kulatý vždycky, takže by ta
    // preference vyrobila list ze samých desetin a pětin. Naměřeno: 51 desetin
    // a 22 pětin z 88 úloh, poloviny tři a čtvrtina jedna.
    const ctx = context(7)
    const rng = createRng('zlomky-rozdeleni')
    const counts = new Map<number, number>()
    let total = 0

    // Rozsah cílů šifry — tam se to projevilo nejsilněji, protože kódy
    // políček jsou nejvýš dvojciferné.
    for (let target = 1; target <= 88; target++) {
      const task = fractionsGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      total++
      const { denominator } = parts(task.prompt.text)
      counts.set(denominator, (counts.get(denominator) ?? 0) + 1)
    }

    expect(counts.size, 'na listu mají být zastoupené všechny jmenovatele').toBe(7)
    for (const [denominator, count] of counts) {
      expect(count / total, `jmenovatel ${denominator}`).toBeLessThan(0.35)
    }
    // Polovina a čtvrtina jsou zlomky, o které v sedmé třídě jde nejvíc.
    expect((counts.get(2) ?? 0) + (counts.get(4) ?? 0)).toBeGreaterThan(10)
  })
})

describe('fractionsGenerator — verifikace zlomek přečte', () => {
  it('lomítko je pro tokenizer dělení, takže hodnota sedí', () => {
    // Tohle je celý důvod, proč zlomky nepotřebovaly nový druh výrazu:
    // dělení se na listu píše dvojtečkou, takže `/` zbylo volné.
    expect(evaluateExpression('3/4 z 80')).toBeCloseTo(60, 9)
    expect(evaluateExpression('80 − 1/4 z 80')).toBeCloseTo(60, 9)
  })

  it('předložka `z` váže těsně jako tečka', () => {
    // Kdyby vázala volně, bylo by `1/2 z 80 + 10` rovno `1/2 z 90`.
    expect(evaluateExpression('1/2 z 80 + 10')).toBeCloseTo(50, 9)
  })
})
