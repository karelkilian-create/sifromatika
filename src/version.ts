/**
 * Verze aplikace a generátoru.
 *
 * Jsou to dvě různá čísla schválně (viz docs/rozsah-0.1.md §3.7):
 *
 *  - `GENERATOR_VERSION` se mění, jen když se změní deterministický výstup.
 *    Každý inkrement znamená, že staré seedy vygenerují jiný list.
 *  - `APP_VERSION` se mění s každým vydáním. Odlišuje chybu v generátoru
 *    od chyby v UI, renderu nebo importu.
 */

/**
 * Historie:
 *  1 — první vydání (3.–5. ročník, aritmetika, souřadnicová i lineární šifra)
 *  2 — tři změny obsahu najednou:
 *      • strop menšence v odčítání. Do verze 1 vznikaly příklady jako
 *        `711 − 708 = 3`: menšenec se losoval z celého oboru, takže skoro
 *        vždy skončil u jeho horní hranice;
 *      • číselné řady odděluje mezera místo čárky (čárka je desetinný
 *        oddělovač a v druhém stupni bude potřeba);
 *      • 6. a 7. ročník: složené výrazy, závorky, celá čísla.
 *      Mění obsah listů pro všechny dosavadní seedy.
 */
export const GENERATOR_VERSION = 2
export const APP_VERSION = '0.1.0-dev'
