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
 *  5 — pexeso losuje TÉMA podle vah, a teprve pak z jeho zásoby cíl. Do
 *      verze 4 se všechny dosažitelné hodnoty slily do jednoho pytle, takže
 *      poměr témat na kartičkách závisel na tom, jak široký obor čísel který
 *      generátor náhodou pokrývá: aritmetika osmého ročníku jich nabízí přes
 *      deset tisíc a mocniny sto, takže zaškrtnutí mocnin vedle počítání se
 *      neprojevilo prakticky nikdy. Mění kartičky ve všech ročnících;
 *      odvozený seed posune i šifru a list řad.
 *  6 — ve hrách smí výsledek mít jedno desetinné místo. Do verze 5 platilo
 *      plošně „výsledek je celé číslo", ačkoli ten důvod má jen šifra (je to
 *      kód políčka v mřížce), takže v pexesu vyšlo `3,5 · 4 = 14`, ale nikdy
 *      `= 2,5`. Zásoba cílů desetinného tématu se tím rozšíří desetinásobně,
 *      takže se mění kartičky, kameny i bingo všude, kde má učitel zaškrtnutá
 *      desetinná čísla — od 5. ročníku výš. Šifra a list řad zůstávají beze
 *      změny: ty si celý výsledek vyžádají dál a dostanou tutéž zásobu.
 */
export const GENERATOR_VERSION = 6
export const APP_VERSION = '0.1.0-dev'
