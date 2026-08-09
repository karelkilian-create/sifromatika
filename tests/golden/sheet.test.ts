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
import type { Grade } from '../../src/core/model/index.js'
import {
  defaultSequenceSheetConfig,
  generateSequenceSheet,
  sheetChecksum as sequenceChecksum,
} from '../../src/activities/sequence-sheet/index.js'
import type { SequenceSheet } from '../../src/activities/sequence-sheet/index.js'

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

function build(message: string, grade: Grade, seed: string): CipherGridSheet {
  const outcome = generateCipherGrid(defaultConfig(message, grade, seed))
  if (!outcome.ok) throw new Error(outcome.reason)
  expect(outcome.sheet.verification).toEqual({ ok: true })
  return outcome.sheet
}

describe('DoD 0.1 bod 7 — zmrazený výstup', () => {
  it('souřadnicová šifra, 4. ročník', () => {
    expect(render(build('POKLAD JE U BAZÉNU', 4, 'golden-1'))).toMatchInlineSnapshot(`
      "mřížka 4×6
        1 | Z L Y A O E
        2 | A J E S U P
        3 | N I A D L U
        4 | L Z B S K T
         1. 40 − 14 = 26
         2. 90 : 6 = 15
         3. 90 : 2 = 45
         4. 72 : 6 = 12
         5. 3 · 7 = 21
         6. 72 − 38 = 34
         7. 12 + 10 = 22
         8. 2 · 8 = 16
         9. 72 : 2 = 36
        10. 86 − 43 = 43
        11. 99 : 3 = 33
        12. 44 : 4 = 11
        13. 8 + 15 = 23
        14. 67 − 36 = 31
        15. 5 · 5 = 25
      součet 45c968ea"
    `)
  })

  it('souřadnicová šifra, 3. ročník, krátká tajenka', () => {
    expect(render(build('AHOJ', 3, 'golden-2'))).toMatchInlineSnapshot(`
      "mřížka 3×3
        1 | O I P
        2 | S A T
        3 | J M H
         1. 66 : 3 = 22
         2. 56 − 23 = 33
         3. 23 − 12 = 11
         4. 12 + 19 = 31
      součet e872dcbb"
    `)
  })

  it('lineární šifra, 5. ročník', () => {
    const config = defaultConfig('CESTA DO LESA', 5, 'golden-3')
    config.payload.cipher.strategy = 'grid-linear'
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 3×6
        1 | L S K O E S
        2 | Q A C A E L
        3 | E U M T D N
         1. 3 + 6 = 9
         2. 50 : 10 = 5
         3. 12 : 6 = 2
         4. 4 + 12 = 16
         5. 3 + 5 = 8
         6. 32 − 15 = 17
         7. 2 · 2 = 4
         8. 3 : 3 = 1
         9. 6 + 7 = 13
        10. 2 · 3 = 6
        11. 26 − 16 = 10
      součet b0405c08"
    `)
  })

  it('list se zapnutými číselnými řadami, 4. ročník', () => {
    const config = defaultConfig('TAJNA STEZKA', 4, 'golden-rady')
    config.payload.generatorMix = { arithmetic: 3, sequence: 1 }
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(outcome.sheet.slots.some((slot) => slot.task.prompt.kind === 'sequence')).toBe(true)
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 3×6
        1 | L Z J T K N
        2 | M E A E A Z
        3 | E A S S K T
         1. 10 14 23 27 ? = 36
         2. 6 + 17 = 23
         3. 6 + 7 = 13
         4. 9 + 7 = 16
         5. 96 : 3 = 32
         6. 68 : 2 = 34
         7. 2 · 7 = 14
         8. 58 − 36 = 22
         9. 84 : 7 = 12
        10. 3 · 5 = 15
        11. 49 43 37 31 ? = 25
      součet 455559e5"
    `)
  })

  it('zapnutí řad nezmění list, který je má vypnuté', () => {
    // Pojistka proti tomu, na co se dá nejsnáz zapomenout: přidání generátoru
    // do registru nesmí posunout losování u konfigurací, které ho nepoužívají.
    const sheet = build('POKLAD JE U BAZÉNU', 4, 'golden-1')
    expect(sheet.slots.every((slot) => slot.task.prompt.kind === 'expr')).toBe(true)
  })

  it('šifra pro 6. ročník — složené výrazy a pořadí operací', () => {
    expect(render(build('ROVNICE', 6, 'golden-6'))).toMatchInlineSnapshot(`
      "mřížka 3×4
        1 | K A N V
        2 | I C N R
        3 | E O F P
         1. 96 : 4 = 24
         2. (24 − 8) · 2 = 32
         3. (4 + 3) · 2 = 14
         4. 130 : 10 = 13
         5. (10 − 3) · 3 = 21
         6. 110 : 5 = 22
         7. 279 : 9 = 31
      součet 88d4a281"
    `)
  })

  it('šifra pro 7. ročník — celá čísla se závorkou u záporného operandu', () => {
    const sheet = build('ZAPORNA CISLA', 7, 'cela-3')
    // Zámek zápisu: záporné číslo za operátorem musí být v závorce.
    expect(sheet.slots.some((slot) => slot.task.prompt.text.includes('(−'))).toBe(true)
    expect(render(sheet)).toMatchInlineSnapshot(`
      "mřížka 4×5
        1 | S K T L Z
        2 | A R S V V
        3 | P E C I O
        4 | O A N A A
         1. 30 : 2 = 15
         2. 264 : 6 = 44
         3. 372 : 12 = 31
         4. (13 − 6) · 5 = 35
         5. 2 · 6 + 10 = 22
         6. 98 − 55 = 43
         7. (3 + 6) · 5 = 45
         8. 24 − (−9) = 33
         9. (23 − 6) · 2 = 34
        10. 25 − 14 = 11
        11. (5 + 2) · 2 = 14
        12. 14 + 7 = 21
      součet edb48487"
    `)
  })

  it('šifra pro 8. ročník — mocniny a odmocniny', () => {
    const sheet = build('DRUHA MOCNINA', 8, 'golden-8')
    expect(sheet.slots.some((slot) => /[²³√]/u.test(slot.task.prompt.text))).toBe(true)
    expect(render(sheet)).toMatchInlineSnapshot(`
      "mřížka 4×5
        1 | D R R O N
        2 | I Y E A O
        3 | U A R U C
        4 | U N M O H
         1. −50 + 61 = 11
         2. 6 + 6 = 12
         3. 8 · 4 + 2 = 34
         4. 5 · 9 = 45
         5. 29 − 5 = 24
         6. 38 + 5 = 43
         7. 10 + 4 = 14
         8. √256 + 19 = 35
         9. 7 · 6 = 42
        10. 2 · 6 + 9 = 21
        11. 33 − √324 = 15
        12. √9 + 29 = 32
      součet caa3641f"
    `)
  })

  it('stejný seed dá stejný součet i po opakovaném generování', () => {
    const first = build('POKLAD JE U BAZÉNU', 4, 'golden-1')
    const second = build('POKLAD JE U BAZÉNU', 4, 'golden-1')
    expect(sheetChecksum(first)).toBe(sheetChecksum(second))
  })
})

