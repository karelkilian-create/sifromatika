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
 *  6 — desetinná čísla až od 6. ročníku a ve hrách smí výsledek mít jedno
 *      desetinné místo.
 *
 *      Pátá třída o téma přišla: RVP ho tam zavádí, ale na listu pro první
 *      stupeň mate učitele víc, než kolik přinese (rozhodnuto 21. 8. 2026).
 *      Mění to jen listy, kde měl pátý ročník zaškrtnutá desetinná čísla —
 *      nově z nich vypadnou.
 *
 *      Zbytek: do verze 5 platilo
 *      plošně „výsledek je celé číslo", ačkoli ten důvod má jen šifra (je to
 *      kód políčka v mřížce), takže v pexesu vyšlo `3,5 · 4 = 14`, ale nikdy
 *      `= 2,5`. Zásoba cílů desetinného tématu se tím rozšíří desetinásobně,
 *      takže se mění kartičky, kameny i bingo všude, kde má učitel zaškrtnutá
 *      desetinná čísla — od 5. ročníku výš. Šifra a list řad zůstávají beze
 *      změny: ty si celý výsledek vyžádají dál a dostanou tutéž zásobu.
 *  7 — hry berou čísla nanejvýš do tisíce. Obor v profilu je psaný pro
 *      pracovní list, kde má dítě tužku a papír; kartičky se párují očima,
 *      a šesťák přesto dostal `9678 − 4658 = 5020`. Ročníky s oborem do
 *      tisíce (3., 4., 5. a 7.) se nemění, u 6., 8. a 9. se mění kartičky,
 *      kameny i bingo. Šifra a list řad zůstávají — ty si obor nikdy nebraly
 *      z profilu naplno, protože jejich cíle jsou kódy políček.
 *  8 — dvě desetinná místa jen do sta a setiny jen ze čtvrtin a dvacetin.
 *      `103,25 + 58,55` bylo v oboru i v počtu míst, a přesto se nepočítá
 *      z hlavy; ve hrách to potkalo zhruba čtvrtinu desetinných úloh. Součin
 *      k tomu bral zlomkovou část z dělení cílem, tedy libovolnou —
 *      `30,02 · 5` bylo pod stem, a stejně na tužku a papír. Mění se každý
 *      list s desetinnými čísly, tedy 6. ročník výš; zásoba dosažitelných
 *      cílů klesla o čtyři setiny procenta (9991 → 9987).
 *  9 — zlomek smí být i VÝSLEDEK (`1/2 + 1/4 = 3/4`), a to jen ve hrách:
 *      šifra má výsledek jako kód políčka v mřížce, kam zlomek nemá jak
 *      ukázat (`TaskRules.fractionResults`).
 *
 *      Generátor zlomků tím dostal dva nové tvary a losuje se ze čtyř místo
 *      ze dvou, takže se mění každé pexeso, domino a bingo se zaškrtnutými
 *      zlomky — tedy 7. ročník výš. **Šifra a list řad se nemění**: tvary se
 *      filtrují podle pravidel listu PŘED losováním, takže šifře zbydou
 *      přesně ty dva, které měla, ve stejném pořadí.
 *
 *      Druhá změna téhož čísla: zaškrtnuté „jen sčítání" dosud zlomky
 *      z listu vyhodilo úplně (část z celku je dělení a násobení). Nově
 *      dostane sčítání zlomků, protože ten tvar sčítání opravdu je.
 * 10 — odškrtnuté „Mocniny a odmocniny" mocniny opravdu vypnou. Aritmetika
 *      osmého ročníku je má v sobě (`POWER_SHAPES`) a bere si je podle
 *      profilu, ne podle vah, takže učitel, který si téma odškrtl, dostal
 *      `7² − 8` na kartičkách dál. Mění pexeso, domino a bingo v 8. a 9.
 *      ročníku, a jen tam, kde mocniny zaškrtnuté NEJSOU.
 *
 *      Šifra zůstává beze změny: pro mocniny nemá zaškrtávátko, takže není
 *      co ctít — a vyjmout je z ní by osmé třídě sebralo složené výrazy,
 *      aniž by si to kdo přál.
 * 11 — násobení a dělení zlomků (`2/3 · 3/5`, `1/2 : 1/4`), od 7. ročníku
 *      a jen ve hrách. Tři změny, které jdou spolu:
 *
 *      • **zlomková čára je pro tokenizer jedno číslo**, ne dělení. Do
 *        verze 10 to dělení bylo a u sčítání i násobení vycházelo nastejno
 *        (`a/b · c/d` čtené zleva doprava je opravdu `a·c/(b·d)`). Dělení
 *        zlomků to ale rozbilo: `1/2 : 1/4` se počítalo jako 1:2:1:4, tedy
 *        0,125 místo 2. Hodnoty dosavadních úloh se tím NEMĚNÍ — `3/4 z 80`
 *        i `1/2 + 1/4` dávají totéž co dřív.
 *      • **tvar se vybírá před losováním**, ne osmi pokusy poslepu. Se dvěma
 *        tvary to bylo neviditelné, u dělení by to znamenalo mizející úlohy.
 *      • **jedno zaškrtávátko „Zlomky" se překládá na čtyři generátory**
 *        a váhu tématu si dělí. Do verze 10 měly zlomky dvě id po jedničce,
 *        takže vedle samotného počítání zabraly dvě třetiny listu, ačkoli
 *        nápověda slibuje rovnoměrné míchání. Váha jednoho tématu je proto
 *        `TOPIC_WEIGHT` = 12 a zlomky berou 4 × 3.
 *
 *      Mění se každé pexeso, domino a bingo se zaškrtnutými zlomky (7. ročník
 *      výš) — a nově i ta, kde jsou zlomky zaškrtnuté VEDLE jiného tématu,
 *      protože se jim srovnala váha. **Šifra a list řad se nemění**: šifra
 *      zlomkový výsledek nedostane (`TaskRules.fractionResults`) a svůj mix
 *      si staví sama, s vlastními vahami. Ověřeno tím, že se z golden snímků
 *      přepsaly jen dva, oba herní.
 */
export const GENERATOR_VERSION = 11
export const APP_VERSION = '0.1.0-dev'
