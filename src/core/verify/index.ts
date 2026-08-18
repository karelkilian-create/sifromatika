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
  PromptNode,
  Task,
  VerificationFailure,
  VerificationReport,
} from '../model/index.js'
import { inferMissing, parseSequence, SequenceError } from '../sequence/index.js'

// ─────────────────────────────────────────────────────────────────────────────
// Vyhodnocení výrazu
// ─────────────────────────────────────────────────────────────────────────────

export class ExpressionError extends Error {}

/**
 * Mocnina a odmocnina mají VLASTNÍ druh tokenu, nejsou to `op`.
 *
 * Není to kosmetika. Kontrola „dva operátory vedle sebe" by jinak označila
 * `2 · √9` za chybný zápis, přestože je správně — odmocnina je předpona
 * čísla, ne binární operátor mezi dvěma čísly.
 */
type Token =
  | { kind: 'num'; value: number }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' }
  | { kind: 'paren'; value: '(' | ')' }
  /** Horní index `²` nebo `³` — připojuje se zprava k číslu nebo závorce. */
  | { kind: 'power'; exponent: number }
  /** Znak `√` — předpona toho, co následuje. */
  | { kind: 'root' }
  /** Znak `%` — připojuje se zprava k číslu: `25 %` je 0,25. */
  | { kind: 'percent' }
  /**
   * Předložka `z` v zápisu `25 % z 80`.
   *
   * Vlastní druh tokenu, ne alias pro násobení. Kdyby to bylo `op`, hlásila
   * by kontrola zápisu u `25 % z 80` dva operátory vedle sebe — a hláška
   * o závorkách kolem záporného čísla by u procent nedávala smysl.
   */
  | { kind: 'of' }

/**
 * Zápisy, které se na českém pracovním listu reálně objeví.
 * Dělení se píše dvojtečkou (`36 : 4`), násobení tečkou (`6 · 4`). Křížek se
 * jako vstup přijímá taky — může přijít z ručně upraveného `.sifra` nebo
 * ze starší verze — ale generátor ho nevyrábí.
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

/** Horní indexy tak, jak se sázejí na list. Vyšší než třetí mocninu nepíšeme. */
const SUPERSCRIPTS: Readonly<Record<string, number>> = {
  '²': 2, // U+00B2
  '³': 3, // U+00B3
}

/** U+221A SQUARE ROOT */
const ROOT_SIGN = '√'

/**
 * Desetinné oddělovače, které tokenizer přijme.
 *
 * Generátor vyrábí VÝHRADNĚ čárku (český úzus). Tečka se přijímá proto, že
 * `.sifra` může přijít ručně upravená nebo z ciziny — odmítnout kvůli tečce
 * jinak správný list by bylo přísnější, než je zdrávo.
 *
 * Čárka může být desetinná právě proto, že členy číselné řady odděluje mezera.
 * Viz `core/sequence`.
 */
const DECIMAL_SEPARATORS = [',', '.']

/** Předložka v zápisu `25 % z 80`. `ze` kvůli ručně upraveným souborům. */
const OF_WORDS = ['ze', 'z']

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

      // Desetinná část jen tehdy, když za oddělovačem opravdu stojí číslice.
      // Bez téhle podmínky by se z věty ukončené tečkou stalo číslo.
      const separator = source[i]
      const afterSeparator = source[i + 1]
      if (
        separator !== undefined &&
        DECIMAL_SEPARATORS.includes(separator) &&
        afterSeparator !== undefined &&
        afterSeparator >= '0' &&
        afterSeparator <= '9'
      ) {
        i++
        let decimals = ''
        while (i < source.length && source[i]! >= '0' && source[i]! <= '9') {
          decimals += source[i]!
          i++
        }
        tokens.push({ kind: 'num', value: Number(`${digits}.${decimals}`) })
        continue
      }

      tokens.push({ kind: 'num', value: Number(digits) })
      continue
    }
    if (char === '%') {
      tokens.push({ kind: 'percent' })
      i++
      continue
    }
    if (char === '(' || char === ')') {
      tokens.push({ kind: 'paren', value: char })
      i++
      continue
    }
    const exponent = SUPERSCRIPTS[char]
    if (exponent !== undefined) {
      tokens.push({ kind: 'power', exponent })
      i++
      continue
    }
    if (char === ROOT_SIGN) {
      tokens.push({ kind: 'root' })
      i++
      continue
    }
    const operator = OPERATOR_ALIASES[char]
    if (operator !== undefined) {
      tokens.push({ kind: 'op', value: operator })
      i++
      continue
    }

    // Předložka `z` / `ze`. Musí stát samostatně — jinak by se první dvě
    // písmena jakéhokoli slova začínajícího na „ze" tvářila jako operátor
    // a zbytek by spadl až na neznámém znaku, s matoucí hláškou.
    const rest = source.slice(i).toLowerCase()
    const word = OF_WORDS.find(
      (candidate) => rest.startsWith(candidate) && !isWordChar(rest[candidate.length]),
    )
    if (word !== undefined) {
      tokens.push({ kind: 'of' })
      i += word.length
      continue
    }

    throw new ExpressionError(`Neznámý znak ${JSON.stringify(char)} ve výrazu ${JSON.stringify(input)}`)
  }

  if (tokens.length === 0) {
    throw new ExpressionError(`Prázdný výraz: ${JSON.stringify(input)}`)
  }
  return tokens
}

