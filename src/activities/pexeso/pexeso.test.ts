/**
 * Pexeso přidává k matematice jediné nové pravidlo — a je to pravidlo hry,
 * ne počítání: hodnoty musí být navzájem různé. Většina testů tady je o něm.
 */

import { describe, expect, it } from 'vitest'
import {
  CUT_LINE_MM,
  chunkCards,
  planCardLayout,
  PRINTABLE_A4,
  PRINTER_MARGIN_RESERVE_MM,
} from '../../core/document/cards.js'
import type { Grade } from '../../core/model/index.js'
import { verifyDistinctValues } from '../../core/verify/index.js'
import { CARD_HEIGHT_MM, CARD_WIDTH_MM, pexesoDocument } from './document.js'
import { defaultPexesoConfig, generatePexeso, sheetChecksum, type PexesoSheet } from './index.js'
import { pexesoModule } from './module.js'

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
    // Mez je statistická, ne přesná: ze 36 kartiček vyjde v dobře zamíchaném
    // balíčku průměrně jedno takové sousedství a tři nejsou nic zvláštního.
    // Do verze 8 tu stály dvě a stačil inkrement `GENERATOR_VERSION`, aby
    // test spadl na zamíchání, které bylo v pořádku. Nemíchaný balíček by
    // jich měl osmnáct, takže i tahle mez ho pozná.
    expect(adjacent.length).toBeLessThan(5)
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

  it('mřížka se vejde do tisknutelné plochy A4 i s rezervou na tiskárnu', () => {
    const layout = planCardLayout({ cardWidthMm: CARD_WIDTH_MM, cardHeightMm: CARD_HEIGHT_MM })!
    // Kdyby přetekla, poslední řada by skončila mimo papír — a to je vada,
    // kterou odhalí až nůžky. Do rozpočtu patří střihový rám mřížky a rezerva
    // na netisknutelný okraj tiskárny: jmenovitá plocha A4 je větší než ta,
    // kterou tiskárna doopravdy potiskne, a tisk 20. 8. 2026 na tom přetekl.
    expect(layout.columns * CARD_WIDTH_MM + CUT_LINE_MM).toBeLessThanOrEqual(PRINTABLE_A4.widthMm)
    expect(
      layout.rows * CARD_HEIGHT_MM + CUT_LINE_MM + PRINTER_MARGIN_RESERVE_MM,
    ).toBeLessThanOrEqual(PRINTABLE_A4.heightMm)
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

  it('na stránce kartiček nestojí nic pod mřížkou', () => {
    // Regrese po tisku 20. 8. 2026. Pod mřížkou stála patička s kontrolní
    // úsečkou, stránka vycházela na osm milimetrů rezervy a patička —
    // nedělitelná kvůli `break-inside: avoid` — odešla celá na další papír.
    // Prázdný list navíc ke každé sadě. Mřížka je teď jediný blok stránky.
    const document = pexesoDocument(build())
    for (const page of document.pages.filter((p) => p.label.startsWith('Kartičky'))) {
      expect(page.blocks.map((block) => block.kind)).toEqual(['card-grid'])
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

/**
 * Volba tématu — to, kvůli čemu celá změna vznikla. Učitel musí umět složit
 * pexeso ze samých mocnin nebo samých procent, ne jen zpestřit počítání.
 */
describe('témata', () => {
  function withTopics(
    grade: Grade,
    mix: Record<string, number>,
    seed: string,
    pairs = 12,
  ): PexesoSheet {
    const config = defaultPexesoConfig(grade, seed, pairs)
    config.payload.generatorMix = mix
    const outcome = generatePexeso(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    return outcome.sheet
  }

  it('celé pexeso ze samých mocnin — každá kartička nese ² ³ nebo √', () => {
    for (let i = 0; i < 10; i++) {
      const sheet = withTopics(8, { powers: 1 }, `jen-mocniny-${i}`)
      for (const task of sheet.tasks) {
        expect(task.generatorId, task.prompt.text).toBe('powers')
        expect(task.prompt.text).toMatch(/[²³√]/u)
      }
    }
  })

  it('celé pexeso ze samých procent', () => {
    for (let i = 0; i < 10; i++) {
      const sheet = withTopics(7, { percent: 1 }, `jen-procenta-${i}`)
      for (const task of sheet.tasks) {
        expect(task.prompt.text, task.prompt.text).toMatch(/^\d+ % z \d+$/u)
      }
    }
  })

  // Kolik dvojic z jednoho tématu spolehlivě vyjde. Kdyby některé téma na
  // dvanáct dvojic nestačilo, učitel to pozná až u kopírky — proto se to měří
  // tady, ne až na papíře.
  it.each([
    ['powers', 8, { powers: 1 }],
    ['percent', 7, { percent: 1 }],
    ['decimal', 7, { decimal: 1 }],
    ['sequence', 7, { sequence: 1 }],
    ['arithmetic', 7, { arithmetic: 1 }],
  ] as [string, Grade, Record<string, number>][])(
    'samotné téma %s dá plných dvanáct dvojic',
    (_id, grade, mix) => {
      for (let i = 0; i < 10; i++) {
        const sheet = withTopics(grade, mix, `plnost-${_id}-${i}`)
        expect(sheet.tasks.length, `seed ${i}`).toBe(12)
        expect(sheet.relaxations.some((r) => r.code === 'fewer-pairs')).toBe(false)
      }
    },
  )

  it('desetinné téma dá i desetinný výsledek, ne jen desetinné zadání', () => {
    // Do `GENERATOR_VERSION` 5 vyšlo `3,5 · 4 = 14`, ale nikdy `= 2,5`:
    // pravidlo šifry o celém výsledku platilo plošně. Kdyby se to vrátilo,
    // pozná se to tady, ne až na kartičkách.
    let decimalResults = 0
    for (let i = 0; i < 10; i++) {
      const sheet = withTopics(6, { decimal: 1 }, `desetinne-vysledky-${i}`)
      decimalResults += sheet.tasks.filter((task) => !Number.isInteger(task.value)).length
    }
    expect(decimalResults).toBeGreaterThan(0)
  })

  it('výsledek na kartičce nemá víc než jedno desetinné místo', () => {
    for (let i = 0; i < 10; i++) {
      const sheet = withTopics(7, { decimal: 1 }, `jedno-misto-${i}`)
      for (const task of sheet.tasks) {
        const places = Math.abs(task.value * 10 - Math.round(task.value * 10))
        expect(places, `${task.prompt.text} = ${task.value}`).toBeLessThan(1e-9)
      }
    }
  })

  it('míchání dvou témat sype obojí', () => {
    const generators = new Set<string>()
    for (let i = 0; i < 10; i++) {
      const sheet = withTopics(8, { arithmetic: 1, powers: 1 }, `mix-${i}`)
      for (const task of sheet.tasks) generators.add(task.generatorId)
    }
    expect(generators.has('arithmetic')).toBe(true)
    expect(generators.has('powers')).toBe(true)
  })

  it('bez zaškrtnutých mocnin se generátor `powers` nepoužije', () => {
    for (let i = 0; i < 10; i++) {
      const sheet = withTopics(8, { arithmetic: 1 }, `bez-mocnin-${i}`)
      for (const task of sheet.tasks) expect(task.generatorId).toBe('arithmetic')
    }
  })

  /**
   * ⚠ Zaškrtávátko „Mocniny a odmocniny" mocniny PŘIDÁVÁ, ale nevypíná.
   *
   * Aritmetika osmého ročníku má mocninné tvary v sobě od commitu 791c1ac a
   * losuje si je z jednoho pytle se zbytkem (`POWER_SHAPES` v `tasks/shapes.ts`).
   * Vyjmout je odtamtud by změnilo obsah šifer, které už někdo má uložené —
   * proto tenhle test popisuje dnešní stav, ne ideál. Kdyby se chování mělo
   * změnit, změní se s ním i tenhle test a `GENERATOR_VERSION`.
   */
  it('počítání v osmé třídě samo o sobě mocniny občas nabídne', () => {
    let withPower = 0
    for (let i = 0; i < 20; i++) {
      const sheet = withTopics(8, { arithmetic: 1 }, `aritmetika-mocniny-${i}`)
      withPower += sheet.tasks.filter((task) => /[²³√]/u.test(task.prompt.text)).length
    }
    expect(withPower).toBeGreaterThan(0)
  })
})

describe('formulář → konfigurace', () => {
  const shared = {
    grade: 8 as Grade,
    title: '',
    operations: { add: true, sub: true, mul: true, div: true },
  }

  const topics = {
    pairCount: 12,
    arithmetic: false,
    sequences: false,
    decimals: false,
    percents: false,
    powers: true,
    fractions: false,
  }

  it('zaškrtnuté téma se propíše do vah, a to rovnoměrně', () => {
    const config = pexesoModule.toConfig(
      { ...topics, arithmetic: true },
      shared,
      'temata-vahy',
    )
    expect(config.payload.generatorMix).toEqual({ arithmetic: 1, powers: 1 })
  })

  it('samotné mocniny znamenají, že počítání v mixu není', () => {
    const config = pexesoModule.toConfig(topics, shared, 'jen-mocniny-mix')
    expect(config.payload.generatorMix).toEqual({ powers: 1 })
  })

  // Bez téhle pojistky by osmák s mocninami přepnutý na šestou třídu dostal
  // místo pexesa hlášku, že pro tuhle obtížnost není žádný generátor.
  it('téma, které ročník neumí, se nahradí počítáním', () => {
    const config = pexesoModule.toConfig(topics, { ...shared, grade: 6 }, 'mocniny-v-sestce')
    expect(config.payload.generatorMix).toEqual({ arithmetic: 1 })

    const outcome = generatePexeso(config)
    expect(outcome.ok).toBe(true)
  })

  // Pátá třída desetinná čísla nemá od 21. 8. 2026 — a zaškrtnutí, které
  // z formuláře zmizelo, se nesmí propsat do konfigurace. Jinak by učitelka
  // po přepnutí ročníku dostala list s `3,5 · 4`, aniž by měla čím to vypnout.
  it('pátá třída desetinná čísla nedostane, ani když v nastavení zůstala', () => {
    const decimalsOnly = { ...topics, powers: false, decimals: true }
    const patka = pexesoModule.toConfig(decimalsOnly, { ...shared, grade: 5 }, 'desetiny-v-patce')
    expect(patka.payload.generatorMix).toEqual({ arithmetic: 1 })

    const sestka = pexesoModule.toConfig(decimalsOnly, { ...shared, grade: 6 }, 'desetiny-v-sestce')
    expect(sestka.payload.generatorMix).toEqual({ decimal: 1 })
  })

  it('konfigurace → formulář vrátí tatáž zaškrtnutí', () => {
    const config = pexesoModule.toConfig(topics, shared, 'zpet-do-formulare')
    expect(pexesoModule.fromConfig(config)).toEqual(topics)
  })

  it('soubor bez volby témat se otevře jako samotné počítání', () => {
    const config = defaultPexesoConfig(8, 'stary-soubor', 12)
    expect(pexesoModule.fromConfig(config)).toEqual({
      pairCount: 12,
      arithmetic: true,
      sequences: false,
      decimals: false,
      percents: false,
      powers: false,
      fractions: false,
    })
  })
})

describe('délka textu na kartičce', () => {
  /**
   * Kartička je 60 mm se 3mm okrajem, písmo 20 pt tučné — na řádek se vejde
   * zhruba 12 znaků a do výšky tři řádky. Delší text se zalomí, což je v
   * pořádku, ale nekonečně dlouhý přeteče přes linku, po které se stříhá.
   *
   * Naměřeno při zavedení volby témat (16. 8. 2026), nejdelší kartička:
   *   mocniny 10 („428 − √361“), procenta 11, desetinná 15,
   *   počítání v 8. třídě 16 („(726 + 3499) · 2“), řady 18 („1000 ? 986 979 972“).
   *
   * Mez je s rezervou nad tím. Není to estetický ideál, ale pojistka proti
   * generátoru, který by jednou začal sázet romány — u kartiček je papír
   * jediný soudce a ten se ozve až po rozstříhání.
   */
  const MAX_CARD_CHARS = 30

  it.each([
    ['powers', 8, { powers: 1 }],
    ['percent', 7, { percent: 1 }],
    ['decimal', 7, { decimal: 1 }],
    ['sequence', 7, { sequence: 1 }],
    ['arithmetic', 8, { arithmetic: 1 }],
  ] as [string, Grade, Record<string, number>][])(
    '%s: žádná kartička nepřeteče přes linku',
    (_id, grade, mix) => {
      for (let i = 0; i < 15; i++) {
        const config = defaultPexesoConfig(grade, `delka-${_id}-${i}`, 12)
        config.payload.generatorMix = mix
        const outcome = generatePexeso(config)
        expect(outcome.ok).toBe(true)
        if (!outcome.ok) continue
        for (const card of outcome.sheet.cards) {
          expect(card.text.length, `"${card.text}"`).toBeLessThanOrEqual(MAX_CARD_CHARS)
        }
      }
    },
  )
})
