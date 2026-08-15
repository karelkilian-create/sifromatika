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
        1 | E S N V U U S L Z
        2 | Z L S S S O L K J
        3 | K E O K V S M N N
        4 | K N L H A S R P S
        5 | O I N R N K O A L
        6 | O O D Z B E I A U
        7 | I Z O E Y E I U O
        8 | E C S Z A L A L Z
        9 | D M N K S E D V A
         1. 96 : 2 = 48
         2. 66 − 40 = 26
         3. 8 + 20 = 28
         4. 9 · 2 = 18
         5. 77 − 9 = 68
         6. 96 − 33 = 63
         7. 58 : 2 = 29
         8. 4 + 7 = 11
         9. 8 · 2 = 16
        10. 89 − 24 = 65
        11. 91 − 4 = 87
        12. 8 + 81 = 89
        13. 100 − 4 = 96
        14. 6 · 7 = 42
        15. 30 − 15 = 15
      součet 24490c04"
    `)
  })

  it('souřadnicová šifra, 3. ročník, krátká tajenka', () => {
    expect(render(build('AHOJ', 3, 'golden-2'))).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | K E T E I O V S K
        2 | L E J R H K E M I
        3 | K N N A B A U Z O
        4 | A P V D T O I J I
        5 | N C K S T D A Z N
        6 | E S U D O P D N T
        7 | A E O B C P I U V
        8 | P A T E T U A V R
        9 | O A C O H T R N A
         1. 38 + 33 = 71
         2. 98 − 3 = 95
         3. 8 · 2 = 16
         4. 28 + 20 = 48
      součet 5dd553a4"
    `)
  })

  it('lineární šifra, 5. ročník', () => {
    const config = defaultConfig('CESTA DO LESA', 5, 'golden-3')
    config.payload.cipher.strategy = 'grid-linear'
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | I A V N D M V S O
        2 | A Y I E O K K S E
        3 | D S T A O L O K A
        4 | C T E R C Y T S Z
        5 | B E A E T D O E R
        6 | V A S T D A T A Z
        7 | O V U P N E S N L
        8 | T D Z A O K E S K
        9 | R S I L K T S R J
         1. 8 · 4 = 32
         2. 560 : 8 = 70
         3. 13 + 4 = 17
         4. 82 − 48 = 34
         5. 12 : 6 = 2
         6. 450 : 9 = 50
         7. 275 : 5 = 55
         8. 16 + 47 = 63
         9. 107 − 47 = 60
        10. 48 + 13 = 61
        11. 376 : 8 = 47
      součet 0b30bb60"
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
        1 | V N R D A E O Y T
        2 | I T C K K M S N Y
        3 | Y A A A S H N C E
        4 | R A M T O A A A T
        5 | J V T T M O E L P
        6 | C A O S R R L I D
        7 | Y L T N C O N I R
        8 | A O J V E M H Z M
        9 | O O Y Z U O K N E
         1. 83 − 39 = 44
         2. 62 − 20 = 42
         3. 75 + 8 = 83
         4. 56 : 2 = 28
         5. 92 : 2 = 46
         6. 5 · 7 = 35
         7. 34 + 15 = 49
         8. 31 ? 42 50 53 = 39
         9. 98 − 4 = 94
        10. 17 + 7 = 24
        11. 13 17 24 34 ? = 47
      součet b0f02148"
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
        1 | N M N O E D R I A
        2 | A I I E N M K K B
        3 | M I T P T I K Z U
        4 | A D V N A O N O C
        5 | P O E A L E T E N
        6 | N S C O L A I N P
        7 | N S P A D I Z T A
        8 | V U M O E L U D M
        9 | P T E E N E C K M
         1. 11 + 6 = 17
         2. 107 − 43 = 64
         3. 5 · 7 + 46 = 81
         4. 5 · 10 + 21 = 71
         5. 14 : 7 + 20 = 22
         6. 26 + 52 − 15 = 63
         7. 72 : 3 = 24
      součet 1caf5db8"
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
        1 | Z J R T N R O K H
        2 | U C E M V N L T O
        3 | E T N I P S A O A
        4 | I A N R D P O J L
        5 | D Z L S K S O O B
        6 | Y R J K E L N C A
        7 | D S I M J V I Z M
        8 | Y N R A N R P C I
        9 | E O A M Z S M A A
         1. (8 + 11) · 5 = 95
         2. (36 − 5) · 3 = 93
         3. 43 + 2 − 10 = 35
         4. 27 : 9 + 26 = 29
         5. (31 − 9) · 2 = 44
         6. 536 : 8 = 67
         7. 81 + 3 = 84
         8. 61 + 27 = 88
         9. 112 − 71 = 41
        10. 91 + 5 = 96
        11. 7 · 7 = 49
        12. 28 − (−41) = 69
      součet f56acf97"
    `)
  })

  it('šifra pro 8. ročník — mocniny a odmocniny', () => {
    const sheet = build('DRUHA MOCNINA', 8, 'golden-8')
    expect(sheet.slots.some((slot) => /[²³√]/u.test(slot.task.prompt.text))).toBe(true)
    expect(render(sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | L I A O I U E L I
        2 | O O P M I E J N F
        3 | V T S S V S H R I
        4 | I E N B V Z H U P
        5 | Z D U E S C E O D
        6 | C B K S R A N I Z
        7 | N I V E O E A V R
        8 | P I B T R E A A U
        9 | A Z O Y E N P S O
         1. 69 − √100 = 59
         2. 711 : 9 = 79
         3. 21 − √25 = 16
         4. 4² + 31 = 47
         5. (2 + 9) · 7 = 77
         6. 96 : 4 = 24
         7. 252 − 153 = 99
         8. 76 − 20 = 56
         9. 4 · 9 + 35 = 71
        10. 3² + 6 = 15
        11. 12 · 8 = 96
        12. 28 − √225 = 13
      součet 303b8bab"
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
         1. 61 67 75 81 ? → 89   (střídavý krok +6 a +8: 61 67 75 81 89)
         2. 16 ? 30 43 60 → 21   (krok roste o 4: 16 21 30 43 60)
         3. 22 ? 30 35 38 → 27   (střídavý krok +5 a +3: 22 27 30 35 38)
         4. 53 42 31 20 ? → 9   (krok −11: 53 42 31 20 9)
         5. 23 29 ? 41 47 → 35   (krok +6: 23 29 35 41 47)
         6. 92 94 96 98 ? → 100   (krok +2: 92 94 96 98 100)
         7. 70 ? 46 34 22 → 58   (krok −12: 70 58 46 34 22)
         8. 69 77 ? 88 91 → 80   (střídavý krok +8 a +3: 69 77 80 88 91)
      součet 3b0cd424"
    `)
  })

  it('list číselných řad, 3. ročník', () => {
    const outcome = generateSequenceSheet(defaultSequenceSheetConfig(3, 'golden-rady-tretak', 6))
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderTasks(outcome.sheet)).toMatchInlineSnapshot(`
      "Číselné řady — 3. třída
         1. 16 14 ? 10 8 → 12   (krok −2: 16 14 12 10 8)
         2. 31 24 17 10 ? → 3   (krok −7: 31 24 17 10 3)
         3. 70 72 ? 76 78 → 74   (krok +2: 70 72 74 76 78)
         4. 75 80 85 90 ? → 95   (krok +5: 75 80 85 90 95)
         5. 96 94 92 90 ? → 88   (krok −2: 96 94 92 90 88)
         6. 48 57 66 75 ? → 84   (krok +9: 48 57 66 75 84)
      součet 8c6a0584"
    `)
  })
})
