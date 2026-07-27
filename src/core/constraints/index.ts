/**
 * Profily obtížnosti a volba mřížky.
 *
 * Tady se realizuje obrácení směru odvození z návrhu (§3.1): primární vstup je
 * *tajenka + ročník*. Z profilu vyplyne obor dosažitelných výsledků, a teprve
 * z něj velikost mřížky. Nikoli naopak — nechat uživatele nastavit 10×10
 * u třetí třídy vede na kombinaci, kterou nelze splnit.
 */

import type { DifficultyProfile, Grade, RelaxationLog } from '../model/index.js'

/**
 * Výchozí profil pro ročník.
 *
 * Hodnoty odpovídají běžnému postupu na české ZŠ. Jsou to defaulty, ne dogma —
 * učitel je může v pokročilém nastavení přepsat a takový zásah se pak podle
 * pravidla z §3.1 nikdy nepřepisuje tiše zpátky.
 */
export function gradeProfile(grade: Grade): DifficultyProfile {
  switch (grade) {
    case 3:
      return {
        grade,
        numberRange: { min: 0, max: 100 },
        allowNegatives: false,
        crossesTen: true,
        multiplicationTables: [2, 3, 4, 5, 10],
        divisionExactOnly: true,
        maxOperands: 2,
      }
    case 4:
      return {
        grade,
        numberRange: { min: 0, max: 100 },
        allowNegatives: false,
        crossesTen: true,
        multiplicationTables: [2, 3, 4, 5, 6, 7, 8, 9, 10],
        divisionExactOnly: true,
        maxOperands: 2,
      }
    case 5:
      return {
        grade,
        numberRange: { min: 0, max: 1000 },
        allowNegatives: false,
        crossesTen: true,
        multiplicationTables: [2, 3, 4, 5, 6, 7, 8, 9, 10],
        divisionExactOnly: true,
        maxOperands: 2,
      }
    default:
      // Ročníky 6.–9. jsou mimo rozsah 0.1 (viz docs/rozsah-0.1.md §2).
      // Vracíme profil 5. ročníku, aby typ zůstal totální a nic nespadlo.
      return { ...gradeProfile(5), grade }
  }
}

export interface GridChoice {
  rows: number
  cols: number
  /** Kódy, které vrstva úloh umí vyrobit. Jen na ně smí přijít písmena tajenky. */
  usableCodes: number[]
}

/**
 * Jak se z pozice v mřížce spočítá kód buňky. Řádky i sloupce jsou od 1.
 *
 * Právě tahle funkce odlišuje `grid-linear` od `grid-coord`; volba mřížky
 * sama o strategii nic vědět nemusí.
 */
export type CodeForCell = (row: number, col: number, rows: number, cols: number) => number

export interface GridRequest {
  /** Kolik buněk musí být k dispozici pro písmena tajenky. */
  letterCells: number
  /** Kolik buněk celkem (písmena + klamná). */
  totalCells: number
  /** Hodnoty dosažitelné vrstvou úloh. */
  reachable: ReadonlySet<number>
  codeFor: CodeForCell
  /** Horní mez strany. `grid-coord` má 9 kvůli číslicím, `grid-linear` víc. */
  maxSide?: number
  /** Ruční override od uživatele. Když je zadaný, respektuje se i za cenu ústupků jinde. */
  override?: { rows: number; cols: number }
}

const MIN_SIDE = 3
const DEFAULT_MAX_SIDE = 12

/**
 * Nejdelší přípustný poměr stran.
 *
 * Je to TVRDÉ omezení, ne až tie-break — jinak minimalizace počtu buněk vyhraje
 * nad tvarem a vzniknou mřížky jako 3×11, které se na A4 sázejí mizerně.
 * Ruční volba uživatele tímhle omezená není (§3.1: co uživatel nastavil, se
 * nepřepisuje).
 */
const MAX_ASPECT_RATIO = 2

/**
 * Najde nejmenší rozumnou mřížku, která uveze požadavek.
 *
 * Kritéria v pořadí: přijatelný tvar → dost použitelných kódů → dost buněk →
 * co nejmenší → co nejblíž čtverci.
 */
export function chooseGrid(request: GridRequest): GridChoice | null {
  const maxSide = request.maxSide ?? DEFAULT_MAX_SIDE

  if (request.override) {
    const { rows, cols } = request.override
    return { rows, cols, usableCodes: usableCodesFor(rows, cols, request) }
  }

  let best: GridChoice | null = null
  for (let rows = MIN_SIDE; rows <= maxSide; rows++) {
    for (let cols = MIN_SIDE; cols <= maxSide; cols++) {
      if (Math.max(rows, cols) / Math.min(rows, cols) > MAX_ASPECT_RATIO) continue
      const capacity = rows * cols
      if (capacity < request.totalCells) continue
      const usableCodes = usableCodesFor(rows, cols, request)
      if (usableCodes.length < request.letterCells) continue

      if (
        best === null ||
        capacity < best.rows * best.cols ||
        (capacity === best.rows * best.cols &&
          Math.abs(rows - cols) < Math.abs(best.rows - best.cols))
      ) {
        best = { rows, cols, usableCodes }
      }
    }
  }
  return best
}

function usableCodesFor(rows: number, cols: number, request: GridRequest): number[] {
  const codes: number[] = []
  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= cols; col++) {
      const code = request.codeFor(row, col, rows, cols)
      if (request.reachable.has(code)) codes.push(code)
    }
  }
  return codes
}

/** Zkratka pro záznam ústupku — ať se úroveň nepíše pokaždé ručně. */
export const relaxation = {
  silent: (code: string, message: string): RelaxationLog => ({ level: 'silent', code, message }),
  notice: (code: string, message: string): RelaxationLog => ({ level: 'notice', code, message }),
  blocking: (code: string, message: string): RelaxationLog => ({ level: 'blocking', code, message }),
}