/** Je to písmeno, tedy pokračování slova? `undefined` = konec vstupu. */
function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /\p{L}/u.test(char)
}

/**
 * Stojí ve výrazu dva operátory vedle sebe?
 *
 * `−7 · −2` je špatně zapsaná matematika, i když se to dá spočítat. Správně
 * je `−7 · (−2)`. Znaménko na začátku výrazu nebo hned za otevírací závorkou
 * je v pořádku — tam žádný operátor nepředchází.
 *
 * Je to kontrola zápisu, ne výsledku, a přesto patří sem: na listu pro děti
 * je chybný zápis vada úplně stejně jako chybný výsledek. Rozdíl je jen
 * v tom, že tuhle vadu nechytí přepočet.
 */
export function hasAdjacentOperators(input: string): boolean {
  let tokens: Token[]
  try {
    tokens = tokenize(input)
  } catch {
    return false // nečitelný výraz řeší přepočet, ne tahle kontrola
  }

  for (let i = 1; i < tokens.length; i++) {
    const previous = tokens[i - 1]!
    if (tokens[i]!.kind === 'op' && previous.kind === 'op') return true
  }
  return false
}

/**
 * Tolerance při porovnání výsledku.
 *
 * Do 0.1 verze by tu nemusela být — celá čísla se porovnávají přesně. Jenže
 * `0,07 · 300` vyjde v plovoucí čárce jako 21.000000000000004, a takových
 * kombinací je mezi desetinnými operandy pár promile. Bez tolerance by se
 * jinak správný list zamítl a učitel by dostal „zkus jinou variantu" bez
 * vysvětlení — vzácně, nepředvídatelně, a proto o to hůř.
 *
 * Verifikaci to neoslabuje: chyba generátoru je vždy řádová (spletená operace,
 * jiný operand), ne v deváté desetině.
 */
const EPSILON = 1e-9

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON
}

/** Je to celé číslo, nebo aspoň nerozeznatelně blízko? */
function isWholeNumber(value: number): boolean {
  return nearlyEqual(value, Math.round(value))
}

/**
 * Spočítá hodnotu aritmetického výrazu.
 *
 * Podporuje `+ − · :`, závorky, unární mínus, mocniny `²` a `³`, odmocninu
 * `√`, desetinná čísla (`3,5`) a procenta (`25 % z 80`), se standardní
 * prioritou.
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

      // `25 % z 80` je násobení: 0,25 · 80. Váže stejně těsně jako tečka,
      // takže `200 − 25 % z 200` je 200 − 50, ne (200 − 25 %) · 200.
      if (token?.kind === 'of') {
        position++
        value = value * parseUnary()
        continue
      }

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
    if (token?.kind === 'root') {
      position++
      const radicand = parseUnary()
      if (radicand < 0) {
        throw new ExpressionError(`Odmocnina ze záporného čísla ve výrazu ${JSON.stringify(input)}`)
      }
      return Math.sqrt(radicand)
    }
    return parsePostfix()
  }

  /**
   * Mocnina se váže těsněji než násobení i než unární mínus:
   * `2 · 3²` je 2 · 9, nikoli (2 · 3)², a `−7²` je −49, nikoli 49.
   */
  const parsePostfix = (): number => {
    let value = parsePrimary()
    for (;;) {
      const token = peek()
      if (token?.kind === 'percent') {
        position++
        value = value / 100
        continue
      }
      if (token?.kind !== 'power') break
      position++
      value = value ** token.exponent
    }
    return value
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
  /**
   * Jak se text čte. Chybí-li, čte se jako aritmetický výraz.
   *
   * Rozlišuje se výslovně, ne podle tvaru textu. Heuristika typu „obsahuje
   * mezeru“ by u výrazů `18 + 6` selhala okamžitě a jakákoli jiná by selhala
   * později — u prvního typu úlohy, který se do žádného vzorku netrefí.
   */
  kind?: PromptNode['kind']
}

