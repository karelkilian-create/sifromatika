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
        powers: false,
        decimals: 0,
        percents: false,
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
        powers: false,
        decimals: 0,
        percents: false,
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
        powers: false,
        // Desetinná čísla se v páté třídě zavádějí — zatím jen desetiny.
        decimals: 1,
        percents: false,
      }
    case 6:
      // Šestá třída: obor se rozšiřuje a přichází pořadí operací se závorkami.
      // Záporná čísla ještě ne — ta jsou látka sedmého ročníku.
      return {
        grade,
        numberRange: { min: 0, max: 10_000 },
        allowNegatives: false,
        crossesTen: true,
        multiplicationTables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        divisionExactOnly: true,
        maxOperands: 3,
        powers: false,
        decimals: 2,
        percents: false,
      }
    case 7:
      // Sedmá třída: celá čísla, tedy poprvé i záporné operandy.
      return {
        grade,
        numberRange: { min: -1000, max: 1000 },
        allowNegatives: true,
        crossesTen: true,
        multiplicationTables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        divisionExactOnly: true,
        maxOperands: 3,
        powers: false,
        decimals: 2,
        // Procenta jsou látka sedmého ročníku.
        percents: true,
      }
    case 8:
      // Osmá třída: druhá a třetí mocnina, druhá odmocnina. Obor se rozšiřuje,
      // protože už 15² je 225 a s přičtením dalšího členu se to rychle sčítá.
      return {
        grade,
        numberRange: { min: -1000, max: 10_000 },
        allowNegatives: true,
        crossesTen: true,
        multiplicationTables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        divisionExactOnly: true,
        maxOperands: 3,
        powers: true,
        decimals: 2,
        percents: true,
      }
    default:
      // ⚠ 9. ročník zatím vlastní profil NEMÁ, a proto se v UI nenabízí.
      //   Tahle větev je jen pojistka totality typu.
      //
      //   Přidat ho do rozbalovátka dřív, než pro něj vznikne obsah (rovnice,
      //   lomené výrazy, procenta), by znamenalo dát deváťákovi osmáckou
      //   matematiku pod nadpisem „9. třída". Vygenerovaný list by byl
      //   matematicky správně, takže by to neodhalila ani verifikace —
      //   jen učitel, až by ho rozdal.
      return { ...gradeProfile(8), grade }
  }
}

/**
 * Kolik úloh smí být na listu, který si počet řídí sám (list řad, později bingo).
 *
 * Meze jsou tady, a ne v aktivitě, protože je potřebuje i parser `.sifra`:
 * počet z nedůvěryhodného souboru se musí ořezat na totéž, co dovolí UI.
 */
export const TASK_COUNT_LIMITS = { min: 4, max: 30, fallback: 12 } as const

export function clampTaskCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return TASK_COUNT_LIMITS.fallback
  const rounded = Math.round(value)
  return Math.min(Math.max(rounded, TASK_COUNT_LIMITS.min), TASK_COUNT_LIMITS.max)
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
