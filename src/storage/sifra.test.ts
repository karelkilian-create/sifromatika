import { describe, expect, it } from 'vitest'
import {
  defaultConfig,
  generateCipherGrid,
  sheetChecksum,
} from '../activities/cipher-grid/index.js'
import { fromConfig, toConfig } from '../features/editor/state.js'
import { parseSifra, serializeSifra, suggestFileName } from './sifra.js'

function sheetOf(config: ReturnType<typeof defaultConfig>) {
  const outcome = generateCipherGrid(config)
  if (!outcome.ok) throw new Error(outcome.reason)
  return outcome.sheet
}

describe('.sifra — uložení a načtení', () => {
  it('otevřený soubor dá bit shodný list (DoD bod 8)', () => {
    const original = sheetOf(defaultConfig('POKLAD JE U BAZÉNU', 4, 'ulozeni'))
    const text = serializeSifra(original.config, sheetChecksum(original))

    const parsed = parseSifra(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    const restored = sheetOf(parsed.file.config)
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
    expect(text.length).toBeLessThan(1200)
  })

  it('projde celým kolečkem formulář → soubor → formulář', () => {
    const before = { ...toConfig({
      message: 'ZLATÝ KLÍČ',
      grade: 5,
      title: 'Lov pirátského pokladu',
      operations: { add: true, sub: false, mul: true, div: false },
      decoyDensity: 0.5,
      distinctCellPerOccurrence: false,
      printTitleOnWorksheet: true,
    }, 'kolecko') }

    const parsed = parseSifra(serializeSifra(before, 'abc'))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    const round = fromConfig(parsed.file.config)
    expect(round.seed).toBe('kolecko')
    expect(round.state.message).toBe('ZLATÝ KLÍČ')
    expect(round.state.grade).toBe(5)
    expect(round.state.title).toBe('Lov pirátského pokladu')
    expect(round.state.operations).toEqual({ add: true, sub: false, mul: true, div: false })
    expect(round.state.decoyDensity).toBe(0.5)
    expect(round.state.distinctCellPerOccurrence).toBe(false)
    expect(round.state.printTitleOnWorksheet).toBe(true)
  })

  it('změna generátoru se pozná podle kontrolního součtu', () => {
    const sheet = sheetOf(defaultConfig('CESTA DO LESA', 4, 'drift'))
    const text = serializeSifra(sheet.config, 'deadbeef') // součet z „jiné verze"
    const parsed = parseSifra(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(sheetChecksum(sheetOf(parsed.file.config))).not.toBe(parsed.file.checksum)
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
    expect(parsed.file.config.payload.cipher.decoyDensity).toBe(0.35)
    expect(parsed.file.config.payload.output.printTitleOnWorksheet).toBe(false)
    // Profil obtížnosti se odvodí z ročníku, ne ze souboru.
    expect(parsed.file.config.payload.difficulty.multiplicationTables.length).toBeGreaterThan(0)
    expect(generateCipherGrid(parsed.file.config).ok).toBe(true)
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
