import { describe, expect, it } from 'vitest'
import { gradeProfile } from '../../core/constraints/index.js'
import type { Grade, OperationTag, Task, TaskGenerator, TaskRules } from '../../core/model/index.js'
import { ALLOW_DECIMAL_RESULTS, ALL_OPERATIONS, REQUIRE_WHOLE_RESULTS } from '../../core/model/index.js'
import { readPhrase } from '../../core/phrase/index.js'
import { createRng } from '../../core/rng/index.js'
import { termProductsGenerator, termQuotientsGenerator, termsGenerator } from './index.js'

const FAMILIES: readonly TaskGenerator[] = [termsGenerator, termProductsGenerator, termQuotientsGenerator]

const ALL: Partial<Record<OperationTag, number>> = { add: 1, sub: 1, mul: 1, div: 1 }

/** Všechny úlohy, které rodina pro ročník vyrobí — každý dosažitelný výsledek několikrát. */
function every(
  generator: TaskGenerator,
  grade: Grade,
  mix = ALL,
  rules: TaskRules = ALLOW_DECIMAL_RESULTS,
  rounds = 6,
): Task[] {
  const profile = gradeProfile(grade)
  const rng = createRng(`pojmy-${generator.id}-${grade}`)
  const ctx = { profile, mix, usedExpressions: new Set<string>(), rules }
  const tasks: Task[] = []
  for (const value of generator.reachableValues(profile, mix, rules)) {
    for (let round = 0; round < rounds; round++) {
      const task = generator.generateForValue(value, ctx, rng)
      if (task !== null) tasks.push(task)
    }
  }
  return tasks
}

const allTasks = (grade: Grade, mix = ALL, rules: TaskRules = ALLOW_DECIMAL_RESULTS) =>
  FAMILIES.flatMap((generator) => every(generator, grade, mix, rules))

