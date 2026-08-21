import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import type { CipherTable } from '../model/index.js'
import type { Task } from '../model/index.js'
import {
  ALLOW_DECIMAL_RESULTS,
  ExpressionError,
  buildCodeIndex,
  decode,
  evaluateExpression,
  hasAdjacentOperators,
  verifyChain,
  verifyDistinctValues,
  verifySheet,
  verifyTasks,
  type VerifiableSheet,
} from './index.js'

/** Tabulka, kde i-té písmeno má kód i+1. */
function makeTable(letters: string[], decoys: string[] = []): CipherTable {
  const all = [...letters, ...decoys]
  return {
    rows: 1,
    cols: all.length,
    cells: all.map((letter, index) => ({
      code: { kind: 'linear' as const, n: index + 1 },
      letter,
      isDecoy: index >= letters.length,
    })),
  }
}

describe('evaluateExpression — český zápis', () => {
  it.each([
    ['18 + 6', 24],
    ['30 − 6', 24], // U+2212
    ['30 - 6', 24],
    ['6 · 4', 24],
    ['6 × 4', 24], // křížek se na vstupu tolerujeme, i když ho negenerujeme
    ['6 * 4', 24],
    ['48 ÷ 2', 24],
    ['48 : 2', 24], // školní zápis dělení
    ['48 / 2', 24],
    ['36 : 4', 9],
  ])('%s = %i', (input, expected) => {
    expect(evaluateExpression(input)).toBe(expected)
  })

  it('ignoruje koncové = a otazník ze sazby listu', () => {
    expect(evaluateExpression('18 + 6 =')).toBe(24)
    expect(evaluateExpression('18 + 6 = ?')).toBe(24)
  })

  it('respektuje prioritu operací a závorky', () => {
    expect(evaluateExpression('2 + 3 × 4')).toBe(14)
    expect(evaluateExpression('(2 + 3) × 4')).toBe(20)
    expect(evaluateExpression('20 - 6 - 4')).toBe(10) // levá asociativita
    expect(evaluateExpression('100 : 5 : 2')).toBe(10)
  })

  it('zvládne unární mínus', () => {
    expect(evaluateExpression('-5 + 8')).toBe(3)
    expect(evaluateExpression('3 × -2')).toBe(-6)
  })

  it('odmítne vadné vstupy místo tichého NaN', () => {
    expect(() => evaluateExpression('')).toThrow(ExpressionError)
    expect(() => evaluateExpression('8 : 0')).toThrow(/nulou/)
    expect(() => evaluateExpression('(2 + 3')).toThrow(/závorka/)
    expect(() => evaluateExpression('2 + 3)')).toThrow(ExpressionError)
    expect(() => evaluateExpression('2 +')).toThrow(ExpressionError)
  })

  it('nevyhodnocuje kód — obrana proti podvrženému .sifra souboru', () => {
    expect(() => evaluateExpression('process.exit(1)')).toThrow(ExpressionError)
    expect(() => evaluateExpression('1;globalThis.x=1')).toThrow(ExpressionError)
  })

  it('souhlasí s nativní aritmetikou pro libovolná celá čísla', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        fc.constantFrom('+', '−', '×'),
        (a, b, op) => {
          const expected = op === '+' ? a + b : op === '−' ? a - b : a * b
          expect(evaluateExpression(`${a} ${op} ${b}`)).toBe(expected)
        },
      ),
    )
  })
})

describe('buildCodeIndex / decode', () => {
  it('více kódů smí ukazovat na stejné písmeno', () => {
    const index = buildCodeIndex(makeTable(['A', 'B', 'A']))
    expect(index.ambiguous).toEqual([])
    expect(index.byCode.get(1)).toBe('A')
    expect(index.byCode.get(3)).toBe('A')
  })

  it('odhalí kód ukazující na dvě různá písmena', () => {
    const table = makeTable(['A', 'B'])
    table.cells[1]!.code.n = 1 // kolize
    expect(buildCodeIndex(table).ambiguous).toEqual([1])
  })

  it('rozluští list jen z tabulky a výsledků', () => {
    expect(decode(makeTable(['A', 'H', 'O', 'J', 'A']), [5, 2, 3, 4])).toBe('AHOJ')
  })

  it('neznámý kód nahradí otazníkem, nikoli undefined', () => {
    expect(decode(makeTable(['A']), [1, 99])).toBe('A?')
  })
})

