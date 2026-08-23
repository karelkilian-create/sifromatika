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
        1 | N P A A J R S A A
        2 | K A A O L Y U N U
        3 | R U E J K T O T A
        4 | Z D B Z T U S D I
        5 | O A S K Y N M A T
        6 | P A E T C Y N E Z
        7 | I R I S L R O D N
        8 | S O L P E E B A E
        9 | P T T S A U B U O
         1. 32 + 52 = 84
         2. 74 : 2 = 37
         3. 5 · 7 = 35
         4. 50 : 2 = 25
         5. 46 + 12 = 58
         6. 7 · 6 = 42
         7. 96 − 62 = 34
         8. 18 + 67 = 85
         9. 64 − 32 = 32
        10. 90 − 3 = 87
        11. 28 + 11 = 39
        12. 66 + 3 = 69
        13. 63 − 30 = 33
        14. 74 − 18 = 56
        15. 92 : 2 = 46
      součet ca8eae94"
    `)
  })

  it('souřadnicová šifra, 3. ročník, krátká tajenka', () => {
    expect(render(build('AHOJ', 3, 'golden-2'))).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | S O O O T B J L L
        2 | K F L A V I Z U J
        3 | O K H C O N S T N
        4 | E S O R N B N J O
        5 | R A N O T N O N M
        6 | B C Z A B T I A S
        7 | R L Y L R R O V L
        8 | E K O D Y S O X S
        9 | O U O E E A A T T
         1. 100 − 4 = 96
         2. 28 + 5 = 33
         3. 6 · 2 = 12
         4. 87 : 3 = 29
      součet 65fd91fc"
    `)
  })

  it('lineární šifra, 5. ročník', () => {
    const config = defaultConfig('CESTA DO LESA', 5, 'golden-3')
    config.payload.cipher.strategy = 'grid-linear'
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(render(outcome.sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | K T U J D S S R A
        2 | M E C U T O S N S
        3 | O D E D P E M Z N
        4 | K A D A K Z E S U
        5 | O T T N B O A R S
        6 | D T E A K E I N A
        7 | O N S R Y I O E I
        8 | O P K E O P P V A
        9 | A K P U T Z C M L
         1. 120 : 10 = 12
         2. 18 + 30 = 48
         3. 6 + 51 = 57
         4. 38 − 24 = 14
         5. 3 + 69 = 72
         6. 10 · 2 = 20
         7. 150 : 10 = 15
         8. 238 − 157 = 81
         9. 240 : 10 = 24
        10. 18 : 3 = 6
        11. 196 : 4 = 49
      součet 94a86864"
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
        1 | N L Z E E V T K E
        2 | N A N E A O O L A
        3 | N A S O M O H T P
        4 | T A J R H A O A N
        5 | I A A A Z A A A N
        6 | A K K N U T A D J
        7 | A L Z N I T O L O
        8 | L S Z O L R O A T
        9 | K E P R O S N U R
         1. 66 − 28 = 38
         2. 62 − 20 = 42
         3. 57 + 12 = 69
         4. 13 15 17 19 ? = 21
         5. 87 : 3 = 29
         6. 23 + 10 = 33
         7. 8 + 68 = 76
         8. 99 − 7 = 92
         9. 7 + 6 = 13
        10. 9 · 7 = 63
        11. 13 ? 30 39 47 = 22
      součet e9b5e9b9"
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
        1 | E V E P N L V N S
        2 | L K Z A E N F L N
        3 | J A A C M S N A O
        4 | I O T S T L N N T
        5 | A S L R I K C S I
        6 | K U E D D T V D T
        7 | D R Z D M J A I A
        8 | O T K R E U P E P
        9 | S O M A V A L R E
         1. 9 · 8 = 72
         2. 4 · 8 + 7 = 39
         3. 18 − 6 = 12
         4. (18 − 5) · 2 = 26
         5. 27 : 9 + 38 = 41
         6. (24 − 5) · 3 = 57
         7. (2 + 19) · 3 = 63
      součet 01c348a5"
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
        1 | E K O C P L I U O
        2 | A S A Y L N P O U
        3 | S A A R O I C B T
        4 | I R I Y C A P D I
        5 | T F E Z T U M A C
        6 | V I V C L A Y O O
        7 | O L O U E O B A S
        8 | C O R Z A O P A A
        9 | E N Z A E K U N R
         1. −47 + 140 = 93
         2. 396 : 12 = 33
         3. 13 + 60 − 26 = 47
         4. 14 + 5 − 6 = 13
         5. 7 · 6 = 42
         6. 28 + 5 − 7 = 26
         7. 6 · 11 = 66
         8. 46 − (−13) = 59
         9. −57 + 106 = 49
        10. 61 − 39 = 22
        11. 30 : 3 + 62 = 72
        12. 116 : 2 = 58
      součet 44ce89ba"
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
        1 | K O D H T P K I R
        2 | I D S I L K N S Z
        3 | V E A Z I O P Y M
        4 | A U T I O I S L I
        5 | E L E L I E L V E
        6 | O T E Z V I N E N
        7 | J V V Z J I J R N
        8 | Y O R A U K E D P
        9 | B O C E N C O D V
         1. 1/5 z 170 = 34
         2. 3/8 z 152 = 57
         3. 1/10 z 610 = 61
         4. 1/6 z 234 = 39
         5. 3/10 z 290 = 87
         6. 2/5 z 65 = 26
      součet 955c2ac4"
    `)
  })

  it('šifra pro 8. ročník — mocniny a odmocniny', () => {
    // Seed vyměněn s `GENERATOR_VERSION` 7: pod `golden-8` už na listu žádná
    // mocnina není a zámek by hlídal prázdno.
    const sheet = build('DRUHA MOCNINA', 8, 'golden-8-1')
    expect(sheet.slots.some((slot) => /[²³√]/u.test(slot.task.prompt.text))).toBe(true)
    expect(render(sheet)).toMatchInlineSnapshot(`
      "mřížka 9×9
        1 | K N H E T J L Z E
        2 | T U N M E Y E T P
        3 | H I M M I O P S O
        4 | E U P E Y L O N M
        5 | N V T C V I A E O
        6 | A K E E J M E A T
        7 | E Y T N T T D O I
        8 | Y I E Y R P N O T
        9 | E M T S A S L H C
         1. 180 − 103 = 77
         2. (2 + 15) · 5 = 85
         3. 5 + 17 = 22
         4. 85 + 43 − 30 = 98
         5. √324 + 39 = 57
         6. 75 − 42 = 33
         7. (2 + 11) · 3 = 39
         8. 162 − 108 = 54
         9. 357 : 7 = 51
        10. 140 − 84 = 56
        11. 8 + 40 = 48
        12. 12 : 2 + 55 = 61
      součet 054ea507"
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
         1. 22 34 46 58 ? → 70   (krok +12: 22 34 46 58 70)
         2. 46 50 54 58 ? → 62   (krok +4: 46 50 54 58 62)
         3. 57 46 ? 24 13 → 35   (krok −11: 57 46 35 24 13)
         4. 91 84 ? 70 63 → 77   (krok −7: 91 84 77 70 63)
         5. 70 58 46 34 ? → 22   (krok −12: 70 58 46 34 22)
         6. 71 73 75 77 ? → 79   (krok +2: 71 73 75 77 79)
         7. 6 12 ? 48 96 → 24   (násobení 2: 6 12 24 48 96)
         8. 3 11 23 39 ? → 59   (krok roste o 4: 3 11 23 39 59)
      součet 3f3ef88c"
    `)
  })

  it('list číselných řad, 3. ročník', () => {
    const outcome = generateSequenceSheet(defaultSequenceSheetConfig(3, 'golden-rady-tretak', 6))
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    expect(renderTasks(outcome.sheet)).toMatchInlineSnapshot(`
      "Číselné řady — 3. třída
         1. 27 22 17 12 ? → 7   (krok −5: 27 22 17 12 7)
         2. 18 15 12 9 ? → 6   (krok −3: 18 15 12 9 6)
         3. 28 23 18 13 ? → 8   (krok −5: 28 23 18 13 8)
         4. 64 69 ? 79 84 → 74   (krok +5: 64 69 74 79 84)
         5. 35 42 49 56 ? → 63   (krok +7: 35 42 49 56 63)
         6. 89 83 77 71 ? → 65   (krok −6: 89 83 77 71 65)
      součet 2e8ff969"
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
         1. 374 | 992 − 11   (v kruhu 2.)
         2. 909 | 587 − 64   (v kruhu 4.)
         3. 787 | 220 : 5   (v kruhu 9.)
         4. 152 | 986 − 37   (v kruhu 11.)
         5. 328 | 174 + 93   (v kruhu 7.)
         6. 44 | 414 − 262   (v kruhu 10.)
         7. 523 | 990 − 42   (v kruhu 5.)
         8. 267 | 836 − 49   (v kruhu 8.)
         9. 948 | 822 − 494   (v kruhu 6.)
        10. 949 | 337 + 119   (v kruhu 12.)
        11. 981 | 956 − 47   (v kruhu 3.)
        12. 456 | 838 − 464   (v kruhu 1.)
      součet 4b4f6a3f"
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
         1. 169 | 10 % z 860   (v kruhu 7.)
         2. 487 | 25 % z 20   (v kruhu 9.)
         3. 190 | 50 % z 338   (v kruhu 6.)
         4. 439 | 75 % z 156   (v kruhu 1.)
         5. 117 | 80 % z 430   (v kruhu 2.)
         6. 344 | 75 % z 920   (v kruhu 3.)
         7. 900 | 15 % z 760   (v kruhu 11.)
         8. 114 | 50 % z 878   (v kruhu 12.)
         9. 86 | 50 % z 974   (v kruhu 8.)
        10. 341 | 25 % z 760   (v kruhu 5.)
        11. 690 | 50 % z 682   (v kruhu 4.)
        12. 5 | 90 % z 1000   (v kruhu 10.)
      součet 9a0f21c1"
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
         1. (17 − 2) · 7 = 105
         2. (303 − 5) · 3 = 894
         3. 520 − 331 = 189
         4. (91 + 72) · 3 = 489
         5. 639 + 79 = 718
         6. 342 + 6 = 348
         7. 642 : 2 = 321
         8. 648 : 8 = 81
         9. 462 + 188 − 18 = 632
        10. 755 − 502 = 253
        11. 77 + 854 − 27 = 904
        12. (46 − 3) · 4 = 172
      součet fb2bf557"
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
         1. 328,7 · 2 = 657,4
         2. 129,1 + 119,2 = 248,3
         3. 388,5 + 360,8 = 749,3
         4. 43,1 · 2 = 86,2
         5. 336,5 + 533,1 = 869,6
         6. 5,7 · 7 = 39,9
         7. 50,5 · 9 = 454,5
         8. 117,9 + 101,7 = 219,6
         9. 376,1 + 321,4 = 697,5
        10. 0,8 · 6 = 4,8
        11. 616,5 + 373,4 = 989,9
        12. 461,1 + 304,4 = 765,5
      součet 1dd06ddd"
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
         1. 7/10 z 130 = 91
         2. 6/8 + 1/8 = 7/8
         3. 4/5 z 465 = 372
         4. 4/5 z 235 = 188
         5. 1/2 + 1/6 = 2/3
         6. 3/5 z 105 = 63
         7. 4/6 + 1/6 = 5/6
         8. 4/5 z 310 = 248
         9. 1/2 + 1/4 = 3/4
        10. 3/8 + 2/8 = 5/8
        11. 7/10 z 510 = 357
        12. 7/8 − 5/8 = 1/4
      součet 12a4b803"
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
         1. 108 | 4/6 − 2/6   (v kruhu 4.)
         2. 1/3 | 5/8 z 704   (v kruhu 5.)
         3. 440 | 1/6 + 1/2   (v kruhu 6.)
         4. 3/5 | 9/10 z 120   (v kruhu 3.)
         5. 427 | 2/3 z 111   (v kruhu 1.)
         6. 74 | 1/2 + 1/10   (v kruhu 2.)
         7. 828 | 7/8 z 488   (v kruhu 12.)
         8. 525 | 5/8 z 360   (v kruhu 8.)
         9. 225 | 5/8 z 392   (v kruhu 9.)
        10. 1/5 | 9/10 z 920   (v kruhu 11.)
        11. 245 | 7/10 − 1/2   (v kruhu 10.)
        12. 2/3 | 7/8 z 600   (v kruhu 7.)
      součet 563c1ad2"
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
         1. 27 + 127 = 154
         2. 4 + 8 = 12
         3. 441 + 9 = 450
         4. 982 − 8 = 974
         5. 477 − 68 = 409
         6. 208 + 98 = 306
         7. 806 : 2 = 403
         8. 794 − 85 = 709
         9. 977 − 67 = 910
        10. 777 − 358 = 419
        11. 882 − 58 = 824
        12. 760 : 2 = 380
        13. 345 + 131 = 476
        14. 780 − 250 = 530
        15. 715 − 295 = 420
        16. 740 + 217 = 957
        17. 69 + 419 = 488
        18. 997 − 42 = 955
        19. 813 − 263 = 550
        20. 44 + 286 = 330
        21. 732 − 436 = 296
        22. 301 + 300 = 601
        23. 55 + 35 = 90
        24. 615 − 24 = 591
        karta 1
          420 550 90 530
          380 957 476 296
          488 591 450 306
          709 409 955 824
        karta 2
          488 957 955 476
          380 530 450 330
          420 974 12 824
          910 419 296 409
      součet 931f8d85"
    `)
  })
})
