/**
 * Šifra `grid-linear`: buňky tabulky jsou očíslované 1..N v pořadí čtení
 * a výsledek příkladu je číslo buňky.
 *
 * O matematice tenhle modul neví nic. Dostane množinu hodnot, které vrstva úloh
 * umí vyrobit, a vrátí seznam hodnot, které potřebuje. To je celé rozhraní mezi
 * oběma vrstvami — a důvod, proč půjde v 0.8 postavit domino beze změny v `tasks/`.
 */

import { chooseGrid, relaxation } from '../../core/constraints/index.js'
import type { CipherArtifact, CipherCell, RelaxationLog } from '../../core/model/index.js'
import type { Rng } from '../../core/rng/index.js'
import { ALPHABET, CZECH_LETTER_WEIGHTS, type NormalizedMessage } from '../../core/text/index.js'

export interface GridLinearRequest {
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

export type GridLinearResult =
  | { ok: true; artifact: CipherArtifact; relaxations: RelaxationLog[] }
  | { ok: false; relaxations: RelaxationLog[]; reason: string }

export function buildGridLinear(request: GridLinearRequest, rng: Rng): GridLinearResult {
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

  let grid = planGrid(wanted, request)

  // Ústupek 1: recyklovat souřadnice. Tajenka „ANANAS V MARMELÁDĚ" má 5× A
  // a do malé mřížky se pět různých áček nevejde. Viz návrh §3.3.
  if (grid === null && request.distinctCellPerOccurrence) {
    wanted = new Map(distinctLetters.map((letter) => [letter, 1]))
    grid = planGrid(wanted, request)
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

  const capacity = grid.rows * grid.cols
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

  // Zbytek mřížky vyplní klamná písmena. Bez nich by šla tajenka uhodnout
  // bez počítání — tabulka by obsahovala jen písmena, která se v ní vyskytují.
  const letterByCode = new Map<number, string>()
  for (const [letter, codes] of codesByLetter) {
    for (const code of codes) letterByCode.set(code, letter)
  }

  const cells: CipherCell[] = []
  for (let code = 1; code <= capacity; code++) {
    const assigned = letterByCode.get(code)
    cells.push({
      code: { kind: 'linear', n: code },
      letter: assigned ?? randomDecoyLetter(rng),
      isDecoy: assigned === undefined,
    })
  }

  // Pořadí kódů pro jednotlivé výskyty. Když je kódů méně než výskytů
  // (po ústupku výše), střídají se dokola.
  const nextIndex = new Map<string, number>()
  const sequence = message.letters.map((letter) => {
    const codes = codesByLetter.get(letter)!
    const index = nextIndex.get(letter) ?? 0
    nextIndex.set(letter, index + 1)
    return { kind: 'linear' as const, n: codes[index % codes.length]! }
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

function planGrid(wanted: ReadonlyMap<string, number>, request: GridLinearRequest) {
  const letterCells = countCells(wanted)
  const density = Math.min(Math.max(request.decoyDensity, 0), 0.9)
  const totalCells = Math.ceil(letterCells / (1 - density))
  return chooseGrid({
    letterCells,
    totalCells,
    reachable: request.reachable,
    override: request.gridOverride,
  })
}

/**
 * Klamné písmeno podle četnosti v češtině — aby tabulka vypadala jako český
 * text. Rovnoměrný výběr by ji prozradil: samé X, Q a W vedle sebe je nápadné.
 */
function randomDecoyLetter(rng: Rng): string {
  return rng.weighted(ALPHABET.map((letter) => [letter, CZECH_LETTER_WEIGHTS[letter] ?? 0.1] as const))
}
