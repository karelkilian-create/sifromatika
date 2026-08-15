import { describe, expect, it } from 'vitest'
import { GRID_SIDE } from '../../core/constraints/index.js'
import type { Grade } from '../../core/model/index.js'
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
      expect(slot.task.prompt.text).toContain('·')
    }
    expect(outcome.sheet.verification).toEqual({ ok: true })
  })
})

describe('generateCipherGrid — mřížka', () => {
  it('velikost tabulky neprozradí délku tajenky', () => {
    // Tohle je celý smysl pevné mřížky. Dokud se hledala nejmenší tabulka,
    // která tajenku uveze, byla čtyřpísmenná tajenka v mřížce 3×3 a dítě z ní
    // přečetlo, že žádný výsledek nepřesáhne 33. Devítka na devítku vypadá
    // stejně pro „AHOJ" i pro tajenku přes celou větu.
    const short = build('AHOJ', 4, 'kratka')
    const long = build('POKLAD JE UKRYTY POD STARYM DUBEM U POTOKA', 5, 'dlouha')

    expect(short.table.rows).toBe(GRID_SIDE)
    expect(short.table.cols).toBe(GRID_SIDE)
    expect(long.table.rows).toBe(GRID_SIDE)
    expect(long.table.cols).toBe(GRID_SIDE)
  })

  it('mřížka je 9×9 pro každou tajenku, kterou lze vygenerovat', () => {
    const rng = createRng('tvary')
    for (let i = 0; i < 20; i++) {
      const length = rng.int(4, 40)
      const message = Array.from({ length }, () => rng.pick('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''))).join('')
      const outcome = generateCipherGrid(defaultConfig(message, 5, `tvar${i}`))
      if (!outcome.ok) continue
      const { rows, cols } = outcome.sheet.table
      expect({ rows, cols }).toEqual({ rows: GRID_SIDE, cols: GRID_SIDE })
    }
  })

  it('buňky pokrývají celou mřížku', () => {
    const sheet = build('CESTA DO LESA')
    expect(sheet.table.cells.length).toBe(sheet.table.rows * sheet.table.cols)
    expect(new Set(sheet.table.cells.map((cell) => cell.code.n)).size).toBe(sheet.table.cells.length)
  })
})

describe('generateCipherGrid — souřadnicová šifra (výchozí)', () => {
  const sheet = build('POKLAD JE U BAZÉNU')

  it('kód buňky je řádek a sloupec složené do dvojciferného čísla', () => {
    sheet.table.cells.forEach((cell, index) => {
      expect(cell.code.kind).toBe('coord')
      if (cell.code.kind !== 'coord') return
      expect(cell.code.row).toBe(Math.floor(index / sheet.table.cols) + 1)
      expect(cell.code.col).toBe((index % sheet.table.cols) + 1)
      expect(cell.code.n).toBe(cell.code.row * 10 + cell.code.col)
    })
  })

  it('mřížka nikdy nepřesáhne 9×9, jinak by dvouciferné čtení přestalo platit', () => {
    const rng = createRng('meze')
    for (let i = 0; i < 60; i++) {
      const length = rng.int(4, 90)
      const message = Array.from({ length }, () =>
        rng.pick('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
      ).join('')
      const outcome = generateCipherGrid(defaultConfig(message, 5, `mez${i}`))
      if (!outcome.ok) continue
      expect(outcome.sheet.table.rows).toBeLessThanOrEqual(9)
      expect(outcome.sheet.table.cols).toBeLessThanOrEqual(9)
      for (const slot of outcome.sheet.slots) {
        // Výsledek musí být čitelný jako dvojice číslic 1–9.
        expect(slot.code).toBeGreaterThanOrEqual(11)
        expect(slot.code).toBeLessThanOrEqual(99)
        expect(slot.code % 10).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('lineární variantu lze pořád zvolit', () => {
    const config = defaultConfig('CESTA DO LESA', 4, 'linearni')
    config.payload.cipher.strategy = 'grid-linear'
    const outcome = generateCipherGrid(config)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    outcome.sheet.table.cells.forEach((cell, index) => {
      expect(cell.code.kind).toBe('linear')
      expect(cell.code.n).toBe(index + 1)
    })
    expect(outcome.sheet.verification).toEqual({ ok: true })
  })
})

describe('generateCipherGrid — desetinná čísla a procenta', () => {
  /** Šifra pro sedmý ročník se zapnutým zpestřením. */
  function sheetWith(mix: Record<string, number>, seed: string) {
    const config = defaultConfig('PROCENTA', 7, seed)
    config.payload.generatorMix = mix
    const outcome = generateCipherGrid(config)
    expect(outcome.ok, outcome.ok ? '' : outcome.reason).toBe(true)
    return outcome.ok ? outcome.sheet : null
  }

  it('list s procenty projde verifikací a procenta na něm opravdu jsou', () => {
    const sheet = sheetWith({ arithmetic: 1, percent: 3 }, 'procenta')
    if (sheet === null) return
    expect(sheet.verification).toEqual({ ok: true })
    expect(sheet.slots.some((slot) => slot.task.generatorId === 'percent')).toBe(true)
    expect(sheet.slots.some((slot) => slot.task.prompt.text.includes(' % z '))).toBe(true)
  })

  it('list s desetinnými čísly projde verifikací', () => {
    const sheet = sheetWith({ arithmetic: 1, decimal: 3 }, 'desetinna')
    if (sheet === null) return
    expect(sheet.verification).toEqual({ ok: true })
    expect(sheet.slots.some((slot) => slot.task.generatorId === 'decimal')).toBe(true)
  })

  it('výsledek zůstává celé kladné číslo, i když je zadání desetinné', () => {
    const sheet = sheetWith({ arithmetic: 1, decimal: 2, percent: 2 }, 'oboji')
    if (sheet === null) return
    for (const slot of sheet.slots) {
      expect(Number.isInteger(slot.task.value), slot.task.prompt.text).toBe(true)
      expect(slot.task.value).toBeGreaterThan(0)
      // A hlavně: přepočet z vytištěného textu dá totéž.
      expect(evaluateExpression(slot.task.prompt.text)).toBeCloseTo(slot.task.value, 9)
    }
  })

  it('čtvrťák procenta ani desetinná čísla nedostane, i kdyby si je soubor vyžádal', () => {
    const config = defaultConfig('POKLAD', 4, 'ctvrtak')
    config.payload.generatorMix = { arithmetic: 1, decimal: 3, percent: 3 }
    const outcome = generateCipherGrid(config)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    for (const slot of outcome.sheet.slots) {
      expect(slot.task.generatorId).toBe('arithmetic')
    }
  })
})

describe('zaškrtnuté operace se na list opravdu dostanou', () => {
  /**
   * Pojistka proti tichému rozporu se zadáním.
   *
   * Když se zavedla pevná mřížka 9×9, spadl podíl násobení a dělení pro 3. a 4.
   * ročník ze 42 % na 17 % — hodnoty jako 71 vyrobí čtvrťák sčítáním, ale malou
   * násobilkou ani dělením v oboru do sta nikdy, takže většina políček skončila
   * u součtů. Učiteli, který si násobení zaškrtl, se vracel list samých sčítání.
   *
   * Měří se podíl na mnoha listech, ne na jednom: na patnácti příkladech je
   * rozptyl velký a test by blikal.
   */
  function operationShare(grade: Grade, sheets: number): Record<string, number> {
    const count: Record<string, number> = { add: 0, sub: 0, mul: 0, div: 0 }
    let total = 0
    for (let i = 0; i < sheets; i++) {
      const outcome = generateCipherGrid(defaultConfig('POKLAD JE U BAZÉNU', grade, `podil-${i}`))
      if (!outcome.ok) continue
      for (const slot of outcome.sheet.slots) {
        const text = slot.task.prompt.text
        const operation = text.includes('·')
          ? 'mul'
          : text.includes(':')
            ? 'div'
            : text.includes('+')
              ? 'add'
              : 'sub'
        count[operation]!++
        total++
      }
    }
    for (const key of Object.keys(count)) count[key] = count[key]! / total
    return count
  }

  it.each([3, 4, 5, 6, 7, 8] as Grade[])(
    '%i. ročník: násobení i dělení tvoří dohromady aspoň čtvrtinu příkladů',
    (grade) => {
      const share = operationShare(grade, 30)
      expect(share.mul! + share.div!, JSON.stringify(share)).toBeGreaterThan(0.25)
      // A žádná operace nesmí list ovládnout — to by taky nebyl mix.
      for (const [operation, value] of Object.entries(share)) {
        expect(value, `${operation} ${JSON.stringify(share)}`).toBeLessThan(0.5)
      }
    },
  )
})
