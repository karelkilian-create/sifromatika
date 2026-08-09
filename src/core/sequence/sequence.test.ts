import { describe, expect, it } from 'vitest'
import {
  formatSequence,
  inferMissing,
  parseSequence,
  SequenceError,
  type SequenceTerms,
} from './index.js'

/** Zkratka: „4 10 16 22 ?" → odvozená hodnota, nebo popis toho, proč ne. */
function infer(text: string) {
  return inferMissing(parseSequence(text))
}

describe('zápis a čtení řady', () => {
  it('projde kolečkem text → členy → text', () => {
    const text = '4 10 16 ? 28'
    expect(formatSequence(parseSequence(text))).toBe(text)
  })

  it('mezera se zapisuje otazníkem', () => {
    expect(formatSequence([3, null, 9])).toBe('3 ? 9')
  })

  it.each([
    ['prázdný text', ''],
    ['jediný člen', '42'],
    ['písmena', '2 x 6'],
    ['desetinné číslo', '2 2.5 3'],
    ['záporný člen', '5 -2 1'],
  ])('odmítne %s', (_label, text) => {
    expect(() => parseSequence(text)).toThrow(SequenceError)
  })
})

describe('odvození chybějícího členu', () => {
  it.each([
    ['konstantní krok na konci', '4 10 16 22 ?', 28, 'krok +6'],
    ['konstantní krok uprostřed', '5 ? 15 20 25', 10, 'krok +5'],
    ['klesající krok', '40 34 28 22 ?', 16, 'krok −6'],
    ['násobení', '3 6 12 24 ?', 48, 'násobení 2'],
    ['dělení', '162 54 18 6 ?', 2, 'dělení 3'],
    ['střídavý krok', '5 8 12 15 ?', 19, 'střídavý krok +3 a +4'],
    ['rostoucí krok', '3 4 6 9 ?', 13, 'krok roste o 1'],
  ])('%s: %s → %s', (_label, text, expected, description) => {
    const result = infer(text)
    expect(result.kind).toBe('unique')
    if (result.kind !== 'unique') return
    expect(result.value).toBe(expected)
    expect(result.rule.description).toBe(description)
  })

  it('odmítne řadu, na kterou sedí dvě pravidla s různým výsledkem', () => {
    // Sestrojeno záměrně: na indexy 0, 1, 3, 4 sedí zároveň rostoucí krok
    // (2 5 10 17 26) i střídavý krok +3/+9 (2 5 14 17 26). Obě děti
    // uvažují správně, jedno z nich by dostalo křížek.
    const result = infer('2 5 ? 17 26')
    expect(result.kind).toBe('ambiguous')
    if (result.kind !== 'ambiguous') return
    expect(result.readings.map((reading) => reading.value).sort((a, b) => a - b)).toEqual([10, 14])
  })

  it('odmítne řadu s příliš málo viditelnými členy', () => {
    // Učebnicová past: ×2 dává 16, kroky +2/+4 dávají 14, rostoucí krok 14.
    const result = infer('2 4 8 ?')
    expect(result.kind).toBe('unreadable')
  })

  it.each([
    ['bez mezery', [4, 10, 16, 22, 28]],
    ['se dvěma mezerami', [4, null, 16, null, 28]],
  ])('odmítne řadu %s', (_label, terms) => {
    expect(inferMissing(terms as SequenceTerms).kind).toBe('unreadable')
  })

  it('odmítne řadu bez rozpoznatelného pravidla', () => {
    expect(infer('7 13 2 91 ?').kind).toBe('unreadable')
  })

  it('konstantní řada není úloha', () => {
    expect(infer('8 8 8 8 ?').kind).toBe('unreadable')
  })
})

describe('vlastnosti odvození', () => {
  it('každou aritmetickou řadu přečte jednoznačně a správně', () => {
    for (let step = 2; step <= 12; step++) {
      for (let first = 1; first <= 40; first++) {
        for (let hidden = 1; hidden <= 4; hidden++) {
          const terms = Array.from({ length: 5 }, (_, index) =>
            index === hidden ? null : first + step * index,
          )
          const result = inferMissing(terms)
          expect(result.kind).toBe('unique')
          if (result.kind !== 'unique') return
          expect(result.value).toBe(first + step * hidden)
        }
      }
    }
  })

  it('nikdy nenabídne záporný ani neceločíselný výsledek', () => {
    for (const text of ['3 6 12 24 ?', '5 ? 15 20 25', '100 90 80 70 ?']) {
      const result = infer(text)
      if (result.kind !== 'unique') continue
      expect(Number.isInteger(result.value)).toBe(true)
      expect(result.value).toBeGreaterThan(0)
    }
  })
})
