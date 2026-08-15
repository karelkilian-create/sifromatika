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
 *  3 — šifrovací tabulka je vždy 9×9, nehledá se nejmenší, která stačí.
 *      Malá tabulka prozrazovala rozsah výsledků: z mřížky 4×6 dítě přečetlo,
 *      že druhá číslice nikdy nepřesáhne 6, a chybný výpočet poznalo bez
 *      ověřování. Mění rozmístění písmen, a tím i příklady — tedy obsah listů
 *      pro všechny dosavadní seedy.
 *  4 — list chudý na některou zaškrtnutou operaci se zahodí a zkusí se jiný
 *      seed. Zhruba každý desátý list pro 3. a 4. ročník měl jediný příklad
 *      na násobení nebo dělení, přestože si učitel obojí zaškrtl. Mění list
 *      jen tam, kde byl vadný — ale odvozený seed posune i ty ostatní.
 */
export const GENERATOR_VERSION = 4
export const APP_VERSION = '0.1.0-dev'
