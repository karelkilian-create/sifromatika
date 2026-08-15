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

/**
 * Kolik písmen smí mít tajenka. Jedno písmeno = jeden příklad.
 *
 * `max: 24` je mez papíru, ne vkusu. Zkušební tisk ukázal, že od 27 příkladů
 * se rozdělí i seznam příkladů a na druhé straně zůstane osamělý zbytek.
 * Nižší mez než těch 27 proto, že kapacita není konstanta: se zapnutými
 * číselnými řadami přibude do zadání věta navíc, tabulka se posune níž a strop
 * klesne. 24 platí ve všech nastaveních.
 *
 * Shodou okolností je to i rozumná pedagogická mez sama o sobě — čtyřiadvacet
 * výpočtů je na jednu hodinu dost.
 */
export const MESSAGE_LETTER_LIMITS = { min: 2, max: 24 } as const

/**
 * Nad kolik písmen se pracovní list nevejde na jednu stranu.
 *
 * Není to zákaz — dvoustránková šifra není rozbitá, jen delší. Je to hodnota,
 * u které se to má učiteli **říct**, aby si dvě strany nevyrobil omylem
 * (docs/rozsah-0.1.md §3.1).
 */
export const ONE_PAGE_LETTERS = 20


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
  /** Hodnoty dosažitelné vrstvou úloh. */
  reachable: ReadonlySet<number>
  codeFor: CodeForCell
}

/**
 * Strana šifrovací mřížky. Vždy 9×9, u obou strategií.
 *
 * Dřív se hledala nejmenší mřížka, která požadavek uveze. Bylo to úsporné
 * a pedagogicky vadné: z tabulky 4×6 dítě přečte, že žádný výsledek nepřesáhne
 * 46 a druhá číslice nikdy nebude větší než 6. Tím dostane **opravu zdarma** —
 * kdo spočítá 58, pozná chybu bez ověřování, protože takový sloupec neexistuje.
 * Právě to hledání chyby přitom má být tou prací, kterou po něm chceme.
 *
 * Devítka, a ne víc: u `grid-coord` je to strop zápisu (desátý řádek by dal
 * kód 104 a dvouciferné čtení souřadnice by přestalo platit). `grid-linear`
 * by unesl víc, ale drží se téhož čísla — jedna mřížka pro obě strategie
 * znamená jednu sazbu a jeden rozměr buňky na papíře.
 *
 * ⚠ Pevná mřížka NEZUŽUJE, co jde vygenerovat. Devítka na devítku obsahuje
 *   každou buňku, kterou by měla jakákoli menší mřížka, takže množina
 *   použitelných kódů je nadmnožinou. Co se vygenerovalo dřív, se vygeneruje
 *   i teď — jen jinam.
 */
export const GRID_SIDE = 9

/**
 * Připraví mřížku a zjistí, které její kódy umí vrstva úloh vyrobit.
 *
 * `null` = na písmena tajenky není dost dosažitelných kódů. Nastane to
 * u úzkých výběrů (třetí třída, zaškrtnuté jen násobení: malá násobilka
 * nabídne 14 dvouciferných výsledků), a je to strop vrstvy úloh, ne mřížky.
 */
export function planFixedGrid(request: GridRequest): GridChoice | null {
  const rows = GRID_SIDE
  const cols = GRID_SIDE
  const usableCodes: number[] = []

  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= cols; col++) {
      const code = request.codeFor(row, col, rows, cols)
      if (request.reachable.has(code)) usableCodes.push(code)
    }
  }

  if (usableCodes.length < request.letterCells) return null
  return { rows, cols, usableCodes }
}

/** Zkratka pro záznam ústupku — ať se úroveň nepíše pokaždé ručně. */
export const relaxation = {
  silent: (code: string, message: string): RelaxationLog => ({ level: 'silent', code, message }),
  notice: (code: string, message: string): RelaxationLog => ({ level: 'notice', code, message }),
  blocking: (code: string, message: string): RelaxationLog => ({ level: 'blocking', code, message }),
}
