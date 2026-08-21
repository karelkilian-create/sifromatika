/**
 * Domino přidává k matematice jediné nové pravidlo, a je to pravidlo hry:
 * kameny musí tvořit **jeden souvislý kruh**. Většina testů tady je o něm.
 *
 * Kontrola různých hodnot se nedubluje s pexesem — ta je společná a testuje se
 * u něj. Tady se hlídá to, co pexeso neumí: že kruh je jeden, ne dva kroužky.
 */

import { describe, expect, it } from 'vitest'
import { TILE_COUNT_LIMITS } from '../../core/constraints/index.js'
import {
  CUT_LINE_MM,
  chunkCards,
  planCardLayout,
  PRINTABLE_A4,
  PRINTER_MARGIN_RESERVE_MM,
} from '../../core/document/cards.js'
import type { Grade } from '../../core/model/index.js'
import { verifyChain } from '../../core/verify/index.js'
import { dominoDocument, TILE_HEIGHT_MM, TILE_WIDTH_MM } from './document.js'
import { defaultDominoConfig, generateDomino, sheetChecksum, type DominoSheet } from './index.js'
import { dominoModule } from './module.js'

function build(grade: Grade = 5, seed = 'domino-1', tiles = 12): DominoSheet {
  const outcome = generateDomino(defaultDominoConfig(grade, seed, tiles))
  if (!outcome.ok) throw new Error(outcome.reason)
  expect(outcome.sheet.verification).toEqual({ ok: true })
  return outcome.sheet
}

/**
 * Obejde kruh nezávisle na verifikaci — podle `chainIndex`, ne podle hodnot.
 *
 * Vrací kameny v pořadí, ve kterém se mají složit.
 */
function chainOrder(sheet: DominoSheet) {
  return [...sheet.tiles].sort((a, b) => a.chainIndex - b.chainIndex)
}

describe('řetěz je jeden souvislý kruh', () => {
  it.each([3, 4, 5, 6, 7, 8] as Grade[])(
    '%i. ročník: zadání na kameni ukazuje na levou půlku toho dalšího',
    (grade) => {
      for (let i = 0; i < 15; i++) {
        const sheet = build(grade, `kruh-${grade}-${i}`)
        const chain = chainOrder(sheet)

        // Každý kámen navazuje na následující a poslední zpátky na první.
        // Kdyby řetěz jen „někam" vedl, dítě by se nedopočítalo domů.
        chain.forEach((tile, index) => {
          const next = chain[(index + 1) % chain.length]!
          const task = sheet.tasks.find((candidate) => candidate.prompt.text === tile.right)
          expect(task, `${grade}. ročník, kámen ${tile.right}`).toBeDefined()
          expect(String(task!.value)).toBe(next.left)
        })
      }
    },
  )

  it('každá hodnota je vlevo právě jednou', () => {
    // Podmínka kruhu, ne jen slušnosti: kdyby dvě zadání dávala 56, pasovaly
    // by na jedno místo dva kameny a řetěz by se rozvětvil.
    for (let i = 0; i < 10; i++) {
      const sheet = build(7, `unikatni-${i}`, 18)
      const lefts = sheet.tiles.map((tile) => tile.left)
      expect(new Set(lefts).size).toBe(lefts.length)
    }
  })

  it('kruh obchází všechny kameny, ne jen některé', () => {
    const sheet = build(6, 'obchuzka', 18)
    const chain = chainOrder(sheet)
    expect(chain.map((tile) => tile.chainIndex)).toEqual(chain.map((_, index) => index))
    expect(chain.length).toBe(sheet.tasks.length)
  })
})

/**
 * Verifikace je poslední pojistka před tiskem. Kdyby se generátor někdy
 * přepsal, musí to spadnout tady — ne u dítěte na koberci.
 */
