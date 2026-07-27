/**
 * Mřížkové šifry.
 *
 * Rozmístění písmen, klamná písmena i ústupky jsou u všech mřížkových šifer
 * stejné — liší se jen tím, jaké číslo ukazuje na kterou buňku. To je celý
 * obsah `GridScheme`. Přidat další mřížkovou variantu tedy znamená napsat
 * dvě funkce, ne další kopii rozmísťovacího algoritmu.
 *
 * O matematice tenhle modul neví nic. Dostane množinu hodnot, které vrstva
 * úloh umí vyrobit, a vrátí seznam hodnot, které potřebuje.
 */

import { chooseGrid, relaxation, type CodeForCell } from '../../core/constraints/index.js'
import type {
  CipherArtifact,
  CipherCell,
  CipherStrategyId,
  CodeToken,
  RelaxationLog,
} from '../../core/model/index.js'
import type { Rng } from '../../core/rng/index.js'
import { ALPHABET, CZECH_LETTER_WEIGHTS, type NormalizedMessage } from '../../core/text/index.js'

export interface GridScheme {
  id: CipherStrategyId
  /** Horní mez strany mřížky. */
  maxSide: number
  codeFor: CodeForCell
  tokenFor(row: number, col: number, rows: number, cols: number): CodeToken
}

/**
 * Souřadnice: výsledek 34 znamená 3. řádek, 4. sloupec.
 *
 * Mřížka nesmí být větší než 9×9 — desátý řádek by dal kód 104 a dvouciferné
 * čtení by přestalo platit. Je to vlastnost zápisu, ne libovolný limit.
 */
export const coordScheme: GridScheme = {
  id: 'grid-coord',
  maxSide: 9,
  codeFor: (row, col) => row * 10 + col,
  tokenFor: (row, col) => ({ kind: 'coord', n: row * 10 + col, row, col }),
}

/** Buňky číslované 1..N v pořadí čtení. Jednodušší, ale souřadnice neučí. */
export const linearScheme: GridScheme = {
  id: 'grid-linear',
  maxSide: 12,
  codeFor: (row, col, _rows, cols) => (row - 1) * cols + col,
  tokenFor: (row, col, _rows, cols) => ({ kind: 'linear', n: (row - 1) * cols + col }),
}

export interface GridRequest {
  message: NormalizedMessage
  /** Hodnoty dosažitelné vrstvou úloh. Určuje, kam smí přijít písmeno tajenky. */
  reachable: ReadonlySet<number>
  /** Podíl klamných písmen, 0–1. */
  decoyDensity: number
  /** Ideál: každý výskyt písmene má vlastní buňku. Měkké omezení. */
  distinctCellPerOccurrence: boolean
  /** Ruční volba rozměrů. Respektuje se, i když si vyžádá ústupky jinde. */
  gridOverride?: { rows: number; cols: number }
}

export type GridResult =
  | { ok: true; artifact: CipherArtifact; relaxations: RelaxationLog[] }
  | { ok: false; relaxations: RelaxationLog[]; reason: string }

