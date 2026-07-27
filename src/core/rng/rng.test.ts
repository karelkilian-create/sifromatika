import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { createRng } from './index.js'

describe('createRng — determinismus', () => {
  it('stejný seed dá stejnou sekvenci', () => {
    const a = createRng('poklad')
    const b = createRng('poklad')
    const seqA = Array.from({ length: 50 }, () => a.next())
    const seqB = Array.from({ length: 50 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('různé seedy dají různou sekvenci', () => {
    const a = createRng('poklad')
    const b = createRng('poklae')
    expect(a.next()).not.toBe(b.next())
  })

  /**
   * Golden test. Tyhle hodnoty se NESMÍ změnit bez inkrementu
   * `generatorVersion` — jinak se rozejdou všechny uložené `.sifra` soubory.
   */
  it('drží zmrazený výstup pro referenční seed', () => {
    const rng = createRng('sifromatika-0.1')
    const drawn = Array.from({ length: 5 }, () => rng.int(0, 999))
    expect(drawn).toMatchInlineSnapshot(`
      [
        325,
        599,
        78,
        823,
        169,
      ]
    `)
  })
})

describe('createRng — vlastnosti', () => {
  it('int() nikdy nevyjde z mezí a obě meze jsou dosažitelné', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.integer({ min: -50, max: 50 }), (seed, min) => {
        const max = min + 3
        const rng = createRng(seed)
        const seen = new Set<number>()
        for (let i = 0; i < 200; i++) {
          const value = rng.int(min, max)
          expect(value).toBeGreaterThanOrEqual(min)
          expect(value).toBeLessThanOrEqual(max)
          expect(Number.isInteger(value)).toBe(true)
          seen.add(value)
        }
        // Při 200 tazích ze 4 hodnot musí padnout všechny.
        expect(seen.size).toBe(4)
      }),
    )
  })

  it('shuffle() zachová prvky a nezmění vstup', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.array(fc.integer(), { minLength: 1 }), (seed, items) => {
        const original = [...items]
        const shuffled = createRng(seed).shuffle(items)
        expect(items).toEqual(original)
        expect([...shuffled].sort()).toEqual([...items].sort())
      }),
    )
  })

  it('weighted() nikdy nevrátí položku s nulovou vahou', () => {
    const rng = createRng('vahy')
    for (let i = 0; i < 500; i++) {
      expect(rng.weighted([
        ['ano', 1],
        ['nikdy', 0],
      ])).toBe('ano')
    }
  })

  it('pick() z prázdného pole vyhodí chybu místo undefined', () => {
    expect(() => createRng('x').pick([])).toThrow(RangeError)
  })
})
