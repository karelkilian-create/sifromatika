import { describe, expect, it } from 'vitest'
import { gradeProfile } from '../../core/constraints/index.js'
import type { Grade, OperationTag } from '../../core/model/index.js'
import { REQUIRE_WHOLE_RESULTS } from '../../core/model/index.js'
import { createRng } from '../../core/rng/index.js'
import { evaluateExpression } from '../../core/verify/index.js'
import { decompositionGenerator } from './index.js'

const ALL: Partial<Record<OperationTag, number>> = { add: 1, sub: 1, mul: 1, div: 1 }

function context(grade: Grade, mix = ALL) {
  return {
    profile: gradeProfile(grade),
    mix,
    usedExpressions: new Set<string>(),
    rules: REQUIRE_WHOLE_RESULTS,
  }
}

describe('decompositionGenerator', () => {
  it('nabízí se do třetí třídy — dál je rozklad čtení čísla, ne úloha', () => {
    expect(decompositionGenerator.supports(gradeProfile(2))).toBe(true)
    expect(decompositionGenerator.supports(gradeProfile(3))).toBe(true)
    expect(decompositionGenerator.supports(gradeProfile(4))).toBe(false)
    expect(decompositionGenerator.supports(gradeProfile(8))).toBe(false)
  })

  it('ve vyšších ročnících nevyrobí nic, ani když ho o to někdo požádá', () => {
    const rng = createRng('rozklad-vyssi')
    expect(decompositionGenerator.generateForValue(37, context(4), rng)).toBeNull()
    expect(
      decompositionGenerator.reachableValues(gradeProfile(4), ALL, REQUIRE_WHOLE_RESULTS).size,
    ).toBe(0)
  })

  it('píše se obráceně: zadání je rozklad, hledá se číslo', () => {
    const rng = createRng('rozklad-smer')
    const task = decompositionGenerator.generateForValue(37, context(2), rng)
    expect(task?.prompt.text).toBe('3 · 10 + 7')
    expect(task?.value).toBe(37)
  })

  it('násobek desíti nemá na konci nulu', () => {
    const rng = createRng('rozklad-desitky')
    expect(decompositionGenerator.generateForValue(40, context(2), rng)?.prompt.text).toBe('4 · 10')
  })

  it('text každé úlohy se přepočte přesně na svůj cíl', () => {
    const rng = createRng('rozklad-cil')
    for (let target = 10; target <= 99; target++) {
      const task = decompositionGenerator.generateForValue(target, context(2), rng)
      expect(task, `cíl ${target}`).not.toBeNull()
      if (task === null) continue
      expect(evaluateExpression(task.prompt.text), `cíl ${target}`).toBe(target)
      expect(task.generatorId).toBe('decomposition')
    }
  })

  it('jednociferná čísla a stovky nerozkládá', () => {
    const rng = createRng('rozklad-meze')
    for (const target of [0, 1, 9, 100, 137]) {
      expect(decompositionGenerator.generateForValue(target, context(2), rng), `cíl ${target}`).toBeNull()
    }
  })

  it('nabízí přesně 10 až 99', () => {
    const values = decompositionGenerator.reachableValues(
      gradeProfile(2),
      ALL,
      REQUIRE_WHOLE_RESULTS,
    )
    expect(values.size).toBe(90)
    expect(Math.min(...values)).toBe(10)
    expect(Math.max(...values)).toBe(99)
  })

  /*
   * Tohle je celý důvod, proč je rozklad samostatný modul a ne tvar
   * aritmetiky: druhá třída nemá v malé násobilce desítku, takže učitel,
   * který si v září odškrtne násobení, o téma přijít nesmí.
   */
  it('přežije odškrtnuté násobení, protože `· 10` není násobilka', () => {
    const rng = createRng('rozklad-operace')
    const task = decompositionGenerator.generateForValue(37, context(2, { add: 1, sub: 1 }), rng)
    expect(task?.prompt.text).toBe('3 · 10 + 7')
  })

  /*
   * Opačný směr, a je zásadnější: šifra se ptá po každé operaci zvlášť, aby
   * věděla, kam smí rozprostřít písmena a na co si smí stěžovat. Kdyby
   * rozklad na dotaz „co umíš dělením?" odpověděl „všechno", čekalo by se
   * dělení tam, kde ve druhé třídě nemá jak vzniknout.
   */
  it('k odčítání ani dělení se nehlásí', () => {
    const rng = createRng('rozklad-deleni')
    expect(decompositionGenerator.generateForValue(37, context(2, { div: 1 }), rng)).toBeNull()
    expect(
      decompositionGenerator.reachableValues(gradeProfile(2), { div: 1 }, REQUIRE_WHOLE_RESULTS).size,
    ).toBe(0)
    expect(
      decompositionGenerator.reachableValues(gradeProfile(2), { sub: 1 }, REQUIRE_WHOLE_RESULTS).size,
    ).toBe(0)
    expect(
      decompositionGenerator.reachableValues(gradeProfile(2), { add: 1 }, REQUIRE_WHOLE_RESULTS).size,
    ).toBeGreaterThan(0)
  })

  it('tutéž hodnotu nevyrobí dvakrát — rozklad je jen jeden', () => {
    const rng = createRng('rozklad-opakovani')
    const ctx = context(2)
    expect(decompositionGenerator.generateForValue(37, ctx, rng)).not.toBeNull()
    expect(decompositionGenerator.generateForValue(37, ctx, rng)).toBeNull()
  })
})