/** Přepočet jedné úlohy. Vrací prázdné pole, když je všechno v pořádku. */
function verifySlot(slot: SheetSlot, index: number): VerificationFailure[] {
  const label = `Úloha č. ${index + 1} (${slot.taskText})`

  if (slot.kind === 'sequence') {
    let inference
    try {
      inference = inferMissing(parseSequence(slot.taskText))
    } catch (error) {
      if (!(error instanceof SequenceError)) throw error
      return [{ code: 'task-value-mismatch', message: `${label} nejde přečíst: ${error.message}` }]
    }

    switch (inference.kind) {
      case 'unreadable':
        return [{ code: 'task-value-mismatch', message: `${label}: ${inference.reason}` }]
      case 'ambiguous': {
        const readings = inference.readings
          .map((reading) => `${reading.rule.description} → ${reading.value}`)
          .join('; ')
        return [
          {
            code: 'ambiguous-sequence',
            message: `${label} má víc správných řešení (${readings}). Dítě může odpovědět správně a mít křížek.`,
          },
        ]
      }
      case 'unique':
        return inference.value === slot.declaredValue
          ? []
          : [
              {
                code: 'task-value-mismatch',
                message: `${label} dává ${inference.value}, generátor tvrdí ${slot.declaredValue}.`,
              },
            ]
    }
  }

  let computed: number
  try {
    computed = evaluateExpression(slot.taskText)
  } catch (error) {
    return [
      {
        code: 'task-value-mismatch',
        message: `${label} nejde vyhodnotit: ${error instanceof Error ? error.message : String(error)}`,
      },
    ]
  }

  if (hasAdjacentOperators(slot.taskText)) {
    return [
      {
        code: 'malformed-notation',
        message: `${label} má dva operátory vedle sebe. Záporné číslo za operátorem patří do závorky: −7 · (−2), nikoli −7 · −2.`,
      },
    ]
  }

  // Výsledek musí být celé číslo — je to kód políčka v mřížce. Do 0.1 to
  // platilo samo, protože celé bylo všechno. S desetinnými operandy je tohle
  // to jediné místo, kde se pravidlo vynutí: `0,3 · 7` je matematicky správně
  // a jako kód políčka nepoužitelné.
  if (!isWholeNumber(computed)) {
    return [
      {
        code: 'non-integer-result',
        message: `${label} dává ${computed}, což není celé číslo. Desetinná čísla smí být jen v zadání, ne ve výsledku.`,
      },
    ]
  }

  return nearlyEqual(computed, slot.declaredValue)
    ? []
    : [
        {
          code: 'task-value-mismatch',
          message: `${label} dává ${computed}, generátor tvrdí ${slot.declaredValue}.`,
        },
      ]
}

/**
 * Přepočet samotných úloh, bez šifrovací tabulky.
 *
 * Aktivity bez tajenky (list řad, později bingo) nemají co dekódovat, ale
 * kontrola „úloha dává, co generátor tvrdí" pro ně platí úplně stejně —
 * a u řad k ní patří i to, že řešení existuje právě jedno.
 */
export function verifyTasks(slots: readonly SheetSlot[]): VerificationReport {
  const failures: VerificationFailure[] = []
  slots.forEach((slot, index) => {
    failures.push(...verifySlot(slot, index))
  })
  return failures.length === 0 ? { ok: true } : { ok: false, failures }
}

/**
 * Mají všechny úlohy navzájem různý výsledek?
 *
 * ⚠ Volá se JEN u párovacích aktivit (pexeso, domino), NIKOLI u šifry.
 *   V mřížce jsou dvě zadání s toutéž hodnotou legitimní a po ústupku
 *   `coordinate-reuse` dokonce běžná — dvě různá písmena prostě ukazují na
 *   totéž políčko.
 *
 * U pexesa je to vada. Kdyby na stole leželo `7 · 8` i `28 + 28`, dítě spáruje
 * `56` s tím druhým, bude mít pravdu a hra mu nevyjde.
 */
