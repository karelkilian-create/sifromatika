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
import { printedResult } from '../../src/core/number/index.js'

function render(sheet: CipherGridSheet): string {
  const rows: string[] = []
  for (let row = 0; row < sheet.table.rows; row++) {
    const cells = sheet.table.cells.slice(row * sheet.table.cols, (row + 1) * sheet.table.cols)
    rows.push(`  ${row + 1} | ${cells.map((cell) => cell.letter).join(' ')}`)
  }
  const tasks = sheet.slots
    .map((slot, index) => {
      // Rovnice má rovnítko v sobě, takže by z „? + 15 = 40 = 25" nešlo
      // přečíst, co je zadání a co kód. Šipka to rozdělí.
      const separator = slot.task.prompt.kind === 'equation' ? '→' : '='
      return `  ${String(index + 1).padStart(2)}. ${slot.task.prompt.text} ${separator} ${slot.code}`
    })
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
        1 | U N A H U L C G E
        2 | U P S O D R J E K
        3 | P K L V K D R N T
        4 | A E C L N O L J A
        5 | Z C P S D P S Z T
        6 | O A A C A V O C S
        7 | O O V E A E Z A A
        8 | K P E O M N A K Z
        9 | N T K A M T R E B
         1. 88 : 4 = 22
         2. 4 + 68 = 72
         3. 9 · 9 = 81
         4. 60 − 13 = 47
         5. 7 · 7 = 49
         6. 16 + 20 = 36
         7. 81 : 3 = 27
         8. 81 − 5 = 76
         9. 48 − 27 = 21
        10. 96 + 3 = 99
        11. 41 + 38 = 79
        12. 13 + 45 = 58
        13. 44 − 25 = 19
        14. 20 − 8 = 12
        15. 17 − 6 = 11
      součet 7e78c263"
    `)
  })

  it('souřadnicová šifra, 3. ročník, krátká tajenka', () => {
    expect(render(build('AHOJ', 3, 'golden-2'))).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | T V M A O O I J P
        2 | H R A A S O D A D
        3 | N I O N A H D A O
        4 | E C H L P U C T E
        5 | M K O O E O Y U K
        6 | Y C O Z A R A H L
        7 | L I Z Y S E O C E
        8 | U S O T D K L C D
        9 | A B N M I L O K R
         1. 7 · 5 = 35
         2. 95 − 52 = 43
         3. 32 : 2 = 16
         4. 13 + 5 = 18
      součet b8ac7cee"
    `)
  })

  it('lineární šifra, 5. ročník', () => {
    const config = defaultConfig('CESTA DO LESA', 5, 'golden-3')
    config.payload.cipher.strategy = 'grid-linear'
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | Y N S H T L P S M
        2 | E U E N O A S S N
        3 | U P B Z O Z L E L
        4 | R E T A Z O D M O
        5 | V O S C O Z C A C
        6 | A E C R F I V D E
        7 | H E V I E K E A N
        8 | Z O N Z M E K S K
        9 | S S N N O I E E L
         1. 133 − 85 = 48
         2. 98 − 19 = 79
         3. 40 + 31 = 71
         4. 5 · 6 = 30
         5. 105 : 7 = 15
         6. 139 − 86 = 53
         7. 3 + 11 = 14
         8. 54 : 2 = 27
         9. 28 − 16 = 12
        10. 40 − 23 = 17
        11. 119 − 73 = 46
      součet 2d60bc22"
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
        1 | Z J T N I I J L E
        2 | L V S D P M H M E
        3 | J N E R K E P B A
        4 | T E I M E N A D E
        5 | I E P C N A E K I
        6 | S D E N U A T V C
        7 | A E P O E H N T J
        8 | K D T T I T A S T
        9 | O T K K Z M E A A
         1. 16 − 3 = 13
         2. 6 14 25 39 ? = 56
         3. 23 + 56 = 79
         4. 27 ? 40 51 65 = 32
         5. 94 : 2 = 47
         6. 92 : 4 = 23
         7. 61 68 75 82 ? = 89
         8. 7 15 18 26 ? = 29
         9. 74 + 21 = 95
        10. 7 · 5 = 35
        11. 8 + 79 = 87
      součet 8ecdace0"
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
        1 | N U E A D Z T E A
        2 | O V U Y A C R I A
        3 | A U V A O V I Z T
        4 | O M C E A Z A A S
        5 | K T A T I K L I I
        6 | P N K K N S Z T U
        7 | M B N N O T B H I
        8 | R A I K V P O I S
        9 | O U P P D T B E D
         1. 4 + 77 = 81
         2. 17 + 24 = 41
         3. 5 + 38 − 21 = 22
         4. 12 · 7 − 11 = 73
         5. 179 − 91 = 88
         6. 182 : 7 = 26
         7. 4 · 11 = 44
      součet e222bd32"
    `)
  })

  it('šifra pro 7. ročník — celá čísla se závorkou u záporného operandu', () => {
    // Seed vybraný tak, aby na listu byl záporný operand — jinak by zámek
    // zápisu neměl co hlídat a test by prošel prázdný. Přeživší seed je tu
    // spotřební materiál: inkrement `GENERATOR_VERSION` se propisuje do
    // seedu, takže se losování přehází i tam, kde se pravidla nezměnila.
    // `cela-4` přestal závorku dávat u verze 6, `cela-5` u verze 11.
    const sheet = build('ZAPORNA CISLA', 7, 'cela-3')
    // Zámek zápisu: záporné číslo za operátorem musí být v závorce.
    expect(sheet.slots.some((slot) => slot.task.prompt.text.includes('(−'))).toBe(true)
    expect(render(sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | N A S V S P K L C
        2 | A A Z O A O D N K
        3 | A A E S Y L A D Z
        4 | D C T N Z V K A C
        5 | O M V I E V T E I
        6 | S K Y T O A T S R
        7 | K V O S Y R O P M
        8 | O T J R O S A O P
        9 | C N C S O Z O M O
         1. 110 − 65 = 45
         2. 4 · 6 + 13 = 37
         3. 42 : 6 + 71 = 78
         4. 35 − (−42) = 77
         5. 69 + 15 = 84
         6. 42 : 6 + 21 = 28
         7. (17 − 6) · 2 = 22
         8. 21 + 21 = 42
         9. (21 + 6) · 2 = 54
        10. 33 − 18 = 15
        11. −81 + 99 = 18
        12. −12 + 33 = 21
      součet 0e8bf1c8"
    `)
  })

  /**
   * Šifra se zlomky. Zamrzá tu jediný tvar úlohy, který má v zadání lomítko —
   * a platí u něj totéž, co ukázala verze 8 u desetinných čísel: snímek,
   * který téma neobsahuje, změnu toho tématu neuhlídá.
   */
  it('šifra se zlomky, 7. ročník', () => {
    const config = defaultConfig('ZLOMEK', 7, 'golden-zlomky')
    config.payload.generatorMix = { fractions: 1 }
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | N E K M V C E O E
        2 | E V M O E K A K N
        3 | D N U M O P L C N
        4 | L C V E U O M V I
        5 | E P E M O E V L S
        6 | E D P O R O O O A
        7 | A M K E A U O V Z
        8 | Y I M E T K H U V
        9 | L T I M C T A O M
         1. 1/5 z 395 = 79
         2. 1/10 z 410 = 41
         3. 1/10 z 240 = 24
         4. 1/3 z 282 = 94
         5. 3/5 z 140 = 84
         6. 1/5 z 140 = 28
      součet b794bdb4"
    `)
  })

  it('šifra pro 8. ročník — mocniny a odmocniny', () => {
    // Seed vyměněn s `GENERATOR_VERSION` 7: pod `golden-8` už na listu žádná
    // mocnina není a zámek by hlídal prázdno.
    const sheet = build('DRUHA MOCNINA', 8, 'golden-8-1')
    expect(sheet.slots.some((slot) => /[²³√]/u.test(slot.task.prompt.text))).toBe(true)
    expect(render(sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | D E O L L N O H O
        2 | A H S K V O A E U
        3 | S T Z T A U O I E
        4 | A A N O D E C A E
        5 | T R Z O K R S I R
        6 | L Z E U S N D T A
        7 | M M N V O K T K N
        8 | A E V I K B N P O
        9 | R T K Z H K L E U
         1. 38 + 7 = 45
         2. 9 + 43 = 52
         3. 8 · 8 = 64
         4. 50 − 32 = 18
         5. 49 + 20 = 69
         6. 24 : 12 + 70 = 72
         7. 60 − 23 = 37
         8. 103 − 56 = 47
         9. 12² − 57 = 87
        10. 199 − 115 = 84
        11. 96 : 6 = 16
        12. 40 − (−2) = 42
      součet 8d9052dc"
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
         1. 80 71 62 ? 44 → 53   (krok −9: 80 71 62 53 44)
         2. 57 55 53 51 ? → 49   (krok −2: 57 55 53 51 49)
         3. 75 66 57 48 ? → 39   (krok −9: 75 66 57 48 39)
         4. 22 31 34 43 ? → 46   (střídavý krok +9 a +3: 22 31 34 43 46)
         5. 4 9 15 ? 30 → 22   (krok roste o 1: 4 9 15 22 30)
         6. 53 58 63 68 ? → 73   (krok +5: 53 58 63 68 73)
         7. 3 9 15 21 ? → 27   (krok +6: 3 9 15 21 27)
         8. 52 60 62 70 ? → 72   (střídavý krok +8 a +2: 52 60 62 70 72)
      součet 396b87d5"
    `)
  })

  it('list číselných řad, 3. ročník', () => {
    const outcome = generateSequenceSheet(defaultSequenceSheetConfig(3, 'golden-rady-tretak', 6))
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderTasks(outcome.sheet)).toMatchInlineSnapshot(`
      "Číselné řady — 3. třída
         1. 91 ? 77 70 63 → 84   (krok −7: 91 84 77 70 63)
         2. 61 68 75 82 ? → 89   (krok +7: 61 68 75 82 89)
         3. 13 20 27 ? 41 → 34   (krok +7: 13 20 27 34 41)
         4. 58 ? 46 40 34 → 52   (krok −6: 58 52 46 40 34)
         5. 91 82 73 ? 55 → 64   (krok −9: 91 82 73 64 55)
         6. 87 90 93 96 ? → 99   (krok +3: 87 90 93 96 99)
      součet ad416a5c"
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
         1. 248 | 549 + 31   (v kruhu 5.)
         2. 186 | 989 − 9   (v kruhu 12.)
         3. 307 | 32 : 4   (v kruhu 2.)
         4. 8 | 359 + 107   (v kruhu 3.)
         5. 159 | 53 + 390   (v kruhu 10.)
         6. 798 | 951 − 315   (v kruhu 8.)
         7. 636 | 795 : 5   (v kruhu 9.)
         8. 780 | 874 − 76   (v kruhu 7.)
         9. 580 | 649 + 131   (v kruhu 6.)
        10. 980 | 63 + 244   (v kruhu 1.)
        11. 466 | 477 − 229   (v kruhu 4.)
        12. 443 | 421 − 235   (v kruhu 11.)
      součet d1195253"
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
         1. 665 | 75 % z 984   (v kruhu 5.)
         2. 738 | 20 % z 700   (v kruhu 6.)
         3. 283 | 25 % z 820   (v kruhu 11.)
         4. 205 | 75 % z 940   (v kruhu 12.)
         5. 241 | 50 % z 310   (v kruhu 8.)
         6. 705 | 50 % z 628   (v kruhu 1.)
         7. 140 | 50 % z 482   (v kruhu 7.)
         8. 94 | 70 % z 950   (v kruhu 4.)
         9. 788 | 50 % z 566   (v kruhu 10.)
        10. 155 | 80 % z 985   (v kruhu 9.)
        11. 314 | 40 % z 155   (v kruhu 2.)
        12. 62 | 40 % z 235   (v kruhu 3.)
      součet 6dc2f1c3"
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
    .map(
      (task, index) =>
        `  ${String(index + 1).padStart(2)}. ${task.prompt.text} = ${printedResult(task)}`,
    )
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
    .map(
      (task, index) =>
        `  ${String(index + 1).padStart(2)}. ${task.prompt.text} = ${printedResult(task)}`,
    )
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
         1. 33 + 228 = 261
         2. (165 + 154) · 3 = 957
         3. 748 − 443 = 305
         4. (125 − 5) · 2 = 240
         5. 985 − 406 = 579
         6. 467 − 3 = 464
         7. 999 − 3 = 996
         8. (15 − 2) · 2 = 26
         9. 14 + 573 = 587
        10. 888 : 2 = 444
        11. 934 − 89 = 845
        12. 99 + 344 = 443
      součet 3f50b787"
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
         1. 484,1 + 307,9 = 792
         2. 89,6 · 2 = 179,2
         3. 161,9 + 97,4 = 259,3
         4. 382,7 · 2 = 765,4
         5. 365,4 + 248,5 = 613,9
         6. 33,8 + 54,8 = 88,6
         7. 214,8 + 175,2 = 390
         8. 366,9 + 237,9 = 604,8
         9. 98,4 · 10 = 984
        10. 391,9 + 219,4 = 611,3
        11. 237,5 + 256,9 = 494,4
        12. 148,4 + 277,9 = 426,3
      součet 441c42db"
    `)
  })
})

