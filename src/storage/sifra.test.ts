import { describe, expect, it } from 'vitest'
import type {
  CipherGridProject,
  ProjectConfig,
  SequenceSheetProject,
} from '../core/model/index.js'
import {
  defaultConfig,
  generateCipherGrid,
  sheetChecksum,
} from '../activities/cipher-grid/index.js'
import {
  generateSequenceSheet,
  sheetChecksum as sequenceChecksum,
} from '../activities/sequence-sheet/index.js'
import {
  INITIAL_EDITOR_STATE,
  fromConfig,
  toConfig,
  type EditorState,
} from '../features/editor/state.js'
import { parseSifra, serializeSifra, suggestFileName } from './sifra.js'

function sheetOf(config: ReturnType<typeof defaultConfig>) {
  const outcome = generateCipherGrid(config)
  if (!outcome.ok) throw new Error(outcome.reason)
  return outcome.sheet
}

/** Zúžení unie v testech, které pracují výhradně se šifrou. */
function asCipher(config: ProjectConfig): CipherGridProject {
  if (config.activity !== 'cipher-grid') {
    throw new Error(`Očekávána šifra, přišlo ${config.activity}`)
  }
  return config
}

describe('.sifra — uložení a načtení', () => {
  it('otevřený soubor dá bit shodný list (DoD bod 8)', () => {
    const original = sheetOf(defaultConfig('POKLAD JE U BAZÉNU', 4, 'ulozeni'))
    const text = serializeSifra(original.config, sheetChecksum(original))

    const parsed = parseSifra(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    const restored = sheetOf(asCipher(parsed.file.config))
    expect(sheetChecksum(restored)).toBe(sheetChecksum(original))
    expect(restored.table.cells).toEqual(original.table.cells)
    expect(restored.slots.map((s) => s.task.prompt.text)).toEqual(
      original.slots.map((s) => s.task.prompt.text),
    )
  })

  it('soubor neobsahuje tabulku ani příklady, jen konfiguraci', () => {
    const sheet = sheetOf(defaultConfig('CESTA DO LESA', 4, 'obsah'))
    const text = serializeSifra(sheet.config, sheetChecksum(sheet))
    const raw = JSON.parse(text) as Record<string, unknown>

    expect(Object.keys(raw).sort()).toEqual(['checksum', 'config', 'format', 'schemaVersion'])
    // Odvozený výstup se neukládá — dva zdroje pravdy by se rozešly.
    expect(text).not.toContain('isDecoy')
    expect(text).not.toContain('prompt')
    // Řádová mez, ne přesná: hlídá, že do souboru nezačal padat vygenerovaný
    // list. Roste s profilem obtížnosti (přibyla `decimals` a `percents`),
    // takže se posouvá — tabulka nebo příklady by ji přestřelily násobně.
    expect(text.length).toBeLessThan(1500)
  })

  it('projde celým kolečkem formulář → soubor → formulář', () => {
    const before = toConfig(
      {
        activity: 'cipher-grid',
        shared: {
          grade: 5,
          title: 'Lov pirátského pokladu',
          operations: { add: true, sub: false, mul: true, div: false },
        },
        byActivity: {
          'cipher-grid': {
            message: 'ZLATÝ KLÍČ',
            sequences: true,
            decimals: true,
            percents: false,
            distinctCellPerOccurrence: false,
            printTitleOnWorksheet: true,
          },
          'sequence-sheet': { taskCount: 12 },
          pexeso: {
            pairCount: 12,
            arithmetic: true,
            sequences: false,
            decimals: false,
            percents: false,
            powers: false,
          },
        },
      },
      'kolecko',
    )

    const parsed = parseSifra(serializeSifra(before, 'abc'))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    const round = fromConfig(parsed.file.config)
    const cipher = round.state.byActivity['cipher-grid']
    expect(round.seed).toBe('kolecko')
    expect(cipher.message).toBe('ZLATÝ KLÍČ')
    expect(round.state.shared.grade).toBe(5)
    expect(round.state.shared.title).toBe('Lov pirátského pokladu')
    expect(round.state.shared.operations).toEqual({ add: true, sub: false, mul: true, div: false })
    expect(cipher.sequences).toBe(true)
    expect(cipher.decimals).toBe(true)
    expect(cipher.percents).toBe(false)
    expect(cipher.distinctCellPerOccurrence).toBe(false)
    expect(cipher.printTitleOnWorksheet).toBe(true)
  })

  it('projde kolečkem i list číselných řad', () => {
    const before = toConfig(
      {
        ...INITIAL_EDITOR_STATE,
        activity: 'sequence-sheet',
        shared: {
          ...INITIAL_EDITOR_STATE.shared,
          grade: 5,
          title: 'Rozcvička na řady',
          operations: { add: true, sub: true, mul: false, div: false },
        },
        byActivity: {
          ...INITIAL_EDITOR_STATE.byActivity,
          'sequence-sheet': { taskCount: 9 },
        },
      },
      'kolecko-rady',
    )

    const parsed = parseSifra(serializeSifra(before, 'abc'))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.file.config.activity).toBe('sequence-sheet')

    const round = fromConfig(parsed.file.config)
    expect(round.seed).toBe('kolecko-rady')
    expect(round.state.activity).toBe('sequence-sheet')
    expect(round.state.shared.grade).toBe(5)
    expect(round.state.byActivity['sequence-sheet'].taskCount).toBe(9)
    expect(round.state.shared.title).toBe('Rozcvička na řady')
    expect(round.state.shared.operations).toEqual({ add: true, sub: true, mul: false, div: false })

    // A list z načtené konfigurace musí být bit shodný s původním.
    const original = generateSequenceSheet(before as SequenceSheetProject)
    const restored = generateSequenceSheet(parsed.file.config as SequenceSheetProject)
    expect(original.ok && restored.ok).toBe(true)
    if (!original.ok || !restored.ok) return
    expect(sequenceChecksum(restored.sheet)).toBe(sequenceChecksum(original.sheet))
  })

  it('přepnutí aktivity nesmaže rozdělanou tajenku', () => {
    // Učitelka si napíše tajenku, zvědavě klikne na Číselné řady a vrátí se.
    // Kdyby tam tajenka nebyla, podruhé už nikam neklikne.
    const withMessage: EditorState = {
      ...INITIAL_EDITOR_STATE,
      byActivity: {
        ...INITIAL_EDITOR_STATE.byActivity,
        'cipher-grid': { ...INITIAL_EDITOR_STATE.byActivity['cipher-grid'], message: 'ZLATÝ KLÍČ' },
      },
    }
    const switched = { ...withMessage, activity: 'sequence-sheet' as const }
    const back = { ...switched, activity: 'cipher-grid' as const }

    const config = toConfig(back, 'prepnuti')
    expect(config.activity).toBe('cipher-grid')
    expect(asCipher(config).payload.message).toBe('ZLATÝ KLÍČ')
  })

  it('odmítne soubor s neznámou aktivitou místo tichého převodu na šifru', () => {
    const parsed = parseSifra(
      '{"format":"sifromatika","schemaVersion":1,"checksum":"a","config":{"schemaVersion":1,"generatorVersion":1,"appVersion":"9.9","activity":"bingo","seed":"s","locale":"cs","payload":{"difficulty":{"grade":4},"taskMix":{"add":1},"output":{}}}}',
    )
    expect(parsed.ok).toBe(false)
  })

  it('změna generátoru se pozná podle kontrolního součtu', () => {
    const sheet = sheetOf(defaultConfig('CESTA DO LESA', 4, 'drift'))
    const text = serializeSifra(sheet.config, 'deadbeef') // součet z „jiné verze"
    const parsed = parseSifra(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(sheetChecksum(sheetOf(asCipher(parsed.file.config)))).not.toBe(parsed.file.checksum)
  })
})

describe('.sifra — nedůvěryhodný vstup', () => {
  it.each([
    ['prázdný soubor', ''],
    ['není JSON', 'to není json'],
    ['pole místo objektu', '[]'],
    ['cizí formát', '{"format":"neco-jineho","schemaVersion":1}'],
    ['budoucí verze formátu', '{"format":"sifromatika","schemaVersion":99,"checksum":"a","config":{}}'],
    ['chybí kontrolní součet', '{"format":"sifromatika","schemaVersion":1,"config":{}}'],
    ['poškozené nastavení', '{"format":"sifromatika","schemaVersion":1,"checksum":"a","config":{}}'],
    [
      'žádná povolená operace',
      '{"format":"sifromatika","schemaVersion":1,"checksum":"a","config":{"schemaVersion":1,"generatorVersion":1,"appVersion":"0.1","activity":"cipher-grid","seed":"s","locale":"cs","payload":{"message":"A","difficulty":{"grade":4},"taskMix":{},"cipher":{"strategy":"grid-coord"},"output":{}}}}',
    ],
    [
      'neznámý ročník',
      '{"format":"sifromatika","schemaVersion":1,"checksum":"a","config":{"schemaVersion":1,"generatorVersion":1,"appVersion":"0.1","activity":"cipher-grid","seed":"s","locale":"cs","payload":{"message":"A","difficulty":{"grade":42},"taskMix":{"add":1},"cipher":{"strategy":"grid-coord"},"output":{}}}}',
    ],
  ])('odmítne: %s', (_label, text) => {
    const parsed = parseSifra(text)
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.error.length).toBeGreaterThan(0)
  })

  it('minimální platný soubor se doplní rozumnými výchozími hodnotami', () => {
    const parsed = parseSifra(
      '{"format":"sifromatika","schemaVersion":1,"checksum":"a","config":{"schemaVersion":1,"generatorVersion":1,"appVersion":"0.1","activity":"cipher-grid","seed":"s","locale":"cs","payload":{"message":"AHOJ","difficulty":{"grade":4},"taskMix":{"add":1},"cipher":{"strategy":"grid-coord"},"output":{}}}}',
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(asCipher(parsed.file.config).payload.cipher.distinctCellPerOccurrence).toBe(true)
    expect(asCipher(parsed.file.config).payload.output.printTitleOnWorksheet).toBe(false)
    // Profil obtížnosti se odvodí z ročníku, ne ze souboru.
    expect(asCipher(parsed.file.config).payload.difficulty.multiplicationTables.length).toBeGreaterThan(0)
    expect(generateCipherGrid(asCipher(parsed.file.config)).ok).toBe(true)
  })

  it('soubor bez generatorMix zůstane u aritmetiky, i když přibyly další generátory', () => {
    // Tenhle soubor vznikl dřív, než existovaly číselné řady. Kdyby se mu
    // doplnil dnešní default, vytiskl by po letech jiný list — a tím padá
    // třetí bod vize („otevřu loňskou aktivitu a vytisknu ji beze změny").
    const parsed = parseSifra(
      '{"format":"sifromatika","schemaVersion":1,"checksum":"a","config":{"schemaVersion":1,"generatorVersion":1,"appVersion":"0.1","activity":"cipher-grid","seed":"s","locale":"cs","payload":{"message":"AHOJ","difficulty":{"grade":5},"taskMix":{"add":1,"sub":1,"mul":1,"div":1},"cipher":{"strategy":"grid-coord"},"output":{}}}}',
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(asCipher(parsed.file.config).payload.generatorMix).toEqual({ arithmetic: 1 })

    const outcome = generateCipherGrid(asCipher(parsed.file.config))
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.sheet.slots.every((slot) => slot.task.generatorId === 'arithmetic')).toBe(true)
  })

  it('nespadne na libovolném balastu', () => {
    for (const text of ['null', 'true', '123', '"text"', '{}', '{"format":null}']) {
      expect(() => parseSifra(text)).not.toThrow()
      expect(parseSifra(text).ok).toBe(false)
    }
  })
})

describe('suggestFileName', () => {
  it.each([
    ['Lov pirátského pokladu', 'Lov pirátského pokladu.sifra'],
    ['Vánoční stezka', 'Vánoční stezka.sifra'],
    ['a/b\\c:d*e?f"g<h>i|j', 'a b c d e f g h i j.sifra'],
    ['   ', 'sifra.sifra'],
    ['', 'sifra.sifra'],
  ])('%s → %s', (title, expected) => {
    expect(suggestFileName(title)).toBe(expected)
  })

  it('diakritiku zachová, protože je pro učitele čitelnější', () => {
    expect(suggestFileName('Žluťoučký kůň')).toContain('Žluťoučký kůň')
  })
})
