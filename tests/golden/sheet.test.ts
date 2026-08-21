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
import {
  defaultPexesoConfig,
  generatePexeso,
  sheetChecksum as pexesoChecksum,
} from '../../src/activities/pexeso/index.js'
import type { PexesoSheet } from '../../src/activities/pexeso/index.js'

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
        1 | U P L C Z O O N I
        2 | L Z V K E I K K T
        3 | E U F I B D E P N
        4 | K B U B I J I A P
        5 | A N O I E D E B T
        6 | R E S E E A N N N
        7 | T Z V T E Z N Y Y
        8 | E O P A E A A E E
        9 | O A S S I E R A Z
         1. 2 · 6 = 12
         2. 7 + 9 = 16
         3. 4 · 6 = 24
         4. 28 − 15 = 13
         5. 61 + 26 = 87
         6. 43 + 13 = 56
         7. 92 : 2 = 46
         8. 5 · 5 = 25
         9. 96 : 3 = 32
        10. 88 : 2 = 44
        11. 36 + 62 = 98
        12. 12 + 3 = 15
        13. 78 − 23 = 55
        14. 3 · 6 = 18
        15. 4 + 7 = 11
      součet bc37fe7f"
    `)
  })

  it('souřadnicová šifra, 3. ročník, krátká tajenka', () => {
    expect(render(build('AHOJ', 3, 'golden-2'))).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | Z T O A O K U Z N
        2 | P D K J P E N E O
        3 | J L A A T M E M J
        4 | N E S Z D V N L Z
        5 | L P Z N I R D N T
        6 | D I N D U L A H P
        7 | R M Y T N A U I L
        8 | E Y S L L M L V R
        9 | A M L E E V O Y N
         1. 56 : 4 = 14
         2. 65 + 3 = 68
         3. 45 − 30 = 15
         4. 48 : 2 = 24
      součet 355e12c5"
    `)
  })

  it('lineární šifra, 5. ročník', () => {
    const config = defaultConfig('CESTA DO LESA', 5, 'golden-3')
    config.payload.cipher.strategy = 'grid-linear'
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | Y T E L U S D J A
        2 | E V P O T P V T Z
        3 | S N N N I T I O K
        4 | E D J D M E L E O
        5 | O A O L O A C R R
        6 | O T P L E E T S M
        7 | O L U V P O M Z K
        8 | E Y L S D K K C O
        9 | E A I A O A N A G
         1. 34 + 37 = 71
         2. 4 · 7 = 28
         3. 31 − 12 = 19
         4. 17 − 15 = 2
         5. 3 · 3 = 9
         6. 128 − 60 = 68
         7. 288 : 8 = 36
         8. 32 : 8 = 4
         9. 159 − 95 = 64
        10. 3 + 3 = 6
        11. 162 − 88 = 74
      součet 3ca950a1"
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
        1 | O V M O I N T A Y
        2 | N S M T V P M K O
        3 | O E Y I I S E I V
        4 | N M J K A E B E T
        5 | D S V P T E E U N
        6 | N O Y T N E Y O N
        7 | V Z A K H S E O N
        8 | A B P L Y S P D Z
        9 | A A M A P D S V A
         1. 9 + 8 = 17
         2. 90 : 2 = 45
         3. 12 + 31 = 43
         4. 8 · 2 = 16
         5. 12 + 6 = 18
         6. 72 : 2 = 36
         7. 60 − 36 = 24
         8. 28 38 ? 58 68 = 48
         9. 81 − 9 = 72
        10. 7 · 4 = 28
        11. 90 − 9 = 81
      součet 92e4eadf"
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
        1 | K D E V O I R E T
        2 | N A A K V Z E I C
        3 | O P N K N N C C R
        4 | U O I V V N N I T
        5 | B O N I A T I Y K
        6 | E I T A U D E E O
        7 | U L I S T E D I C
        8 | E O E H N A P U I
        9 | M T B S K K N R N
         1. 10 · 4 − 23 = 17
         2. 70 : 10 + 24 = 31
         3. 23 + 22 = 45
         4. 9 · 4 = 36
         5. 96 : 12 + 35 = 43
         6. 15 + 22 = 37
         7. 170 − 89 = 81
      součet b64290a3"
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
        1 | A I E S E L A C N
        2 | A A R S I I N R K
        3 | N P Z N E R L A O
        4 | L T E C K C E S T
        5 | N S T E O O E O V
        6 | E M S S S E O A C
        7 | P P I L N X P Z S
        8 | R A D K E O V Z A
        9 | N I E T C T Z O S
         1. (8 + 3) · 8 = 88
         2. 90 : 9 + 79 = 89
         3. 3 · 3 + 68 = 77
         4. 980 : 10 = 98
         5. 60 − 32 = 28
         6. 48 : 6 + 67 = 75
         7. −81 + 102 = 21
         8. (2 + 2) · 11 = 44
         9. 7 − (−85) = 92
        10. 19 + 29 = 48
        11. 74 : 2 = 37
        12. 203 − 121 = 82
      součet 7d8886e9"
    `)
  })

  it('šifra pro 8. ročník — mocniny a odmocniny', () => {
    // Seed vyměněn s `GENERATOR_VERSION` 7: pod `golden-8` už na listu žádná
    // mocnina není a zámek by hlídal prázdno.
    const sheet = build('DRUHA MOCNINA', 8, 'golden-8-1')
    expect(sheet.slots.some((slot) => /[²³√]/u.test(slot.task.prompt.text))).toBe(true)
    expect(render(sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | V A S C E Z T M P
        2 | A C L I I A L D K
        3 | N N C I O J O C J
        4 | V V P N U R V D A
        5 | P B H L S I I T I
        6 | L Z O E H I I O N
        7 | E Z D C J K O A T
        8 | R N C M E O S L L
        9 | Y V A I T R U V R
         1. 59 + 14 = 73
         2. √196 + 67 = 81
         3. 66 : 11 + 39 = 45
         4. √9 + 50 = 53
         5. (20 − 7) · 2 = 26
         6. 6 · 3 = 18
         7. 42 : 7 + 29 = 35
         8. 50 : 5 + 23 = 33
         9. √225 + 16 = 31
        10. 79 − 22 = 57
        11. 4 · 11 = 44
        12. 2 · 6 = 12
      součet 2efb95bd"
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
         1. 69 61 53 45 ? → 37   (krok −8: 69 61 53 45 37)
         2. 26 35 44 53 ? → 62   (krok +9: 26 35 44 53 62)
         3. 43 38 33 28 ? → 23   (krok −5: 43 38 33 28 23)
         4. 59 67 75 83 ? → 91   (krok +8: 59 67 75 83 91)
         5. 46 48 51 55 ? → 60   (krok roste o 1: 46 48 51 55 60)
         6. 65 68 ? 74 77 → 71   (krok +3: 65 68 71 74 77)
         7. 84 ? 92 96 100 → 88   (krok +4: 84 88 92 96 100)
         8. 22 25 30 37 ? → 46   (krok roste o 2: 22 25 30 37 46)
      součet cb39c0ea"
    `)
  })

  it('list číselných řad, 3. ročník', () => {
    const outcome = generateSequenceSheet(defaultSequenceSheetConfig(3, 'golden-rady-tretak', 6))
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderTasks(outcome.sheet)).toMatchInlineSnapshot(`
      "Číselné řady — 3. třída
         1. 55 53 51 ? 47 → 49   (krok −2: 55 53 51 49 47)
         2. 91 87 83 79 ? → 75   (krok −4: 91 87 83 79 75)
         3. 52 49 46 43 ? → 40   (krok −3: 52 49 46 43 40)
         4. 30 38 46 ? 62 → 54   (krok +8: 30 38 46 54 62)
         5. 35 44 53 62 ? → 71   (krok +9: 35 44 53 62 71)
         6. 6 ? 20 27 34 → 13   (krok +7: 6 13 20 27 34)
      součet a0cef8f9"
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
         1. 191 | 963 − 177   (v kruhu 8.)
         2. 786 | 395 + 15   (v kruhu 9.)
         3. 429 | 788 − 64   (v kruhu 12.)
         4. 724 | 448 + 537   (v kruhu 1.)
         5. 410 | 363 + 126   (v kruhu 10.)
         6. 936 | 222 − 31   (v kruhu 7.)
         7. 989 | 536 − 261   (v kruhu 3.)
         8. 556 | 726 : 6   (v kruhu 5.)
         9. 275 | 832 − 276   (v kruhu 4.)
        10. 489 | 309 + 120   (v kruhu 11.)
        11. 121 | 982 − 46   (v kruhu 6.)
        12. 985 | 995 − 6   (v kruhu 2.)
      součet 34dc6041"
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
         1. 756 | 90 % z 790   (v kruhu 12.)
         2. 711 | 25 % z 940   (v kruhu 1.)
         3. 99 | 65 % z 120   (v kruhu 3.)
         4. 78 | 70 % z 890   (v kruhu 4.)
         5. 17 | 50 % z 716   (v kruhu 10.)
         6. 201 | 50 % z 542   (v kruhu 7.)
         7. 235 | 30 % z 330   (v kruhu 2.)
         8. 271 | 40 % z 965   (v kruhu 8.)
         9. 623 | 75 % z 964   (v kruhu 5.)
        10. 358 | 90 % z 840   (v kruhu 11.)
        11. 386 | 10 % z 170   (v kruhu 9.)
        12. 723 | 25 % z 804   (v kruhu 6.)
      součet 2da5cbbf"
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

/**
 * Pexeso pro šestý ročník. Do `GENERATOR_VERSION` 6 tenhle zámek chyběl —
 * golden testy hlídaly jen ročníky s oborem do tisíce, takže se změna oboru
 * čísel ve hrách neprojevila v žádném snímku a nikdo by si jí nevšiml.
 * Šestka je nejmenší ročník, kde profil dovoluje deset tisíc.
 */
function renderPairs(sheet: PexesoSheet): string {
  const cards = sheet.tasks
    .map((task, index) => `  ${String(index + 1).padStart(2)}. ${task.prompt.text} = ${task.value}`)
    .join('\n')
  return [sheet.title, cards, `součet ${pexesoChecksum(sheet)}`].join('\n')
}

describe('DoD 0.1 bod 7 — zmrazené pexeso', () => {
  it('pexeso, 6. ročník, dvanáct dvojic', () => {
    const outcome = generatePexeso(defaultPexesoConfig(6, 'golden-pexeso', 12))
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderPairs(outcome.sheet)).toMatchInlineSnapshot(`
      "Pexeso — 6. třída
         1. 135 : 5 = 27
         2. (291 − 2) · 3 = 867
         3. 548 − 62 = 486
         4. (3 + 231) · 3 = 702
         5. 42 : 7 + 817 = 823
         6. 800 : 4 = 200
         7. 923 − 63 = 860
         8. (5 + 2) · 3 = 21
         9. (15 − 7) · 11 = 88
        10. 60 : 6 + 848 = 858
        11. (61 + 46) · 7 = 749
        12. 125 + 265 = 390
      součet acbf0167"
    `)
  })
})

describe('DoD 0.1 bod 7 — zmrazené bingo', () => {
  it('bingo, 5. ročník, dvanáct karet', () => {
    const outcome = generateBingo(defaultBingoConfig(5, 'golden-bingo', 12))
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderBingo(outcome.sheet)).toMatchInlineSnapshot(`
      "Bingo — 5. třída
         1. 242 + 234 = 476
         2. 928 − 392 = 536
         3. 416 : 8 = 52
         4. 87 + 496 = 583
         5. 788 : 4 = 197
         6. 199 + 19 = 218
         7. 6 + 5 = 11
         8. 985 − 137 = 848
         9. 2 · 2 = 4
        10. 42 + 324 = 366
        11. 782 : 2 = 391
        12. 750 − 190 = 560
        13. 990 − 29 = 961
        14. 298 + 664 = 962
        15. 693 : 3 = 231
        16. 25 + 577 = 602
        17. 536 : 4 = 134
        18. 848 : 4 = 212
        19. 136 + 428 = 564
        20. 29 + 187 = 216
        21. 96 : 8 = 12
        22. 753 + 85 = 838
        23. 65 + 262 = 327
        24. 441 + 117 = 558
        karta 1
          12 476 11 558
          848 134 536 231
          327 212 602 197
          838 961 218 52
        karta 2
          4 536 327 602
          134 838 52 197
          216 218 961 560
          962 366 564 391
      součet f68303c6"
    `)
  })
})
