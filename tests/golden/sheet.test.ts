/**
 * Definition of Done pro 0.1, bod 7:
 *
 *   „Daný seed dá bit shodný výstup napříč spuštěními a platformami."
 *
 * Tenhle snapshot je zámek determinismu. Když se změní, znamená to, že
 * všechny odkazy a `.sifra` soubory vytvořené dosud vygenerují jiný list.
 *
 * ⚠ NIKDY ho neaktualizuj příkazem `vitest -u` jen proto, že selhal.
 *   Buď je změna nechtěná a patří vrátit, nebo je záměrná a patří k ní
 *   inkrement `GENERATOR_VERSION` v src/version.ts.
 */

import { describe, expect, it } from 'vitest'
import { defaultConfig, generateCipherGrid, sheetChecksum } from '../../src/activities/cipher-grid/index.js'
import type { CipherGridSheet } from '../../src/activities/cipher-grid/index.js'

function render(sheet: CipherGridSheet): string {
  const rows: string[] = []
  for (let row = 0; row < sheet.table.rows; row++) {
    const cells = sheet.table.cells.slice(row * sheet.table.cols, (row + 1) * sheet.table.cols)
    rows.push(`  ${row + 1} | ${cells.map((cell) => cell.letter).join(' ')}`)
  }
  const tasks = sheet.slots
    .map((slot, index) => `  ${String(index + 1).padStart(2)}. ${slot.task.prompt.text} = ${slot.code}`)
    .join('\n')

  return [
    `mřížka ${sheet.table.rows}×${sheet.table.cols}`,
    rows.join('\n'),
    tasks,
    `součet ${sheetChecksum(sheet)}`,
  ].join('\n')
}

function build(message: string, grade: 3 | 4 | 5, seed: string): CipherGridSheet {
  const outcome = generateCipherGrid(defaultConfig(message, grade, seed))
  if (!outcome.ok) throw new Error(outcome.reason)
  expect(outcome.sheet.verification).toEqual({ ok: true })
  return outcome.sheet
}

describe('DoD 0.1 bod 7 — zmrazený výstup', () => {
  it('souřadnicová šifra, 4. ročník', () => {
    expect(render(build('POKLAD JE U BAZÉNU', 4, 'golden-1'))).toMatchInlineSnapshot(`
      "mřížka 4×6
        1 | A Z A L A D
        2 | B J J E K E
        3 | O U P O V P
        4 | U I N Z O S
         1. 98 − 65 = 33
         2. 68 : 2 = 34
         3. 59 − 34 = 25
         4. 56 : 4 = 14
         5. 9 + 4 = 13
         6. 2 × 8 = 16
         7. 18 + 4 = 22
         8. 48 : 2 = 24
         9. 24 + 17 = 41
        10. 18 + 3 = 21
        11. 33 : 3 = 11
        12. 48 : 4 = 12
        13. 79 − 53 = 26
        14. 86 : 2 = 43
        15. 16 + 16 = 32
      součet 96155d3b"
    `)
  })

  it('souřadnicová šifra, 3. ročník, krátká tajenka', () => {
    expect(render(build('AHOJ', 3, 'golden-2'))).toMatchInlineSnapshot(`
      "mřížka 3×3
        1 | O L M
        2 | A V A
        3 | J H J
         1. 5 + 16 = 21
         2. 7 + 25 = 32
         3. 3 + 8 = 11
         4. 93 : 3 = 31
      součet 85220ff2"
    `)
  })

  it('lineární šifra, 5. ročník', () => {
    const config = defaultConfig('CESTA DO LESA', 5, 'golden-3')
    config.payload.cipher.strategy = 'grid-linear'
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 3×6
        1 | E A D O S K
        2 | B E C S T O
        3 | L C R E S A
         1. 6 + 8 = 14
         2. 3 + 5 = 8
         3. 45 : 9 = 5
         4. 4 + 7 = 11
         5. 3 × 6 = 18
         6. 711 − 708 = 3
         7. 28 : 7 = 4
         8. 91 : 7 = 13
         9. 649 − 648 = 1
        10. 752 − 742 = 10
        11. 6 : 3 = 2
      součet 9b12bae7"
    `)
  })

  it('stejný seed dá stejný součet i po opakovaném generování', () => {
    const first = build('POKLAD JE U BAZÉNU', 4, 'golden-1')
    const second = build('POKLAD JE U BAZÉNU', 4, 'golden-1')
    expect(sheetChecksum(first)).toBe(sheetChecksum(second))
  })
})
