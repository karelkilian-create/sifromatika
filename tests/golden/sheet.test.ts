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
        1 | T L C A C N J N K
        2 | U E S E A N I F V
        3 | S D S I R U Z C L
        4 | L A E L Y J S B E
        5 | A O O E O A P L V
        6 | B N Q K A O Y M D
        7 | O K N J Y O N Z E
        8 | O A A K O E V O I
        9 | G M Z B V M P E V
         1. 65 − 8 = 57
         2. 92 − 37 = 55
         3. 98 − 34 = 64
         4. 5 + 7 = 12
         5. 72 + 11 = 83
         6. 8 · 4 = 32
         7. 31 − 14 = 17
         8. 66 : 3 = 22
         9. 6 · 6 = 36
        10. 100 − 6 = 94
        11. 75 : 3 = 25
        12. 34 + 59 = 93
        13. 8 · 3 = 24
        14. 2 · 8 = 16
        15. 51 − 30 = 21
      součet 92b9e58e"
    `)
  })

  it('souřadnicová šifra, 3. ročník, krátká tajenka', () => {
    expect(render(build('AHOJ', 3, 'golden-2'))).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | T S R O N N P S V
        2 | U U N A E M N O O
        3 | N E O A O D T C E
        4 | L O S J B K J D H
        5 | Y O T O N E U A H
        6 | O K H V D N M P N
        7 | T Z O C N S T E E
        8 | B X S A O O A A K
        9 | S L M R D V P A K
         1. 92 − 4 = 88
         2. 22 + 41 = 63
         3. 6 · 7 = 42
         4. 88 : 2 = 44
      součet c74c5ead"
    `)
  })

  it('lineární šifra, 5. ročník', () => {
    const config = defaultConfig('CESTA DO LESA', 5, 'golden-3')
    config.payload.cipher.strategy = 'grid-linear'
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | B U P O K L K O N
        2 | A V U I M S O Z I
        3 | D A A Z M N A K J
        4 | M A B T P D N O A
        5 | E O D A L B I D E
        6 | T K O Z C A N D T
        7 | O Y I E R N O O A
        8 | A E Z D I S E E P
        9 | R R D S I C O A E
         1. 468 : 6 = 78
         2. 405 : 9 = 45
         3. 3 + 66 = 69
         4. 69 − 38 = 31
         5. 5 · 5 = 25
         6. 42 + 25 = 67
         7. 116 − 55 = 61
         8. 2 · 3 = 6
         9. 7 · 10 = 70
        10. 40 − 25 = 15
        11. 567 : 9 = 63
      součet f4f5b388"
    `)
  })

  it('list se zapnutými číselnými řadami, 4. ročník', () => {
    // Seed nese číslo verze, protože se s ní mění: `generatorVersion` je
    // součástí semínka RNG, takže inkrement přehází losování i tam, kde se
    // pravidla vůbec nezměnila. Do verze 8 tu stál `golden-rady` a do verze
    // 12 `golden-rady-8`; do obou se po přehození netrefila ani jedna řada —
    // a bez řady tenhle zámek nehlídá nic.
    const config = defaultConfig('TAJNA STEZKA', 4, 'golden-rady-12')
    config.payload.generatorMix = { arithmetic: 3, sequence: 1 }
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(outcome.sheet.slots.some((slot) => slot.task.prompt.kind === 'sequence')).toBe(true)
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | D V A N N A O E K
        2 | A S L K C O B V R
        3 | T S A N K K N P E
        4 | A O E L Z D T S A
        5 | A I E R T O N S A
        6 | T A E A P A D U Z
        7 | L N J A T I E F O
        8 | A K V I K V O P U
        9 | D A N T E T J N X
         1. 20 + 27 = 47
         2. 55 + 9 = 64
         3. 100 − 3 = 97
         4. 70 : 5 = 14
         5. 1 3 7 13 ? = 21
         6. 23 + 9 = 32
         7. 65 − 10 = 55
         8. 62 − 19 = 43
         9. 9 · 5 = 45
        10. 18 ? 30 36 42 = 24
        11. 27 30 ? 36 39 = 33
      součet 2319c7b5"
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
        1 | N L A K V K O N L
        2 | E Y I T O E N R D
        3 | I T I M I T E A O
        4 | V R A K Z N N W I
        5 | A O B V N E V K R
        6 | T I E J O K O C Y
        7 | S R I E C C V L Y
        8 | E E O V P R U Y K
        9 | E E B D N U O K L
         1. 2 + 96 − 12 = 86
         2. 3 · 7 − 4 = 17
         3. (23 − 5) · 3 = 54
         4. 135 : 5 = 27
         5. 39 + 13 − 29 = 23
         6. 36 : 6 + 69 = 75
         7. (13 − 4) · 9 = 81
      součet 108995fd"
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
        1 | V O L R T Z R J N
        2 | Y L O N E O U S U
        3 | B T A P V K S N O
        4 | A D T E H U U O J
        5 | O E T I A I C J E
        6 | C N E A D K R T L
        7 | M Z K O B E V R I
        8 | O C N E L R L D L
        9 | C O T A E O V O K
         1. (14 − 8) · 12 = 72
         2. 65 − 24 = 41
         3. 6 + 28 = 34
         4. 283 − 185 = 98
         5. 10 : 5 + 12 = 14
         6. 72 + 22 − 11 = 83
         7. 3 · 11 = 33
         8. 19 + 38 = 57
         9. 87 − 33 = 54
        10. −4 · (−7) = 28
        11. 510 : 6 = 85
        12. −73 + 167 = 94
      součet 5d9f2b1d"
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
        1 | O Z I O P N C A E
        2 | H I K C D L T M U
        3 | I T N N M D L P N
        4 | S S A B O R I L N
        5 | S D O Y T O A M M
        6 | K D J P I K L L K
        7 | Y L V D B M B N M
        8 | J K Z N S V A N M
        9 | U Y P O E U M E D
         1. 1/10 z 120 = 12
         2. 1/3 z 216 = 72
         3. 1/3 z 159 = 53
         4. 1/5 z 290 = 58
         5. 5/8 z 152 = 95
         6. 1/4 z 244 = 61
      součet 4a5c3fc2"
    `)
  })

  it('šifra pro 8. ročník — mocniny a odmocniny', () => {
    // Seed vyměněn s `GENERATOR_VERSION` 7: pod `golden-8` už na listu žádná
    // mocnina není a zámek by hlídal prázdno.
    const sheet = build('DRUHA MOCNINA', 8, 'golden-8-1')
    expect(sheet.slots.some((slot) => /[²³√]/u.test(slot.task.prompt.text))).toBe(true)
    expect(render(sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | N N B O H R C N J
        2 | U O K S R A D C A
        3 | H Z Z I N R E K E
        4 | O E N M N N A N B
        5 | N U A A I A O T O
        6 | O D C N S A J S T
        7 | V D S E E O N E Y
        8 | Y N R M T I O C U
        9 | Y E D E I O O S E
         1. 40 : 10 + 23 = 27
         2. 42 : 6 + 9 = 16
         3. 17 + 4 = 21
         4. 29 − √196 = 15
         5. −46 + 102 = 56
         6. 240 − 156 = 84
         7. 5 · 8 + 21 = 61
         8. 3³ + 36 = 63
         9. 510 : 10 = 51
        10. 10 : 2 + 29 = 34
        11. 8 + 3 = 11
        12. 43 + 15 − 11 = 47
      součet 8f38d891"
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
         1. 17 14 11 8 ? → 5   (krok −3: 17 14 11 8 5)
         2. 57 67 77 ? 97 → 87   (krok +10: 57 67 77 87 97)
         3. 2 ? 18 32 50 → 8   (krok roste o 4: 2 8 18 32 50)
         4. 8 12 ? 19 22 → 15   (střídavý krok +4 a +3: 8 12 15 19 22)
         5. 75 69 ? 57 51 → 63   (krok −6: 75 69 63 57 51)
         6. 48 37 26 15 ? → 4   (krok −11: 48 37 26 15 4)
         7. 56 61 69 80 ? → 94   (krok roste o 3: 56 61 69 80 94)
         8. 65 61 57 53 ? → 49   (krok −4: 65 61 57 53 49)
      součet 59d8f3b4"
    `)
  })

  it('list číselných řad, 3. ročník', () => {
    const outcome = generateSequenceSheet(defaultSequenceSheetConfig(3, 'golden-rady-tretak', 6))
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderTasks(outcome.sheet)).toMatchInlineSnapshot(`
      "Číselné řady — 3. třída
         1. 86 ? 92 95 98 → 89   (krok +3: 86 89 92 95 98)
         2. 64 72 80 ? 96 → 88   (krok +8: 64 72 80 88 96)
         3. 32 27 ? 17 12 → 22   (krok −5: 32 27 22 17 12)
         4. 38 47 ? 65 74 → 56   (krok +9: 38 47 56 65 74)
         5. 5 11 17 23 ? → 29   (krok +6: 5 11 17 23 29)
         6. 31 37 43 49 ? → 55   (krok +6: 31 37 43 49 55)
      součet 7df39c8f"
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
         1. 281 | 688 + 156   (v kruhu 2.)
         2. 949 | 987 − 301   (v kruhu 7.)
         3. 965 | 31 + 493   (v kruhu 10.)
         4. 236 | 754 − 473   (v kruhu 1.)
         5. 615 | 883 − 336   (v kruhu 5.)
         6. 848 | 878 − 263   (v kruhu 4.)
         7. 524 | 84 + 785   (v kruhu 11.)
         8. 547 | 971 − 22   (v kruhu 6.)
         9. 869 | 944 : 4   (v kruhu 12.)
        10. 844 | 868 − 20   (v kruhu 3.)
        11. 71 | 980 − 15   (v kruhu 9.)
        12. 686 | 182 − 111   (v kruhu 8.)
      součet 04019a31"
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
         1. 31 | 10 % z 230   (v kruhu 1.)
         2. 568 | 35 % z 60   (v kruhu 11.)
         3. 454 | 50 % z 716   (v kruhu 3.)
         4. 40 | 50 % z 964   (v kruhu 8.)
         5. 117 | 80 % z 710   (v kruhu 10.)
         6. 207 | 25 % z 160   (v kruhu 7.)
         7. 358 | 75 % z 180   (v kruhu 4.)
         8. 482 | 25 % z 468   (v kruhu 9.)
         9. 21 | 10 % z 310   (v kruhu 12.)
        10. 296 | 50 % z 414   (v kruhu 6.)
        11. 23 | 50 % z 908   (v kruhu 2.)
        12. 135 | 50 % z 592   (v kruhu 5.)
      součet bd4c0eab"
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
         1. 133 + 118 = 251
         2. (81 − 4) · 7 = 539
         3. 876 : 2 = 438
         4. 661 + 146 = 807
         5. 467 + 47 − 21 = 493
         6. 7 · 8 + 540 = 596
         7. 2 · 5 + 657 = 667
         8. 36 + 519 − 23 = 532
         9. (105 − 8) · 3 = 291
        10. 37 + 20 − 5 = 52
        11. 4 + 235 − 19 = 220
        12. 738 : 3 = 246
      součet 04864645"
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
         1. 43,4 + 47,1 = 90,5
         2. 195,8 + 143,3 = 339,1
         3. 131,2 + 161,5 = 292,7
         4. 383,3 · 2 = 766,6
         5. 297,6 + 170,5 = 468,1
         6. 243,1 · 3 = 729,3
         7. 170,8 + 187,6 = 358,4
         8. 20,75 · 2 = 41,5
         9. 272,2 + 405,7 = 677,9
        10. 194,9 + 329,7 = 524,6
        11. 71,2 · 8 = 569,6
        12. 300,6 + 433,1 = 733,7
      součet a7f8a1d9"
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
        1 | E K D Y Z D O I I
        2 | L R E P J O K A U
        3 | I E N B L V L O T
        4 | P I E Z T C Z E E
        5 | I D K U O D N A I
        6 | T O A E P Y Z E E
        7 | D N O V B N C P L
        8 | V E L S J J P V O
        9 | P B T N T O P E O
         1. ? : 2 = 11 → 22
         2. 3 + ? = 92 → 89
         3. ? + 10 = 91 → 81
         4. ? : 3 = 19 → 57
         5. ? − 3 = 15 → 18
         6. ? − 25 = 52 → 77
         7. 17 + ? = 28 → 11
      součet 30a0f36c"
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
         1. 741 | 5 + ? = 527   (v kruhu 9.)
         2. 781 | 890 : ? = 5   (v kruhu 5.)
         3. 904 | ? + 2 = 1000   (v kruhu 2.)
         4. 914 | 906 − ? = 2   (v kruhu 1.)
         5. 43 | 801 − ? = 20   (v kruhu 4.)
         6. 854 | 601 − ? = 47   (v kruhu 7.)
         7. 178 | ? + 88 = 942   (v kruhu 6.)
         8. 522 | ? − 16 = 84   (v kruhu 10.)
         9. 100 | ? + 31 = 667   (v kruhu 11.)
        10. 998 | 62 − ? = 19   (v kruhu 3.)
        11. 636 | ? − 49 = 865   (v kruhu 12.)
        12. 554 | ? + 11 = 752   (v kruhu 8.)
      součet 29db90ff"
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
         1. 7/10 − 2/5 = 3/10
         2. 1/6 : 1/2 = 1/3
         3. 1/2 + 1/4 = 3/4
         4. 4/5 : 1/10 = 8
         5. 7/10 z 450 = 315
         6. 3/4 − 1/2 = 1/4
         7. 1/2 · 2/5 = 1/5
         8. 1/5 · 5/6 = 1/6
         9. 1/2 − 1/10 = 2/5
        10. 1/5 + 3/5 = 4/5
        11. 1/10 z 150 = 15
        12. 1/2 : 1/4 = 2
      součet f765ff2b"
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
         1. 34 | 1/10 : 4/5   (v kruhu 11.)
         2. 3/4 | 1/2 + 1/6   (v kruhu 3.)
         3. 1/2 | 7/8 − 4/8   (v kruhu 6.)
         4. 1/4 | 7/8 − 1/8   (v kruhu 2.)
         5. 2/3 | 1/2 + 3/10   (v kruhu 4.)
         6. 3/8 | 7/8 · 4/5   (v kruhu 7.)
         7. 1/8 | 2/3 · 1/4   (v kruhu 12.)
         8. 4/5 | 3/4 · 2/3   (v kruhu 5.)
         9. 1/6 | 1/2 · 1/2   (v kruhu 1.)
        10. 2 | 1/5 z 155   (v kruhu 9.)
        11. 7/10 | 2/5 : 1/5   (v kruhu 8.)
        12. 31 | 2/5 z 85   (v kruhu 10.)
      součet bccd7585"
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
         1. 871 + 127 = 998
         2. 459 : 3 = 153
         3. 419 − 77 = 342
         4. 152 + 638 = 790
         5. 985 − 35 = 950
         6. 806 : 2 = 403
         7. 901 − 267 = 634
         8. 834 − 260 = 574
         9. 751 − 111 = 640
        10. 107 + 113 = 220
        11. 117 + 245 = 362
        12. 464 + 196 = 660
        13. 438 : 2 = 219
        14. 668 − 71 = 597
        15. 426 + 85 = 511
        16. 11 + 624 = 635
        17. 199 − 72 = 127
        18. 587 − 59 = 528
        19. 640 − 17 = 623
        20. 365 + 337 = 702
        21. 966 − 57 = 909
        22. 240 + 278 = 518
        23. 56 : 8 = 7
        24. 921 − 246 = 675
        karta 1
          702 790 574 635
          634 362 403 623
          511 153 127 597
          909 342 675 518
        karta 2
          362 342 623 675
          220 660 219 403
          511 702 7 950
          790 998 909 640
      součet afb5874c"
    `)
  })
})

/**
 * Druhá třída. Tři snímky, protože jsou to tři různé věci, které se od
 * ostatních ročníků liší: obsah profilu, přepínatelný přechod přes desítku
 * a rozklad na desítky a jednotky.
 */
describe('druhá třída', () => {
  it('šifra pro 2. ročník — do sta a bez desítky v násobilce', () => {
    expect(render(build('DVOJKA', 2, 'golden-dvojka'))).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | T U B O E I M A V
        2 | R U Z Z R I O T T
        3 | O T M V T R H C I
        4 | J L I C M O K A U
        5 | C O R I P H E L U
        6 | E E A L Z D T N E
        7 | T E T A O E R V O
        8 | S P V U T I P O J
        9 | K I M P Z I E D P
         1. 49 + 17 = 66
         2. 47 − 28 = 19
         3. 7 · 2 = 14
         4. 4 + 85 = 89
         5. 88 + 3 = 91
         6. 5 + 13 = 18
      součet 375884be"
    `)
  })

  it('odškrtnutý přechod přes desítku list opravdu změní', () => {
    const config = defaultConfig('DVOJKA', 2, 'golden-dvojka')
    config.payload.difficulty = { ...config.payload.difficulty, crossesTen: false }
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | P T U A B E I M V
        2 | R U Z Z R I O O T
        3 | T O T M V T R H C
        4 | I J L I C M O K A
        5 | U C O R I P H E L
        6 | U E E A L D Z T N
        7 | E T E T A O E R V
        8 | O S P V U T I P J
        9 | K O I M P Z I E D
         1. 78 − 12 = 66
         2. 49 − 30 = 19
         3. 9 · 3 = 27
         4. 99 − 10 = 89
         5. 11 + 80 = 91
         6. 2 · 7 = 14
      součet 1a7810b6"
    `)
  })

  it('šifra z rozkladu na desítky a jednotky, 2. ročník', () => {
    const config = defaultConfig('DESITKY', 2, 'golden-rozklad')
    config.payload.generatorMix = { decomposition: 1 }
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | N E P V K H U L O
        2 | D R I V R A A S B
        3 | D R K Y R I U T S
        4 | H V V K C H E I Y
        5 | N R Z O A H S O E
        6 | H K R A O L O O A
        7 | O E S N H I V P I
        8 | N E V P N I J E L
        9 | V U I Z A I M U E
         1. 2 · 10 + 1 = 21
         2. 9 · 10 + 9 = 99
         3. 7 · 10 + 3 = 73
         4. 4 · 10 + 8 = 48
         5. 3 · 10 + 8 = 38
         6. 4 · 10 + 4 = 44
         7. 4 · 10 + 9 = 49
      součet 065c321f"
    `)
  })
})
