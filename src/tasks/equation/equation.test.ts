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
import { crossesTenOnAdd, crossesTenOnSub } from '../shapes.js'
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

  it('druhá třída dostane obrácené sčítání, ne obrácené odčítání', () => {
    // `? + 5 = 13` ano, `? − 5 = 8` až od trojky: obrátit odčítání je o krok
    // dál. Kdyby se dvojce nedostalo ani jedno, měla by zaškrtnuté téma,
    // ze kterého nic nevypadne.
    const texts = every(2).map((task) => task.prompt.text)
    expect(texts.length).toBeGreaterThan(0)
    expect(texts.some((text) => /^\? \+ /u.test(text) || / \+ \? =/u.test(text))).toBe(true)
    expect(texts.some((text) => /^\? −/u.test(text))).toBe(false)
  })

  it('rozklad s otazníkem je látka nejvýš třetí třídy', () => {
    const decompositions = (grade: Grade) =>
      every(grade, ALL, 200).filter((task) => task.prompt.text.includes('· 10'))
    expect(decompositions(2).length).toBeGreaterThan(0)
    expect(decompositions(4).length).toBe(0)
    expect(decompositions(8).length).toBe(0)
  })

  it('u rozkladu s otazníkem je hledané číslo vždy jednociferné', () => {
    // Otazník stojí na desítkách nebo na jednotkách, takže odpověď je 1 až 9.
    // Větší cíl musí tvar odmítnout, jinak by generátor sliboval hodnotu,
    // kterou nevyrobí.
    for (const task of every(2, ALL, 200)) {
      if (!task.prompt.text.includes('· 10')) continue
      expect(task.value, task.prompt.text).toBeGreaterThanOrEqual(1)
      expect(task.value, task.prompt.text).toBeLessThanOrEqual(9)
    }
  })

  it('odškrtnutý přechod přes desítku platí i pro rovnice', () => {
    // `? + 5 = 13` je sčítání s přechodem stejně jako `5 + 8`. Bez tohohle
    // by list „pro září" vypadal správně jen v příkladech.
    //
    // Kontroluje se LEVÁ strana s dosazeným výsledkem, tedy to, co dítě
    // opravdu počítá — ne tvar, který si generátor pamatuje.
    const profile = { ...gradeProfile(2), crossesTen: false }
    const rng = createRng('rovnice-bez-prechodu')
    const targets = [...equationGenerator.reachableValues(profile, ALL, REQUIRE_WHOLE_RESULTS)]
    expect(targets.length).toBeGreaterThan(0)

    let checked = 0
    for (const target of targets.slice(0, 80)) {
      const task = equationGenerator.generateForValue(
        target,
        { profile, mix: ALL, usedExpressions: new Set<string>(), rules: REQUIRE_WHOLE_RESULTS },
        rng,
      )
      if (task === null) continue

      const left = task.prompt.text.split('=')[0]!.replace('?', String(task.value))
      const parts = left.trim().split(' ')
      if (parts.length !== 3) continue // rozklad má tři členy, ten přes desítku nejde
      const [first, operator, second] = parts as [string, string, string]
      const a = Number(first)
      const b = Number(second)
      if (operator === '+') {
        expect(crossesTenOnAdd(a, b), task.prompt.text).toBe(false)
        checked++
      } else if (operator === '−') {
        expect(crossesTenOnSub(a, b), task.prompt.text).toBe(false)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(5)
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
