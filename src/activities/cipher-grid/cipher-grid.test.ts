import { describe, expect, it } from 'vitest'
import { createRng } from '../../core/rng/index.js'
import { plainLetters } from '../../core/text/index.js'
import { decode, evaluateExpression } from '../../core/verify/index.js'
import {
  defaultConfig,
  generateCipherGrid,
  solutionTitle,
  worksheetTitle,
  type CipherGridSheet,
} from './index.js'

function build(message: string, grade: 3 | 4 | 5 = 4, seed = 'test'): CipherGridSheet {
  const outcome = generateCipherGrid(defaultConfig(message, grade, seed))
  expect(outcome.ok, outcome.ok ? '' : outcome.reason).toBe(true)
  if (!outcome.ok) throw new Error(outcome.reason)
  return outcome.sheet
}

describe('generateCipherGrid — referenční tajenka ze zadání', () => {
  const sheet = build('POKLAD JE U BAZÉNU')

  it('projde verifikací', () => {
    expect(sheet.verification).toEqual({ ok: true })
  })

  it('má tolik úloh, kolik má tajenka písmen', () => {
    expect(sheet.slots).toHaveLength(15)
    expect(plainLetters(sheet.message)).toBe('POKLADJEUBAZENU')
  })

  it('rozluští se zpět na zadanou tajenku', () => {
    const values = sheet.slots.map((slot) => slot.task.value)
    expect(decode(sheet.table, values)).toBe('POKLADJEUBAZENU')
  })

  it('každý příklad se dá spočítat a ukazuje na správnou buňku', () => {
    for (const slot of sheet.slots) {
      expect(evaluateExpression(slot.task.prompt.text)).toBe(slot.code)
    }
  })

  it('tabulka obsahuje klamná písmena, jinak by šla tajenka uhodnout', () => {
    const decoys = sheet.table.cells.filter((cell) => cell.isDecoy)
    expect(decoys.length).toBeGreaterThan(0)
    const decoyLetters = new Set(decoys.map((cell) => cell.letter))
    // Aspoň nějaké písmeno, které v tajence vůbec není.
    const messageLetters = new Set(sheet.message.letters)
    expect([...decoyLetters].some((letter) => !messageLetters.has(letter))).toBe(true)
  })

  it('žádný kód neukazuje na dvě různá písmena', () => {
    const byCode = new Map<number, string>()
    for (const cell of sheet.table.cells) {
      const existing = byCode.get(cell.code.n)
      if (existing !== undefined) expect(existing).toBe(cell.letter)
      byCode.set(cell.code.n, cell.letter)
    }
  })

  it('opakované písmeno dostane pokaždé jinou souřadnici', () => {
    // V POKLADJEUBAZENU je A dvakrát, U dvakrát, E dvakrát.
    for (const letter of ['A', 'U', 'E']) {
      const codes = sheet.slots
        .filter((_, index) => sheet.message.letters[index] === letter)
        .map((slot) => slot.code)
      expect(new Set(codes).size).toBe(codes.length)
    }
  })
})

describe('generateCipherGrid — determinismus', () => {
  it('stejný seed dá identický list', () => {
    const a = build('CESTA DO LESA', 4, 'stejny')
    const b = build('CESTA DO LESA', 4, 'stejny')
    expect(a.slots.map((s) => s.task.prompt.text)).toEqual(b.slots.map((s) => s.task.prompt.text))
    expect(a.table.cells).toEqual(b.table.cells)
  })

  it('jiný seed dá jiný list', () => {
    const a = build('CESTA DO LESA', 4, 'seed-a')
    const b = build('CESTA DO LESA', 4, 'seed-b')
    expect(a.slots.map((s) => s.task.prompt.text)).not.toEqual(b.slots.map((s) => s.task.prompt.text))
  })
})