describe('kontrola řetězu ve verifikaci', () => {
  it('hotové domino projde', () => {
    const sheet = build(7, 'verifikace-ok')
    expect(verifyChain(sheet.tiles.map((tile) => ({ left: tile.left, right: tile.right })))).toEqual({
      ok: true,
    })
  })

  it('dva kroužky místo jednoho kruhu neprojdou', () => {
    // Čtyři kameny, každý má souseda, každá hodnota je jednou — a přesto to
    // dítě nesloží: jsou to dva kroužky po dvou. Tuhle vadu neodhalí žádná
    // kontrola jednotlivé úlohy, protože každá je spočítaná správně.
    const report = verifyChain([
      { left: '10', right: '4 + 16' },
      { left: '20', right: '5 + 5' },
      { left: '30', right: '20 + 20' },
      { left: '40', right: '10 + 20' },
    ])

    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures[0]?.code).toBe('broken-chain')
  })

  it('přetržený řetěz neprojde', () => {
    const report = verifyChain([
      { left: '10', right: '5 + 5' },
      { left: '20', right: '50 + 50' },
    ])

    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures[0]?.code).toBe('broken-chain')
    expect(report.failures[0]?.message).toContain('nenavazuje')
  })

  it('dvě stejné hodnoty vlevo neprojdou', () => {
    const report = verifyChain([
      { left: '10', right: '5 + 5' },
      { left: '10', right: '5 + 5' },
    ])

    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures[0]?.code).toBe('broken-chain')
  })

  it('čte i číselnou řadu, když se řekne, že je to řada', () => {
    // Bez `kind` by se řada „4 10 16 22 ?" vyhodnocovala jako výraz a kontrola
    // by hlásila rozbitý řetěz na jinak správném dominu.
    const report = verifyChain([
      { left: '28', right: '10 16 22 28 ?', kind: 'sequence' },
      { left: '34', right: '4 10 16 22 ?', kind: 'sequence' },
    ])
    expect(report).toEqual({ ok: true })
  })
})

describe('kameny', () => {
  it('jsou zamíchané — pořadí tisku není pořadí řetězu', () => {
    // Bez zamíchání by stačilo kameny rozstříhat a domino by bylo složené
    // ještě před rozdáním.
    //
    // Měří se přes víc seedů a s volnějším stropem, než by odpovídalo jednomu
    // listu: kamenů, které náhoda nechá na svém místě, je v zamíchané
    // osmnáctce průměrně jeden, ale tři nejsou nic zvláštního. Test s pevným
    // stropem u jediného seedu proto padal po každém posunu
    // `GENERATOR_VERSION`, aniž by se na míchání cokoli změnilo.
    for (const seed of ['michani', 'michani-2', 'michani-3', 'michani-4', 'michani-5']) {
      const sheet = build(5, seed, 18)
      const inOrder = sheet.tiles.filter((tile, index) => tile.chainIndex === index)
      expect(inOrder.length, seed).toBeLessThan(sheet.tiles.length / 3)
    }
  })

  it('zamíchání je součástí listu, ne sazby — dvě volání dají totéž', () => {
    // Kdyby míchala `toDocument`, potřebovala by generátor náhody a `.sifra`
    // uložená loni by vytiskla jiné kameny.
    const first = build(5, 'determinismus')
    const second = build(5, 'determinismus')
    expect(first.tiles).toEqual(second.tiles)
    expect(sheetChecksum(first)).toBe(sheetChecksum(second))
  })

  it('kontrolní součet se změní, když se přeskládá pořadí kamenů', () => {
    // Zamíchání je součást toho, co učitel dostane na papíře. Kdyby ho součet
    // nezahrnul, otevřený soubor by tvrdil, že sedí, a vytiskl jiné listy.
    const sheet = build(5, 'soucet')
    const reordered: DominoSheet = { ...sheet, tiles: [...sheet.tiles].reverse() }
    expect(sheetChecksum(reordered)).not.toBe(sheetChecksum(sheet))
  })
})

