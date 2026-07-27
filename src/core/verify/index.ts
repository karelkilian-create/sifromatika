/**
 * Nezávislé ověření vygenerovaného pracovního listu.
 *
 * Tenhle modul je jediná obrana proti tomu, aby učitel rozdal 25 rozbitých
 * listů. Běží VŽDY, i v produkci, ne jen v testech.
 *
 * ⚠ Kritické pravidlo: tento modul NESMÍ použít nic z vrstvy generátorů.
 *   Výraz se parsuje a počítá znovu, od nuly, z vytištěného textu. Kdyby
 *   verifikace volala tutéž funkci, která výsledek vyrobila, ověřovala by
 *   jen sama sebe a společnou chybu by neodhalila.
 */

import type {
  CipherTable,
  VerificationFailure,
  VerificationReport,
} from '../model/index.js'

// ─────────────────────────────────────────────────────────────────────────────
// Vyhodnocení výrazu
// ─────────────────────────────────────────────────────────────────────────────

export class ExpressionError extends Error {}

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' }
  | { kind: 'paren'; value: '(' | ')' }

/**
 * Zápisy, které se na českém pracovním listu reálně objeví.
 * Dělení se ve škole píše dvojtečkou (`36 : 4`), násobení křížkem (`6 × 4`).
 */
const OPERATOR_ALIASES: Readonly<Record<string, '+' | '-' | '*' | '/'>> = {
  '+': '+',
  '-': '-',
  '−': '-', // − MINUS SIGN
  '–': '-', // – EN DASH, občas z copy-paste
  '*': '*',
  '×': '*', // × MULTIPLICATION SIGN
  '·': '*', // · MIDDLE DOT
  '/': '/',
  ':': '/',
  '÷': '/', // ÷ DIVISION SIGN
}

function tokenize(input: string): Token[] {
  // Koncové „=" nebo „= ?" na listu je součást sazby, ne výrazu.
  const source = input.replace(/[=?\s]+$/u, '').trim()
  const tokens: Token[] = []
  let i = 0

  while (i < source.length) {
    const char = source[i]!

    if (/\s/.test(char)) {
      i++
      continue
    }
    if (char >= '0' && char <= '9') {
      let digits = ''
      while (i < source.length && source[i]! >= '0' && source[i]! <= '9') {
        digits += source[i]!
        i++
      }
      tokens.push({ kind: 'num', value: Number(digits) })
      continue
    }
    if (char === '(' || char === ')') {
      tokens.push({ kind: 'paren', value: char })
      i++
      continue
    }
    const operator = OPERATOR_ALIASES[char]
    if (operator !== undefined) {
      tokens.push({ kind: 'op', value: operator })
      i++
      continue
    }
    throw new ExpressionError(`Neznámý znak ${JSON.stringify(char)} ve výrazu ${JSON.stringify(input)}`)
  }

  if (tokens.length === 0) {
    throw new ExpressionError(`Prázdný výraz: ${JSON.stringify(input)}`)
  }
  return tokens
}

/**
 * Spočítá hodnotu aritmetického výrazu.
 *
 * Podporuje `+ − × ÷`, závorky a unární mínus, se standardní prioritou.
 * Záměrně NEpoužívá `eval` ani `new Function` — kdyby se sem někdy dostal
 * text z importovaného `.sifra` souboru, byla by to díra.
 */
