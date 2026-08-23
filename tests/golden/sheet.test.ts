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
        1 | S A C P L K P B A
        2 | P I A U J J N U J
        3 | H T P O K O H J S
        4 | E U L U E J N T Z
        5 | K S N D A A N I A
        6 | A T O A N B I T O
        7 | T Z O L I K A P R
        8 | E O I M V N N L B
        9 | E P E T A E C L I
         1. 14 + 3 = 17
         2. 70 + 12 = 82
         3. 7 · 5 = 35
         4. 9 + 6 = 15
         5. 19 + 76 = 95
         6. 11 + 43 = 54
         7. 4 + 21 = 25
         8. 14 + 27 = 41
         9. 84 : 2 = 42
        10. 36 : 2 = 18
        11. 88 − 29 = 59
        12. 8 · 9 = 72
        13. 45 + 46 = 91
        14. 71 − 44 = 27
        15. 88 : 2 = 44
      součet bce17a22"
    `)
  })

  it('souřadnicová šifra, 3. ročník, krátká tajenka', () => {
    expect(render(build('AHOJ', 3, 'golden-2'))).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | O B N I I H N A H
        2 | E E J D V S C O D
        3 | A B V K V G P H V
        4 | V T Y J V P S P O
        5 | T U I I Y K H S A
        6 | R F N O H S V J R
        7 | P A O Z N D C E H
        8 | O B C E P T O A M
        9 | Y T V A J O N J P
         1. 80 − 21 = 59
         2. 32 : 2 = 16
         3. 7 · 4 = 28
         4. 33 + 11 = 44
      součet 861591ba"
    `)
  })

  it('lineární šifra, 5. ročník', () => {
    const config = defaultConfig('CESTA DO LESA', 5, 'golden-3')
    config.payload.cipher.strategy = 'grid-linear'
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | E E E A D I Y T D
        2 | D D B D B L S A L
        3 | I V E H U S D E M
        4 | O E I T N N K V S
        5 | T N O D E N A L V
        6 | I Z D N K A Y J L
        7 | O T A O N C N S I
        8 | O O E O T U J I O
        9 | A U S D O S S I I
         1. 3 + 57 = 60
         2. 114 − 48 = 66
         3. 172 − 94 = 78
         4. 121 − 53 = 68
         5. 2 · 2 = 4
         6. 221 − 145 = 76
         7. 384 : 6 = 64
         8. 30 − 12 = 18
         9. 7 · 3 = 21
        10. 324 : 9 = 36
        11. 430 : 10 = 43
      součet b621cd55"
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
        1 | S P C M U K R F M
        2 | D I N A M N I A T
        3 | O K I U E P T U S
        4 | O N J N A Z N A T
        5 | P O T E A V A E L
        6 | K S Z T Z U C K E
        7 | V Z S A I K C T Z
        8 | M A Y P J E P P G
        9 | O T J U R I Z T A
         1. 1 9 15 23 ? = 29
         2. 8 · 6 = 48
         3. 99 − 6 = 93
         4. 3 + 39 = 42
         5. 90 : 2 = 45
         6. 78 : 2 = 39
         7. 82 88 90 96 ? = 98
         8. 51 + 7 = 58
         9. 17 + 55 = 72
        10. 44 − 28 = 16
        11. 78 + 21 = 99
      součet 213cae90"
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
        1 | J S B C V E E N R
        2 | S N E N L T Z N R
        3 | D R R N N V E I I
        4 | S E Z V B O A R C
        5 | T D N O O L K E D
        6 | Z N E Z Z O N S A
        7 | P R I O H V A O O
        8 | O E S L Z L R I Q
        9 | D S E E D K I L A
         1. 13 + 16 = 29
         2. (17 + 6) · 2 = 46
         3. 56 : 7 + 7 = 15
         4. 4 · 7 = 28
         5. 6 + 54 − 21 = 39
         6. 35 + 3 − 24 = 14
         7. 17 + 25 = 42
      součet 97990398"
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
        1 | K L N E C R S C V
        2 | M A A Y E T K I V
        3 | P C E O S L C I H
        4 | O I L I U T N O T
        5 | J Z M P K Y E V B
        6 | Z R E C C R E R A
        7 | A R L C E P O K N
        8 | O P O R E T B S V
        9 | P Y N Y A Z I O N
         1. −41 + 137 = 96
         2. 28 − (−41) = 69
         3. 56 + 20 = 76
         4. 7 · 11 = 77
         5. (9 − 3) · 12 = 72
         6. 6 · 6 − 23 = 13
         7. 25 : 5 + 17 = 22
         8. 7 · 5 + 2 = 37
         9. 38 − (−6) = 44
        10. −8 · (−11) = 88
        11. 803 : 11 = 73
        12. −86 + 157 = 71
      součet ea3e1cd5"
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
        1 | O J O M N E I I R
        2 | A E I S C A M T E
        3 | T L P S N R E V S
        4 | E A E U S I E A V
        5 | J K C T S I E O Y
        6 | N K M I W I J P T
        7 | K U L U S L T V O
        8 | O S Y V V S H H Y
        9 | U H H K E K T O Z
         1. 3/8 z 264 = 99
         2. 1/5 z 160 = 32
         3. 1/2 z 158 = 79
         4. 3/8 z 72 = 27
         5. 1/8 z 128 = 16
         6. 2/5 z 235 = 94
      součet 8a2c9ec5"
    `)
  })

  it('šifra pro 8. ročník — mocniny a odmocniny', () => {
    // Seed vyměněn s `GENERATOR_VERSION` 7: pod `golden-8` už na listu žádná
    // mocnina není a zámek by hlídal prázdno.
    const sheet = build('DRUHA MOCNINA', 8, 'golden-8-1')
    expect(sheet.slots.some((slot) => /[²³√]/u.test(slot.task.prompt.text))).toBe(true)
    expect(render(sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | T K Z S E D N Y V
        2 | M N O R T N V A B
        3 | S O O S E O K S L
        4 | T N N D R M C C I
        5 | K P N T C B A N Z
        6 | I V N U T Z E C Z
        7 | R T S M U L I S L
        8 | S O D B E H C O R
        9 | A O S A U V R E Y
         1. 128 : 8 = 16
         2. 22 + 75 = 97
         3. 28 : 4 + 57 = 64
         4. 12 · 5 + 26 = 86
         5. √100 + 81 = 91
         6. 31 − 10 = 21
         7. 43 − √121 = 32
         8. 44 : 11 + 44 = 48
         9. 3 + 23 = 26
        10. 11 · 7 = 77
        11. (3 + 4) · 6 = 42
        12. 564 : 6 = 94
      součet d6999cf3"
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
         1. 17 ? 27 29 37 → 19   (střídavý krok +2 a +8: 17 19 27 29 37)
         2. 16 28 40 ? 64 → 52   (krok +12: 16 28 40 52 64)
         3. 86 87 89 92 ? → 96   (krok roste o 1: 86 87 89 92 96)
         4. 58 60 65 73 ? → 84   (krok roste o 3: 58 60 65 73 84)
         5. 34 37 40 ? 46 → 43   (krok +3: 34 37 40 43 46)
         6. 85 ? 79 76 73 → 82   (krok −3: 85 82 79 76 73)
         7. 64 56 48 ? 32 → 40   (krok −8: 64 56 48 40 32)
         8. 3 5 11 21 ? → 35   (krok roste o 4: 3 5 11 21 35)
      součet bf4d8ed6"
    `)
  })

  it('list číselných řad, 3. ročník', () => {
    const outcome = generateSequenceSheet(defaultSequenceSheetConfig(3, 'golden-rady-tretak', 6))
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderTasks(outcome.sheet)).toMatchInlineSnapshot(`
      "Číselné řady — 3. třída
         1. 58 ? 46 40 34 → 52   (krok −6: 58 52 46 40 34)
         2. 40 49 58 67 ? → 76   (krok +9: 40 49 58 67 76)
         3. 54 ? 38 30 22 → 46   (krok −8: 54 46 38 30 22)
         4. 83 75 ? 59 51 → 67   (krok −8: 83 75 67 59 51)
         5. 50 58 66 74 ? → 82   (krok +8: 50 58 66 74 82)
         6. 32 41 50 59 ? → 68   (krok +9: 32 41 50 59 68)
      součet 67facf23"
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
         1. 911 | 112 − 41   (v kruhu 2.)
         2. 71 | 904 − 113   (v kruhu 3.)
         3. 90 | 829 − 229   (v kruhu 5.)
         4. 27 | 510 − 150   (v kruhu 9.)
         5. 791 | 31 + 59   (v kruhu 4.)
         6. 988 | 282 + 555   (v kruhu 11.)
         7. 487 | 765 − 408   (v kruhu 7.)
         8. 600 | 974 : 2   (v kruhu 6.)
         9. 357 | 46 − 19   (v kruhu 8.)
        10. 360 | 393 + 595   (v kruhu 10.)
        11. 575 | 978 − 67   (v kruhu 1.)
        12. 837 | 126 + 449   (v kruhu 12.)
      součet 1ca2845d"
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
         1. 506 | 80 % z 320   (v kruhu 11.)
         2. 728 | 20 % z 680   (v kruhu 7.)
         3. 408 | 75 % z 316   (v kruhu 1.)
         4. 330 | 20 % z 880   (v kruhu 3.)
         5. 256 | 80 % z 510   (v kruhu 12.)
         6. 136 | 40 % z 575   (v kruhu 8.)
         7. 287 | 55 % z 920   (v kruhu 10.)
         8. 176 | 80 % z 985   (v kruhu 4.)
         9. 112 | 80 % z 910   (v kruhu 6.)
        10. 237 | 50 % z 660   (v kruhu 2.)
        11. 230 | 50 % z 574   (v kruhu 9.)
        12. 788 | 20 % z 560   (v kruhu 5.)
      součet 8b873ac9"
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
         1. 122 + 103 − 14 = 211
         2. 581 + 362 − 2 = 941
         3. (29 + 82) · 5 = 555
         4. 64 : 8 + 830 = 838
         5. 363 + 124 − 13 = 474
         6. 73 + 57 = 130
         7. 836 : 4 = 209
         8. 19 + 4 = 23
         9. 802 − 193 = 609
        10. (44 + 5) · 3 = 147
        11. (78 − 9) · 10 = 690
        12. (69 + 26) · 3 = 285
      součet ed28aca1"
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
         1. 410,5 + 585,1 = 995,6
         2. 156,8 + 244,3 = 401,1
         3. 22,9 · 4 = 91,6
         4. 8,9 · 3 = 26,7
         5. 404,9 + 477,4 = 882,3
         6. 191,8 + 179,1 = 370,9
         7. 5,2 · 5 = 26
         8. 214,1 · 4 = 856,4
         9. 209,4 + 259,3 = 468,7
        10. 154,5 + 142,2 = 296,7
        11. 55,9 · 7 = 391,3
        12. 250,1 + 397,8 = 647,9
      součet e0c94ac1"
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
        1 | T N K R D U R V R
        2 | B N L M C O K Y O
        3 | K L S E T E I V U
        4 | B K V T A A U T V
        5 | E P I E P T R R M
        6 | S E H R O O O E O
        7 | S A R I O E O J R
        8 | A I E S A O N K P
        9 | N V T U C D R A U
         1. 2 + ? = 99 → 97
         2. 3 · ? = 87 → 29
         3. 73 − ? = 24 → 49
         4. 93 − ? = 2 → 91
         5. 87 − ? = 13 → 74
         6. ? − 13 = 82 → 95
         7. ? : 4 = 17 → 68
      součet 2fa2adc4"
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
         1. 951 | 970 − ? = 6   (v kruhu 11.)
         2. 895 | ? + 78 = 937   (v kruhu 1.)
         3. 964 | ? : 5 = 179   (v kruhu 12.)
         4. 285 | ? + 83 = 515   (v kruhu 4.)
         5. 103 | 333 − ? = 25   (v kruhu 8.)
         6. 165 | ? : 3 = 317   (v kruhu 10.)
         7. 684 | 2 · ? = 206   (v kruhu 7.)
         8. 787 | 68 + ? = 353   (v kruhu 3.)
         9. 308 | ? : 5 = 33   (v kruhu 9.)
        10. 432 | ? − 100 = 729   (v kruhu 5.)
        11. 859 | 816 − ? = 29   (v kruhu 2.)
        12. 829 | ? − 80 = 604   (v kruhu 6.)
      součet 0bfff805"
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
    // Přes zaškrtávátka, ne ručně: jedno téma „Zlomky" se překládá na dvě id
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
         1. 1/5 + 7/10 = 9/10
         2. 1/10 + 1/2 = 3/5
         3. 4/10 − 3/10 = 1/10
         4. 5/10 − 1/10 = 2/5
         5. 1/10 + 6/10 = 7/10
         6. 4/5 z 490 = 392
         7. 7/10 z 160 = 112
         8. 2/5 + 2/5 = 4/5
         9. 1/2 − 3/10 = 1/5
        10. 1/6 + 4/6 = 5/6
        11. 5/8 z 632 = 395
        12. 7/10 z 490 = 343
      součet 29fa5fc9"
    `)
  })

  /**
   * Domino se zlomky. Řetěz se tu skládá přes vytištěnou podobu výsledku,
   * takže tohle je jediný zámek na to, že `readPrintedValue` umí přečíst
   * zlomek na levé půlce kamene.
   */
  it('domino se zlomky, 7. ročník', () => {
    const config = defaultDominoConfig(7, 'golden-domino-zlomky', 12)
    // Přes zaškrtávátka, ne ručně: jedno téma „Zlomky" se překládá na dvě id
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
         1. 47 | 1/10 + 3/5   (v kruhu 12.)
         2. 1/6 | 5/6 z 330   (v kruhu 4.)
         3. 2/3 | 1/2 + 3/10   (v kruhu 8.)
         4. 7/8 | 7/8 − 3/8   (v kruhu 2.)
         5. 7/10 | 2/8 + 5/8   (v kruhu 1.)
         6. 275 | 3/6 + 2/6   (v kruhu 5.)
         7. 1/2 | 1/3 − 1/6   (v kruhu 3.)
         8. 57 | 2/6 + 2/6   (v kruhu 7.)
         9. 2/5 | 1/10 z 470   (v kruhu 11.)
        10. 5/6 | 3/4 z 76   (v kruhu 6.)
        11. 4/5 | 3/8 + 3/8   (v kruhu 9.)
        12. 3/4 | 9/10 − 1/2   (v kruhu 10.)
      součet a48df863"
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
         1. 978 − 236 = 742
         2. 198 − 105 = 93
         3. 224 + 201 = 425
         4. 898 : 2 = 449
         5. 894 − 256 = 638
         6. 714 − 119 = 595
         7. 614 + 166 = 780
         8. 491 − 61 = 430
         9. 596 + 176 = 772
        10. 397 + 340 = 737
        11. 939 − 158 = 781
        12. 860 : 5 = 172
        13. 406 − 239 = 167
        14. 720 − 259 = 461
        15. 113 + 105 = 218
        16. 877 − 498 = 379
        17. 171 + 13 = 184
        18. 577 − 153 = 424
        19. 739 − 218 = 521
        20. 365 + 221 = 586
        21. 137 + 444 = 581
        22. 723 + 160 = 883
        23. 835 − 68 = 767
        24. 4 + 3 = 7
        karta 1
          586 581 424 595
          172 767 742 737
          430 772 521 218
          425 638 461 379
        karta 2
          379 424 581 742
          521 218 781 767
          737 883 461 184
          172 167 7 595
      součet f63f4d60"
    `)
  })
})
