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
import { generatorMixFromTopics } from '../../src/tasks/mix.js'
import { gradeProfile } from '../../src/core/constraints/index.js'

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
        1 | U A A O E J B E V
        2 | O L S Y O I I A D
        3 | K V T V U L I D P
        4 | V V O L E Z R O I
        5 | R E O N B K N P E
        6 | O T K T R R D N P
        7 | O T A D N J E O M
        8 | D N L V K V T A N
        9 | E I V S M E L C E
         1. 9 + 30 = 39
         2. 88 − 10 = 78
         3. 7 · 8 = 56
         4. 88 : 2 = 44
         5. 60 + 13 = 73
         6. 9 · 9 = 81
         7. 22 − 6 = 16
         8. 25 + 20 = 45
         9. 24 + 11 = 35
        10. 69 − 14 = 55
        11. 28 − 15 = 13
        12. 16 + 30 = 46
        13. 100 − 9 = 91
        14. 9 · 6 = 54
        15. 6 + 5 = 11
      součet 024bd88c"
    `)
  })

  it('souřadnicová šifra, 3. ročník, krátká tajenka', () => {
    expect(render(build('AHOJ', 3, 'golden-2'))).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | R E I C N E P S A
        2 | D E A O A V N O U
        3 | Y V K V V J A A Z
        4 | A O N P A O A A D
        5 | T I H A T H O N O
        6 | D L S K Z N P C T
        7 | M Z I O E H T A H
        8 | P N I K N I L O I
        9 | E E A O N P S N E
         1. 67 − 30 = 37
         2. 92 − 13 = 79
         3. 22 + 6 = 28
         4. 9 · 4 = 36
      součet 16c59931"
    `)
  })

  it('lineární šifra, 5. ročník', () => {
    const config = defaultConfig('CESTA DO LESA', 5, 'golden-3')
    config.payload.cipher.strategy = 'grid-linear'
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | B A A K T T K J P
        2 | R P E U W J J P A
        3 | I T U S I K X A N
        4 | L O S Z J A C N L
        5 | K S E T P O C T J
        6 | E T A D O P T T O
        7 | U E D I K N P D C
        8 | M N C V U N E H O
        9 | T K N S S C I B T
         1. 45 + 18 = 63
         2. 9 + 3 = 12
         3. 97 − 21 = 76
         4. 18 : 3 = 6
         5. 6 · 8 = 48
         6. 129 − 72 = 57
         7. 34 + 20 = 54
         8. 4 · 9 = 36
         9. 105 − 49 = 56
        10. 198 : 9 = 22
        11. 52 : 2 = 26
      součet 87c9b633"
    `)
  })

  it('list se zapnutými číselnými řadami, 4. ročník', () => {
    // Seed nese číslo verze, protože se s ní mění: `generatorVersion` je
    // součástí semínka RNG, takže inkrement přehází losování i tam, kde se
    // pravidla vůbec nezměnila. Do verze 8 tu stál `golden-rady`, do kterého
    // se po přehození netrefila ani jedna řada — a bez řady tenhle zámek
    // nehlídá nic.
    const config = defaultConfig('TAJNA STEZKA', 4, 'golden-rady-8')
    config.payload.generatorMix = { arithmetic: 3, sequence: 1 }
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(outcome.sheet.slots.some((slot) => slot.task.prompt.kind === 'sequence')).toBe(true)
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | L K A L T U O I O
        2 | A A D V N T N C A
        3 | N E S A J E V N N
        4 | M N M T E D E K O
        5 | P T E A J O I J D
        6 | S E D A M D A N L
        7 | L N V V B M S U D
        8 | T E M C K V T O R
        9 | L Z J J J S S I T
         1. 75 : 5 = 15
         2. 4 8 16 32 ? = 64
         3. 70 : 2 = 35
         4. 61 52 43 34 ? = 25
         5. 20 + 9 = 29
         6. 99 : 3 = 33
         7. 63 − 19 = 44
         8. 22 26 29 33 ? = 36
         9. 68 74 80 86 ? = 92
        10. 8 · 6 = 48
        11. 92 − 25 = 67
      součet d128437a"
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
        1 | E E E B E A M R O
        2 | E A N N H Z N O A
        3 | Z I V H N D V N D
        4 | T N J N R N L D P
        5 | M O R U O I I P R
        6 | D K R C O O L N B
        7 | O A S N S D Z B L
        8 | C Y H I E N N C J
        9 | T I R N E R L U V
         1. 12 · 8 = 96
         2. 468 : 9 = 52
         3. (41 − 8) · 3 = 99
         4. 45 + 2 − 9 = 38
         5. 320 : 10 = 32
         6. 156 − 75 = 81
         7. 63 : 3 = 21
      součet 903db7de"
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
        1 | I I N A R E D S A
        2 | O O H I L S A S S
        3 | O O A S N S O N M
        4 | E N K T Z E N O I
        5 | N T E E I L Z Z O
        6 | C P I U A A E P H
        7 | H C A A S P D V L
        8 | J M A K V A R I O
        9 | L Y O D Z N O D S
         1. 627 : 11 = 57
         2. 3 · 10 + 56 = 86
         3. 32 + 44 = 76
         4. 24 : 8 + 28 = 31
         5. 43 − 28 = 15
         6. (3 + 14) · 3 = 51
         7. −9 · (−3) = 27
         8. 9 · 8 = 72
         9. 26 − 15 = 11
        10. −9 · (−2) = 18
        11. 672 : 12 = 56
        12. 20 − 6 = 14
      součet b089e9e9"
    `)
  })

  it('šifra pro 8. ročník — mocniny a odmocniny', () => {
    // Seed vyměněn s `GENERATOR_VERSION` 7: pod `golden-8` už na listu žádná
    // mocnina není a zámek by hlídal prázdno.
    const sheet = build('DRUHA MOCNINA', 8, 'golden-8-1')
    expect(sheet.slots.some((slot) => /[²³√]/u.test(slot.task.prompt.text))).toBe(true)
    expect(render(sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | A C T Z U H I O C
        2 | N S N M A R A O E
        3 | U D Y E V H I N Z
        4 | A U E K V T S E E
        5 | E R U L R E I Y H
        6 | D T C L T R E S A
        7 | O A T K U D I P T
        8 | E Z D B N A S M C
        9 | S E K D K O O K O
         1. √64 + 53 = 61
         2. 6 · 11 = 66
         3. 9² − 39 = 42
         4. 160 : 10 = 16
         5. −34 + 120 = 86
         6. −41 + 65 = 24
         7. −86 + 185 = 99
         8. 16 + 3 = 19
         9. 39 + 56 − 10 = 85
        10. 45 + 61 − 29 = 77
        11. 147 : 7 = 21
        12. 22 + 5 = 27
      součet 1e53529f"
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
         1. 66 68 70 72 ? → 74   (krok +2: 66 68 70 72 74)
         2. 86 88 91 ? 100 → 95   (krok roste o 1: 86 88 91 95 100)
         3. 69 71 76 78 ? → 83   (střídavý krok +2 a +5: 69 71 76 78 83)
         4. 14 12 ? 8 6 → 10   (krok −2: 14 12 10 8 6)
         5. 30 28 ? 24 22 → 26   (krok −2: 30 28 26 24 22)
         6. 68 56 44 32 ? → 20   (krok −12: 68 56 44 32 20)
         7. 96 94 92 ? 88 → 90   (krok −2: 96 94 92 90 88)
         8. 35 ? 40 47 57 → 36   (krok roste o 3: 35 36 40 47 57)
      součet ae371ddd"
    `)
  })

  it('list číselných řad, 3. ročník', () => {
    const outcome = generateSequenceSheet(defaultSequenceSheetConfig(3, 'golden-rady-tretak', 6))
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderTasks(outcome.sheet)).toMatchInlineSnapshot(`
      "Číselné řady — 3. třída
         1. 92 88 84 80 ? → 76   (krok −4: 92 88 84 80 76)
         2. 31 28 25 ? 19 → 22   (krok −3: 31 28 25 22 19)
         3. 32 28 24 ? 16 → 20   (krok −4: 32 28 24 20 16)
         4. 33 ? 17 9 1 → 25   (krok −8: 33 25 17 9 1)
         5. 20 16 12 8 ? → 4   (krok −4: 20 16 12 8 4)
         6. 51 43 35 27 ? → 19   (krok −8: 51 43 35 27 19)
      součet ff0cdba5"
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
         1. 392 | 705 + 179   (v kruhu 1.)
         2. 75 | 811 − 285   (v kruhu 6.)
         3. 888 | 839 − 500   (v kruhu 11.)
         4. 339 | 784 : 2   (v kruhu 12.)
         5. 212 | 496 + 62   (v kruhu 8.)
         6. 125 | 12 : 4   (v kruhu 4.)
         7. 558 | 972 : 3   (v kruhu 9.)
         8. 526 | 636 : 3   (v kruhu 7.)
         9. 3 | 122 − 47   (v kruhu 5.)
        10. 884 | 284 + 702   (v kruhu 2.)
        11. 324 | 949 − 61   (v kruhu 10.)
        12. 986 | 500 : 4   (v kruhu 3.)
      součet 726621d3"
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
         1. 31 | 50 % z 520   (v kruhu 3.)
         2. 35 | 25 % z 984   (v kruhu 9.)
         3. 222 | 50 % z 362   (v kruhu 6.)
         4. 81 | 50 % z 140   (v kruhu 12.)
         5. 70 | 60 % z 600   (v kruhu 1.)
         6. 246 | 25 % z 884   (v kruhu 10.)
         7. 221 | 10 % z 810   (v kruhu 11.)
         8. 260 | 90 % z 430   (v kruhu 4.)
         9. 360 | 10 % z 310   (v kruhu 2.)
        10. 149 | 50 % z 70   (v kruhu 8.)
        11. 387 | 60 % z 370   (v kruhu 5.)
        12. 181 | 50 % z 298   (v kruhu 7.)
      součet 9b516eab"
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
         1. 100 : 10 + 784 = 794
         2. 457 + 116 = 573
         3. 11 · 9 + 180 = 279
         4. 314 + 147 − 7 = 454
         5. 432 + 472 = 904
         6. 504 + 160 = 664
         7. 9 · 9 + 255 = 336
         8. 923 − 114 = 809
         9. 524 + 114 = 638
        10. 60 : 12 + 398 = 403
        11. 849 : 3 = 283
        12. 756 − 255 = 501
      součet d87c12d9"
    `)
  })
})

/**
 * Pexeso ze samých desetinných čísel. Zamrzá tu jediný druh úlohy, který má
 * v zadání čárku — a je to potřetí táž mezera: do `GENERATOR_VERSION` 8
 * neobsahoval desetinné číslo ANI JEDEN snímek, takže změna, která přepsala
 * čtvrtinu desetinné zásoby, prošla všemi 525 testy bez jediného selhání.
 *
 * Hlídá tím i `TWO_PLACE_CEILING`: kdyby strop zmizel, vrátí se sem operandy
 * jako `103,25` a snímek to ukáže.
 */
describe('DoD 0.1 bod 7 — zmrazené desetinné pexeso', () => {
  it('pexeso ze samých desetinných čísel, 6. ročník', () => {
    const config = defaultPexesoConfig(6, 'golden-pexeso-des', 12)
    config.payload.generatorMix = generatorMixFromTopics(
      { arithmetic: false, sequences: false, decimals: true, percents: false, powers: false },
      gradeProfile(6),
    )
    const outcome = generatePexeso(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderPairs(outcome.sheet)).toMatchInlineSnapshot(`
      "Pexeso — 6. třída
         1. 156,8 · 4 = 627.2
         2. 496,6 + 369,1 = 865.7
         3. 236,2 + 360,2 = 596.4
         4. 309,8 + 577,6 = 887.4
         5. 136,1 + 227,6 = 363.7
         6. 124,3 · 7 = 870.1
         7. 201,2 · 2 = 402.4
         8. 188,4 + 117,5 = 305.9
         9. 228,1 · 4 = 912.4
        10. 31,05 + 49,05 = 80.1
        11. 95,5 + 88,7 = 184.2
        12. 9,9 · 6 = 59.4
      součet 83593e11"
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
         1. 935 − 46 = 889
         2. 650 : 2 = 325
         3. 630 : 2 = 315
         4. 771 − 39 = 732
         5. 670 : 10 = 67
         6. 897 − 537 = 360
         7. 940 : 2 = 470
         8. 528 : 3 = 176
         9. 725 + 54 = 779
        10. 300 − 175 = 125
        11. 460 + 395 = 855
        12. 860 − 427 = 433
        13. 59 + 331 = 390
        14. 141 − 73 = 68
        15. 890 − 437 = 453
        16. 302 + 248 = 550
        17. 402 : 2 = 201
        18. 104 − 45 = 59
        19. 979 − 20 = 959
        20. 209 + 663 = 872
        21. 228 + 46 = 274
        22. 58 − 25 = 33
        23. 987 − 5 = 982
        24. 885 − 61 = 824
        karta 1
          433 959 125 360
          779 33 67 274
          889 325 201 176
          824 855 550 68
        karta 2
          33 68 390 59
          125 176 67 824
          982 325 315 872
          779 732 201 889
      součet 2428bb1f"
    `)
  })
})
