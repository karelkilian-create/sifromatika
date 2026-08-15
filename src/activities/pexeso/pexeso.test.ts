/**
 * Pexeso přidává k matematice jediné nové pravidlo — a je to pravidlo hry,
 * ne počítání: hodnoty musí být navzájem různé. Většina testů tady je o něm.
 */

import { describe, expect, it } from 'vitest'
import {
  chunkCards,
  planCardLayout,
  PRINTABLE_A4,
  SCALE_CHECK_HEIGHT_MM,
} from '../../core/document/cards.js'
import type { Grade } from '../../core/model/index.js'
import { verifyDistinctValues } from '../../core/verify/index.js'
import { CARD_HEIGHT_MM, CARD_WIDTH_MM, pexesoDocument } from './document.js'
import { defaultPexesoConfig, generatePexeso, sheetChecksum, type PexesoSheet } from './index.js'

function build(grade: Grade = 5, seed = 'pexeso-1', pairs = 12): PexesoSheet {
  const outcome = generatePexeso(defaultPexesoConfig(grade, seed, pairs))
  if (!outcome.ok) throw new Error(outcome.reason)
  expect(outcome.sheet.verification).toEqual({ ok: true })
  return outcome.sheet
}

describe('párování musí být jednoznačné', () => {
  it.each([3, 4, 5, 6, 7, 8] as Grade[])('%i. ročník: žádné dvě úlohy nemají týž výsledek', (grade) => {
    for (let i = 0; i < 15; i++) {
      const sheet = build(grade, `jednoznacnost-${grade}-${i}`)
      const values = sheet.tasks.map((task) => task.value)
      expect(new Set(values).size, `${grade}. ročník, seed ${i}: ${values.join(', ')}`).toBe(
        values.length,
      )
    }
  })

  it('kontrola duplicity je součástí verifikace, ne jen přáním generátoru', () => {
    // Kdyby se hodnoty omylem zopakovaly, list se NESMÍ vytisknout. Tenhle
    // test hlídá, že kontrola existuje a hlásí správný kód — bez něj by dítě
    // spárovalo špatně a mělo pravdu.
    const sheet = build()
    const doubled = [...sheet.tasks, sheet.tasks[0]!]
    const report = verifyDistinctValues(doubled)

    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures[0]?.code).toBe('ambiguous-pairing')
  })
})

describe('kartičky', () => {
  it('ke každé dvojici jsou právě dvě kartičky: zadání a výsledek', () => {
    const sheet = build()
    expect(sheet.cards.length).toBe(sheet.tasks.length * 2)

    sheet.tasks.forEach((task, pairIndex) => {
      const pair = sheet.cards.filter((card) => card.pairIndex === pairIndex)
      expect(pair.length).toBe(2)
      expect(pair.map((card) => card.kind).sort()).toEqual(['prompt', 'value'])
      expect(pair.find((card) => card.kind === 'prompt')?.text).toBe(task.prompt.text)
      expect(pair.find((card) => card.kind === 'value')?.text).toBe(String(task.value))
    })
  })

  it('jsou zamíchané — zadání a výsledek neleží vedle sebe', () => {
    // Bez zamíchání by stačilo kartičky rozstříhat a dvojice by zůstaly
    // v pořadí, takže by hra byla vyřešená ještě před rozdáním.
    const sheet = build(5, 'michani', 18)
    const adjacent = sheet.cards.filter(
      (card, index) => index > 0 && sheet.cards[index - 1]!.pairIndex === card.pairIndex,
    )
    expect(adjacent.length).toBeLessThan(3)
  })

  it('zamíchání je součástí listu, ne sazby — dvě volání dají totéž', () => {
    // Kdyby míchala `toDocument`, potřebovala by generátor náhody a `.sifra`
    // uložená loni by vytiskla jiné kartičky.
    const first = build(5, 'determinismus')
    const second = build(5, 'determinismus')
    expect(first.cards).toEqual(second.cards)
    expect(sheetChecksum(first)).toBe(sheetChecksum(second))
  })
})

