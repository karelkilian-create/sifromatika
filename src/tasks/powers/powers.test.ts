import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { gradeProfile } from '../../core/constraints/index.js'
import type { Grade, OperationTag } from '../../core/model/index.js'
import { createRng } from '../../core/rng/index.js'
import { evaluateExpression } from '../../core/verify/index.js'
import { powersGenerator } from './index.js'

const ALL: Partial<Record<OperationTag, number>> = { add: 1, sub: 1, mul: 1, div: 1 }

function context(grade: Grade, mix = ALL) {
  return { profile: gradeProfile(grade), mix, usedExpressions: new Set<string>() }
}

describe('powersGenerator', () => {
  it('nabízí se až v osmé třídě — dřív nejsou mocniny v učivu', () => {
    expect(powersGenerator.supports(gradeProfile(5))).toBe(false)
    expect(powersGenerator.supports(gradeProfile(6))).toBe(false)
    expect(powersGenerator.supports(gradeProfile(7))).toBe(false)
    expect(powersGenerator.supports(gradeProfile(8))).toBe(true)
  })

  it('v nižších ročnících nevyrobí nic, ani když ho o to někdo požádá', () => {
    const rng = createRng('powers-nizsi')
    expect(powersGenerator.generateForValue(49, context(6), rng)).toBeNull()
    expect(powersGenerator.reachableValues(gradeProfile(6), ALL).size).toBe(0)
  })

  it('vyrobí úlohu, jejíž text dává právě zadaný cíl', () => {
    const rng = createRng('powers-cil')
    for (const target of [0, 4, 9, 16, 27, 49, 64, 81, 100]) {
      const task = powersGenerator.generateForValue(target, context(8), rng)
      expect(task, `cíl ${target}`).not.toBeNull()
      if (task === null) continue
      expect(evaluateExpression(task.prompt.text)).toBe(target)
      expect(task.value).toBe(target)
      expect(task.generatorId).toBe('powers')
    }
  })

  it('každá úloha nese mocninu nebo odmocninu — jinak by téma nedávalo smysl', () => {
    const rng = createRng('powers-znak')
    for (let target = 0; target <= 120; target++) {
      const task = powersGenerator.generateForValue(target, context(8), rng)
      if (task === null) continue
      expect(task.prompt.text, `cíl ${target}`).toMatch(/[²³√]/u)
    }
  })

  // Tohle je celý důvod, proč modul vznikl: bez holých tvarů by „jen mocniny"
  // u učitele se zaškrtnutým samotným dělením nevyrobilo vůbec nic.
  it('umí holé tvary, které nezávisí na zaškrtnutých operacích', () => {
    const rng = createRng('powers-hole')
    const onlyDivision: Partial<Record<OperationTag, number>> = { div: 1 }

    const texts = new Set<string>()
    for (let target = 0; target <= 100; target++) {
      const task = powersGenerator.generateForValue(target, context(8, onlyDivision), rng)
      if (task !== null) texts.add(task.prompt.text)
    }

    // Cíle, pro které je holý tvar jediná možnost, takže nezáleží na losu:
    // 49 je jen `7²`, 27 jen `3³` a 13 jen `√169` (druhá mocnina 13 přesahuje
    // meze základů, takže se k ní žádný jiný tvar nedostane).
    expect(texts.has('7²')).toBe(true)
    expect(texts.has('3³')).toBe(true)
    expect(texts.has('√169')).toBe(true)
    // Se samotným dělením nesmí projít nic se sčítáním ani odčítáním.
    for (const text of texts) expect(text).not.toMatch(/[+−]/u)
  })

  it('zvládne Karlův příklad `2³ − 8`, tedy i nulu jako výsledek', () => {
    const rng = createRng('powers-nula')
    const texts = new Set<string>()
    for (let attempt = 0; attempt < 40; attempt++) {
      const task = powersGenerator.generateForValue(0, context(8), rng)
      if (task !== null) texts.add(task.prompt.text)
    }
    expect(texts.size).toBeGreaterThan(0)
    for (const text of texts) expect(evaluateExpression(text)).toBe(0)
    expect(powersGenerator.reachableValues(gradeProfile(8), ALL).has(0)).toBe(true)
  })

  it('druhý člen zůstává krátký — kartička se má přečíst na pohled', () => {
    const rng = createRng('powers-kratky')
    for (let target = 0; target <= 300; target++) {
      const task = powersGenerator.generateForValue(target, context(8), rng)
      if (task === null) continue
      const rest = /[+−] (\d+)$/u.exec(task.prompt.text)?.[1]
      if (rest === undefined) continue
      expect(Number(rest), task.prompt.text).toBeLessThanOrEqual(100)
    }
  })

  it('neopakuje výraz, který už na listu je', () => {
    const rng = createRng('powers-opakovani')
    const ctx = context(8)
    const texts = new Set<string>()
    for (let target = 0; target <= 200; target++) {
      const task = powersGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      expect(texts.has(task.prompt.text)).toBe(false)
      texts.add(task.prompt.text)
    }
    expect(texts.size).toBeGreaterThan(50)
  })

  // Pexeso vybírá cíle právě z `reachableValues`. Kdyby generátor slíbil
  // hodnotu, kterou pak nevyrobí, je to o dvojici na kartičkách míň.
  it('co slíbí v reachableValues, to i vyrobí', () => {
    const rng = createRng('powers-slib')
    for (const mix of [ALL, { add: 1 }, { sub: 1 }, { div: 1 }, { mul: 1, add: 1 }]) {
      const values = powersGenerator.reachableValues(gradeProfile(8), mix)
      expect(values.size, JSON.stringify(mix)).toBeGreaterThan(0)
      for (const value of values) {
        const task = powersGenerator.generateForValue(value, context(8, mix), rng)
        expect(task, `${JSON.stringify(mix)} → ${value}`).not.toBeNull()
      }
    }
  })

  it('žádná hodnota mimo slib — každý vyrobený cíl je v reachableValues', () => {
    const rng = createRng('powers-mimo')
    const values = powersGenerator.reachableValues(gradeProfile(8), ALL)
    for (let target = 0; target <= 600; target++) {
      const task = powersGenerator.generateForValue(target, context(8), rng)
      if (task === null) continue
      expect(values.has(target), `cíl ${target}`).toBe(true)
    }
  })

  it('výraz je spočitatelný a sedí pro libovolný cíl a seed', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 500 }), fc.string(), (target, seed) => {
        const task = powersGenerator.generateForValue(target, context(8), createRng(seed))
        if (task === null) return true
        return evaluateExpression(task.prompt.text) === target && task.value === target
      }),
      { numRuns: 500 },
    )
  })
})