function renderTasks(sheet: SequenceSheet): string {
  const tasks = sheet.tasks
    .map(
      (task, index) =>
        `  ${String(index + 1).padStart(2)}. ${task.prompt.text} → ${task.value}   (${
          task.solutionSteps[0]?.text ?? '—'
        })`,
    )
    .join('\n')
  return [sheet.title, tasks, `součet ${sequenceChecksum(sheet)}`].join('\n')
}

describe('DoD 0.1 bod 7 — zmrazený výstup listu řad', () => {
  it('list číselných řad, 4. ročník', () => {
    const outcome = generateSequenceSheet(defaultSequenceSheetConfig(4, 'golden-rady-list', 8))
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderTasks(outcome.sheet)).toMatchInlineSnapshot(`
      "Číselné řady — 4. třída
         1. 26 29 32 35 ? → 38   (krok +3: 26 29 32 35 38)
         2. 40 43 45 48 ? → 50   (střídavý krok +3 a +2: 40 43 45 48 50)
         3. 19 16 13 10 ? → 7   (krok −3: 19 16 13 10 7)
         4. 66 63 60 57 ? → 54   (krok −3: 66 63 60 57 54)
         5. 40 44 48 ? 56 → 52   (krok +4: 40 44 48 52 56)
         6. 62 65 71 80 ? → 92   (krok roste o 3: 62 65 71 80 92)
         7. 38 46 54 62 ? → 70   (krok +8: 38 46 54 62 70)
         8. 1 8 ? 24 33 → 17   (střídavý krok +7 a +9: 1 8 17 24 33)
      součet d47cae2a"
    `)
  })

  it('list číselných řad, 3. ročník', () => {
    const outcome = generateSequenceSheet(defaultSequenceSheetConfig(3, 'golden-rady-tretak', 6))
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderTasks(outcome.sheet)).toMatchInlineSnapshot(`
      "Číselné řady — 3. třída
         1. 48 52 56 ? 64 → 60   (krok +4: 48 52 56 60 64)
         2. 91 85 79 73 ? → 67   (krok −6: 91 85 79 73 67)
         3. 31 40 49 ? 67 → 58   (krok +9: 31 40 49 58 67)
         4. 38 ? 26 20 14 → 32   (krok −6: 38 32 26 20 14)
         5. 96 92 88 84 ? → 80   (krok −4: 96 92 88 84 80)
         6. 72 67 62 57 ? → 52   (krok −5: 72 67 62 57 52)
      součet 826c48fa"
    `)
  })
})
