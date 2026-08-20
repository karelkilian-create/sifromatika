/**
 * Bingo přidává dvě pravidla, obě pravidla hry: každé číslo na kartě musí jít
 * vyvolat a karty musí být navzájem různé. Většina testů tady je o nich.
 */

import { describe, expect, it } from 'vitest'
import {
  BINGO_CELLS,
  BINGO_POOL_RATIO,
  BINGO_SIDE,
  CARD_COUNT_LIMITS,
} from '../../core/constraints/index.js'
import {
  CUT_LINE_MM,
  chunkCards,
  planCardLayout,
  PRINTABLE_A4,
  PRINTER_MARGIN_RESERVE_MM,
} from '../../core/document/cards.js'
import type { Grade } from '../../core/model/index.js'
import { verifyBingoCards } from '../../core/verify/index.js'
import { bingoDocument, CARD_SIDE_MM } from './document.js'
import { defaultBingoConfig, generateBingo, sheetChecksum, type BingoSheet } from './index.js'
import { bingoModule } from './module.js'

function build(grade: Grade = 5, seed = 'bingo-1', cards = 12): BingoSheet {
  const outcome = generateBingo(defaultBingoConfig(grade, seed, cards))
  if (!outcome.ok) throw new Error(outcome.reason)
  expect(outcome.sheet.verification).toEqual({ ok: true })
  return outcome.sheet
}

describe('každé číslo na kartě musí jít vyvolat', () => {
  it.each([3, 4, 5, 6, 7, 8] as Grade[])(
    '%i. ročník: žádná karta nemá číslo mimo vyvolávací seznam',
    (grade) => {
      for (let i = 0; i < 10; i++) {
        const sheet = build(grade, `vyvolatelnost-${grade}-${i}`)
        const called = new Set(sheet.tasks.map((task) => String(task.value)))

        for (const [index, card] of sheet.cards.entries()) {
          for (const cell of card.flat()) {
            // Dítě s číslem, které učitel nikdy nepřečte, nemůže vyhrát —
            // a nepozná, že to není jeho chyba.
            expect(called.has(cell), `karta ${index + 1}, číslo ${cell}`).toBe(true)
          }
        }
      }
    },
  )

  it('kontrola je součástí verifikace, ne jen přáním generátoru', () => {
    const report = verifyBingoCards({
      cards: [
        [
          ['1', '2'],
          ['3', '99'],
        ],
      ],
      called: ['1', '2', '3'],
    })

    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures[0]?.code).toBe('uncallable-value')
  })
})

describe('karty jsou navzájem různé', () => {
  it('žádné dvě karty nejsou stejné', () => {
    for (let i = 0; i < 10; i++) {
      const sheet = build(7, `ruznost-${i}`, CARD_COUNT_LIMITS.max)
      const fingerprints = sheet.cards.map((card) => card.flat().join('|'))
      expect(new Set(fingerprints).size).toBe(fingerprints.length)
    }
  })

  it('žádná karta nemá totéž číslo dvakrát', () => {
    // Jedno škrtnutí by zabralo dvě políčka a dítě by vyhrálo dřív.
    for (let i = 0; i < 10; i++) {
      const sheet = build(5, `bez-duplicit-${i}`)
      for (const card of sheet.cards) {
        const cells = card.flat()
        expect(new Set(cells).size).toBe(cells.length)
      }
    }
  })

  it('dvě stejné karty ve verifikaci spadnou', () => {
    const card = [
      ['1', '2'],
      ['3', '4'],
    ]
    const report = verifyBingoCards({ cards: [card, card], called: ['1', '2', '3', '4'] })

    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures[0]?.code).toBe('duplicate-card')
  })

  it('totéž číslo dvakrát na jedné kartě ve verifikaci spadne', () => {
    const report = verifyBingoCards({
      cards: [
        [
          ['1', '1'],
          ['3', '4'],
        ],
      ],
      called: ['1', '3', '4'],
    })

    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures.some((failure) => failure.code === 'duplicate-card')).toBe(true)
  })
})

describe('karta a vyvolávání', () => {
  it('karta je 4 × 4, tedy šestnáct čísel', () => {
    const sheet = build()
    for (const card of sheet.cards) {
      expect(card.length).toBe(BINGO_SIDE)
      for (const row of card) expect(row.length).toBe(BINGO_SIDE)
      expect(card.flat().length).toBe(BINGO_CELLS)
    }
  })

  it('vyvolává se víc čísel, než je políček na kartě', () => {
    // Kdyby se vyvolávalo přesně šestnáct, musel by učitel přečíst úplně
    // všechno a vyhráli by všichni naráz.
    const sheet = build(7, 'zasoba')
    expect(sheet.tasks.length).toBe(Math.round(BINGO_CELLS * BINGO_POOL_RATIO))
    expect(sheet.tasks.length).toBeGreaterThan(BINGO_CELLS)
  })

  it('vyvolávací seznam není seřazený podle velikosti', () => {
    // Kdyby čísla šla od nejmenšího, děti by škrtaly odshora dolů a nic by
    // nepočítaly.
    const values = build(7, 'poradi').tasks.map((task) => task.value)
    const ascending = [...values].sort((a, b) => a - b)
    expect(values).not.toEqual(ascending)
  })

  it('dvě volání se stejným seedem dají tytéž karty', () => {
    // Kdyby míchala `toDocument`, potřebovala by generátor náhody a `.sifra`
    // uložená loni by vytiskla jiné karty.
    const first = build(5, 'determinismus')
    const second = build(5, 'determinismus')
    expect(first.cards).toEqual(second.cards)
    expect(sheetChecksum(first)).toBe(sheetChecksum(second))
  })

  it('kontrolní součet se změní, když se přeskládají karty', () => {
    const sheet = build(5, 'soucet')
    const reordered: BingoSheet = { ...sheet, cards: [...sheet.cards].reverse() }
    expect(sheetChecksum(reordered)).not.toBe(sheetChecksum(sheet))
  })
})

