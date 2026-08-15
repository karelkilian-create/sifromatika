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
      "mřížka 9×9
        1 | K T I S M V Z L U
        2 | U J L K A L K B A
        3 | N P A U T A H N A
        4 | O Y N Z E Z A K N
        5 | E P Z M D D U A A
        6 | D N B E K O N O U
        7 | E P T R U N D O N
        8 | E M A K A O P S D
        9 | C E N V K U R K E
         1. 79 − 7 = 72
         2. 89 − 3 = 86
         3. 81 : 3 = 27
         4. 4 + 14 = 18
         5. 76 + 7 = 83
         6. 91 − 35 = 56
         7. 27 − 5 = 22
         8. 9 · 9 = 81
         9. 63 : 3 = 21
        10. 4 · 7 = 28
        11. 9 · 4 = 36
        12. 78 − 25 = 53
        13. 35 + 64 = 99
        14. 88 − 39 = 49
        15. 55 − 36 = 19
      součet 0eec4dab"
    `)
  })

  it('souřadnicová šifra, 3. ročník, krátká tajenka', () => {
    expect(render(build('AHOJ', 3, 'golden-2'))).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | E V T L V O P L R
        2 | A I R T T O B H B
        3 | A N Z O K A J C P
        4 | V B N K N R K L Y
        5 | T A O V T Y O P N
        6 | R B N U L L S L M
        7 | Z B D S C N S E A
        8 | R K E P S T H M U
        9 | R H J D L C N V D
         1. 68 − 16 = 52
         2. 4 + 24 = 28
         3. 48 : 3 = 16
         4. 87 − 50 = 37
      součet d8bc5edd"
    `)
  })

  it('lineární šifra, 5. ročník', () => {
    const config = defaultConfig('CESTA DO LESA', 5, 'golden-3')
    config.payload.cipher.strategy = 'grid-linear'
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | P R K E C S T T E
        2 | T T I L A N L S L
        3 | R L C D L T D S I
        4 | A Z E R T V E D R
        5 | O M K N E T E E C
        6 | V U H Y L R A O U
        7 | U J A P L S L E O
        8 | E D D A A O P K O
        9 | E A M I O O S Z A
         1. 25 − 4 = 21
         2. 140 − 78 = 62
         3. 6 · 10 = 60
         4. 5 · 2 = 10
         5. 567 : 7 = 81
         6. 660 : 10 = 66
         7. 85 − 8 = 77
         8. 16 + 4 = 20
         9. 23 + 7 = 30
        10. 9 + 17 = 26
        11. 77 − 20 = 57
      součet ef8d7e21"
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
      "mřížka 9×9
        1 | B K T A C A N R A
        2 | Z V K L N Y M B E
        3 | O S O N S A O D J
        4 | V N M A D O A I K
        5 | E L U V O D V A H
        6 | D N S C E T I I Z
        7 | P L M S C K H V T
        8 | S Z P T O P B I J
        9 | S T A D V L O N E
         1. 72 75 78 81 ? = 84
         2. 20 − 6 = 14
         3. 79 80 82 85 ? = 89
         4. 100 : 4 = 25
         5. 53 − 34 = 19
         6. 22 + 10 = 32
         7. 24 + 55 = 79
         8. 33 35 41 51 ? = 65
         9. 3 11 13 ? 23 = 21
        10. 98 : 2 = 49
        11. 20 ? 12 8 4 = 16
      součet e6f65e82"
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
      "mřížka 9×9
        1 | E N Z M N O L K Y
        2 | V M E R H A U E O
        3 | C O D D O I E T C
        4 | V E I S T M C I O
        5 | K R A S Z N M I A
        6 | E J A A L M N M I
        7 | M I T O M I C M A
        8 | R D C S A O B A S
        9 | A E S V A U Z M E
         1. 8 · 3 = 24
         2. (3 + 4) · 7 = 49
         3. 56 : 7 + 13 = 21
         4. 22 + 6 − 16 = 12
         5. 64 + 18 − 10 = 72
         6. 3 + 28 = 31
         7. 9 + 99 − 9 = 99
      součet 58dcd7b7"
    `)
  })

  it('šifra pro 7. ročník — celá čísla se závorkou u záporného operandu', () => {
    // Seed vybraný tak, aby na listu byl záporný operand — jinak by zámek
    // zápisu neměl co hlídat a test by prošel prázdný.
    const sheet = build('ZAPORNA CISLA', 7, 'cela-4')
    // Zámek zápisu: záporné číslo za operátorem musí být v závorce.
    expect(sheet.slots.some((slot) => slot.task.prompt.text.includes('(−'))).toBe(true)
    expect(render(sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | R I C N B K S I J
        2 | Z O T S R I M V L
        3 | L C K O A N C C U
        4 | K A T C N N N P L
        5 | B L Y K I S U I S
        6 | V U L A E R L O F
        7 | E K R D V O O H L
        8 | U D N E Y E R I V
        9 | S M R I E A C M E
         1. 84 : 4 = 21
         2. 73 + 47 − 24 = 96
         3. 12 · 4 = 48
         4. 2 · 11 = 22
         5. −5 · (−5) = 25
         6. 14 − (−69) = 83
         7. (2 + 12) · 3 = 42
         8. 230 − 133 = 97
         9. −73 + 99 = 26
        10. (13 − 5) · 3 = 24
        11. 29 + 23 = 52
        12. 59 + 28 − 23 = 64
      součet d135a0d0"
    `)
  })

  it('šifra pro 8. ročník — mocniny a odmocniny', () => {
    const sheet = build('DRUHA MOCNINA', 8, 'golden-8')
    expect(sheet.slots.some((slot) => /[²³√]/u.test(slot.task.prompt.text))).toBe(true)
    expect(render(sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | N R Y I N O N D E
        2 | O J K L D Z L F P
        3 | G E O I M O A N V
        4 | O N I U M T U J M
        5 | N T S R S N A S U
        6 | D A C H M O Y A O
        7 | I T C E L A Y I H
        8 | B N J E P O O A E
        9 | D M M M T E U C E
         1. −2 + 63 = 61
         2. 2 · 6 = 12
         3. 2³ + 36 = 44
         4. 161 − 97 = 64
         5. −49 + 117 = 68
         6. 28 − (−17) = 45
         7. 29 + 4 = 33
         8. 4³ + 9 = 73
         9. 69 − √169 = 56
        10. 390 : 5 = 78
        11. −46 + 57 = 11
        12. 46 − 9 = 37
      součet d78f7e52"
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
         1. 18 24 30 36 ? → 42   (krok +6: 18 24 30 36 42)
         2. 36 45 ? 63 72 → 54   (krok +9: 36 45 54 63 72)
         3. 79 68 57 46 ? → 35   (krok −11: 79 68 57 46 35)
         4. 76 78 82 ? 96 → 88   (krok roste o 2: 76 78 82 88 96)
         5. 74 82 86 94 ? → 98   (střídavý krok +8 a +4: 74 82 86 94 98)
         6. 68 72 78 ? 96 → 86   (krok roste o 2: 68 72 78 86 96)
         7. 52 43 34 25 ? → 16   (krok −9: 52 43 34 25 16)
         8. 71 61 51 41 ? → 31   (krok −10: 71 61 51 41 31)
      součet 257bc711"
    `)
  })

  it('list číselných řad, 3. ročník', () => {
    const outcome = generateSequenceSheet(defaultSequenceSheetConfig(3, 'golden-rady-tretak', 6))
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderTasks(outcome.sheet)).toMatchInlineSnapshot(`
      "Číselné řady — 3. třída
         1. 56 64 72 80 ? → 88   (krok +8: 56 64 72 80 88)
         2. 64 66 68 70 ? → 72   (krok +2: 64 66 68 70 72)
         3. 24 22 20 ? 16 → 18   (krok −2: 24 22 20 18 16)
         4. 5 13 ? 29 37 → 21   (krok +8: 5 13 21 29 37)
         5. 62 71 80 89 ? → 98   (krok +9: 62 71 80 89 98)
         6. 84 86 88 90 ? → 92   (krok +2: 84 86 88 90 92)
      součet d1210d88"
    `)
  })
})