describe('rozvržení na papír', () => {
  it('kámen 84×42 mm dá 2 sloupce a 12 kamenů na stránku', () => {
    // Dvanáct kamenů je pak přesně jeden list — učitel zkopíruje jednu
    // stránku na skupinu a je hotov.
    const layout = planCardLayout({ cardWidthMm: TILE_WIDTH_MM, cardHeightMm: TILE_HEIGHT_MM })
    expect(layout).toEqual({ columns: 2, rows: 6, perPage: 12 })
  })

  it('mřížka se vejde do tisknutelné plochy A4 i s rezervou na tiskárnu', () => {
    const layout = planCardLayout({ cardWidthMm: TILE_WIDTH_MM, cardHeightMm: TILE_HEIGHT_MM })!
    // Do rozpočtu patří střihový rám mřížky a rezerva na netisknutelný okraj
    // tiskárny: jmenovitá plocha A4 je větší než ta, kterou tiskárna
    // doopravdy potiskne, a tisk 20. 8. 2026 na tom přetekl.
    expect(layout.columns * TILE_WIDTH_MM + CUT_LINE_MM).toBeLessThanOrEqual(PRINTABLE_A4.widthMm)
    expect(
      layout.rows * TILE_HEIGHT_MM + CUT_LINE_MM + PRINTER_MARGIN_RESERVE_MM,
    ).toBeLessThanOrEqual(PRINTABLE_A4.heightMm)
  })

  it('osmnáct kamenů se rozdělí na dvě stránky a žádný se neztratí', () => {
    const tiles = Array.from({ length: 18 }, (_, i) => i)
    const pages = chunkCards(tiles, 12)
    expect(pages.map((page) => page.length)).toEqual([12, 6])
    expect(pages.flat()).toEqual(tiles)
  })
})

describe('dokument', () => {
  it('12 kamenů je jedna stránka plus list pro učitele', () => {
    const document = dominoDocument(build())
    expect(document.pages.map((page) => page.label)).toEqual(['Kameny', 'Pro učitele'])
  })

  it('kámen má dvě půlky, ne jeden text', () => {
    const document = dominoDocument(build())
    const grid = document.pages[0]!.blocks.find((block) => block.kind === 'card-grid')
    expect(grid).toBeDefined()
    if (grid?.kind !== 'card-grid') return
    for (const card of grid.cards) {
      expect('left' in card, JSON.stringify(card)).toBe(true)
    }
  })

  it('na stránce kamenů nestojí nic pod mřížkou', () => {
    // Regrese po tisku 20. 8. 2026. Pod mřížkou stála patička s kontrolní
    // úsečkou, stránka vycházela na osm milimetrů rezervy a patička —
    // nedělitelná kvůli `break-inside: avoid` — odešla celá na další papír.
    // Prázdný list navíc ke každé sadě. Mřížka je teď jediný blok stránky.
    const document = dominoDocument(build(7, 'paticka', 18))
    for (const page of document.pages.filter((p) => p.label.startsWith('Kameny'))) {
      expect(page.blocks.map((block) => block.kind)).toEqual(['card-grid'])
    }
  })

  it('učitelská tabulka se čte shora dolů: výsledek řádku je zadáním toho dalšího', () => {
    // To je celý smysl toho listu — učitel zkontroluje pořadí, aniž by domino
    // skládal. Kdyby tabulka navazovala pozpátku, četl by ji naruby.
    const sheet = build(7, 'ucitelska-tabulka')
    const document = dominoDocument(sheet)
    const teacher = document.pages[document.pages.length - 1]!
    const table = teacher.blocks.find((block) => block.kind === 'table')
    expect(table).toBeDefined()
    if (table?.kind !== 'table') return

    expect(table.columns).toEqual(['Č.', 'Výsledek', 'Zadání'])
    expect(table.rows.length).toBe(sheet.tasks.length)
    table.rows.forEach((row, index) => {
      const nextRow = table.rows[(index + 1) % table.rows.length]!
      const task = sheet.tasks.find((candidate) => candidate.prompt.text === row[2])!
      expect(String(task.value)).toBe(nextRow[1])
    })
  })

  it('pořadí řetězu je jen na učitelském listu', () => {
    // Na kamenech pořadí být nesmí — kdyby šlo vyčíst z papíru, domino by bylo
    // složené dřív, než se rozdá.
    const document = dominoDocument(build())
    const tilePages = document.pages.filter((page) => page.label.startsWith('Kameny'))
    for (const page of tilePages) {
      expect(page.blocks.some((block) => block.kind === 'table')).toBe(false)
    }
  })
})