export function verifyDistinctValues(tasks: readonly Task[]): VerificationReport {
  const byValue = new Map<number, string[]>()
  for (const task of tasks) {
    const texts = byValue.get(task.value) ?? []
    texts.push(task.prompt.text)
    byValue.set(task.value, texts)
  }

  const failures: VerificationFailure[] = []
  for (const [value, texts] of byValue) {
    if (texts.length < 2) continue
    failures.push({
      code: 'ambiguous-pairing',
      message: `Výsledek ${value} má víc zadání (${texts.join(', ')}) — párování by nebylo jednoznačné.`,
    })
  }
  return failures.length === 0 ? { ok: true } : { ok: false, failures }
}

/**
 * Jeden kámen domina tak, jak je vytištěný.
 *
 * Obě půlky jsou TEXT, ne čísla z generátoru. Verifikace si hodnotu přečte
 * z papíru a spočítá znovu — jinak by ověřovala generátor místo toho, co
 * dostane dítě do ruky.
 */
export interface ChainTile {
  /** Levá půlka: hotová hodnota (`56`). */
  left: string
  /** Pravá půlka: zadání, jehož výsledek ukazuje na další kámen (`7 · 8`). */
  right: string
  /** Jak se čte pravá půlka. Chybí-li, čte se jako aritmetický výraz. */
  kind?: PromptNode['kind']
}