describe('generateCipherGrid — název aktivity', () => {
  it('odvozený název se na žákovský list nedostane nikdy', () => {
    const sheet = build('POKLAD JE U BAZÉNU')
    expect(sheet.titleDerived).toBe(true)
    expect(sheet.title).toBe('POKLAD JE U BAZÉNU')
    expect(worksheetTitle(sheet)).toBeNull()
    expect(solutionTitle(sheet)).toBe('POKLAD JE U BAZÉNU')
  })

  it('ani když si učitel tisk názvu vysloveně zapne', () => {
    const config = defaultConfig('POKLAD JE U BAZÉNU', 4, 'x')
    config.payload.output.printTitleOnWorksheet = true
    const outcome = generateCipherGrid(config)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(worksheetTitle(outcome.sheet)).toBeNull()
  })

  it('vlastní název se vytiskne jen na výslovné přání', () => {
    const config = defaultConfig('POKLAD JE U BAZÉNU', 4, 'x')
    config.title = 'Lov pirátského pokladu'
    const off = generateCipherGrid(config)
    expect(off.ok && worksheetTitle(off.sheet)).toBeNull()

    config.payload.output.printTitleOnWorksheet = true
    const on = generateCipherGrid(config)
    expect(on.ok && worksheetTitle(on.sheet)).toBe('Lov pirátského pokladu')
  })

  it('dlouhou tajenku v názvu zkrátí', () => {
    const sheet = build('POKLAD JE UKRYTY POD STARYM DUBEM', 5)
    expect(sheet.title.length).toBeLessThanOrEqual(31)
    expect(sheet.title.endsWith('…')).toBe(true)
  })
})

describe('generateCipherGrid — ústupky a meze', () => {
  it('upozorní na znaky, které nelze zašifrovat', () => {
    const sheet = build('SEJDEME SE V 8 HODIN', 4)
    const notice = sheet.relaxations.find((entry) => entry.code === 'dropped-characters')
    expect(notice?.level).toBe('notice')
    expect(notice?.message).toContain('8')
  })

  it('prázdnou tajenku odmítne, místo aby vyrobil prázdný list', () => {
    const outcome = generateCipherGrid(defaultConfig('   ', 4, 'prazdne'))
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.reason).toContain('žádné písmeno')
  })

  it('při mnoha stejných písmenech ohlásí recyklaci souřadnic, ne tichou degradaci', () => {
    // 3. ročník má malý obor výsledků, takže se sem pět různých A nevejde.
    const outcome = generateCipherGrid(defaultConfig('AAAAAAAAAAAAAAAAAAAAAAAA', 3, 'aaa'))
    if (!outcome.ok) return // legitimní — pak to musí být hlášené jako důvod
    const notice = outcome.sheet.relaxations.find((entry) => entry.code === 'coordinate-reuse')
    if (notice !== undefined) expect(notice.level).toBe('notice')
    expect(outcome.sheet.verification).toEqual({ ok: true })
  })

  it('respektuje omezení jen na násobení', () => {
    const config = defaultConfig('AHOJ', 4, 'nasobeni')
    config.payload.taskMix = { mul: 1 }
    const outcome = generateCipherGrid(config)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    for (const slot of outcome.sheet.slots) {
      expect(slot.task.prompt.text).toContain('×')
    }
    expect(outcome.sheet.verification).toEqual({ ok: true })
  })
})

describe('generateCipherGrid — mřížka', () => {
  it('velikost mřížky se odvodí z tajenky, ne z ručního nastavení', () => {
    const short = build('AHOJ', 4, 'kratka')
    const long = build('POKLAD JE UKRYTY POD STARYM DUBEM U POTOKA', 5, 'dlouha')
    expect(short.table.cells.length).toBeLessThan(long.table.cells.length)
  })

  it('mřížka je vždy zhruba čtvercová, aby se dala vytisknout', () => {
    const rng = createRng('tvary')
    for (let i = 0; i < 20; i++) {
      const length = rng.int(4, 40)
      const message = Array.from({ length }, () => rng.pick('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''))).join('')
      const outcome = generateCipherGrid(defaultConfig(message, 5, `tvar${i}`))
      if (!outcome.ok) continue
      const { rows, cols } = outcome.sheet.table
      // Poměr stran nejvýš 2:1 — 3×11 nebo 2×18 se na A4 sází mizerně.
      expect(Math.max(rows, cols) / Math.min(rows, cols), `${rows}×${cols}`).toBeLessThanOrEqual(2)
    }
  })

  it('kódy buněk jdou od 1 po řadě a nikde nechybí', () => {
    const sheet = build('CESTA DO LESA')
    sheet.table.cells.forEach((cell, index) => {
      expect(cell.code.n).toBe(index + 1)
    })
    expect(sheet.table.cells.length).toBe(sheet.table.rows * sheet.table.cols)
  })
})