describe('meze', () => {
  it('když nejde sestavit dost různých výsledků, řekne se to', () => {
    // Třeťák se zaškrtnutým jen násobením: malá násobilka nenabídne osmnáct
    // různých výsledků. Domino vzniknout smí, ale s poznámkou — mlčky zkrátit
    // řetěz nejde, počet kamenů je to, co učitel zadal.
    const config = defaultDominoConfig(3, 'uzky', TILE_COUNT_LIMITS.max)
    config.payload.taskMix = { mul: 1 }
    const outcome = generateDomino(config)

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    if (outcome.sheet.tiles.length < TILE_COUNT_LIMITS.max) {
      expect(outcome.sheet.relaxations.some((r) => r.code === 'fewer-tiles')).toBe(true)
    }
    // I zkrácené domino musí být celý kruh, ne torzo.
    expect(outcome.sheet.tiles.length).toBe(outcome.sheet.tasks.length)
    expect(outcome.sheet.verification).toEqual({ ok: true })
  })
})

describe('témata', () => {
  function withTopics(grade: Grade, mix: Record<string, number>, seed: string): DominoSheet {
    const config = defaultDominoConfig(grade, seed, 12)
    config.payload.generatorMix = mix
    const outcome = generateDomino(config)
    if (!outcome.ok) throw new Error(outcome.reason)
    expect(outcome.sheet.verification).toEqual({ ok: true })
    return outcome.sheet
  }

  it('celé domino ze samých mocnin', () => {
    for (let i = 0; i < 10; i++) {
      const sheet = withTopics(8, { powers: 1 }, `jen-mocniny-${i}`)
      for (const task of sheet.tasks) {
        expect(task.generatorId, task.prompt.text).toBe('powers')
        expect(task.prompt.text).toMatch(/[²³√]/u)
      }
    }
  })

  it('celé domino ze samých procent', () => {
    for (let i = 0; i < 10; i++) {
      const sheet = withTopics(7, { percent: 1 }, `jen-procenta-${i}`)
      for (const task of sheet.tasks) {
        expect(task.prompt.text, task.prompt.text).toMatch(/^\d+ % z \d+$/u)
      }
    }
  })

  // Kdyby některé téma na dvanáct kamenů nestačilo, učitel to pozná až
  // u kopírky — proto se to měří tady, ne až na papíře.
  it.each([
    ['powers', 8, { powers: 1 }],
    ['percent', 7, { percent: 1 }],
    ['decimal', 7, { decimal: 1 }],
    ['sequence', 7, { sequence: 1 }],
    ['arithmetic', 7, { arithmetic: 1 }],
  ] as [string, Grade, Record<string, number>][])(
    'samotné téma %s dá plných dvanáct kamenů',
    (id, grade, mix) => {
      for (let i = 0; i < 10; i++) {
        const sheet = withTopics(grade, mix, `plnost-${id}-${i}`)
        expect(sheet.tiles.length, `seed ${i}`).toBe(12)
        expect(sheet.relaxations.some((r) => r.code === 'fewer-tiles')).toBe(false)
      }
    },
  )

  it('řady se do kruhu zřetězí stejně jako výrazy', () => {
    // Zadání na kameni je pak „864 875 886 897 ?" a verifikace ho musí číst
    // jako řadu, ne jako výraz — jinak by na správném dominu hlásila vadu.
    const sheet = withTopics(7, { sequence: 1 }, 'rady-v-kruhu')
    expect(sheet.tasks.every((task) => task.prompt.kind === 'sequence')).toBe(true)
    expect(sheet.verification).toEqual({ ok: true })
  })
})

