/**
 * Čtečka vět s matematickými pojmy — „Kolik je součin čísel 6 a 7?“.
 *
 * Modul úmyslně NEUMÍ věty vyrábět. Dostane vytištěný text, pozná v něm jednu
 * z pevných šablon, vytáhne čísla a spočítá výsledek. Slouží verifikaci
 * (`core/verify`) a generátoru jen jako sebekontrola, stejně jako
 * `core/sequence` u řad. Rozvaha je v `docs/navrh-matematicke-pojmy.md` §5.
 *
 * ⚠ Tabulky „pojem → operace“ a „násobná číslovka → číslo“ tu stojí ZNOVU,
 *   nezávisle na `tasks/terms`, a tak to musí zůstat. Celé téma je o tom, že
 *   děti zaměňují „pětkrát menší“ s násobením. Kdyby si generátor i čtečka
 *   vzaly jednu tabulku, stejná záměna by v ní prošla oběma a list by dítěti
 *   tvrdil, že pětkrát menší než 40 je 200.
 *
 * ⚠ Text, který žádné šabloně neodpovídá, se nehádá. Věta přeformulovaná
 *   jinak („Jaký je součet…“) je pro čtečku neznámá a list s ní neprojde —
 *   nová šablona se přidává sem i do generátoru, vědomě na obou místech.
 */

/** Pojem → co se s dvojicí čísel udělá. `null` = v přirozených číslech to nejde. */
const TERM_VALUE: Readonly<Record<string, (a: number, b: number) => number | null>> = {
  součet: (a, b) => a + b,
  rozdíl: (a, b) => (a > b ? a - b : null),
  součin: (a, b) => a * b,
  podíl: (a, b) => (b !== 0 && a % b === 0 ? a / b : null),
}

/**
 * Násobné číslovky, jak je píše generátor: slovem, ne „5krát“.
 *
 * Jen dvě až deset. Jednou ani nulakrát se neporovnává, a jedenáctkrát už
 * není malá násobilka.
 */
const TIMES_WORD: Readonly<Record<string, number>> = {
  dvakrát: 2,
  třikrát: 3,
  čtyřikrát: 4,
  pětkrát: 5,
  šestkrát: 6,
  sedmkrát: 7,
  osmkrát: 8,
  devětkrát: 9,
  desetkrát: 10,
}

const TERM = '(součet|rozdíl|součin|podíl)'
const NUMBER = '(\\d+)'

/** Kolik je součet čísel 45 a 37? */
const SINGLE = new RegExp(`^Kolik je ${TERM} čísel ${NUMBER} a ${NUMBER}\\?$`, 'u')

/** O kolik je součet čísel 12 a 4 větší než jejich rozdíl? */
const PAIR = new RegExp(
  `^(O kolik|Kolikrát) je ${TERM} čísel ${NUMBER} a ${NUMBER} (větší|menší) než jejich ${TERM}\\?$`,
  'u',
)

/** Které číslo je o 7 větší než 35? */
const BY_DIFFERENCE = new RegExp(`^Které číslo je o ${NUMBER} (větší|menší) než ${NUMBER}\\?$`, 'u')

/** Které číslo je pětkrát menší než 40? */
const BY_RATIO = /^Které číslo je (\p{L}+) (větší|menší) než (\d+)\?$/u

export type PhraseReading =
  | { kind: 'value'; value: number }
  /** Věta neodpovídá žádné šabloně — zápis, kterému čtečka nerozumí. */
  | { kind: 'unreadable'; reason: string }
  /**
   * Věta se přečte, ale nemá smysl: „O kolik je 5 větší než 9?“, „rozdíl
   * čísel 3 a 5“, „pětkrát menší než 12“. Dítě by na ni nemělo co odpovědět.
   */
  | { kind: 'invalid'; reason: string }

function invalid(reason: string): PhraseReading {
  return { kind: 'invalid', reason }
}

function term(name: string, a: number, b: number): number | null {
  return TERM_VALUE[name]!(a, b)
}

/** Spočítá větu tak, jak je vytištěná. */
export function readPhrase(text: string): PhraseReading {
  const trimmed = text.trim()

  let match = SINGLE.exec(trimmed)
  if (match !== null) {
    const [, name, a, b] = match as unknown as [string, string, string, string]
    const value = term(name, Number(a), Number(b))
    return value === null
      ? invalid(`${name} čísel ${a} a ${b} nevyjde v přirozených číslech`)
      : { kind: 'value', value }
  }

  match = PAIR.exec(trimmed)
  if (match !== null) {
    const [, question, first, a, b, direction, second] = match as unknown as string[] as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ]
    if (first === second) return invalid(`porovnává ${first} sám se sebou`)
    const left = term(first, Number(a), Number(b))
    const right = term(second, Number(a), Number(b))
    if (left === null) return invalid(`${first} čísel ${a} a ${b} nevyjde v přirozených číslech`)
    if (right === null) return invalid(`${second} čísel ${a} a ${b} nevyjde v přirozených číslech`)
    // „větší“ se ptá, o kolik (kolikrát) levá strana převyšuje pravou,
    // „menší“ obráceně. Věta, která tvrdí opak skutečnosti, je vada.
    const [bigger, smaller] = direction === 'větší' ? [left, right] : [right, left]
    if (bigger <= smaller) {
      return invalid(`${first} (${left}) není ${direction} než ${second} (${right})`)
    }
    if (question === 'O kolik') return { kind: 'value', value: bigger - smaller }
    if (smaller === 0 || bigger % smaller !== 0) {
      return invalid(`${bigger} není násobkem ${smaller}, „kolikrát“ nevyjde celé`)
    }
    return { kind: 'value', value: bigger / smaller }
  }

  match = BY_DIFFERENCE.exec(trimmed)
  if (match !== null) {
    const [, by, direction, base] = match as unknown as [string, string, string, string]
    const value = direction === 'větší' ? Number(base) + Number(by) : Number(base) - Number(by)
    return value > 0 ? { kind: 'value', value } : invalid(`o ${by} menší než ${base} není kladné číslo`)
  }

  match = BY_RATIO.exec(trimmed)
  if (match !== null) {
    const [, word, direction, base] = match as unknown as [string, string, string, string]
    const times = timesFor(word)
    if (times === null) {
      return { kind: 'unreadable', reason: `„${word}“ není násobná číslovka od dvou do deseti` }
    }
    const x = Number(base)
    if (direction === 'větší') return { kind: 'value', value: x * times }
    return x % times === 0
      ? { kind: 'value', value: x / times }
      : invalid(`${word} menší než ${base} nevyjde celé`)
  }

  return { kind: 'unreadable', reason: 'věta neodpovídá žádné známé šabloně' }
}

/** `null` = slovo není v tabulce. Přes `hasOwn`, aby „constructor“ nebyl číslovka. */
function timesFor(word: string): number | null {
  return Object.hasOwn(TIMES_WORD, word) ? TIMES_WORD[word]! : null
}
