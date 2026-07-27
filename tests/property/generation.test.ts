/**
 * Definition of Done pro 0.1, bod 6:
 *
 *   „10 000 náhodných konfigurací → 0 neverifikovatelných listů, 0 výjimek."
 *
 * Tenhle soubor je hlavní obrana projektu. Ručně psané testy prostor
 * kombinací tajenka × ročník × operace × hustota klamných písmen nepokryjí.
 *
 * Hlídaný invariant je záměrně asymetrický: generátor SMÍ říct „tohle nejde"
 * (dlouhá tajenka v malém oboru čísel je legitimně neřešitelná), ale NESMÍ
 * nikdy vrátit list, který neprošel verifikací. Učiteli se rozbitý list
 * nesmí dostat do ruky ani omylem.
 */

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { createRng } from '../../src/core/rng/index.js'
import { plainLetters } from '../../src/core/text/index.js'
import { decode, evaluateExpression } from '../../src/core/verify/index.js'
import { defaultConfig, generateCipherGrid, worksheetTitle } from '../../src/activities/cipher-grid/index.js'
import type { Grade, OperationTag, ProjectConfig } from '../../src/core/model/index.js'
import type { Rng } from '../../src/core/rng/index.js'

const WORDS = [
  'POKLAD', 'JE', 'U', 'BAZÉNU', 'CESTA', 'DO', 'LESA', 'ZLATÝ', 'KLÍČ',
  'ŠKOLA', 'DINOSAURUS', 'VÁNOCE', 'PIRÁT', 'MAPA', 'HRAD', 'DRAK', 'ŘEKA',
  'ANANAS', 'MARMELÁDA', 'ŽIRAFA', 'ÚTĚK', 'TAJEMSTVÍ', 'POD', 'STARÝM', 'DUBEM',
]

const OPERATIONS: OperationTag[] = ['add', 'sub', 'mul', 'div']

/** Náhodná, ale realistická konfigurace — takové zadá skutečný učitel. */
function randomConfig(rng: Rng, index: number): ProjectConfig {
  const wordCount = rng.int(1, 5)
  const message = Array.from({ length: wordCount }, () => rng.pick(WORDS)).join(' ')
  const grade = rng.pick([3, 4, 5]) as Grade

  const config = defaultConfig(message, grade, `prop-${index}`)

  const enabled = OPERATIONS.filter(() => rng.chance(0.6))
  const mix: Partial<Record<OperationTag, number>> = {}
  for (const operation of enabled.length > 0 ? enabled : ['add' as const]) {
    mix[operation] = rng.int(1, 3)
  }
  config.payload.taskMix = mix
  config.payload.cipher.decoyDensity = rng.int(0, 60) / 100
  config.payload.cipher.distinctCellPerOccurrence = rng.chance(0.8)
  if (rng.chance(0.3)) config.title = 'Vlastní název'
  return config
}

describe('DoD 0.1 bod 6 — 10 000 konfigurací', () => {
  // Běží pár sekund. Je to hlavní pojistka projektu, takže se počet konfigurací
  // nesnižuje kvůli rychlosti — místo toho má tenhle test vlastní limit.
  it('nevrátí ani jeden neverifikovaný list a nespadne', { timeout: 120_000 }, () => {
    const rng = createRng('dod-6')
    let generated = 0
    let refused = 0

    for (let index = 0; index < 10_000; index++) {
      const config = randomConfig(rng, index)
      const outcome = generateCipherGrid(config)

      if (!outcome.ok) {
        refused++
        expect(outcome.reason.length, `konfigurace ${index}`).toBeGreaterThan(0)
        // Odmítnout dlouhou tajenku je legitimní. Hláška „pro výsledek N nelze
        // vytvořit příklad" ale znamená, že si šifra a vrstva úloh odporují:
        // šifra použila kód, který generátor při zvolených operacích netrefí.
        expect(outcome.reason, `konfigurace ${index}: ${config.payload.message}`).not.toMatch(
          /Pro výsledek/u,
        )
        continue
      }

      generated++
      const sheet = outcome.sheet

      // 1. Verifikace musí být zelená — jinak se list ven vůbec neměl dostat.
      expect(sheet.verification, `konfigurace ${index}: ${config.payload.message}`).toEqual({ ok: true })

      // 2. Nezávislé rozluštění dá přesně zadanou tajenku.
      const values = sheet.slots.map((slot) => slot.task.value)
      expect(decode(sheet.table, values)).toBe(plainLetters(sheet.message))

      // 3. Každý příklad se dá spočítat a ukazuje na svou buňku.
      for (const slot of sheet.slots) {
        expect(evaluateExpression(slot.task.prompt.text)).toBe(slot.code)
      }

      // 4. Počet úloh sedí s délkou tajenky.
      expect(sheet.slots).toHaveLength(sheet.message.letters.length)

      // 5. Odvozený název nikdy neuteče na žákovský list.
      if (sheet.titleDerived) expect(worksheetTitle(sheet)).toBeNull()
    }

    // Kdyby generátor odmítal skoro všechno, test by byl zelený a prázdný.
    expect(generated + refused).toBe(10_000)
    expect(generated / 10_000).toBeGreaterThan(0.9)
  })
})

describe('Invarianty nad libovolným vstupem', () => {
  it('nespadne ani na nesmyslné tajence', () => {
    fc.assert(
      fc.property(fc.string(), fc.constantFrom(3, 4, 5), fc.string({ minLength: 1 }), (message, grade, seed) => {
        const outcome = generateCipherGrid(defaultConfig(message, grade as Grade, seed))
        if (outcome.ok) {
          expect(outcome.sheet.verification).toEqual({ ok: true })
        } else {
          expect(outcome.reason).toBeTruthy()
        }
      }),
      { numRuns: 300 },
    )
  })

  it('tabulka nikdy neobsahuje dvojznačný kód', () => {
    const rng = createRng('dvojznacnost')
    for (let index = 0; index < 400; index++) {
      const outcome = generateCipherGrid(randomConfig(rng, index))
      if (!outcome.ok) continue
      const byCode = new Map<number, string>()
      for (const cell of outcome.sheet.table.cells) {
        const existing = byCode.get(cell.code.n)
        if (existing !== undefined) expect(existing).toBe(cell.letter)
        byCode.set(cell.code.n, cell.letter)
      }
    }
  })

  it('při zapnutém požadavku dostane každý výskyt písmene vlastní buňku, nebo se to ohlásí', () => {
    const rng = createRng('souradnice')
    for (let index = 0; index < 400; index++) {
      const config = randomConfig(rng, index)
      config.payload.cipher.distinctCellPerOccurrence = true
      const outcome = generateCipherGrid(config)
      if (!outcome.ok) continue

      const sheet = outcome.sheet
      const codesByLetter = new Map<string, number[]>()
      sheet.message.letters.forEach((letter, position) => {
        const list = codesByLetter.get(letter) ?? []
        list.push(sheet.slots[position]!.code)
        codesByLetter.set(letter, list)
      })

      const reused = [...codesByLetter.values()].some((codes) => new Set(codes).size !== codes.length)
      if (reused) {
        // Ústupek je povolený, ale nikdy tichý.
        expect(sheet.relaxations.map((entry) => entry.code)).toContain('coordinate-reuse')
      }
    }
  })
})