describe('verifySheet', () => {
  const correctSheet = (): VerifiableSheet => ({
    table: makeTable(['A', 'H', 'O', 'J', 'A'], ['Q', 'X']),
    slots: [
      { taskText: '2 + 3', declaredValue: 5 },
      { taskText: '8 : 4', declaredValue: 2 },
      { taskText: '1 × 3', declaredValue: 3 },
      { taskText: '10 - 6', declaredValue: 4 },
    ],
    expectedMessage: 'AHOJ',
  })

  it('projde na správném listu', () => {
    expect(verifySheet(correctSheet())).toEqual({ ok: true })
  })

  it('odhalí příklad, jehož výsledek nesouhlasí', () => {
    const sheet = correctSheet()
    sheet.slots = [{ taskText: '2 + 3', declaredValue: 6 }, ...sheet.slots.slice(1)]
    const report = verifySheet(sheet)
    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures.map((f) => f.code)).toContain('task-value-mismatch')
  })

  it('odhalí nevyhodnotitelný příklad', () => {
    const sheet = correctSheet()
    sheet.slots = [{ taskText: '2 + ', declaredValue: 5 }, ...sheet.slots.slice(1)]
    const report = verifySheet(sheet)
    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures[0]!.code).toBe('task-value-mismatch')
  })

  it('odhalí dvojznačný kód v tabulce', () => {
    const sheet = correctSheet()
    sheet.table.cells[1]!.code.n = 5 // 5 už patří 'A', teď i 'H'
    const report = verifySheet(sheet)
    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures.map((f) => f.code)).toContain('ambiguous-code')
  })

  it('odhalí výsledek, který v tabulce není', () => {
    const sheet = correctSheet()
    sheet.slots = [{ taskText: '90 + 9', declaredValue: 99 }, ...sheet.slots.slice(1)]
    const report = verifySheet(sheet)
    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures.map((f) => f.code)).toContain('value-not-in-table')
  })

  it('přijme číselnou řadu se správným chybějícím členem', () => {
    const sheet = correctSheet()
    sheet.slots = [{ taskText: '1 2 3 4 ?', declaredValue: 5, kind: 'sequence' }, ...sheet.slots.slice(1)]
    expect(verifySheet(sheet)).toEqual({ ok: true })
  })

  it('odhalí řadu, jejíž chybějící člen nesouhlasí', () => {
    const sheet = correctSheet()
    sheet.slots = [{ taskText: '1 2 3 4 ?', declaredValue: 4, kind: 'sequence' }, ...sheet.slots.slice(1)]
    const report = verifySheet(sheet)
    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures.map((f) => f.code)).toContain('task-value-mismatch')
  })

  it('odhalí řadu, na kterou sedí dvě pravidla — dítě by mělo křížek za správnou odpověď', () => {
    const sheet = correctSheet()
    sheet.slots = [{ taskText: '2 5 ? 17 26', declaredValue: 5, kind: 'sequence' }, ...sheet.slots.slice(1)]
    const report = verifySheet(sheet)
    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures.map((f) => f.code)).toContain('ambiguous-sequence')
  })

  it('řadu nečte jako aritmetický výraz a naopak', () => {
    const sheet = correctSheet()
    // Bez `kind` se text čte jako výraz — a řada jako výraz nedává smysl.
    sheet.slots = [{ taskText: '1 2 3 4 ?', declaredValue: 5 }, ...sheet.slots.slice(1)]
    const report = verifySheet(sheet)
    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures[0]!.code).toBe('task-value-mismatch')
  })

  it('odhalí, že rozluštění nedá zadanou tajenku', () => {
    const sheet = correctSheet()
    sheet.expectedMessage = 'AHOJTE'
    const report = verifySheet(sheet)
    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures.map((f) => f.code)).toContain('decoded-message-mismatch')
  })

  it('prohození dvou úloh je vada, i když všechny příklady sedí', () => {
    const sheet = correctSheet()
    const [first, second, ...rest] = sheet.slots
    sheet.slots = [second!, first!, ...rest]
    const report = verifySheet(sheet)
    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures.map((f) => f.code)).toEqual(['decoded-message-mismatch'])
  })
})