export function buildGrid(request: GridRequest, rng: Rng, scheme: GridScheme): GridResult {
  const relaxations: RelaxationLog[] = []
  const { message } = request

  if (message.letters.length === 0) {
    return { ok: false, relaxations, reason: 'Tajenka neobsahuje žádné písmeno.' }
  }

  const distinctLetters = [...message.histogram.keys()]

  // Kolik buněk chceme pro každé písmeno. Ideál = jedna na každý výskyt,
  // aby dítě nenašlo dvakrát stejnou souřadnici.
  let wanted = new Map(
    distinctLetters.map((letter) => [
      letter,
      request.distinctCellPerOccurrence ? message.histogram.get(letter)! : 1,
    ]),
  )

  let grid = planGrid(wanted, request, scheme)

  // Ústupek 1: recyklovat souřadnice. Tajenka „ANANAS V MARMELÁDĚ" má 5× A
  // a do malé mřížky se pět různých áček nevejde. Viz návrh §3.3.
  if (grid === null && request.distinctCellPerOccurrence) {
    wanted = new Map(distinctLetters.map((letter) => [letter, 1]))
    grid = planGrid(wanted, request, scheme)
    if (grid !== null) {
      relaxations.push(
        relaxation.notice(
          'coordinate-reuse',
          'Některá písmena se v tajence opakují častěji, než se vejde do tabulky — jejich souřadnice se opakují.',
        ),
      )
    }
  }

  if (grid === null) {
    return {
      ok: false,
      relaxations,
      reason:
        'Tajenku nelze s tímto nastavením vytvořit — je příliš dlouhá, nebo obtížnost nedovoluje dost různých výsledků.',
    }
  }

  const usable = rng.shuffle(grid.usableCodes)
  if (usable.length < countCells(wanted)) {
    return {
      ok: false,
      relaxations,
      reason: 'V tabulce není dost políček s dosažitelným výsledkem.',
    }
  }

  // Rozdělení použitelných kódů mezi písmena tajenky.
  const codesByLetter = new Map<string, number[]>()
  let cursor = 0
  for (const letter of distinctLetters) {
    const take = wanted.get(letter)!
    codesByLetter.set(letter, usable.slice(cursor, cursor + take))
    cursor += take
  }

  const letterByCode = new Map<number, string>()
  for (const [letter, codes] of codesByLetter) {
    for (const code of codes) letterByCode.set(code, letter)
  }

  // Zbytek mřížky vyplní klamná písmena. Bez nich by šla tajenka uhodnout
  // bez počítání — tabulka by obsahovala jen písmena, která se v ní vyskytují.
  const cells: CipherCell[] = []
  for (let row = 1; row <= grid.rows; row++) {
    for (let col = 1; col <= grid.cols; col++) {
      const code = scheme.tokenFor(row, col, grid.rows, grid.cols)
      const assigned = letterByCode.get(code.n)
      cells.push({
        code,
        letter: assigned ?? randomDecoyLetter(rng),
        isDecoy: assigned === undefined,
      })
    }
  }

  const tokenByCode = new Map(cells.map((cell) => [cell.code.n, cell.code]))

  // Pořadí kódů pro jednotlivé výskyty. Když je kódů méně než výskytů
  // (po ústupku výše), střídají se dokola.
  const nextIndex = new Map<string, number>()
  const sequence = message.letters.map((letter) => {
    const codes = codesByLetter.get(letter)!
    const index = nextIndex.get(letter) ?? 0
    nextIndex.set(letter, index + 1)
    return tokenByCode.get(codes[index % codes.length]!)!
  })

  if (request.gridOverride) {
    relaxations.push(
      relaxation.silent('grid-override', `Použity ručně zadané rozměry ${grid.rows}×${grid.cols}.`),
    )
  }

  return {
    ok: true,
    relaxations,
    artifact: {
      table: { rows: grid.rows, cols: grid.cols, cells },
      sequence,
      requiredValues: sequence.map((token) => token.n),
    },
  }
}

function countCells(wanted: ReadonlyMap<string, number>): number {
  let total = 0
  for (const count of wanted.values()) total += count
  return total
}

function planGrid(
  wanted: ReadonlyMap<string, number>,
  request: GridRequest,
  scheme: GridScheme,
) {
  const letterCells = countCells(wanted)
  const density = Math.min(Math.max(request.decoyDensity, 0), 0.9)
  const totalCells = Math.ceil(letterCells / (1 - density))
  return chooseGrid({
    letterCells,
    totalCells,
    reachable: request.reachable,
    codeFor: scheme.codeFor,
    maxSide: scheme.maxSide,
    override: request.gridOverride,
  })
}

/**
 * Klamné písmeno podle četnosti v češtině — aby tabulka vypadala jako český
 * text. Rovnoměrný výběr by ji prozradil: samé X, Q a W vedle sebe je nápadné.
 */
function randomDecoyLetter(rng: Rng): string {
  return rng.weighted(
    ALPHABET.map((letter) => [letter, CZECH_LETTER_WEIGHTS[letter] ?? 0.1] as const),
  )
}
