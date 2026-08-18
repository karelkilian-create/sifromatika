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
import {
  defaultDominoConfig,
  generateDomino,
  sheetChecksum as dominoChecksum,
} from '../../src/activities/domino/index.js'
import type { DominoSheet } from '../../src/activities/domino/index.js'

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
        1 | E Y J P N D D S B
        2 | R J P Z G A J K L
        3 | E Z M E O U U A P
        4 | O A M L J L A Y U
        5 | P Z Z V V E S E A
        6 | A V A R E Y R Y S
        7 | E R J V T S T T S
        8 | O U H O N O U I L
        9 | O O R E O U P D N
         1. 28 + 23 = 51
         2. 96 − 4 = 92
         3. 25 + 3 = 28
         4. 92 : 2 = 46
         5. 52 : 2 = 26
         6. 35 − 19 = 16
         7. 88 : 4 = 22
         8. 53 + 18 = 71
         9. 7 · 7 = 49
        10. 38 : 2 = 19
        11. 35 + 26 = 61
        12. 92 − 39 = 53
        13. 56 + 38 = 94
        14. 5 · 3 = 15
        15. 74 : 2 = 37
      součet f7bccb99"
    `)
  })

  it('souřadnicová šifra, 3. ročník, krátká tajenka', () => {
    expect(render(build('AHOJ', 3, 'golden-2'))).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | R U I Y E I E M H
        2 | A V E D S L J L A
        3 | B O T P E S R O Z
        4 | H P E L E E T O U
        5 | R N J A E D L Z C
        6 | B A S A R U V N A
        7 | E V Z T N O S E D
        8 | A V K A U H E S K
        9 | D Y D L R L E M O
         1. 40 + 29 = 69
         2. 82 : 2 = 41
         3. 8 · 4 = 32
         4. 32 − 5 = 27
      součet fe301d8b"
    `)
  })

  it('lineární šifra, 5. ročník', () => {
    const config = defaultConfig('CESTA DO LESA', 5, 'golden-3')
    config.payload.cipher.strategy = 'grid-linear'
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | M J E H E K A T E
        2 | L U O O A A S B K
        3 | M J T O S C V P R
        4 | A K V A H C K K V
        5 | P I K K T H I U T
        6 | N T Z C L R N V D
        7 | S K L J O S N E Z
        8 | E O N V S D H E E
        9 | N Z S P I N O A E
         1. 8 + 16 = 24
         2. 9 + 55 = 64
         3. 540 : 9 = 60
         4. 83 − 42 = 41
         5. 21 − 14 = 7
         6. 6 · 9 = 54
         7. 82 − 23 = 59
         8. 5 · 10 = 50
         9. 20 : 4 = 5
        10. 12 + 4 = 16
        11. 176 − 96 = 80
      součet cfcc8445"
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
        1 | C R S K O O G A A
        2 | T T K E N A D A L
        3 | O B O S K B K L S
        4 | N E I J E I T A O
        5 | A N L T K M J O Y
        6 | D M Z T P U R O Y
        7 | C O L K F A I J A
        8 | K U T T S T N B P
        9 | A K E Z O Z P J N
         1. 11 + 72 = 83
         2. 96 : 2 = 48
         3. 34 + 64 = 98
         4. 50 : 2 = 25
         5. 4 · 7 = 28
         6. 40 31 22 ? 4 = 13
         7. 15 + 32 = 47
         8. 18 22 30 ? 58 = 42
         9. 18 + 45 = 63
        10. 71 77 ? 87 91 = 81
        11. 87 + 4 = 91
      součet f723a706"
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
        1 | K C P I O I O E I
        2 | P A E E D A O D E
        3 | S D O I R N O N C
        4 | E T N P E D Z D E
        5 | P N J V R O O S A
        6 | T O U S N I J R A
        7 | N D B J A O A E J
        8 | U V V V E M L T A
        9 | T E S E I O O D R
         1. 6 : 3 + 33 = 35
         2. (23 − 4) · 4 = 76
         3. 6 · 9 + 30 = 84
         4. 49 : 7 + 36 = 43
         5. 143 − 77 = 66
         6. (2 + 11) · 3 = 39
         7. 7 · 7 = 49
      součet bf91dc1a"
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
        1 | T A R A A F E I A
        2 | N I U T P S R U L
        3 | S A P P T Z Z D A
        4 | D E L O S S I L T
        5 | O O V D E V V M F
        6 | S I U A T R L N O
        7 | P I P L C O E A N
        8 | S Z Z K S O A I P
        9 | D M T L E V S A P
         1. −17 + 54 = 37
         2. 74 + 11 − 7 = 78
         3. 175 : 7 = 25
         4. (20 + 2) · 2 = 44
         5. −9 · (−3) = 27
         6. 129 − 50 = 79
         7. (3 + 2) · 3 = 15
         8. 58 − (−17) = 75
         9. 94 : 2 = 47
        10. 4 · 4 + 29 = 45
        11. (18 + 19) · 2 = 74
        12. 54 : 6 + 10 = 19
      součet d2d6359e"
    `)
  })

  it('šifra pro 8. ročník — mocniny a odmocniny', () => {
    const sheet = build('DRUHA MOCNINA', 8, 'golden-8')
    expect(sheet.slots.some((slot) => /[²³√]/u.test(slot.task.prompt.text))).toBe(true)
    expect(render(sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | P M C N C C K V U
        2 | S J O A U I M T T
        3 | A S C L M L S S H
        4 | U E B I A N S N R
        5 | D S F N T N Z I A
        6 | N V K D L N E S L
        7 | C M O M M U N N U
        8 | P O N D A T A I D
        9 | O E H N I I U O M
         1. 8 + 55 − 12 = 51
         2. 7 · 7 = 49
         3. 10 : 5 + 23 = 25
         4. 26 + 13 = 39
         5. 192 : 8 = 24
         6. 3 · 9 = 27
         7. 55 + 27 = 82
         8. √400 + 51 = 71
         9. 32 + 14 = 46
        10. 58 + 34 − 4 = 88
        11. 24 : 6 + 50 = 54
        12. 28 : 7 + 41 = 45
      součet cbdf64c0"
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
         1. 29 37 48 ? 79 → 62   (krok roste o 3: 29 37 48 62 79)
         2. 23 25 29 35 ? → 43   (krok roste o 2: 23 25 29 35 43)
         3. 47 55 62 70 ? → 77   (střídavý krok +8 a +7: 47 55 62 70 77)
         4. 17 26 ? 44 53 → 35   (krok +9: 17 26 35 44 53)
         5. 5 12 14 21 ? → 23   (střídavý krok +7 a +2: 5 12 14 21 23)
         6. 69 ? 81 86 93 → 74   (střídavý krok +5 a +7: 69 74 81 86 93)
         7. 74 79 ? 88 92 → 83   (střídavý krok +5 a +4: 74 79 83 88 92)
         8. 5 10 20 40 ? → 80   (násobení 2: 5 10 20 40 80)
      součet 0e436bf3"
    `)
  })

  it('list číselných řad, 3. ročník', () => {
    const outcome = generateSequenceSheet(defaultSequenceSheetConfig(3, 'golden-rady-tretak', 6))
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderTasks(outcome.sheet)).toMatchInlineSnapshot(`
      "Číselné řady — 3. třída
         1. 93 85 77 ? 61 → 69   (krok −8: 93 85 77 69 61)
         2. 80 ? 90 95 100 → 85   (krok +5: 80 85 90 95 100)
         3. 93 86 79 ? 65 → 72   (krok −7: 93 86 79 72 65)
         4. 89 82 75 ? 61 → 68   (krok −7: 89 82 75 68 61)
         5. 50 ? 32 23 14 → 41   (krok −9: 50 41 32 23 14)
         6. 87 90 ? 96 99 → 93   (krok +3: 87 90 93 96 99)
      součet 49958cf9"
    `)
  })
})

