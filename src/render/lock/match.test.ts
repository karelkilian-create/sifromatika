import { describe, expect, it } from 'vitest'
import type { LockScreenModel, LockStation } from '../../core/screen/index.js'
import { matchStation } from './match.js'

function station(word: string): LockStation {
  return { word, display: word, picks: [word[0]!], boardSentence: '' }
}

const model = {
  stations: [station('KOS'), station('KOSTI'), station('TRUHLA'), station('MAPA')],
} as unknown as LockScreenModel

describe('matchStation', () => {
  it('uzná druhé stanoviště skupiny dřív než první', () => {
    expect(matchStation(model, [0, 1], 'KOSTI')).toBe(1)
  })

  it('porovnává celé slovo, ne začátek', () => {
    expect(matchStation(model, [0, 1], 'KOS')).toBe(0)
    expect(matchStation(model, [1], 'KOS')).toBeNull()
  })

  it('neuzná slovo jiné skupiny ani už uznané', () => {
    expect(matchStation(model, [0, 1], 'TRUHLA')).toBeNull()
    expect(matchStation(model, [1], 'KOS')).toBeNull()
  })

  it('prázdné zadání nic neuzná', () => {
    expect(matchStation(model, [0, 1], '')).toBeNull()
  })
})
