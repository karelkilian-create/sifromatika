import { describe, expect, it } from 'vitest'
import { TASK_COUNT_LIMITS } from '../../core/constraints/index.js'
import type { Grade, OperationTag } from '../../core/model/index.js'
import { inferMissing, parseSequence } from '../../core/sequence/index.js'
import { defaultSequenceSheetConfig, generateSequenceSheet, sheetChecksum } from './index.js'

function build(grade: Grade, seed: string, taskCount: number = TASK_COUNT_LIMITS.fallback) {
  const outcome = generateSequenceSheet(defaultSequenceSheetConfig(grade, seed, taskCount))
  if (!outcome.ok) throw new Error(outcome.reason)
  return outcome.sheet
}

describe('list číselných řad', () => {
  it.each([3, 4, 5] as const)('%s. ročník: vyrobí požadovaný počet ověřených úloh', (grade) => {
    const sheet = build(grade, `pocet-${grade}`)

    expect(sheet.tasks).toHaveLength(TASK_COUNT_LIMITS.fallback)
    expect(sheet.verification).toEqual({ ok: true })
    expect(sheet.tasks.every((task) => task.prompt.kind === 'sequence')).toBe(true)
  })

  it('žádná úloha se neopakuje', () => {
    const sheet = build(5, 'bez-opakovani', 25)
    const texts = sheet.tasks.map((task) => task.prompt.text)
    expect(new Set(texts).size).toBe(texts.length)
  })

  it('každá řada má právě jedno řešení a sedí s deklarovanou hodnotou', () => {
    for (const grade of [3, 4, 5] as const) {
      for (const sheet of [build(grade, `jednoznacnost-${grade}`, 20)]) {
        for (const task of sheet.tasks) {
          const result = inferMissing(parseSequence(task.prompt.text))
          expect(result.kind).toBe('unique')
          if (result.kind !== 'unique') return
          expect(result.value).toBe(task.value)
        }
      }
    }
  })

  it('řešení pro učitele nese u každé úlohy pravidlo', () => {
    for (const task of build(4, 'pravidla').tasks) {
      expect(task.solutionSteps[0]?.text ?? '').not.toBe('')
    }
  })

  it('stejný seed dá stejný list', () => {
    expect(sheetChecksum(build(4, 'determinismus'))).toBe(sheetChecksum(build(4, 'determinismus')))
  })

  it('jiný seed dá jiný list', () => {
    expect(sheetChecksum(build(4, 'seed-a'))).not.toBe(sheetChecksum(build(4, 'seed-b')))
  })

  it('název se odvodí z ročníku a smí se tisknout — není co prozradit', () => {
    const sheet = build(4, 'nazev')
    expect(sheet.titleDerived).toBe(true)
    expect(sheet.title).toContain('4. třída')
    expect(sheet.config.payload.output.printTitleOnWorksheet).toBe(true)
  })

  it('vlastní název přebije odvozený', () => {
    const config = defaultSequenceSheetConfig(4, 'vlastni-nazev')
    config.title = 'Rozcvička na řady'
    const outcome = generateSequenceSheet(config)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.sheet.titleDerived).toBe(false)
    expect(outcome.sheet.title).toBe('Rozcvička na řady')
  })
})

describe('list číselných řad — omezení učitele', () => {
  it('třetí ročník dostane jen řady s konstantním krokem', () => {
    for (const task of build(3, 'tretak').tasks) {
      expect(task.didactic.skills).toEqual(['rady.konstantni-krok'])
    }
  })

  it('bez násobení a dělení se neobjeví řada s podílem', () => {
    const config = defaultSequenceSheetConfig(5, 'bez-nasobeni')
    config.payload.taskMix = { add: 1, sub: 1 }
    const outcome = generateSequenceSheet(config)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return

    for (const task of outcome.sheet.tasks) {
      expect(task.didactic.skills).not.toContain('rady.nasobeni-delenim')
    }
  })

  it('když se požadovaný počet nevejde, ohlásí to místo tichého ořezu', () => {
    // Jen dělení ve 5. ročníku je úzké hrdlo — kombinací je málo.
    const config = defaultSequenceSheetConfig(5, 'malo-uloh', TASK_COUNT_LIMITS.max)
    config.payload.taskMix = { div: 1 }
    const outcome = generateSequenceSheet(config)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return

    if (outcome.sheet.tasks.length < TASK_COUNT_LIMITS.max) {
      const notice = outcome.sheet.relaxations.find((entry) => entry.code === 'fewer-tasks')
      expect(notice?.level).toBe('notice')
    }
  })

  it('nikdy nevrátí neověřený list', () => {
    for (const grade of [3, 4, 5] as const) {
      for (const count of [TASK_COUNT_LIMITS.min, 15, TASK_COUNT_LIMITS.max]) {
        for (const mix of [
          { add: 1 },
          { sub: 1 },
          { mul: 1 },
          { add: 1, sub: 1, mul: 1, div: 1 },
        ] as Partial<Record<OperationTag, number>>[]) {
          const config = defaultSequenceSheetConfig(grade, `robustnost-${grade}-${count}`, count)
          config.payload.taskMix = mix
          const outcome = generateSequenceSheet(config)
          if (!outcome.ok) {
            expect(outcome.reason.length).toBeGreaterThan(0)
            continue
          }
          expect(outcome.sheet.verification).toEqual({ ok: true })
          expect(outcome.sheet.tasks.length).toBeGreaterThan(0)
        }
      }
    }
  })
})