describe('zápis matematiky', () => {
  it.each([
    ['−7 × −2', true],
    ['−7 × (−2)', false],
    ['5 − (−3)', false],
    ['−8 + 41', false], // vedoucí znaménko závorku nepotřebuje
    ['(−4) × 6', false],
    ['12 + −5', true],
    ['20 : −4', true],
    ['(2 + 3) × 4', false],
    ['18 + 6', false],
  ])('%s → dva operátory vedle sebe: %s', (text, expected) => {
    expect(hasAdjacentOperators(text)).toBe(expected)
  })

  it('list s chybným zápisem se nevytiskne', () => {
    const sheet: VerifiableSheet = {
      table: makeTable(['A', 'H', 'O', 'J', 'A'], ['Q', 'X']),
      slots: [
        // Spočítá se správně na 5, ale zapsané je to špatně.
        { taskText: '−1 × −5', declaredValue: 5 },
        { taskText: '8 : 4', declaredValue: 2 },
        { taskText: '1 × 3', declaredValue: 3 },
        { taskText: '10 - 6', declaredValue: 4 },
      ],
      expectedMessage: 'AHOJ',
    }

    const report = verifySheet(sheet)
    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures.map((f) => f.code)).toContain('malformed-notation')
  })
})

describe('mocniny a odmocniny', () => {
  it.each([
    ['7²', 49],
    ['2³', 8],
    ['√81', 9],
    ['√81 + 25', 34],
    ['7² − 16', 33],
    ['100 − √64', 92],
    ['√(16 + 9)', 5],
    ['2 · 3²', 18], // mocnina se váže těsněji než násobení
    ['(2 · 3)²', 36],
    ['−7²', -49], // standardní úmluva: umocní se 7, pak se to zneguje
    ['2³ · 3', 24],
    ['√81 · 2', 18],
  ])('%s = %i', (input, expected) => {
    expect(evaluateExpression(input)).toBe(expected)
  })

  it('odmocnina ze záporného čísla je chyba, ne NaN', () => {
    expect(() => evaluateExpression('√(4 − 9)')).toThrow(/záporného/)
  })

  it('odmocnina není operátor, takže „2 · √9" projde kontrolou zápisu', () => {
    expect(hasAdjacentOperators('2 · √9')).toBe(false)
    expect(hasAdjacentOperators('5 − √16')).toBe(false)
    expect(hasAdjacentOperators('3² + 4')).toBe(false)
    // Dva skutečné operátory ale chytit musí i tady.
    expect(hasAdjacentOperators('√9 · −2')).toBe(true)
  })
})

describe('desetinná čísla', () => {
  it.each([
    ['3,5 · 4', 14],
    ['2,5 + 3,5', 6],
    ['12,6 : 0,3', 42],
    ['10 − 2,5 · 2', 5],
    ['0,25 · 80', 20],
    ['1,5 + 1,5 + 1', 4],
    ['3.5 · 4', 14], // tečka se přijímá z ručně upravených souborů
  ])('%s = %i', (input, expected) => {
    expect(evaluateExpression(input)).toBeCloseTo(expected, 9)
  })

  it('tečka na konci věty není desetinné číslo', () => {
    // Oddělovač se počítá jen tehdy, když za ním stojí číslice.
    expect(() => evaluateExpression('5 + 3.')).toThrow(ExpressionError)
  })

  it('desetinné číslo neplete kontrolu zápisu', () => {
    expect(hasAdjacentOperators('3,5 · 4')).toBe(false)
    expect(hasAdjacentOperators('2,5 − (−1,5)')).toBe(false)
    expect(hasAdjacentOperators('2,5 · −1,5')).toBe(true)
  })
})

describe('procenta', () => {
  it.each([
    ['25 % z 80', 20],
    ['50 % z 40', 20],
    ['10 % z 300', 30],
    ['7 % z 300', 21], // v plovoucí čárce 21.000000000000004 — viz EPSILON
    ['200 − 25 % z 200', 150], // „z" váže těsněji než odčítání
    ['25 % ze 80', 20], // „ze" se přijímá, generátor ho nevyrábí
    ['5 % z 60 + 7', 10],
  ])('%s = %i', (input, expected) => {
    expect(evaluateExpression(input)).toBeCloseTo(expected, 9)
  })

  it('předložka není operátor, takže zápis projde kontrolou', () => {
    expect(hasAdjacentOperators('25 % z 80')).toBe(false)
    expect(hasAdjacentOperators('200 − 25 % z 200')).toBe(false)
  })

  it('slovo začínající na „ze" není předložka', () => {
    expect(() => evaluateExpression('25 % zebra 80')).toThrow(ExpressionError)
  })
})