export function evaluateExpression(input: string): number {
  const tokens = tokenize(input)
  let position = 0

  const peek = (): Token | undefined => tokens[position]

  const parseExpression = (): number => {
    let value = parseTerm()
    for (;;) {
      const token = peek()
      if (token?.kind !== 'op' || (token.value !== '+' && token.value !== '-')) break
      position++
      const right = parseTerm()
      value = token.value === '+' ? value + right : value - right
    }
    return value
  }

  const parseTerm = (): number => {
    let value = parseUnary()
    for (;;) {
      const token = peek()
      if (token?.kind !== 'op' || (token.value !== '*' && token.value !== '/')) break
      position++
      const right = parseUnary()
      if (token.value === '/') {
        if (right === 0) throw new ExpressionError(`Dělení nulou ve výrazu ${JSON.stringify(input)}`)
        value = value / right
      } else {
        value = value * right
      }
    }
    return value
  }

  const parseUnary = (): number => {
    const token = peek()
    if (token?.kind === 'op' && token.value === '-') {
      position++
      return -parseUnary()
    }
    return parsePrimary()
  }

  const parsePrimary = (): number => {
    const token = peek()
    if (token === undefined) {
      throw new ExpressionError(`Neúplný výraz: ${JSON.stringify(input)}`)
    }
    if (token.kind === 'num') {
      position++
      return token.value
    }
    if (token.kind === 'paren' && token.value === '(') {
      position++
      const value = parseExpression()
      const closing = peek()
      if (closing?.kind !== 'paren' || closing.value !== ')') {
        throw new ExpressionError(`Chybí uzavírací závorka: ${JSON.stringify(input)}`)
      }
      position++
      return value
    }
    throw new ExpressionError(`Neočekávaný token ve výrazu ${JSON.stringify(input)}`)
  }

  const result = parseExpression()
  if (position !== tokens.length) {
    throw new ExpressionError(`Přebytečný text ve výrazu ${JSON.stringify(input)}`)
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Dekódování
// ─────────────────────────────────────────────────────────────────────────────

export interface CodeIndex {
  /** Kód → písmeno. Více kódů smí ukazovat na stejné písmeno, opačně nikdy. */
  byCode: Map<number, string>
  /** Kódy, které v tabulce ukazují na dvě různá písmena — vždy vada. */
  ambiguous: number[]
}

export function buildCodeIndex(table: CipherTable): CodeIndex {
  const byCode = new Map<number, string>()
  const ambiguous: number[] = []

  for (const cell of table.cells) {
    const existing = byCode.get(cell.code.n)
    if (existing === undefined) {
      byCode.set(cell.code.n, cell.letter)
    } else if (existing !== cell.letter) {
      ambiguous.push(cell.code.n)
    }
  }
  return { byCode, ambiguous }
}

/**
 * Rozluští list tak, jak by ho luštilo dítě: má jen tabulku a výsledky příkladů.
 * Nedostane tajenku ani nic z generátoru.
 */
export function decode(table: CipherTable, values: readonly number[]): string {
  const { byCode } = buildCodeIndex(table)
  return values.map((value) => byCode.get(value) ?? '?').join('')
}

// ─────────────────────────────────────────────────────────────────────────────
// Verifikace listu
// ─────────────────────────────────────────────────────────────────────────────

export interface SheetSlot {
  /** Text tak, jak bude vytištěn na listu. Parsuje se znovu, od nuly. */
  taskText: string
  /** Hodnota, kterou o téhle úloze tvrdí generátor. */
  declaredValue: number
}

export interface VerifiableSheet {
  table: CipherTable
  slots: readonly SheetSlot[]
  /** Písmena tajenky bez mezer a diakritiky — viz `plainLetters` v core/text. */
  expectedMessage: string
}

/**
 * Čtyři kontroly z docs/rozsah-0.1.md §3.7. Selže-li kterákoli, list se
 * nesmí zobrazit ani vytisknout — generuje se znovu s jiným seedem.
 */
export function verifySheet(sheet: VerifiableSheet): VerificationReport {
  const failures: VerificationFailure[] = []
  const { byCode, ambiguous } = buildCodeIndex(sheet.table)

  // 1. Žádný kód nesmí ukazovat na dvě různá písmena.
  for (const code of ambiguous) {
    failures.push({
      code: 'ambiguous-code',
      message: `Kód ${code} ukazuje v tabulce na více různých písmen.`,
    })
  }

  // 2. Každý příklad se přepočítá nezávisle na generátoru.
  sheet.slots.forEach((slot, index) => {
    let computed: number
    try {
      computed = evaluateExpression(slot.taskText)
    } catch (error) {
      failures.push({
        code: 'task-value-mismatch',
        message: `Úloha č. ${index + 1} (${slot.taskText}) nejde vyhodnotit: ${
          error instanceof Error ? error.message : String(error)
        }`,
      })
      return
    }
    if (computed !== slot.declaredValue) {
      failures.push({
        code: 'task-value-mismatch',
        message: `Úloha č. ${index + 1} (${slot.taskText}) dává ${computed}, generátor tvrdí ${slot.declaredValue}.`,
      })
    }
  })

  // 3. Každá potřebná hodnota musí být v tabulce dohledatelná.
  sheet.slots.forEach((slot, index) => {
    if (!byCode.has(slot.declaredValue)) {
      failures.push({
        code: 'value-not-in-table',
        message: `Výsledek ${slot.declaredValue} (úloha č. ${index + 1}) v tabulce neexistuje.`,
      })
    }
  })

  // 4. Rozluštění musí dát přesně zadanou tajenku.
  const decoded = decode(
    sheet.table,
    sheet.slots.map((slot) => slot.declaredValue),
  )
  if (decoded !== sheet.expectedMessage) {
    failures.push({
      code: 'decoded-message-mismatch',
      message: `Rozluštěním vyšlo ${JSON.stringify(decoded)}, očekáváno ${JSON.stringify(sheet.expectedMessage)}.`,
    })
  }

  return failures.length === 0 ? { ok: true } : { ok: false, failures }
}
