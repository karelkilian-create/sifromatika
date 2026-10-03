/**
 * Špatné odpovědi k výběru — mají vycházet z typických chyb a nikdy nesmí
 * prozradit, která odpověď je správná (mimo obor, nula, duplikát).
 */

import { describe, expect, it } from 'vitest'
import type { Task } from '../core/model/index.js'
import { createRng } from '../core/rng/index.js'
import { distractorsFor } from './distractors.js'

function task(text: string, value: number): Task {
  return {
    id: text,
    generatorId: 'arithmetic',
    value,
    prompt: { kind: 'expr', text },
    solutionSteps: [],
    didactic: { grade: 2, difficulty: 1, skills: [], operations: [] },
  } as unknown as Task
}

describe('špatné odpovědi', () => {
  it('odčítání s přechodem: menší od většího v jednotkách a zaměněná operace', () => {
    expect(distractorsFor(task('15 − 8', 7), 2, 100, createRng('a')).sort((a, b) => a - b)).toEqual([13, 23])
  })

  it('sčítání s přechodem: zapomenutá desítka', () => {
    expect(distractorsFor(task('27 + 15', 42), 2, 100, createRng('b'))).toContain(32)
  })

  it('nikdy mimo obor, nikdy nula, nikdy správný výsledek a nikdy dvakrát totéž', () => {
    const cases: [string, number][] = [
      ['98 − 50', 48],
      ['33 + 33', 66],
      ['2 : 2', 1],
      ['99 + 1', 100],
      ['1 · 1', 1],
      ['(4 + 5) · 9', 81],
    ]
    for (const [text, value] of cases) {
      for (let seed = 0; seed < 20; seed++) {
        const wrong = distractorsFor(task(text, value), 2, 100, createRng(`${text}-${seed}`))
        expect(wrong).toHaveLength(2)
        expect(new Set(wrong).size).toBe(2)
        for (const candidate of wrong) {
          expect(candidate, text).toBeGreaterThan(0)
          expect(candidate, text).toBeLessThanOrEqual(100)
          expect(candidate, text).not.toBe(value)
          expect(Number.isInteger(candidate)).toBe(true)
        }
      }
    }
  })
})