describe('DoD 0.1 bod 7 — zmrazené rovnice', () => {
  /**
   * Šifra z rovnic, 4. ročník. Zamrzá tu jediný druh zadání, který má
   * v sobě rovnítko — a s ním i to, že hledané číslo slouží jako kód políčka.
   */
  it('šifra z rovnic, 4. ročník', () => {
    const config = defaultConfig('ROVNICE', 4, 'golden-rovnice')
    config.payload.generatorMix = { equation: 1 }
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | E E A D I E R B S
        2 | K C U V C G O O L
        3 | N E S E N U L A C
        4 | E A O T M C A V A
        5 | N Z C I P T P N R
        6 | N I R C T O A N L
        7 | Z O A I I U A E Z
        8 | O C M E R K Y N O
        9 | R L I N O R C E O
         1. ? − 67 = 18 → 85
         2. 2 · ? = 56 → 28
         3. ? : 8 = 6 → 48
         4. 33 + ? = 84 → 51
         5. 33 + ? = 95 → 62
         6. 76 − ? = 30 → 46
         7. 100 − ? = 2 → 98
      součet a43a42ba"
    `)
  })

  /**
   * Domino z rovnic. Řetěz se tu skládá jedině tak, že verifikace rovnici
   * VYŘEŠÍ — proto je tenhle snímek jediný zámek na `solveEquation` v běhu
   * celé aktivity.
   */
  it('domino z rovnic, 5. ročník', () => {
    const config = defaultDominoConfig(5, 'golden-domino-rovnice', 12)
    config.payload.generatorMix = { equation: 1 }
    const outcome = generateDomino(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderTiles(outcome.sheet)).toMatchInlineSnapshot(`
      "Domino — 5. třída
         1. 130 | ? − 60 = 234   (v kruhu 4.)
         2. 585 | ? − 61 = 613   (v kruhu 6.)
         3. 745 | ? − 7 = 173   (v kruhu 8.)
         4. 176 | ? + 44 = 911   (v kruhu 2.)
         5. 767 | ? − 79 = 819   (v kruhu 11.)
         6. 867 | 780 : ? = 6   (v kruhu 3.)
         7. 180 | ? − 6 = 420   (v kruhu 9.)
         8. 976 | 352 : ? = 2   (v kruhu 1.)
         9. 426 | 834 − ? = 67   (v kruhu 10.)
        10. 674 | 840 − ? = 95   (v kruhu 7.)
        11. 294 | ? + 50 = 635   (v kruhu 5.)
        12. 898 | ? + 23 = 999   (v kruhu 12.)
      součet c3cb2537"
    `)
  })
})

describe('DoD 0.1 bod 7 — zmrazené zlomky ve hrách', () => {
  /**
   * Pexeso se zlomkovým výsledkem. Zamrzá tu to, co šifra ukázat nemůže:
   * kartička, na které stojí `3/4` místo `0,75`.
   *
   * ⚠ Bez tohohle snímku by změna zlomkových tvarů neshodila nic. Golden
   *   testy her zlomky do verze 9 vůbec neobsahovaly — táž díra, jakou měl
   *   obor čísel do verze 7.
   */
  it('pexeso se zlomky, 7. ročník', () => {
    const config = defaultPexesoConfig(7, 'golden-pexeso-zlomky', 12)
    // Přes zaškrtávátka, ne ručně: jedno téma „Zlomky" se překládá na čtyři id
    // a právě ten poměr má snímek hlídat.
    config.payload.generatorMix = generatorMixFromTopics(
      {
        arithmetic: false,
        sequences: false,
        decimals: false,
        percents: false,
        powers: false,
        fractions: true,
      },
      gradeProfile(7),
    )
    const outcome = generatePexeso(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderPairs(outcome.sheet)).toMatchInlineSnapshot(`
      "Pexeso — 7. třída
         1. 7/8 z 640 = 560
         2. 1/4 : 5/6 = 3/10
         3. 1/4 : 2/3 = 3/8
         4. 4/5 z 160 = 128
         5. 9/10 z 740 = 666
         6. 4/5 z 215 = 172
         7. 1/2 · 1/2 = 1/4
         8. 9/10 : 1/10 = 9
         9. 1/10 : 1/4 = 2/5
        10. 4/5 · 5/6 = 2/3
        11. 3/8 + 4/8 = 7/8
        12. 1/2 : 1/4 = 2
      součet 330b269f"
    `)
  })

  /**
   * Domino se zlomky. Řetěz se tu skládá přes vytištěnou podobu výsledku,
   * takže tohle je jediný zámek na to, že `readPrintedValue` umí přečíst
   * zlomek na levé půlce kamene.
   */
  it('domino se zlomky, 7. ročník', () => {
    const config = defaultDominoConfig(7, 'golden-domino-zlomky', 12)
    // Přes zaškrtávátka, ne ručně: jedno téma „Zlomky" se překládá na čtyři id
    // a právě ten poměr má snímek hlídat.
    config.payload.generatorMix = generatorMixFromTopics(
      {
        arithmetic: false,
        sequences: false,
        decimals: false,
        percents: false,
        powers: false,
        fractions: true,
      },
      gradeProfile(7),
    )
    const outcome = generateDomino(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderTiles(outcome.sheet)).toMatchInlineSnapshot(`
      "Domino — 7. třída
         1. 658 | 3/10 · 2/3   (v kruhu 1.)
         2. 1/10 | 2/3 · 3/5   (v kruhu 6.)
         3. 1/3 | 3/4 · 1/6   (v kruhu 11.)
         4. 1/8 | 7/8 z 752   (v kruhu 12.)
         5. 111 | 1/6 : 1/2   (v kruhu 10.)
         6. 2/3 | 9/10 − 1/10   (v kruhu 4.)
         7. 1/5 | 3/4 · 5/6   (v kruhu 2.)
         8. 4/5 | 1/6 · 3/5   (v kruhu 5.)
         9. 2/5 | 8/10 − 3/10   (v kruhu 7.)
        10. 235 | 3/5 z 185   (v kruhu 9.)
        11. 1/2 | 5/8 z 376   (v kruhu 8.)
        12. 5/8 | 1/6 : 1/4   (v kruhu 3.)
      součet 87ee1a51"
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
         1. 836 : 2 = 418
         2. 375 − 77 = 298
         3. 941 − 159 = 782
         4. 956 : 2 = 478
         5. 585 − 112 = 473
         6. 293 + 362 = 655
         7. 734 − 198 = 536
         8. 249 + 127 = 376
         9. 35 + 30 = 65
        10. 87 : 3 = 29
        11. 364 − 151 = 213
        12. 43 + 474 = 517
        13. 526 − 329 = 197
        14. 336 − 19 = 317
        15. 993 − 5 = 988
        16. 271 − 121 = 150
        17. 782 − 251 = 531
        18. 179 + 118 = 297
        19. 353 − 64 = 289
        20. 572 + 217 = 789
        21. 401 + 133 = 534
        22. 472 + 195 = 667
        23. 346 − 202 = 144
        24. 719 + 82 = 801
        karta 1
          478 150 988 531
          789 65 473 782
          144 534 298 29
          801 289 376 655
        karta 2
          297 317 801 667
          29 213 298 536
          789 531 289 517
          376 144 534 473
      součet 376e60e0"
    `)
  })
})