describe('rozvržení na papír', () => {
  it('karta 82×82 mm dá 2 sloupce a 6 karet na stránku', () => {
    // Rozměr je zvolený právě kvůli tomuhle číslu: při 88 mm vyšly čtyři karty
    // a třetina stránky zůstala prázdná.
    const layout = planCardLayout({ cardWidthMm: CARD_SIDE_MM, cardHeightMm: CARD_SIDE_MM })
    expect(layout).toEqual({ columns: 2, rows: 3, perPage: 6 })
  })

  it('mřížka se vejde do tisknutelné plochy A4 i s rezervou na tiskárnu', () => {
    const layout = planCardLayout({ cardWidthMm: CARD_SIDE_MM, cardHeightMm: CARD_SIDE_MM })!
    // Do rozpočtu patří střihový rám mřížky a rezerva na netisknutelný okraj
    // tiskárny: jmenovitá plocha A4 je větší než ta, kterou tiskárna
    // doopravdy potiskne, a tisk 20. 8. 2026 na tom přetekl.
    expect(layout.columns * CARD_SIDE_MM + CUT_LINE_MM).toBeLessThanOrEqual(PRINTABLE_A4.widthMm)
    expect(
      layout.rows * CARD_SIDE_MM + CUT_LINE_MM + PRINTER_MARGIN_RESERVE_MM,
    ).toBeLessThanOrEqual(PRINTABLE_A4.heightMm)
  })

  it('dvanáct karet jsou dva plné listy a žádná se neztratí', () => {
    const cards = Array.from({ length: 12 }, (_, i) => i)
    const pages = chunkCards(cards, 6)
    expect(pages.map((page) => page.length)).toEqual([6, 6])
    expect(pages.flat()).toEqual(cards)
  })
})

describe('dokument', () => {
  it('dvanáct karet dá dvě stránky karet plus list pro učitele', () => {
    const document = bingoDocument(build())
    expect(document.pages.map((page) => page.label)).toEqual([
      'Karty 1/2',
      'Karty 2/2',
      'Pro učitele',
    ])
  })

  it('karta je mřížka, ne text', () => {
    const document = bingoDocument(build())
    const grid = document.pages[0]!.blocks.find((block) => block.kind === 'card-grid')
    expect(grid).toBeDefined()
    if (grid?.kind !== 'card-grid') return
    for (const card of grid.cards) {
      expect('grid' in card, JSON.stringify(card)).toBe(true)
    }
  })

  it('na stránce karet nestojí nic pod mřížkou', () => {
    // Regrese po tisku 20. 8. 2026. Pod mřížkou stála patička s kontrolní
    // úsečkou, stránka vycházela na osm milimetrů rezervy a patička —
    // nedělitelná kvůli `break-inside: avoid` — odešla celá na další papír.
    // Prázdný list navíc ke každé sadě. Mřížka je teď jediný blok stránky.
    const document = bingoDocument(build())
    for (const page of document.pages.filter((p) => p.label.startsWith('Karty'))) {
      expect(page.blocks.map((block) => block.kind)).toEqual(['card-grid'])
    }
  })

  it('příklady jsou jen na učitelském listu, na kartách jsou samá čísla', () => {
    // Kdyby byl na kartě příklad, dítě si ho spočítá dopředu a ze hry zbyde
    // hledání čísla.
    const document = bingoDocument(build(8, 'jen-cisla'))
    const cardPages = document.pages.filter((page) => page.label.startsWith('Karty'))

    for (const page of cardPages) {
      expect(page.blocks.some((block) => block.kind === 'table')).toBe(false)
      for (const block of page.blocks) {
        if (block.kind !== 'card-grid') continue
        for (const card of block.cards) {
          if (!('grid' in card)) throw new Error('karta binga musí být mřížka')
          for (const cell of card.grid.flat()) {
            expect(cell, cell).toMatch(/^-?\d+(,\d+)?$/u)
          }
        }
      }
    }

    const teacher = document.pages[document.pages.length - 1]!
    expect(teacher.blocks.some((block) => block.kind === 'table')).toBe(true)
  })
})

