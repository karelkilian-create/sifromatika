import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { CZECH_LETTER_WEIGHTS, normalizeMessage, plainLetters } from './index.js'

describe('normalizeMessage', () => {
  it('rozloží referenční tajenku ze zadání', () => {
    const message = normalizeMessage('POKLAD JE U BAZÉNU')
    expect(plainLetters(message)).toBe('POKLADJEUBAZENU')
    expect(message.wordLengths).toEqual([6, 2, 1, 6])
    expect(message.dropped).toEqual([])
  })

  it('odstraní veškerou českou diakritiku', () => {
    const message = normalizeMessage('PŘÍŠERNĚ ŽLUŤOUČKÝ KŮŇ ÚPĚL ĎÁBELSKÉ ÓDY')
    expect(plainLetters(message)).toBe('PRISERNEZLUTOUCKYKUNUPELDABELSKEODY')
    expect(plainLetters(message)).toMatch(/^[A-Z]+$/)
  })

  it('sečte četnost písmen v tajence', () => {
    const message = normalizeMessage('POKLAD JE U BAZÉNU')
    expect(message.histogram.get('A')).toBe(2)
    expect(message.histogram.get('U')).toBe(2)
    expect(message.histogram.get('E')).toBe(2)
    expect(message.histogram.get('P')).toBe(1)
    expect(message.histogram.get('X')).toBeUndefined()
  })

  it('vrátí zahozené znaky, aby na ně UI mohlo upozornit', () => {
    const message = normalizeMessage('SEJDEME SE V 8:30!')
    expect(plainLetters(message)).toBe('SEJDEMESEV')
    expect(message.dropped).toEqual(['8', ':', '3', '0', '!'])
  })

  it('nepočítá emoji jako dva znaky', () => {
    const message = normalizeMessage('POKLAD 🏴‍☠️')
    expect(plainLetters(message)).toBe('POKLAD')
    expect(message.dropped.join('')).toBe('🏴‍☠️')
  })

  it('zvládne vícenásobné mezery i prázdný vstup', () => {
    expect(normalizeMessage('  A   B  ').wordLengths).toEqual([1, 1])
    const empty = normalizeMessage('   ')
    expect(empty.letters).toEqual([])
    expect(empty.wordLengths).toEqual([])
  })
})

describe('normalizeMessage — vlastnosti', () => {
  it('součet délek slov se vždy rovná počtu písmen', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const message = normalizeMessage(input)
        const total = message.wordLengths.reduce((sum, length) => sum + length, 0)
        expect(total).toBe(message.letters.length)
      }),
    )
  })

  it('histogram vždy sedí s posloupností písmen', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const message = normalizeMessage(input)
        let total = 0
        for (const [letter, count] of message.histogram) {
          expect(message.letters.filter((l) => l === letter).length).toBe(count)
          total += count
        }
        expect(total).toBe(message.letters.length)
      }),
    )
  })

  it('výstupem jsou vždy jen velká písmena A–Z', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        expect(plainLetters(normalizeMessage(input))).toMatch(/^[A-Z]*$/)
      }),
    )
  })

  it('žádné slovo nemá nulovou délku', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        for (const length of normalizeMessage(input).wordLengths) {
          expect(length).toBeGreaterThan(0)
        }
      }),
    )
  })
})

describe('CZECH_LETTER_WEIGHTS', () => {
  it('pokrývá celou abecedu kladnými vahami', () => {
    for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      expect(CZECH_LETTER_WEIGHTS[letter]).toBeGreaterThan(0)
    }
  })
})
