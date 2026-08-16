import { describe, expect, it } from 'vitest'
import { gradeProfile } from '../../core/constraints/index.js'
import type { DifficultyProfile, Grade, OperationTag, Task } from '../../core/model/index.js'
import { createRng } from '../../core/rng/index.js'
import { inferMissing, parseSequence } from '../../core/sequence/index.js'
import { sequenceGenerator } from './index.js'

function context(profile: DifficultyProfile, mix: Partial<Record<OperationTag, number>> = {}) {
  return { profile, mix, usedExpressions: new Set<string>() }
}

function generate(
  target: number,
  grade: Grade,
  seed: string,
  mix: Partial<Record<OperationTag, number>> = {},
): Task | null {
  const profile = gradeProfile(grade)
  return sequenceGenerator.generateForValue(target, context(profile, mix), createRng(seed))
}

describe('generátor řad — základní kontrakt', () => {
  it('vyrobí řadu, jejíž chybějící člen je právě požadovaná hodnota', () => {
    const task = generate(34, 4, 'zaklad')
    expect(task).not.toBeNull()
    if (task === null) return

    expect(task.value).toBe(34)
    expect(task.generatorId).toBe('sequence')
    expect(task.prompt.kind).toBe('sequence')
    expect(task.prompt.text).toContain('?')
  })

  it('stejný seed dá stejnou řadu', () => {
    expect(generate(48, 5, 'stejny')?.prompt.text).toBe(generate(48, 5, 'stejny')?.prompt.text)
  })

  it('nepoužije podruhé týž zápis', () => {
    const ctx = context(gradeProfile(4))
    const rng = createRng('duplicity')
    const first = sequenceGenerator.generateForValue(30, ctx, rng)
    expect(first).not.toBeNull()
    if (first === null) return

    // Druhé volání pro tutéž hodnotu musí buď dát jiný zápis, nebo nic.
    const second = sequenceGenerator.generateForValue(30, ctx, rng)
    if (second !== null) expect(second.prompt.text).not.toBe(first.prompt.text)
  })
})

describe('generátor řad — každá vydaná řada je bezvadné zadání', () => {
  it.each([3, 4, 5] as const)('%s. ročník: jednoznačná, celočíselná a v oboru', (grade) => {
    const profile = gradeProfile(grade)
    let produced = 0

    for (const target of [...sequenceGenerator.reachableValues(profile, {})].slice(0, 120)) {
      const task = generate(target, grade, `bezvadnost-${grade}-${target}`)
      if (task === null) continue
      produced++

      const terms = parseSequence(task.prompt.text)
      const result = inferMissing(terms)

      // Tohle je celý smysl modulu: pravidlo odvozené zpátky z vytištěných
      // čísel musí být jediné a musí dát právě deklarovanou hodnotu.
      expect(result.kind).toBe('unique')
      if (result.kind !== 'unique') return
      expect(result.value).toBe(task.value)
      expect(result.value).toBe(target)

      for (const term of terms) {
        if (term === null) continue
        expect(Number.isInteger(term)).toBe(true)
        expect(term).toBeGreaterThanOrEqual(1)
        expect(term).toBeLessThanOrEqual(profile.numberRange.max)
      }
    }

    expect(produced).toBeGreaterThan(50)
  })
})

describe('generátor řad — respektuje nastavení učitele', () => {
  it('bez povoleného násobení a dělení nevydá řadu s podílem', () => {
    const profile = gradeProfile(5)
    for (const target of [16, 24, 32, 48, 64, 81, 96, 128, 243]) {
      const task = generate(target, 5, `bez-nasobeni-${target}`, { add: 1, sub: 1 })
      if (task === null) continue
      expect(task.didactic.operations).not.toContain('mul')
      expect(task.didactic.operations).not.toContain('div')
      expect(task.didactic.skills).not.toContain('rady.nasobeni-delenim')
      expect(profile.numberRange.max).toBeGreaterThan(0)
    }
  })

  it('třetí ročník dostane jen konstantní krok', () => {
    for (const target of [12, 20, 24, 30, 36, 44, 50, 60, 72, 84, 96]) {
      const task = generate(target, 3, `tretak-${target}`)
      if (task === null) continue
      expect(task.didactic.skills).toEqual(['rady.konstantni-krok'])
    }
  })

  it('bez povoleného odčítání nevydá klesající řadu', () => {
    for (const target of [15, 25, 35, 45, 55, 65]) {
      const task = generate(target, 4, `bez-odcitani-${target}`, { add: 1 })
      if (task === null) continue
      const terms = parseSequence(task.prompt.text).filter((term): term is number => term !== null)
      const first = terms[0]!
      const last = terms[terms.length - 1]!
      expect(last).toBeGreaterThan(first)
    }
  })
})

describe('generátor řad — sliby o dosažitelných hodnotách', () => {
  it('co ohlásí jako dosažitelné, to i vyrobí', () => {
    const profile = gradeProfile(3)
    const reachable = [...sequenceGenerator.reachableValues(profile, {})]
    expect(reachable.length).toBeGreaterThan(50)

    const failed = reachable.filter(
      (target) => generate(target, 3, `slib-${target}`) === null,
    )
    expect(failed).toEqual([])
  })

  it('v příliš malém oboru se vypne úplně', () => {
    const tiny: DifficultyProfile = {
      ...gradeProfile(3),
      numberRange: { min: 0, max: 8 },
    }
    expect(sequenceGenerator.supports(tiny)).toBe(false)
    expect(sequenceGenerator.reachableValues(tiny, {}).size).toBe(0)
  })
})

describe('délka členů', () => {
  /**
   * Obor šestého a osmého ročníku sahá do deseti tisíc, takže bez stropu
   * vznikaly řady jako `5184 5196 ? 5220 5232`. Pravidlo je v nich totéž jako
   * v `12 24 ? 48`, jen se hůř čte — a na kartičce pexesa se láme na dva řádky.
   */
  it.each([3, 4, 5, 6, 7, 8] as Grade[])('%i. ročník: žádný člen nemá čtyři cifry', (grade) => {
    const profile = gradeProfile(grade)
    const values = [...sequenceGenerator.reachableValues(profile, {})]
    expect(values.length).toBeGreaterThan(0)

    for (const value of values.slice(0, 300)) {
      const task = generate(value, grade, `cifry-${grade}-${value}`)
      if (task === null) continue
      for (const term of task.prompt.text.split(' ')) {
        if (term === '?') continue
        expect(Number(term), task.prompt.text).toBeLessThanOrEqual(999)
      }
    }
  })
})