describe('meze', () => {
  it('úzký výběr skončí hláškou, ne zmenšenou kartou', () => {
    // Šestnáct různých hodnot je tvrdé minimum — mřížka má šestnáct políček
    // a prázdné by dítě škrtlo hned. Hláška musí učiteli říct, co má změnit.
    const config = defaultBingoConfig(3, 'uzky', 12)
    config.payload.taskMix = { div: 1 }
    config.payload.difficulty = { ...config.payload.difficulty, multiplicationTables: [2] }
    const outcome = generateBingo(config)

    if (!outcome.ok) {
      expect(outcome.reason).toContain('různých výsledků')
      return
    }
    // Povedlo-li se to i tak, karta musí být plná — zmenšit se nesmí.
    for (const card of outcome.sheet.cards) expect(card.flat().length).toBe(BINGO_CELLS)
  })

  it('kratší zásoba je ústupek, ne chyba', () => {
    // Míň vyvolávaných čísel znamená kratší hru, ne rozbitou kartu.
    const config = defaultBingoConfig(3, 'kratka-zasoba', 6)
    config.payload.taskMix = { mul: 1 }
    const outcome = generateBingo(config)

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.sheet.tasks.length).toBeGreaterThanOrEqual(BINGO_CELLS)
    if (outcome.sheet.tasks.length < Math.round(BINGO_CELLS * BINGO_POOL_RATIO)) {
      expect(outcome.sheet.relaxations.some((r) => r.code === 'fewer-values')).toBe(true)
    }
  })
})

describe('témata', () => {
  function withTopics(grade: Grade, mix: Record<string, number>, seed: string): BingoSheet {
    const config = defaultBingoConfig(grade, seed, 6)
    config.payload.generatorMix = mix
    const outcome = generateBingo(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    return outcome.sheet
  }

  it.each([
    ['powers', 8, { powers: 1 }],
    ['percent', 7, { percent: 1 }],
    ['decimal', 7, { decimal: 1 }],
    ['sequence', 7, { sequence: 1 }],
    ['arithmetic', 7, { arithmetic: 1 }],
  ] as [string, Grade, Record<string, number>][])(
    'samotné téma %s dá plnou zásobu k vyvolávání',
    (id, grade, mix) => {
      for (let i = 0; i < 10; i++) {
        const sheet = withTopics(grade, mix, `plnost-${id}-${i}`)
        expect(sheet.tasks.length, `seed ${i}`).toBe(Math.round(BINGO_CELLS * BINGO_POOL_RATIO))
        expect(sheet.relaxations.some((r) => r.code === 'fewer-values')).toBe(false)
      }
    },
  )

  it('celé bingo ze samých procent', () => {
    const sheet = withTopics(7, { percent: 1 }, 'jen-procenta')
    for (const task of sheet.tasks) {
      expect(task.prompt.text, task.prompt.text).toMatch(/^\d+ % z \d+$/u)
    }
  })
})

describe('formulář → konfigurace', () => {
  const shared = {
    grade: 8 as Grade,
    title: '',
    operations: { add: true, sub: true, mul: true, div: true },
  }

  const topics = {
    cardCount: 12,
    arithmetic: false,
    sequences: false,
    decimals: false,
    percents: false,
    powers: true,
  }

  it('zaškrtnuté téma se propíše do vah, a to rovnoměrně', () => {
    const config = bingoModule.toConfig({ ...topics, arithmetic: true }, shared, 'temata-vahy')
    expect(config.payload.generatorMix).toEqual({ arithmetic: 1, powers: 1 })
  })

  it('téma, které ročník neumí, se nahradí počítáním', () => {
    const config = bingoModule.toConfig(topics, { ...shared, grade: 6 }, 'mocniny-v-sestce')
    expect(config.payload.generatorMix).toEqual({ arithmetic: 1 })
    expect(generateBingo(config).ok).toBe(true)
  })

  it('konfigurace → formulář vrátí tatáž zaškrtnutí', () => {
    const config = bingoModule.toConfig(topics, shared, 'zpet-do-formulare')
    expect(bingoModule.fromConfig(config)).toEqual(topics)
  })
})

describe('délka čísla v políčku', () => {
  /**
   * Políčko je 22 mm, písmo 14 pt tučné — vejde se do něj zhruba šest znaků.
   * Nejdelší čísla dává osmá třída (obor do 10 000).
   *
   * Mez není estetický ideál, ale pojistka: číslo, které přeteče přes linku,
   * se nedá škrtnout tak, aby bylo poznat které.
   */
  const MAX_CELL_CHARS = 6

  it.each([5, 7, 8] as Grade[])('%i. ročník: žádné číslo nepřeteče přes políčko', (grade) => {
    for (let i = 0; i < 10; i++) {
      const sheet = build(grade, `delka-${grade}-${i}`, 6)
      for (const card of sheet.cards) {
        for (const cell of card.flat()) {
          expect(cell.length, `"${cell}"`).toBeLessThanOrEqual(MAX_CELL_CHARS)
        }
      }
    }
  })
})
