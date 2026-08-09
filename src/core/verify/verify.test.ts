import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import type { CipherTable } from '../model/index.js'
import {
  ExpressionError,
  buildCodeIndex,
  decode,
  evaluateExpression,
  hasAdjacentOperators,
  verifySheet,
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
