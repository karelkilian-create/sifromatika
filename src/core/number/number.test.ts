import { describe, expect, it } from 'vitest'

import { formatValue, isPrintable, isWholeNumber, roundToPrintable } from './index.js'

describe('formatValue', () => {
  it('píše celá čísla bez desetinné části', () => {
    expect(formatValue(0)).toBe('0')
    expect(formatValue(7)).toBe('7')
    expect(formatValue(144)).toBe('144')
  })

  it('používá desetinnou čárku, ne tečku', () => {
    expect(formatValue(2.5)).toBe('2,5')
    expect(formatValue(3.25)).toBe('3,25')
  })

  it('nepíše koncovou nulu — „2,50" vypadá jako cena', () => {
    expect(formatValue(2.5)).toBe('2,5')
    expect(formatValue(2.1)).toBe('2,1')
  })

  it('spolkne šum plovoucí čárky', () => {
    expect(formatValue(0.1 + 0.2)).toBe('0,3')
    expect(formatValue(1.1 + 2.2)).toBe('3,3')
    expect(formatValue(2.9000000000000004)).toBe('2,9')
  })

  it('píše typografické mínus, ne spojovník', () => {
    expect(formatValue(-4)).toBe('−4')
    expect(formatValue(-2.5)).toBe('−2,5')
  })

  it('nevyrobí „−0"', () => {
    expect(formatValue(-0)).toBe('0')
    expect(formatValue(-0.001)).toBe('0')
  })
})

describe('roundToPrintable', () => {
  it('zaokrouhlí na dvě desetinná místa', () => {
    expect(roundToPrintable(1 / 3)).toBe(0.33)
    expect(roundToPrintable(2.555)).toBe(2.56)
  })

  it('celé číslo nechá být', () => {
    expect(roundToPrintable(12)).toBe(12)
  })
})

describe('isPrintable', () => {
  it('propustí to, co se do dvou míst vejde', () => {
    expect(isPrintable(3)).toBe(true)
    expect(isPrintable(0.75)).toBe(true)
    expect(isPrintable(-2.5)).toBe(true)
  })

  it('propustí i hodnotu se šumem plovoucí čárky', () => {
    expect(isPrintable(0.1 + 0.2)).toBe(true)
  })

  it('odmítne třetinu — zaokrouhlené 0,33 by dítě nedopočítalo', () => {
    expect(isPrintable(1 / 3)).toBe(false)
    expect(isPrintable(0.125)).toBe(false)
  })

  it('odmítne nekonečno a NaN', () => {
    expect(isPrintable(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isPrintable(Number.NaN)).toBe(false)
  })
})

describe('isWholeNumber', () => {
  it('bere šum plovoucí čárky jako celé číslo', () => {
    expect(isWholeNumber(3)).toBe(true)
    expect(isWholeNumber(2.9999999999)).toBe(true)
    expect(isWholeNumber(2.5)).toBe(false)
  })
})

describe('vytištěná podoba jako klíč', () => {
  // Tohle je vlastnost, kvůli které modul vznikl: dvě hodnoty různé v
  // posledním bitu musí mít týž klíč, jinak je verifikace prohlásí za různé
  // a na papíře budou stejné.
  it('dvě hodnoty lišící se v posledním bitu dají tentýž text', () => {
    expect(formatValue(0.1 + 0.2)).toBe(formatValue(0.3))
    expect(formatValue(4.35 * 2)).toBe(formatValue(8.7))
  })
})