/** Přečte vytištěnou hodnotu. `null` = nejde přečíst jako číslo. */
function readPrintedValue(text: string): number | null {
  // Čárka je na českém listu desetinný oddělovač; hodnoty kamenů jsou sice
  // vždy celé, ale číst je tolerantně nic nestojí.
  const parsed = Number(text.trim().replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

/** Spočítá pravou půlku. `null` = nejde vyhodnotit nebo má víc řešení. */
function computePrinted(text: string, kind: PromptNode['kind'] | undefined): number | null {
  if (kind === 'sequence') {
    try {
      const inference = inferMissing(parseSequence(text))
      return inference.kind === 'unique' ? inference.value : null
    } catch (error) {
      if (!(error instanceof SequenceError)) throw error
      return null
    }
  }
  try {
    return evaluateExpression(text)
  } catch (error) {
    if (!(error instanceof ExpressionError)) throw error
    return null
  }
}

/**
 * Tvoří kameny JEDEN souvislý kruh?
 *
 * Tohle je celé nové pravidlo domina a žádná kontrola jednotlivé úlohy ho
 * nenahradí: osm kamenů s osmi různými hodnotami se dá spojit i jako dva
 * kroužky po čtyřech. Každý kámen má souseda, každý příklad je spočítaný
 * správně — a dítě to na koberci stejně nesloží.
 *
 * Z konstrukce generátoru to vyjít má; ověřuje se to stejně. Verifikace je
 * poslední pojistka před tiskem, ne ozdoba — kdyby se generátor někdy přepsal,
 * musí to spadnout tady.
 */
export function verifyChain(tiles: readonly ChainTile[]): VerificationReport {
  const failures: VerificationFailure[] = []
  const fail = (message: string): VerificationReport => ({
    ok: false,
    failures: [{ code: 'broken-chain', message }],
  })

  if (tiles.length === 0) return fail('Domino nemá jediný kámen — není co skládat.')

  // Kam který kámen ukazuje levou půlkou. Dvě stejné hodnoty vlevo znamenají,
  // že na jedno zadání pasují dva kameny a řetěz se větví.
  const byLeft = new Map<number, number>()
  tiles.forEach((tile, index) => {
    const value = readPrintedValue(tile.left)
    if (value === null) {
      failures.push({
        code: 'broken-chain',
        message: `Levá půlka kamene č. ${index + 1} („${tile.left}") není číslo.`,
      })
      return
    }
    if (byLeft.has(value)) {
      failures.push({
        code: 'broken-chain',
        message: `Hodnota ${value} je vlevo na dvou kamenech — dítě by mělo na výběr a obě volby by byly správně.`,
      })
      return
    }
    byLeft.set(value, index)
  })
  if (failures.length > 0) return { ok: false, failures }

  // Následník: kámen, jehož levá půlka se rovná výsledku pravé půlky.
  const next: number[] = []
  for (const [index, tile] of tiles.entries()) {
    const computed = computePrinted(tile.right, tile.kind)
    if (computed === null) {
      return fail(`Zadání na kameni č. ${index + 1} („${tile.right}") nejde vyhodnotit.`)
    }
    const successor = byLeft.get(computed)
    if (successor === undefined) {
      return fail(
        `Na kámen č. ${index + 1} („${tile.right}" = ${computed}) nenavazuje žádný další — řetěz se přetrhne.`,
      )
    }
    next.push(successor)
  }

  // Obchůzka: z prvního kamene se musí projít VŠECHNY a skončit zase u něj.
  // Kratší okruh znamená, že se domino rozpadlo na několik kroužků.
  const visited = new Set<number>()
  let current = 0
  for (let step = 0; step < tiles.length; step++) {
    if (visited.has(current)) break
    visited.add(current)
    current = next[current]!
  }

  if (visited.size < tiles.length) {
    return fail(
      `Kameny netvoří jeden kruh, ale ${Math.ceil(tiles.length / visited.size)} kroužky — obejít jich jde jen ${visited.size} z ${tiles.length}.`,
    )
  }
  if (current !== 0) {
    return fail('Řetěz se neuzavírá — poslední kámen nenavazuje na první.')
  }
  return { ok: true }
}

/**
 * Bingo karty tak, jak jsou vytištěné.
 *
 * Čísla jsou TEXT, ne hodnoty z generátoru — verifikace si je přečte z papíru
 * a porovná s tím, co učitel opravdu bude číst nahlas.
 */
export interface BingoCards {
  /** Jedna karta = řádky mřížky, buňka je vytištěný text. */
  cards: readonly (readonly (readonly string[])[])[]
  /** Čísla ve vyvolávacím seznamu, jak jsou vytištěná na listu pro učitele. */
  called: readonly string[]
}

/**
 * Jde každé číslo na kartě vyvolat, a jsou karty navzájem různé?
 *
 * Dvě kontroly, obě takové, že je žádný přepočet jednotlivé úlohy neodhalí:
 *
 *  1. **Číslo, které nikdo nepřečte.** Dítě, které ho má na kartě, nemůže
 *     vyhrát — a nepozná, že to není jeho chyba.
 *  2. **Dvě stejné karty** (dvě děti volají bingo naráz) nebo totéž číslo
 *     dvakrát na jedné kartě (jedno škrtnutí zabere dvě políčka).
 */
export function verifyBingoCards(sheet: BingoCards): VerificationReport {
  const failures: VerificationFailure[] = []
  const called = new Set(sheet.called.map((value) => value.trim()))

  const seenCards = new Map<string, number>()
  sheet.cards.forEach((card, index) => {
    const cells = card.flatMap((row) => row.map((cell) => cell.trim()))

    for (const cell of cells) {
      if (!called.has(cell)) {
        failures.push({
          code: 'uncallable-value',
          message: `Karta č. ${index + 1} má číslo ${cell}, které není ve vyvolávacím seznamu — dítě s touhle kartou nemůže vyhrát.`,
        })
      }
    }

    if (new Set(cells).size !== cells.length) {
      failures.push({
        code: 'duplicate-card',
        message: `Karta č. ${index + 1} má totéž číslo dvakrát — jedno škrtnutí by zabralo dvě políčka.`,
      })
    }

    // Pořadí čísel na kartě je součást karty: dvě karty s týmiž čísly jinak
    // rozmístěnými jsou různé karty a vyhrají v jiném okamžiku.
    const fingerprint = cells.join('|')
    const twin = seenCards.get(fingerprint)
    if (twin !== undefined) {
      failures.push({
        code: 'duplicate-card',
        message: `Karty č. ${twin + 1} a ${index + 1} jsou stejné — dvě děti by volaly bingo naráz.`,
      })
    } else {
      seenCards.set(fingerprint, index)
    }
  })

  return failures.length === 0 ? { ok: true } : { ok: false, failures }
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

  // 2. Každá úloha se přepočítá nezávisle na generátoru. U řad je součástí
  //    přepočtu i to, že řešení smí být jen jedno.
  sheet.slots.forEach((slot, index) => {
    failures.push(...verifySlot(slot, index))
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