describe('věty s matematickými pojmy', () => {
  it('nabízí se od třetí třídy, druhák čte slabikovaně', () => {
    for (const generator of FAMILIES) {
      expect(generator.supports(gradeProfile(2))).toBe(false)
      expect(generator.supports(gradeProfile(3))).toBe(true)
      expect(generator.supports(gradeProfile(8))).toBe(true)
      expect(generator.reachableValues(gradeProfile(2), ALL, ALLOW_DECIMAL_RESULTS).size).toBe(0)
    }
  })

  it('každá ze dvanácti šablon vyrobí aspoň jednu větu', () => {
    const texts = allTasks(4).map((task) => task.prompt.text)
    const patterns = [
      /^Kolik je součet /u,
      /^Kolik je rozdíl /u,
      /^Kolik je součin /u,
      /^Kolik je podíl /u,
      /^O kolik je .* větší než jejich /u,
      /^O kolik je .* menší než jejich /u,
      /^Kolikrát je .* větší než jejich /u,
      /^Kolikrát je .* menší než jejich /u,
      /^Které číslo je o \d+ větší /u,
      /^Které číslo je o \d+ menší /u,
      /^Které číslo je \p{L}+krát větší /u,
      /^Které číslo je \p{L}+krát menší /u,
    ]
    for (const pattern of patterns) {
      expect(texts.some((text) => pattern.test(text)), String(pattern)).toBe(true)
    }
  })

  it('každá věta se přečte nezávislou čtečkou přesně na svůj výsledek', () => {
    for (const grade of [3, 5, 8] as Grade[]) {
      for (const task of allTasks(grade)) {
        expect(readPhrase(task.prompt.text), task.prompt.text).toEqual({ kind: 'value', value: task.value })
        expect(task.prompt.kind).toBe('phrase')
        expect(Number.isInteger(task.value) && task.value >= 2, task.prompt.text).toBe(true)
      }
    }
  })

  it('čísla zůstávají malá i v osmé třídě — procvičuje se slovo, ne počítání', () => {
    for (const task of allTasks(8)) {
      const numbers = task.prompt.text.match(/\d+/gu)!.map(Number)
      expect(Math.max(...numbers, task.value), task.prompt.text).toBeLessThanOrEqual(100)
    }
  })

  it('reachableValues a generateForValue se shodnou po každé jednotlivé operaci', () => {
    const profile = gradeProfile(4)
    for (const generator of FAMILIES) {
      for (const operation of ALL_OPERATIONS) {
        const mix = { [operation]: 1 }
        const rng = createRng(`shoda-${generator.id}-${operation}`)
        for (const value of generator.reachableValues(profile, mix, REQUIRE_WHOLE_RESULTS)) {
          const ctx = { profile, mix, usedExpressions: new Set<string>(), rules: REQUIRE_WHOLE_RESULTS }
          const task = generator.generateForValue(value, ctx, rng)
          expect(task, `${generator.id} ${operation} ${value}`).not.toBeNull()
          // Na dotaz po jedné operaci odpovídá jen větami, které nic jiného nepotřebují.
          expect(task!.didactic.operations).toEqual([operation])
        }
      }
    }
  })

  it('odškrtnuté dělení: žádný podíl, „kolikrát“ ani „krát menší“', () => {
    const mix = { add: 1, sub: 1, mul: 1 }
    const tasks = allTasks(3, mix)
    expect(tasks.length).toBeGreaterThan(0)
    for (const task of tasks) {
      expect(task.prompt.text, task.prompt.text).not.toMatch(/podíl|Kolikrát|krát menší/u)
      expect(task.didactic.operations).not.toContain('div')
    }
  })

  it('porovnání dvou pojmů až od čtvrté třídy', () => {
    expect(allTasks(3).some((task) => task.prompt.text.includes('jejich'))).toBe(false)
    expect(allTasks(4).some((task) => task.prompt.text.includes('jejich'))).toBe(true)
  })

  it('porovnání dvou pojmů nese operace obou pojmů i vztahu', () => {
    const task = allTasks(4).find((candidate) =>
      /^Kolikrát je součet .* než jejich rozdíl/u.test(candidate.prompt.text),
    )
    expect(task?.didactic.operations).toEqual(['add', 'sub', 'div'])
  })

  it('rodiny se nepřekrývají: „o kolik“, násobení a dělení', () => {
    for (const task of every(termsGenerator, 3)) {
      expect(task.prompt.text).toMatch(/součet|rozdíl|O kolik|Které číslo je o /u)
      expect(task.prompt.text).not.toMatch(/^Kolikrát|krát (větší|menší) než \d/u)
    }
    for (const task of every(termProductsGenerator, 3)) {
      expect(task.prompt.text).toMatch(/^Kolik je součin|krát větší než \d/u)
    }
    for (const task of every(termQuotientsGenerator, 3)) {
      expect(task.prompt.text).toMatch(/^Kolik je podíl|^Kolikrát|krát menší než \d/u)
    }
  })

  it('strop délky zadání vyřadí porovnání dvou pojmů, nic jiného', () => {
    const rules = { ...ALLOW_DECIMAL_RESULTS, maxPromptLength: 40 }
    const short = allTasks(4, ALL, rules)
    expect(short.length).toBeGreaterThan(0)
    for (const task of short) {
      expect(task.prompt.text.length).toBeLessThanOrEqual(40)
      expect(task.prompt.text).not.toMatch(/jejich/u)
    }
    // Strop nesmí sebrat žádnou jinou šablonu — jinak by domino přišlo o víc,
    // než se na kartičku nevejde.
    const long = allTasks(4).filter((task) => !task.prompt.text.includes('jejich'))
    expect(long.every((task) => task.prompt.text.length <= 40)).toBe(true)
  })

  it('stejnou větu dvakrát nevyrobí', () => {
    const profile = gradeProfile(3)
    const ctx = { profile, mix: ALL, usedExpressions: new Set<string>(), rules: ALLOW_DECIMAL_RESULTS }
    const rng = createRng('pojmy-opakovani')
    const texts: string[] = []
    for (let round = 0; round < 40; round++) {
      const task = termQuotientsGenerator.generateForValue(8, ctx, rng)
      if (task !== null) texts.push(task.prompt.text)
    }
    expect(new Set(texts).size).toBe(texts.length)
  })
})