describe('formulář → konfigurace', () => {
  const shared = {
    grade: 8 as Grade,
    title: '',
    operations: { add: true, sub: true, mul: true, div: true },
  }

  const topics = {
    tileCount: 12,
    arithmetic: false,
    sequences: false,
    decimals: false,
    percents: false,
    powers: true,
  }

  it('zaškrtnuté téma se propíše do vah, a to rovnoměrně', () => {
    const config = dominoModule.toConfig({ ...topics, arithmetic: true }, shared, 'temata-vahy')
    expect(config.payload.generatorMix).toEqual({ arithmetic: 1, powers: 1 })
  })

  it('téma, které ročník neumí, se nahradí počítáním', () => {
    const config = dominoModule.toConfig(topics, { ...shared, grade: 6 }, 'mocniny-v-sestce')
    expect(config.payload.generatorMix).toEqual({ arithmetic: 1 })
    expect(generateDomino(config).ok).toBe(true)
  })

  it('konfigurace → formulář vrátí tatáž zaškrtnutí', () => {
    const config = dominoModule.toConfig(topics, shared, 'zpet-do-formulare')
    expect(dominoModule.fromConfig(config)).toEqual(topics)
  })

  it('soubor bez volby témat se otevře jako samotné počítání', () => {
    const config = defaultDominoConfig(8, 'stary-soubor', 12)
    expect(dominoModule.fromConfig(config)).toEqual({
      tileCount: 12,
      arithmetic: true,
      sequences: false,
      decimals: false,
      percents: false,
      powers: false,
    })
  })
})

describe('délka textu na půlce kamene', () => {
  /**
   * Půlka kamene je 42 mm se 2mm okrajem, písmo 16 pt tučné — na řádek se
   * vejde zhruba 12 znaků a do výšky tři řádky.
   *
   * Naměřeno při zavedení domina (18. 8. 2026), nejdelší půlka:
   *   mocniny 9 („79 − √256“), procenta 11, desetinná 15,
   *   řady 17 („864 875 886 897 ?“), počítání v 8. třídě 17 („(1627 + 1174) · 3“).
   *
   * Mez je s rezervou nad tím a odpovídá pexesové (30 znaků na 60mm kartičce)
   * přepočtené na užší půlku. Není to estetický ideál, ale pojistka proti
   * generátoru, který by jednou začal sázet romány — u kartiček je papír
   * jediný soudce a ten se ozve až po rozstříhání.
   */
  const MAX_HALF_CHARS = 24

  it.each([
    ['powers', 8, { powers: 1 }],
    ['percent', 7, { percent: 1 }],
    ['decimal', 7, { decimal: 1 }],
    ['sequence', 7, { sequence: 1 }],
    ['arithmetic', 8, { arithmetic: 1 }],
  ] as [string, Grade, Record<string, number>][])(
    '%s: žádná půlka nepřeteče přes dělicí čáru',
    (id, grade, mix) => {
      for (let i = 0; i < 15; i++) {
        const config = defaultDominoConfig(grade, `delka-${id}-${i}`, 12)
        config.payload.generatorMix = mix
        const outcome = generateDomino(config)
        expect(outcome.ok).toBe(true)
        if (!outcome.ok) continue
        for (const tile of outcome.sheet.tiles) {
          expect(tile.left.length, `"${tile.left}"`).toBeLessThanOrEqual(MAX_HALF_CHARS)
          expect(tile.right.length, `"${tile.right}"`).toBeLessThanOrEqual(MAX_HALF_CHARS)
        }
      }
    },
  )
})
