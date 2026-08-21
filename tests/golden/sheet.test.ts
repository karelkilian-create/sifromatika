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
import {
  defaultBingoConfig,
  generateBingo,
  sheetChecksum as bingoChecksum,
} from '../../src/activities/bingo/index.js'
import type { BingoSheet } from '../../src/activities/bingo/index.js'

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
        1 | M C N N O L C J L
        2 | T E A N P N U A N
        3 | E O O I N N K K L
        4 | A K A I G E V N D
        5 | S E A A Z L T S S
        6 | D L K B M L A S I
        7 | Z U I A A T I P P
        8 | A S K M E E C N P
        9 | A M J R U M E T E
         1. 21 + 4 = 25
         2. 66 : 2 = 33
         3. 91 − 28 = 63
         4. 39 − 20 = 19
         5. 9 + 44 = 53
         6. 98 : 2 = 49
         7. 3 · 6 = 18
         8. 44 : 2 = 22
         9. 97 − 25 = 72
        10. 55 + 9 = 64
        11. 86 : 2 = 43
        12. 66 − 11 = 55
        13. 79 + 6 = 85
        14. 6 · 8 = 48
        15. 9 + 18 = 27
      součet 28c37ce2"
    `)
  })

  it('souřadnicová šifra, 3. ročník, krátká tajenka', () => {
    expect(render(build('AHOJ', 3, 'golden-2'))).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | B O P N J M P U Y
        2 | K B E H V U E H N
        3 | U V A J S D S E O
        4 | P N Y M T N I Y H
        5 | N B T I I V D Z N
        6 | A Z O T L E O C R
        7 | L R I L N V C M A
        8 | O O Z A R H K M C
        9 | A R E A M B D D N
         1. 52 + 9 = 61
         2. 7 · 4 = 28
         3. 23 − 11 = 12
         4. 30 : 2 = 15
      součet c79f7a17"
    `)
  })

  it('lineární šifra, 5. ročník', () => {
    const config = defaultConfig('CESTA DO LESA', 5, 'golden-3')
    config.payload.cipher.strategy = 'grid-linear'
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | U I U J K L E S A
        2 | S R L M O A I T N
        3 | R V S D N S E I L
        4 | M T D V S S O H N
        5 | R Y D O T P L O A
        6 | A C N E E A P Y N
        7 | E R P I A I E S K
        8 | D V N Z S N J T E
        9 | Z O P I P S I M N
         1. 56 − 9 = 47
         2. 58 + 3 = 61
         3. 51 + 17 = 68
         4. 164 : 4 = 41
         5. 135 : 9 = 15
         6. 8 · 8 = 64
         7. 54 − 20 = 34
         8. 108 : 4 = 27
         9. 201 − 129 = 72
        10. 3 + 7 = 10
        11. 48 + 11 = 59
      součet 72ff0f9d"
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
        1 | J U O D N A I I O
        2 | Z I T E O T U I J
        3 | Y T O J K O A Y V
        4 | T P D L A I S K S
        5 | S Z I M T K V M S
        6 | O V L P O K A E A
        7 | K T O T L I T O O
        8 | N R L V J S U Y L
        9 | O O H S Z A O A M
         1. 86 − 9 = 77
         2. 100 − 4 = 96
         3. 87 : 3 = 29
         4. 13 + 68 = 81
         5. 7 17 27 ? 47 = 37
         6. 56 − 7 = 49
         7. 7 + 34 = 41
         8. 77 ? 59 50 41 = 68
         9. 100 − 5 = 95
        10. 10 + 25 = 35
        11. 8 · 2 = 16
      součet c0ddbf02"
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
        1 | N V P A S V I E L
        2 | P O D C L T J M T
        3 | K H O A S F C O P
        4 | O U K I O S R A E
        5 | N K S K O S A A E
        6 | O E T D R V R D E
        7 | N J N S T M L A O
        8 | I A T O C E O O O
        9 | O S V T L E S Z C
         1. 329 : 7 = 47
         2. 60 : 10 + 49 = 55
         3. (4 + 2) · 11 = 66
         4. 60 − 9 = 51
         5. 48 + 3 − 7 = 44
         6. 52 + 33 = 85
         7. 49 : 7 + 11 = 18
      součet e7662ae8"
    `)
  })

  it('šifra pro 7. ročník — celá čísla se závorkou u záporného operandu', () => {
    // Seed vybraný tak, aby na listu byl záporný operand — jinak by zámek
    // zápisu neměl co hlídat a test by prošel prázdný. Po inkrementu
    // `GENERATOR_VERSION` na 6 přestal `cela-4` závorku dávat; `cela-5` ano.
    const sheet = build('ZAPORNA CISLA', 7, 'cela-5')
    // Zámek zápisu: záporné číslo za operátorem musí být v závorce.
    expect(sheet.slots.some((slot) => slot.task.prompt.text.includes('(−'))).toBe(true)
    expect(render(sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | A U S P O O S N J
        2 | P O M R R S D A M
        3 | N D I Z U L O T F
        4 | R A T V S C V Y B
        5 | A O J Z K E Z L O
        6 | D Z R I O V A P S
        7 | N A M E I Z K R R
        8 | I S B J O C U I O
        9 | A O Q C N I R A J
         1. (28 − 9) · 3 = 57
         2. 546 : 6 = 91
         3. −83 + 151 = 68
         4. 6 + 46 = 52
         5. 73 − 48 = 25
         6. 6 + 12 = 18
         7. 5 − (−6) = 11
         8. 10 : 2 + 81 = 86
         9. 8 · 8 = 64
        10. 31 + 14 = 45
        11. 18 + 40 = 58
        12. 26 + 41 = 67
      součet d0721953"
    `)
  })

  it('šifra pro 8. ročník — mocniny a odmocniny', () => {
    const sheet = build('DRUHA MOCNINA', 8, 'golden-8')
    expect(sheet.slots.some((slot) => /[²³√]/u.test(slot.task.prompt.text))).toBe(true)
    expect(render(sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | U O S I S M J U I
        2 | T B K N A N O O C
        3 | J A T S E E B A S
        4 | U A C S E K O T N
        5 | H K U A M K P S T
        6 | N Z V E O S N K N
        7 | L V H I N H S H S
        8 | N D R A K U V C U
        9 | E Y J R O R N J V
         1. 66 + 16 = 82
         2. 49 + 76 − 29 = 96
         3. 21 : 3 + 4 = 11
         4. 8 + 43 = 51
         5. 2³ + 34 = 42
         6. 440 : 8 = 55
         7. 36 : 3 = 12
         8. 40 + 3 − 14 = 29
         9. (13 + 2) · 5 = 75
        10. 9 + 10 = 19
        11. 45 : 9 + 44 = 49
        12. 2³ + 24 = 32
      součet 994e3eba"
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
         1. 23 19 15 11 ? → 7   (krok −4: 23 19 15 11 7)
         2. 97 91 ? 79 73 → 85   (krok −6: 97 91 85 79 73)
         3. 79 73 67 ? 55 → 61   (krok −6: 79 73 67 61 55)
         4. 86 89 93 96 ? → 100   (střídavý krok +3 a +4: 86 89 93 96 100)
         5. 44 53 ? 66 70 → 57   (střídavý krok +9 a +4: 44 53 57 66 70)
         6. 70 61 52 ? 34 → 43   (krok −9: 70 61 52 43 34)
         7. 15 26 37 48 ? → 59   (krok +11: 15 26 37 48 59)
         8. 63 72 77 86 ? → 91   (střídavý krok +9 a +5: 63 72 77 86 91)
      součet 02043c83"
    `)
  })

  it('list číselných řad, 3. ročník', () => {
    const outcome = generateSequenceSheet(defaultSequenceSheetConfig(3, 'golden-rady-tretak', 6))
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderTasks(outcome.sheet)).toMatchInlineSnapshot(`
      "Číselné řady — 3. třída
         1. 15 18 21 24 ? → 27   (krok +3: 15 18 21 24 27)
         2. 91 ? 85 82 79 → 88   (krok −3: 91 88 85 82 79)
         3. 88 85 82 79 ? → 76   (krok −3: 88 85 82 79 76)
         4. 41 49 ? 65 73 → 57   (krok +8: 41 49 57 65 73)
         5. 36 40 44 48 ? → 52   (krok +4: 36 40 44 48 52)
         6. 54 61 ? 75 82 → 68   (krok +7: 54 61 68 75 82)
      součet ab0b4e2c"
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
         1. 758 | 439 + 295   (v kruhu 4.)
         2. 847 | 240 + 626   (v kruhu 2.)
         3. 849 | 315 + 32   (v kruhu 10.)
         4. 268 | 930 − 81   (v kruhu 9.)
         5. 734 | 987 − 89   (v kruhu 5.)
         6. 347 | 52 + 16   (v kruhu 11.)
         7. 898 | 162 + 127   (v kruhu 6.)
         8. 866 | 818 − 60   (v kruhu 3.)
         9. 260 | 316 + 531   (v kruhu 1.)
        10. 68 | 751 − 491   (v kruhu 12.)
        11. 844 | 536 : 2   (v kruhu 8.)
        12. 289 | 567 + 277   (v kruhu 7.)
      součet f41f43dd"
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
         1. 58 | 80 % z 685   (v kruhu 4.)
         2. 499 | 15 % z 100   (v kruhu 9.)
         3. 44 | 55 % z 920   (v kruhu 11.)
         4. 107 | 50 % z 998   (v kruhu 8.)
         5. 231 | 65 % z 940   (v kruhu 1.)
         6. 101 | 40 % z 145   (v kruhu 3.)
         7. 442 | 80 % z 535   (v kruhu 6.)
         8. 611 | 50 % z 202   (v kruhu 2.)
         9. 15 | 40 % z 110   (v kruhu 10.)
        10. 428 | 50 % z 214   (v kruhu 7.)
        11. 506 | 75 % z 308   (v kruhu 12.)
        12. 548 | 65 % z 680   (v kruhu 5.)
      součet 80282157"
    `)
  })
})

/**
 * U binga zamrzá **pořadí vyvolávání i rozmístění čísel na kartách**.
 *
 * Obojí je součást toho, co učitel dostane: jiné pořadí čtení je jiná hra
 * a jinak rozmístěná karta vyhrává v jiném okamžiku. Sází se první dvě karty
 * — na tři stránky karet snímek nemá smysl a určit determinismus stačí.
 */
function renderBingo(sheet: BingoSheet): string {
  const called = sheet.tasks
    .map((task, index) => `  ${String(index + 1).padStart(2)}. ${task.prompt.text} = ${task.value}`)
    .join('\n')
  const cards = sheet.cards
    .slice(0, 2)
    .map((card, index) => [`  karta ${index + 1}`, ...card.map((row) => `    ${row.join(' ')}`)].join('\n'))
    .join('\n')

  return [sheet.title, called, cards, `součet ${bingoChecksum(sheet)}`].join('\n')
}

describe('DoD 0.1 bod 7 — zmrazené bingo', () => {
  it('bingo, 5. ročník, dvanáct karet', () => {
    const outcome = generateBingo(defaultBingoConfig(5, 'golden-bingo', 12))
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderBingo(outcome.sheet)).toMatchInlineSnapshot(`
      "Bingo — 5. třída
         1. 261 − 95 = 166
         2. 380 + 359 = 739
         3. 639 − 190 = 449
         4. 273 − 147 = 126
         5. 573 + 56 = 629
         6. 646 − 324 = 322
         7. 884 − 268 = 616
         8. 446 + 206 = 652
         9. 761 − 150 = 611
        10. 32 + 26 = 58
        11. 108 + 562 = 670
        12. 798 : 2 = 399
        13. 921 − 50 = 871
        14. 577 − 322 = 255
        15. 8 + 16 = 24
        16. 801 − 99 = 702
        17. 100 : 2 = 50
        18. 267 + 520 = 787
        19. 825 : 3 = 275
        20. 109 + 679 = 788
        21. 654 : 3 = 218
        22. 111 + 729 = 840
        23. 780 : 2 = 390
        24. 224 + 776 = 1000
        karta 1
          840 739 166 255
          871 616 399 58
          629 1000 611 670
          126 24 787 652
        karta 2
          871 126 24 702
          739 616 255 1000
          166 275 218 58
          390 629 652 449
      součet f85d2791"
    `)
  })
})
