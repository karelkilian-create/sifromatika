import { describe, expect, it } from 'vitest'
import { INITIAL_EDITOR_STATE, withGrade, type EditorState } from './state.js'

describe('withGrade', () => {
  it('co se odškrtlo pro druháky, je v osmé třídě zase zaškrtnuté', () => {
    const second: EditorState = {
      ...INITIAL_EDITOR_STATE,
      shared: {
        ...INITIAL_EDITOR_STATE.shared,
        grade: 2,
        operations: { add: true, sub: true, mul: false, div: false },
        crossesTen: false,
      },
      byActivity: {
        ...INITIAL_EDITOR_STATE.byActivity,
        escape: { ...INITIAL_EDITOR_STATE.byActivity.escape, sequences: false, equations: false, upToTwenty: true },
        pexeso: { ...INITIAL_EDITOR_STATE.byActivity.pexeso, arithmetic: false, decimals: false },
      },
    }

    const eighth = withGrade(second, 8)

    expect(eighth.shared.grade).toBe(8)
    expect(eighth.shared.operations).toEqual({ add: true, sub: true, mul: true, div: true })
    expect(eighth.shared.crossesTen).toBe(true)
    expect(eighth.byActivity.escape.sequences).toBe(true)
    expect(eighth.byActivity.escape.equations).toBe(true)
    expect(eighth.byActivity.pexeso.arithmetic).toBe(true)
    expect(eighth.byActivity.pexeso.decimals).toBe(true)
    // Co není výběr obsahu, zůstává; „do 20" stejně platí jen ve druhé třídě.
    expect(eighth.byActivity.escape.upToTwenty).toBe(true)
  })

  it('nesahá na tajenku, příběh ani délku hry', () => {
    const state: EditorState = {
      ...INITIAL_EDITOR_STATE,
      shared: { ...INITIAL_EDITOR_STATE.shared, title: 'Hra 7.B' },
      byActivity: {
        ...INITIAL_EDITOR_STATE.byActivity,
        escape: { ...INITIAL_EDITOR_STATE.byActivity.escape, story: 'hrobka', length: 'long', message: 'ABRAKADABRA' },
      },
    }
    const next = withGrade(state, 6)
    expect(next.shared.title).toBe('Hra 7.B')
    expect(next.byActivity.escape.story).toBe('hrobka')
    expect(next.byActivity.escape.length).toBe('long')
    expect(next.byActivity.escape.message).toBe('ABRAKADABRA')
    expect(next.byActivity['cipher-grid']).toEqual(state.byActivity['cipher-grid'])
  })
})