describe('výsledek musí zůstat celé číslo', () => {
  const sheetWith = (taskText: string, declaredValue: number): VerifiableSheet => ({
    table: makeTable(['A'], ['Q', 'X']),
    slots: [{ taskText, declaredValue }],
    expectedMessage: 'A',
  })

  it('0,07 · 300 projde jako 21, přestože v plovoucí čárce vyjde jinak', () => {
    // Přesně tenhle případ by bez tolerance zamítl správný list — vzácně,
    // takže by se na to přišlo až u učitele ve třídě.
    expect(evaluateExpression('0,07 · 300')).not.toBe(21)
    const table: CipherTable = {
      rows: 1,
      cols: 1,
      cells: [{ code: { kind: 'linear', n: 21 }, letter: 'A', isDecoy: false }],
    }
    expect(
      verifySheet({
        table,
        slots: [{ taskText: '0,07 · 300', declaredValue: 21 }],
        expectedMessage: 'A',
      }),
    ).toEqual({ ok: true })
  })

  it('0,3 · 7 se odmítne — 2,1 nemůže být kód políčka', () => {
    const report = verifySheet(sheetWith('0,3 · 7', 2.1))
    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures[0]?.code).toBe('non-integer-result')
  })

  it('necelý výsledek se odmítne i tehdy, když ho generátor deklaruje správně', () => {
    const report = verifySheet(sheetWith('7 : 2', 3.5))
    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures[0]?.code).toBe('non-integer-result')
  })

  it('tolerance nepřehlédne skutečnou chybu generátoru', () => {
    const report = verifySheet(sheetWith('25 % z 80', 21))
    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures[0]?.code).toBe('task-value-mismatch')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Celý výsledek je pravidlo šifry, ne projektu
// ─────────────────────────────────────────────────────────────────────────────

describe('pravidla listu', () => {
  it('výchozí přísnost platí i tam, kde se pravidla nepředají', () => {
    // Zapomenuté volací místo musí zůstat na dnešním chování. Uvolnit se
    // smí jen vědomě — obráceně by tichá změna prošla až na papír.
    const report = verifyTasks([{ taskText: '7 : 2', declaredValue: 3.5 }])
    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures[0]?.code).toBe('non-integer-result')
  })

  it('hra pustí 7 : 2 = 3,5 — žádný kód políčka tu není', () => {
    expect(
      verifyTasks([{ taskText: '7 : 2', declaredValue: 3.5 }], ALLOW_DECIMAL_RESULTS),
    ).toEqual({ ok: true })
  })

  it('uvolněné pravidlo nepřestane hlídat samotný přepočet', () => {
    const report = verifyTasks(
      [{ taskText: '7 : 2', declaredValue: 3.6 }],
      ALLOW_DECIMAL_RESULTS,
    )
    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures[0]?.code).toBe('task-value-mismatch')
  })

  it('nevytisknutelná hodnota je vada listu i ve hře', () => {
    // `1 : 3` vytištěné jako `0,33` by dítě sečetlo a nedopočítalo se.
    const report = verifyTasks(
      [{ taskText: '1 : 3', declaredValue: 1 / 3 }],
      ALLOW_DECIMAL_RESULTS,
    )
    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures[0]?.code).toBe('unprintable-value')
  })
})

describe('porovnává se vytištěná podoba, ne číslo', () => {
  function task(text: string, value: number): Task {
    return {
      id: text,
      generatorId: 'test',
      value,
      prompt: { kind: 'expr', text },
      solutionSteps: [],
      didactic: { grade: 5, difficulty: 1, effort: 1, operations: ['add'], skills: [] },
    }
  }

  it('dvě hodnoty různé v posledním bitu jsou na papíře táž hodnota', () => {
    // Jako čísla se 0.1 + 0.2 a 0.3 nerovnají. Na kartičce je obojí „0,3“
    // a dítě by mělo dvě zadání k jednomu výsledku.
    const report = verifyDistinctValues([task('0,1 + 0,2', 0.1 + 0.2), task('0,15 · 2', 0.3)])
    expect(report.ok).toBe(false)
    if (report.ok) return
    expect(report.failures[0]?.code).toBe('ambiguous-pairing')
  })

  it('řetěz domina se nepřetrhne o poslední bit plovoucí čárky', () => {
    // Kámen nese vytištěné „0,3“, výpočet dá 0.30000000000000004. Hledání
    // podle čísla by následníka nenašlo a domino by spadlo na `broken-chain`.
    expect(
      verifyChain([
        { left: '0,3', right: '0,2 + 0,3' },
        { left: '0,5', right: '0,1 + 0,2' },
      ]),
    ).toEqual({ ok: true })
  })
})