describe('rozvržení na papír', () => {
  it('kartička 60×60 mm dá 3 sloupce a 12 kartiček na stránku', () => {
    const layout = planCardLayout({ cardWidthMm: CARD_WIDTH_MM, cardHeightMm: CARD_HEIGHT_MM })
    expect(layout).toEqual({ columns: 3, rows: 4, perPage: 12 })
  })

  it('mřížka i s patičkou se vejde do tisknutelné plochy A4', () => {
    const layout = planCardLayout({ cardWidthMm: CARD_WIDTH_MM, cardHeightMm: CARD_HEIGHT_MM })!
    // Kdyby přetekla, poslední řada by skončila mimo papír — a to je vada,
    // kterou odhalí až nůžky. Patička s kontrolní úsečkou se musí počítat
    // taky: je na každé stránce kartiček.
    expect(layout.columns * CARD_WIDTH_MM).toBeLessThanOrEqual(PRINTABLE_A4.widthMm)
    expect(layout.rows * CARD_HEIGHT_MM + SCALE_CHECK_HEIGHT_MM).toBeLessThanOrEqual(
      PRINTABLE_A4.heightMm,
    )
  })

  it('kartička větší než papír se nezmenší, ale odmítne', () => {
    // Velikost kartičky je to, co dítě dostane do ruky. Tiché zmenšení by
    // z pexesa udělalo konfety.
    expect(planCardLayout({ cardWidthMm: 250, cardHeightMm: 60 })).toBeNull()
  })

  it('poslední stránka smí být neúplná, žádná kartička se neztratí', () => {
    const cards = Array.from({ length: 26 }, (_, i) => i)
    const pages = chunkCards(cards, 12)
    expect(pages.map((page) => page.length)).toEqual([12, 12, 2])
    expect(pages.flat()).toEqual(cards)
  })
})

describe('dokument', () => {
  it('12 dvojic = 24 kartiček na dvou stránkách plus seznam pro učitele', () => {
    const document = pexesoDocument(build())
    expect(document.pages.map((page) => page.label)).toEqual([
      'Kartičky 1/2',
      'Kartičky 2/2',
      'Pro učitele',
    ])
  })

  it('každá stránka kartiček nese kontrolní úsečku', () => {
    // Měřítko se může mezi stránkami lišit, když se tisknou na dvakrát.
    const document = pexesoDocument(build())
    for (const page of document.pages.filter((p) => p.label.startsWith('Kartičky'))) {
      expect(page.blocks.some((block) => block.kind === 'print-scale-check')).toBe(true)
    }
  })

  it('výsledky jsou jen na učitelské stránce', () => {
    const sheet = build()
    const document = pexesoDocument(sheet)
    const cardPages = document.pages.filter((page) => page.label.startsWith('Kartičky'))

    // Na kartičkách výsledky pochopitelně jsou — bez nich by nebylo co párovat.
    // Nesmí tam ale být tabulka, která je páruje se zadáním.
    for (const page of cardPages) {
      expect(page.blocks.some((block) => block.kind === 'table')).toBe(false)
    }
    const teacher = document.pages[document.pages.length - 1]!
    expect(teacher.blocks.some((block) => block.kind === 'table')).toBe(true)
  })
})

describe('meze', () => {
  it('když nejde sestavit dost různých výsledků, řekne se to', () => {
    // Třeťák se zaškrtnutým jen násobením: malá násobilka nenabídne osmnáct
    // různých výsledků. List vzniknout smí, ale s poznámkou.
    const config = defaultPexesoConfig(3, 'uzky', 18)
    config.payload.taskMix = { mul: 1 }
    const outcome = generatePexeso(config)

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    if (outcome.sheet.tasks.length < 18) {
      expect(outcome.sheet.relaxations.some((r) => r.code === 'fewer-pairs')).toBe(true)
    }
    expect(new Set(outcome.sheet.tasks.map((t) => t.value)).size).toBe(outcome.sheet.tasks.length)
  })
})
