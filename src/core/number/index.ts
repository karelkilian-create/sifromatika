/**
 * Jak číslo vypadá na papíře.
 *
 * Vzniklo to při uvolňování celých výsledků ve hrách (viz
 * `docs/navrh-uvolneni-celych-vysledku.md`). Do té doby stálo `formatValue`
 * třikrát zkopírované v pexesu, dominu a bingu a bylo to v jádru
 * `String(value)` — což u celých čísel stačilo a u prvního desetinného
 * výsledku by vytisklo `0,30000000000000004`.
 *
 * Sídlí v `core`, protože na tuhle podobu se ptá i verifikace: otázka
 * „mají dvě úlohy stejný výsledek?" je ve skutečnosti otázka „vypadají na
 * papíře stejně?".
 */

/**
 * Kolik desetinných míst se smí vytisknout.
 *
 * Není to libovolná volba. Je to jednotka, ve které už dnes počítá generátor
 * desetinných čísel (`CENTS` v `tasks/decimal`), a pokryje i převody typu
 * `45 min = 0,75 h`. Zvýšení je rozhodnutí o látce, ne o kódu — třetí místo
 * znamená, že se úloha přestane počítat z hlavy.
 */
export const MAX_DECIMAL_PLACES = 2

const SCALE = 10 ** MAX_DECIMAL_PLACES

/** Menší rozdíl než tenhle je šum plovoucí čárky, ne jiné číslo. */
const EPSILON = 1e-9

/** U+2212, typografické mínus. Na listu se nepíše spojovník. */
const MINUS = '−'

/**
 * Zaokrouhlení na tisknutelnou přesnost.
 *
 * Dělá se **při generování**, ne až v sazbě: kdyby se zaokrouhlovalo pozdě,
 * nesla by hodnota v listu šum plovoucí čárky dál a porovnávala by se s ním.
 */
export function roundToPrintable(value: number): number {
  return Math.round(value * SCALE) / SCALE
}

/**
 * Vejde se hodnota do daného počtu desetinných míst?
 *
 * Ptá se na to generátor (co smí vyrobit) i verifikace (co smělo vyjít).
 * Musí to být tatáž odpověď, jinak by se list generoval a zahazoval dokola.
 */
export function fitsPlaces(value: number, places: number): boolean {
  if (!Number.isFinite(value)) return false
  const scale = 10 ** places
  return Math.abs(value * scale - Math.round(value * scale)) < EPSILON
}

/**
 * Dá se hodnota vytisknout beze ztráty?
 *
 * `1 : 3` se nedá — a je to vada listu, ne důvod k tichému zaokrouhlení.
 * Vytištěné `0,33` by dítě sečetlo a nedopočítalo se. Verifikace na tuhle
 * otázku odpovídá kódem `unprintable-value`.
 */
export function isPrintable(value: number): boolean {
  return fitsPlaces(value, MAX_DECIMAL_PLACES)
}

/** Je to celé číslo, nebo aspoň nerozeznatelně blízko? */
export function isWholeNumber(value: number): boolean {
  return Math.abs(value - Math.round(value)) < EPSILON
}

/**
 * Číslo → text pro list. Desetinná čárka, ne tečka — na českém listu se
 * píše `2,5`.
 *
 * Koncová nula se nepíše: `2,50` vypadá jako cena, ne jako číslo z matematiky.
 * Je to totéž pravidlo, jaké má `formatDecimal` v `tasks/decimal`; ten ale
 * převádí ze setin, kdežto tenhle z hotové hodnoty úlohy.
 */
export function formatValue(value: number): string {
  const rounded = roundToPrintable(value)
  // Ostré `<` schválně: −0 jím neprojde, takže `formatValue(-0)` dá „0"
  // a ne „−0".
  const negative = rounded < 0
  const absolute = Math.abs(rounded)

  const whole = Math.floor(absolute + EPSILON)
  const rest = Math.round((absolute - whole) * SCALE)

  const sign = negative ? MINUS : ''
  if (rest === 0) return `${sign}${whole}`
  if (rest % 10 === 0) return `${sign}${whole},${rest / 10}`
  return `${sign}${whole},${String(rest).padStart(MAX_DECIMAL_PLACES, '0')}`
}