/**
 * U domina zamrzá i **pořadí kamenů na papíře**, ne jen jejich obsah.
 *
 * Zamíchání je součást toho, co učitel dostane: kdyby se posunulo, vytiskla by
 * `.sifra` uložená loni jiné listy, přestože by řetěz seděl. Proto se sází
 * v pořadí tisku a k němu se připisuje pozice v kruhu.
 */
function renderTiles(sheet: DominoSheet): string {
  const tiles = sheet.tiles
    .map(
      (tile, index) =>
        `  ${String(index + 1).padStart(2)}. ${tile.left} | ${tile.right}   (v kruhu ${tile.chainIndex + 1}.)`,
    )
    .join('\n')
  return [sheet.title, tiles, `součet ${dominoChecksum(sheet)}`].join('\n')
}

describe('DoD 0.1 bod 7 — zmrazené domino', () => {
  it('domino, 5. ročník, dvanáct kamenů', () => {
    const outcome = generateDomino(defaultDominoConfig(5, 'golden-domino', 12))
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderTiles(outcome.sheet)).toMatchInlineSnapshot(`
      "Domino — 5. třída
         1. 876 | 780 + 26   (v kruhu 2.)
         2. 625 | 864 − 324   (v kruhu 5.)
         3. 540 | 7 + 24   (v kruhu 6.)
         4. 948 | 113 + 651   (v kruhu 11.)
         5. 823 | 342 + 649   (v kruhu 9.)
         6. 7 | 135 + 688   (v kruhu 8.)
         7. 31 | 23 − 16   (v kruhu 7.)
         8. 991 | 634 + 314   (v kruhu 10.)
         9. 423 | 371 + 505   (v kruhu 1.)
        10. 846 | 693 − 68   (v kruhu 4.)
        11. 806 | 982 − 136   (v kruhu 3.)
        12. 764 | 846 : 2   (v kruhu 12.)
      součet 99952949"
    `)
  })

  it('domino ze samých procent, 7. ročník', () => {
    const config = defaultDominoConfig(7, 'golden-domino-procenta', 12)
    config.payload.generatorMix = { percent: 1 }
    const outcome = generateDomino(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderTiles(outcome.sheet)).toMatchInlineSnapshot(`
      "Domino — 7. třída
         1. 237 | 20 % z 540   (v kruhu 1.)
         2. 51 | 50 % z 770   (v kruhu 4.)
         3. 108 | 75 % z 952   (v kruhu 2.)
         4. 716 | 50 % z 894   (v kruhu 11.)
         5. 385 | 50 % z 744   (v kruhu 5.)
         6. 447 | 25 % z 948   (v kruhu 12.)
         7. 59 | 80 % z 725   (v kruhu 8.)
         8. 580 | 20 % z 830   (v kruhu 9.)
         9. 365 | 10 % z 590   (v kruhu 7.)
        10. 372 | 50 % z 730   (v kruhu 6.)
        11. 714 | 10 % z 510   (v kruhu 3.)
        12. 166 | 80 % z 895   (v kruhu 10.)
      součet 9abc469f"
    `)
  })
})
