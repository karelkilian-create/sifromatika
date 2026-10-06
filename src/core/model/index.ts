/**
 * Doménové typy Šifromatiky.
 *
 * Tento modul je čistě deklarativní — žádná logika, žádné závislosti.
 * Platí pravidlo z docs/rozsah-0.1.md: `core` neimportuje React ani nic z `dom` lib.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Didaktika
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Didaktická dovednost. Řízený slovník, NIKOLI volný `string`.
 *
 * Jmenný prostor před tečkou je záměr: až jich bude sedmdesát, seskupení je
 * `split('.')`. Zavedení prefixu zpětně by znamenalo migraci uložených
 * `.sifra` souborů, ne jen refaktoring. Viz docs/rozsah-0.1.md §3.3.
 */
export type SkillTag =
  | 'arit.scitani-do-20'
  | 'arit.scitani-do-100'
  | 'arit.odcitani-do-20'
  | 'arit.odcitani-do-100'
  | 'arit.prechod-pres-desitku'
  | 'arit.desitky-jednotky'
  | 'arit.mala-nasobilka'
  | 'arit.deleni-beze-zbytku'
  | 'arit.deleni-se-zbytkem'
  | 'arit.poradi-operaci'
  | 'arit.zavorky'
  | 'cela.scitani-odcitani'
  | 'cela.nasobeni-deleni'
  | 'moc.druha-mocnina'
  | 'moc.treti-mocnina'
  | 'moc.druha-odmocnina'
  | 'des.scitani-odcitani'
  | 'des.nasobeni-delenim'
  | 'proc.cast-z-celku'
  | 'proc.sleva-navyseni'
  | 'zlom.cast-z-celku'
  | 'zlom.scitani-odcitani'
  | 'zlom.nasobeni-deleni'
  | 'rov.chybejici-cislo'
  | 'pojm.nazvy-vysledku'
  | 'pojm.o-kolik-kolikrat'
  | 'rady.konstantni-krok'
  | 'rady.stridavy-krok'
  | 'rady.rostouci-krok'
  | 'rady.nasobeni-delenim'

export type OperationTag = 'add' | 'sub' | 'mul' | 'div'

/**
 * Výčet k `OperationTag` — pořadí je závazné, protože podle něj se losuje.
 *
 * Je tady, a ne u toho, kdo ho zrovna potřebuje: přehození pořadí nebo přidání
 * operace by jinak změnilo výstup jen některým volajícím a listy z jednoho
 * seedu by se rozešly.
 */
export const ALL_OPERATIONS: readonly OperationTag[] = ['add', 'sub', 'mul', 'div']

export interface DidacticMeta {
  grade: number
  difficulty: 1 | 2 | 3 | 4 | 5
  /** Relativní náklad, bezrozměrný, kalibrovaný v rámci ročníku. NIKOLI sekundy. */
  effort: number
  /** Mechanická operace — řídí poměr typů úloh v UI („zaškrtni násobení"). */
  operations: OperationTag[]
  /** Didaktická dovednost — slouží filtrování („aktivita jen na malou násobilku"). */
  skills: SkillTag[]
  /** Rezervováno pro 0.5+. Kurátorská práce, ne kód. */
  rvpOutcomes?: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Úloha
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zadání úlohy.
 *
 * Každý člen unie nese `text` — přesně to, co se vytiskne na list. Díky tomu
 * se render, kontrolní součet i verifikace dostanou k vytištěné podobě bez
 * rozlišování druhu úlohy; `kind` potřebuje jen ten, kdo text vyhodnocuje.
 */
export type PromptNode =
  | { kind: 'expr'; text: string }
  /**
   * Číselná řada s jednou mezerou: „4, 10, 16, ?, 28“.
   *
   * `terms` a `hiddenIndex` jsou tu pro render a diagnostiku, NIKOLI pro
   * verifikaci — ta si čísla přečte znovu z `text`, jinak by ověřovala
   * generátor místo papíru.
   */
  | { kind: 'sequence'; text: string; terms: readonly (number | null)[]; hiddenIndex: number }
  /**
   * Rovnice s chybějícím číslem: „? + 15 = 40".
   *
   * Nese jen text, na rozdíl od řady žádná strukturovaná data — verifikace si
   * úlohu rozdělí na rovnítku a dosadí do ní hodnotu, kterou generátor tvrdí.
   * Čitatel toho, co má vyjít, je tedy vytištěný text a nic jiného.
   *
   * ⚠ Zápis s otazníkem drží od 3. do 7. ročníku; rovnice s neznámou
   *   (`x + 15 = 40`) je látka osmičky. Až na ni dojde, je to další tvar
   *   téhož generátoru, ne nový druh zadání.
   */
  | { kind: 'equation'; text: string }
  /**
   * Věta s matematickými pojmy: „Kolik je součin čísel 6 a 7?“.
   *
   * Zase jen text. Verifikace v něm pozná šablonu a spočítá ho vlastní
   * tabulkou pojmů (`core/phrase`), ne tou, kterou má generátor.
   *
   * Rovnítko za větou nepatří — končí otazníkem.
   */
  | { kind: 'phrase'; text: string }

export interface Task {
  id: string
  generatorId: string
  /** Výsledek úlohy. Musí souhlasit s nezávislým přepočtem ve `core/verify`. */
  value: number
  /**
   * Vytištěná podoba výsledku, liší-li se od `formatValue(value)`.
   *
   * Existuje kvůli zlomkovému výsledku: `1/2 + 1/4` má hodnotu 0,75, ale na
   * kartičce musí stát `3/4`. U `1/3` je to dokonce jediná možnost — desetinný
   * zápis té hodnoty neexistuje a `isPrintable` ho po právu zamítá.
   *
   * `value` zůstává číslo a nese dál všechno, co se počítá: párování, hledání
   * v šifrovací tabulce, `usedValues`. Tohle pole je jen to, co uvidí dítě.
   *
   * ⚠ Verifikace ho NESMÍ brát jako pravdu. Čte si ho znovu, od nuly, stejně
   *   jako čte zadání — jinak by ověřovala generátor místo papíru.
   */
  printedValue?: string
  prompt: PromptNode
  solutionSteps: PromptNode[]
  didactic: DidacticMeta
}

// ─────────────────────────────────────────────────────────────────────────────
// Šifra
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kód buňky — číslo, které musí dítě spočítat, aby buňku našlo.
 *
 * `n` je u obou variant totéž: hodnota, kterou má dát výsledek příkladu.
 * U `coord` je odvozená z řádku a sloupce (34 = 3. řádek, 4. sloupec), ale
 * ukládá se, aby verifikace i vrstva úloh mohly pracovat jednotně s `n`
 * a nemusely rozlišovat strategii.
 */
export type CodeToken =
  | { kind: 'linear'; n: number }
  | { kind: 'coord'; n: number; row: number; col: number }

export interface CipherCell {
  code: CodeToken
  /** Jedno písmeno A–Z, bez diakritiky. */
  letter: string
  /** Klamné písmeno — v tajence se nevyskytuje, je tam kvůli znemožnění hádání. */
  isDecoy: boolean
}

export interface CipherTable {
  rows: number
  cols: number
  /** V pořadí čtení: řádek po řádku. */
  cells: CipherCell[]
}

/**
 * `grid-coord` je výchozí: tabulka se záhlavím řádků a sloupců připravuje děti
 * na soustavu souřadnic, kterou se budou učit později. `grid-linear` (buňky
 * číslované 1..N popořadě) zůstává jako jednodušší varianta.
 */
export type CipherStrategyId = 'grid-coord' | 'grid-linear'

export interface CipherArtifact {
  table: CipherTable
  /** Jeden token na každé písmeno tajenky, ve stejném pořadí. */
  sequence: CodeToken[]
  /** Hodnoty, které musí vrstva úloh vyrobit. Odvozeno ze `sequence`. */
  requiredValues: number[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Konfigurace (serializovatelná — jde do .sifra i do URL)
// ─────────────────────────────────────────────────────────────────────────────

export type Grade = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface DifficultyProfile {
  grade: Grade
  numberRange: { min: number; max: number }
  allowNegatives: boolean
  /**
   * Smí sčítání a odčítání přecházet přes desítku (`18 + 5`, `23 − 7`)?
   *
   * ⚠ Jediné pole profilu, které si smí přepsat učitel — u druhé třídy je
   *   z něj zaškrtávátko, protože právě tudy vede hranice mezi zářím
   *   a jarem. Ukládá se jen `false`; viz `parseDifficulty`.
   */
  crossesTen: boolean
  multiplicationTables: number[]
  divisionExactOnly: boolean
  maxOperands: number
  /** Smí se objevit druhá a třetí mocnina a druhá odmocnina? Od 8. ročníku. */
  powers: boolean
  /**
   * Nejvyšší počet desetinných míst v OPERANDU. `0` = jen celá čísla.
   *
   * Výsledku se to netýká — ten musí zůstat kladné celé číslo, protože slouží
   * jako kód políčka v mřížce. Tisíciny se nenabízejí schválně: na listu pro ZŠ
   * znamenají počítání na papíře, ne z hlavy.
   */
  decimals: 0 | 1 | 2
  /** Smí se objevit počítání s procenty (`25 % z 80`)? Od 7. ročníku. */
  percents: boolean
  /**
   * Smí se objevit počítání se zlomky (`3/4 z 80`, ve hrách i `2/3 · 3/5`)?
   * Od 7. ročníku.
   *
   * Šestá třída zlomky zavádí, ale počítá s nimi až sedmá. Sedí tím na
   * stejném ročníku jako `percents`, což odpovídá i tomu, že `1/4 z 80`
   * a `25 % z 80` je táž úloha dvěma zápisy.
   *
   * ⚠ Jeden příznak na celé téma, včetně násobení a dělení zlomků. Sedmá
   *   třída je má v látce společně se společným jmenovatelem, takže vlastní
   *   ročníková brána by neměla co dělit — a nový příznak v profilu je
   *   navíc pole v uloženém `.sifra`.
   */
  fractions: boolean
}

export interface CipherGridConfig {
  message: string
  difficulty: DifficultyProfile
  /** Váhy jednotlivých typů úloh, nikoli booleany. */
  taskMix: Partial<Record<OperationTag, number>>
  /**
   * Váhy generátorů úloh — druhá, nezávislá osa vedle `taskMix`.
   *
   * `taskMix` říká, které *operace* se smí objevit; tohle říká, které
   * *druhy zadání* (příklad, číselná řada, později slovní úloha). Obě osy
   * platí zároveň: řada s podílem vyžaduje povolené násobení.
   *
   * ⚠ Volitelné schválně. Chybějící hodnota znamená „jen aritmetika“, takže
   *   `.sifra` uložená před přidáním dalších generátorů vytiskne po letech
   *   pořád tentýž list. Kdyby se místo toho doplňoval aktuální default,
   *   losování generátoru by se posunulo a s ním celý obsah listu.
   */
  generatorMix?: Readonly<Record<string, number>>
  /**
   * Rozměry mřížky tu schválně NEJSOU. Je vždy 9×9 (`GRID_SIDE`), protože
   * menší tabulka prozrazuje rozsah výsledků — viz komentář v `core/constraints`.
   * Se zmizelými rozměry ztratila smysl i hustota klamných písmen: buňky, které
   * nedostaly písmeno tajenky, jsou klamné všechny.
   *
   * Starší `.sifra` obě pole nese; parser je mlčky ignoruje.
   */
  cipher: {
    strategy: CipherStrategyId
    distinctCellPerOccurrence: boolean
  }
  output: OutputConfig
}

export interface OutputConfig {
  includeSolution: boolean
  paper: 'A4'
  columns: 1 | 2
  /**
   * Tisknout název aktivity na ŽÁKOVSKÝ list?
   *
   * U šifry defaultně `false` a při automaticky odvozeném `title` se ignoruje
   * úplně — nadpis odvozený z tajenky by ji prozradil dřív, než dítě spočítá
   * první příklad. Viz docs/rozsah-0.1.md §3.6.
   *
   * Aktivity bez tajenky nemají co prozradit a název si tisknou vždy.
   */
  printTitleOnWorksheet: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Aktivita „list číselných řad"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List samotných číselných řad, bez šifry.
 *
 * Nemá tajenku, a tím pádem ani mřížku, klamná písmena a rámečky na odpovědi.
 * Zůstane po nich jedno: seznam úloh a k němu řešení pro učitele.
 */
export interface SequenceSheetConfig {
  /** Kolik řad bude na listu. */
  taskCount: number
  difficulty: DifficultyProfile
  /** Které operace se v řadách smí objevit (podíl vyžaduje násobení). */
  taskMix: Partial<Record<OperationTag, number>>
  output: OutputConfig
}

// ─────────────────────────────────────────────────────────────────────────────
// Aktivita „pexeso"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kartičky ve dvojicích: na jedné zadání, na druhé výsledek.
 *
 * Nemá tajenku ani mřížku — hodnoty si nikdo nediktuje, jen musí být navzájem
 * různé. Dvě zadání se stejným výsledkem znamenají, že dítě spáruje špatně
 * a bude mít pravdu; hlídá to `verifyDistinctValues`.
 */
export interface PexesoConfig {
  /** Kolik DVOJIC. Kartiček je dvakrát tolik. */
  pairCount: number
  difficulty: DifficultyProfile
  taskMix: Partial<Record<OperationTag, number>>
  /** Viz `CipherGridConfig.generatorMix` — chybějící hodnota znamená aritmetiku. */
  generatorMix?: Readonly<Record<string, number>>
  output: OutputConfig
}

// ─────────────────────────────────────────────────────────────────────────────
// Aktivita „domino"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kameny o dvou půlkách: vlevo výsledek, vpravo zadání.
 *
 * Proti pexesu jediné nové pravidlo, zato tvrdší: hodnoty musí tvořit **jeden
 * souvislý kruh**, ne několik kroužků. Různé hodnoty na to nestačí — osm
 * kamenů s osmi různými hodnotami se dá spojit i do dvou čtyřkruhů, ve kterých
 * má každý kámen souseda a dítě je stejně nesloží.
 *
 * Kruh, a ne otevřený řetěz: dítě skončí tam, kde začalo, a tím si samo
 * zkontroluje, že to má dobře. Otevřený řetěz to neumí — komu zbyly tři
 * kameny, ví, že něco je špatně, ale ne kde.
 */
export interface DominoConfig {
  /** Kolik KAMENŮ. Každý nese jednu hodnotu a jedno zadání. */
  tileCount: number
  difficulty: DifficultyProfile
  taskMix: Partial<Record<OperationTag, number>>
  /** Viz `CipherGridConfig.generatorMix` — chybějící hodnota znamená aritmetiku. */
  generatorMix?: Readonly<Record<string, number>>
  output: OutputConfig
}

// ─────────────────────────────────────────────────────────────────────────────
// Aktivita „bingo"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Karty s výsledky, příklady vyvolává učitel.
 *
 * Na kartě jsou VÝHRADNĚ výsledky. Kdyby na ní byly příklady, dítě si je
 * spočítá dopředu a ze hry zbyde hledání čísla — bingo je jediná aktivita
 * v Šifromatice, kde se počítá z hlavy a hned.
 *
 * Nové pravidlo hry: **každé číslo na kartě musí jít vyvolat.** Zásoba
 * vyvolávaných čísel je proto větší než karta, ale karta z ní nesmí vybočit.
 */
export interface BingoConfig {
  /** Kolik KARET, tedy pro kolik dětí. Každá je jiná. */
  cardCount: number
  difficulty: DifficultyProfile
  taskMix: Partial<Record<OperationTag, number>>
  /** Viz `CipherGridConfig.generatorMix` — chybějící hodnota znamená aritmetiku. */
  generatorMix?: Readonly<Record<string, number>>
  output: OutputConfig
}

// ─────────────────────────────────────────────────────────────────────────────
// Aktivita „úniková hra"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Délka hry. Určuje počet stanovišť, ne délku tajenky — viz
 * docs/navrh-unikova-hra.md §4. Kolik stanovišť je která, říká
 * `ESCAPE_STATIONS` v `core/constraints`.
 */
export type EscapeLength = 'short' | 'medium' | 'long'

/**
 * Kdo které stanoviště řeší. Generování i ověření je pro oba režimy totéž;
 * liší se jen rozdělení stanovišť a to, kdy tabule ukáže písmena (§2).
 */
export type EscapeMode = 'class' | 'groups'

/**
 * Jak stanoviště zašifruje své slovo.
 *
 * `grid`: souřadnicová tabulka 9 × 9 jako u šifry. `choice`: u každého
 * příkladu tři odpovědi s písmeny a dítě opíše písmeno té správné. Výběr je
 * pro druhou třídu — souřadnice čte hůř a výsledek nemusí být kód políčka
 * (11–99), takže se do hry dostane i dělení. Samokontrola zůstává: kdo
 * počítá špatně, tomu nevyjde slovo.
 */
export type EscapeStationKind = 'grid' | 'choice'

/**
 * Úniková hra: stanoviště jsou mini-šifry, jejichž tajenky jsou slova
 * z příběhu, a slova se na tabuli skládají do finální tajenky.
 *
 * `message` se ukládá i tehdy, když ji jen nabídl příběh — příběh se může
 * v budoucí verzi změnit a uložená hra musí dál dávat totéž (§8).
 */
export interface EscapeConfig {
  /** Id příběhu. Neznámé id ze souboru se odmítne, ne převede. */
  story: string
  length: EscapeLength
  message: string
  mode: EscapeMode
  /** Počet skupin. V režimu „celá třída" se nepoužije, ale ukládá se. */
  groupCount: number
  stationKind: EscapeStationKind
  difficulty: DifficultyProfile
  taskMix: Partial<Record<OperationTag, number>>
  /**
   * Viz `CipherGridConfig.generatorMix` — chybějící hodnota znamená
   * aritmetiku. Témata přibyla po první hře ve třídě (5. 10. 2026).
   */
  generatorMix?: Readonly<Record<string, number>>
  /**
   * Obor do dvaceti místo do sta (jen druhá třída s výběrem odpovědí,
   * `upToTwentyIsChoice`). `difficulty` je už zúžená; pole je tu proto, že
   * profil se ze souboru odvozuje znovu z ročníku a zúžení by se ztratilo.
   */
  upToTwenty?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Projekt
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityId = 'cipher-grid' | 'sequence-sheet' | 'pexeso' | 'domino' | 'bingo' | 'escape'

/**
 * Společná hlavička každé uložené aktivity — vše kromě `activity` a `payload`.
 *
 * Exportovaná kvůli parseru `.sifra`, který ji sestaví jednou pro všechny
 * aktivity a teprve pak k ní nechá registr doplnit payload.
 */
export interface ProjectBase {
  schemaVersion: 1
  /** Mění deterministický výstup. Změna = staré seedy generují jiný list. */
  generatorVersion: number
  /** Odlišuje chybu v generátoru od chyby v UI, renderu nebo importu. */
  appVersion: string
  seed: string
  locale: 'cs'
  /** Prázdné = odvodí se z obsahu; odvozený název se na žákovský list netiskne. */
  title?: string
}

/**
 * Uložená aktivita daného druhu.
 *
 * Generická schválně: díky tomu jde v kontraktu `ActivityModule` napsat
 * „konfigurace právě té aktivity, které modul patří", a překladač ohlídá,
 * že modul pod klíčem `cipher-grid` nevrací payload číselných řad.
 */
export interface Project<A extends ActivityId, P> extends ProjectBase {
  activity: A
  payload: P
}

export type CipherGridProject = Project<'cipher-grid', CipherGridConfig>

export type SequenceSheetProject = Project<'sequence-sheet', SequenceSheetConfig>

export type PexesoProject = Project<'pexeso', PexesoConfig>

export type DominoProject = Project<'domino', DominoConfig>

export type BingoProject = Project<'bingo', BingoConfig>

export type EscapeProject = Project<'escape', EscapeConfig>

/**
 * Uložitelná aktivita. Rozlišená unie podle `activity` — přidání další hry
 * je nový člen, ne další volitelná pole v jednom společném objektu.
 */
export type ProjectConfig =
  | CipherGridProject
  | SequenceSheetProject
  | PexesoProject
  | DominoProject
  | BingoProject
  | EscapeProject

// ─────────────────────────────────────────────────────────────────────────────
// Výstup generování
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Záznam o ústupku. Pravidlo: tiše opravuj to, co uživatel nenastavil;
 * ohlas to, co nastavil. Viz docs/rozsah-0.1.md §3.1.
 */
export interface RelaxationLog {
  level: 'silent' | 'notice' | 'blocking'
  code: string
  message: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Kontrakt vrstvy úloh
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Jaký výsledek smí na tomhle listu vyjít.
 *
 * Není to vlastnost ročníku, ale LISTU — proto to nesedí v
 * `DifficultyProfile`. Sedmák umí `2,25`, ale na kartičce pexesa se
 * `2,25` páruje očima přes celý stůl hůř než `2,5`.
 *
 * Ptá se na to generátor i verifikace, a musí dostat tutéž odpověď: kdyby
 * pravidlo znala jen verifikace, list by se generoval a zahazoval dokola.
 */
export interface TaskRules {
  /**
   * Nejvyšší počet desetinných míst VÝSLEDKU. `0` = celé číslo.
   *
   * Zadání se to netýká — to řídí `DifficultyProfile.decimals`. Klidně tedy
   * platí `2,25 + 0,25 = 2,5`: dvě místa vlevo, jedno vpravo.
   */
  maxResultPlaces: 0 | 1 | 2
  /**
   * Smí být výsledek zlomek (`1/2 + 1/4 = 3/4`)?
   *
   * Výslovné pravidlo, NIKOLI odvozené z `maxResultPlaces`. Zlomek není „víc
   * desetinných míst" — `1/3` se do desetinného zápisu nevejde vůbec, takže
   * by ho žádný počet míst nepovolil ani nezakázal správně. Je to jiný druh
   * zápisu a rozlišuje se deklarací, stejně jako `SheetSlot.kind`.
   */
  fractionResults: boolean
  /**
   * Nejvýš kolik znaků smí mít zadání. Chybí-li, délka se nehlídá.
   *
   * Týká se zatím jen vět (`PromptNode` druhu `phrase`): výraz se do
   * kartičky vejde vždycky, kdežto „O kolik je součet čísel 12 a 4 větší
   * než jejich rozdíl?“ má přes padesát znaků a na půlku dominového kamene
   * se nevejde. Je to vlastnost LISTU, stejně jako pravidla o výsledku —
   * a ptá se na ni generátor i verifikace ze stejného důvodu.
   */
  maxPromptLength?: number
}

/**
 * Šifra: výsledek je kód políčka v mřížce, tedy celé číslo.
 *
 * ⚠ Pro šifru je to i tak nadbytečné — `verifySheet` má druhý zámek: každá
 *   potřebná hodnota musí být dohledatelná v tabulce, a kódy jsou celá
 *   čísla. `0,25` by spadlo i bez tohohle pravidla, jen s kódem
 *   `value-not-in-table`. Zůstává proto, že hláška o celém výsledku
 *   pojmenuje příčinu, kdežto ta druhá popisuje následek.
 */
export const REQUIRE_WHOLE_RESULTS: TaskRules = { maxResultPlaces: 0, fractionResults: false }

/**
 * Hry: kód políčka tu žádný není, takže `2,5` je legitimní výsledek.
 *
 * Jedno místo, ne dvě — rozhodnuto 21. 8. 2026. Není to strop projektu, ale
 * dnešní nastavení: až přijde kruh v 8. ročníku, `3,14 · 7² = 153,86` si
 * dvě místa vyžádá a zvedne se to buď tady, nebo jen pro to téma. Právě
 * proto je to parametr, a ne konstanta zadrátovaná ve verifikaci.
 */
export const ALLOW_DECIMAL_RESULTS: TaskRules = { maxResultPlaces: 1, fractionResults: true }

/**
 * Kontext jednoho generování. `usedExpressions` brání tomu, aby na listu
 * byla pětkrát tatáž úloha — naivní výběr to dělá překvapivě často.
 */
export interface GenContext {
  profile: DifficultyProfile
  /** Váhy povolených operací. Prázdné = všechny se stejnou vahou. */
  mix: Partial<Record<OperationTag, number>>
  usedExpressions: Set<string>
  /** Co smí vyjít. Generátor to musí ctít, jinak list neprojde verifikací. */
  rules: TaskRules
}

/**
 * Generátor úloh. Dva režimy záměrně:
 *
 *  - `generateForValue` je levný pro aritmetiku, kde jde počítat pozpátku.
 *  - `generatePool` bude jediný použitelný pro slovní úlohy a geometrii
 *    v 0.5+, protože generovat je pozpátku z výsledku vyrábí nesmysly
 *    („Jana koupila 47 rohlíků"). Viz docs/sifromatika-navrh-architektury.md §3.4.
 *
 * Ve verzi 0.1 implementuje aritmetika jen ten první; kontrakt je tu proto,
 * aby druhý režim nešlo dodělat jen za cenu přepsání volajících.
 */
export interface TaskGenerator {
  id: string
  supports(profile: DifficultyProfile): boolean
  /**
   * Hodnoty, které tenhle generátor umí vyrobit při daném profilu A daném
   * výběru operací.
   *
   * `mix` tu musí být: kdyby se počítalo se všemi operacemi a učitel měl
   * zaškrtnuté jen násobení, šifra by umístila písmeno na kód 37 a teprve
   * generátor by zjistil, že prvočíslo z malé násobilky nevyrobí.
   */
  reachableValues(
    profile: DifficultyProfile,
    mix: Partial<Record<OperationTag, number>>,
    rules: TaskRules,
  ): Set<number>
  /** `null` = tuhle hodnotu neumím (nebo ne bez opakování už použitého výrazu). */
  generateForValue(target: number, ctx: GenContext, rng: import('../rng/index.js').Rng): Task | null
}

export type VerificationReport =
  | { ok: true }
  | { ok: false; failures: VerificationFailure[] }

export interface VerificationFailure {
  code:
    | 'task-value-mismatch'
    | 'ambiguous-code'
    | 'decoded-message-mismatch'
    | 'value-not-in-table'
    /** Na čísla řady sedí víc pravidel s různým výsledkem — vadné zadání. */
    | 'ambiguous-sequence'
    /**
     * Rovnici splní víc čísel než jedno: `? · 0 = 0`.
     *
     * Táž vada jako u řady, jen z jiné strany — dítě může odpovědět správně
     * a mít křížek. Pozná se tím, že se levá strana po dosazení jiného čísla
     * nezmění, tedy že na otazníku vůbec nezáleží.
     */
    | 'ambiguous-equation'
    /** Chybný matematický zápis, například dva operátory vedle sebe. */
    | 'malformed-notation'
    /**
     * Zadání je delší, než kolik unese kartička (`TaskRules.maxPromptLength`).
     * Správně spočítané, ale na papíře by se rozlezlo přes okraj.
     */
    | 'prompt-too-long'
    /**
     * Výsledek není celé číslo, takže nemůže sloužit jako kód políčka.
     * Týká se úloh s desetinnými operandy: `0,3 · 7` dává 2,1.
     *
     * ⚠ Hlásí se jen tam, kde se celý výsledek opravdu vyžaduje — tedy
     *   u šifry (`maxResultPlaces: 0`). Ve hrách je `2,5` legitimní
     *   výsledek; viz `TaskRules`.
     */
    | 'non-integer-result'
    /**
     * Výsledek má víc desetinných míst, než list dovoluje: `2,25` tam, kde
     * se smí jen `2,5`. Na rozdíl od `non-integer-result` to není o celých
     * číslech, ale o tom, kolik se toho na kartičce dá přečíst naráz.
     */
    | 'result-too-precise'
    /**
     * Výsledek se nedá vytisknout beze ztráty na dvě desetinná místa.
     *
     * Například `1 : 3`. Vytištěné `0,33` by dítě sečetlo s dalším číslem
     * a nedopočítalo by se — a nepoznalo by, že chyba není jeho. Proto je
     * to vada listu, ne důvod k tichému zaokrouhlení.
     */
    | 'unprintable-value'
    /**
     * Vytištěný zlomkový výsledek není v základním tvaru: `6/8` místo `3/4`.
     *
     * Hodnota je správně, a přesto je to vada. Na kartičce má stát tvar, ke
     * kterému dítě dojde krácením — a dvě kartičky s touž hodnotou v různých
     * tvarech by rozbily párování.
     */
    | 'unreduced-fraction'
    /**
     * Zlomkový výsledek na listu, který ho nedovoluje.
     *
     * Šifra: výsledek je kód políčka v mřížce, takže `3/4` v ní nemá kam
     * ukázat. Viz `TaskRules.fractionResults`.
     */
    | 'fraction-result-not-allowed'
    /**
     * Dvě zadání se stejným výsledkem. U párovacích her (pexeso, domino) vada:
     * dítě spáruje špatně a bude mít pravdu. U šifry naopak v pořádku.
     */
    | 'ambiguous-pairing'
    /**
     * Číslo na bingo kartě, které není ve vyvolávacím seznamu.
     *
     * Dítě s takovým číslem nemůže vyhrát a nemá jak poznat, že to není jeho
     * chyba — hledá výsledek, který učitel nikdy nepřečte.
     */
    | 'uncallable-value'
    /**
     * Dvě stejné bingo karty, nebo totéž číslo dvakrát na jedné kartě.
     *
     * Stejné karty znamenají dvě děti volající bingo naráz; číslo dvakrát na
     * kartě znamená, že jedno škrtnutí zabere dvě políčka.
     */
    | 'duplicate-card'
    /**
     * Kameny domina netvoří jeden souvislý kruh.
     *
     * Osm kamenů se dá spojit i jako dva kroužky po čtyřech: každý kámen má
     * souseda, každá hodnota je jednou — a přesto to dítě nesloží. Vada, kterou
     * neodhalí žádná kontrola jednotlivé úlohy, protože každá je správně.
     */
    | 'broken-chain'
    /*
     * Úniková hra — kontroly celé hry nad rámec jednotlivých stanovišť.
     * Viz docs/navrh-unikova-hra.md §9.
     */
    /** Slovo stanoviště není ve slovníku příběhu. */
    | 'station-word-unknown'
    /** Písmeno, které má tabule ze slova vzít, ve slově není. */
    | 'picked-letter-not-in-word'
    /** Stanoviště, ze kterého se nebere žádné písmeno, nebo víc než tři. */
    | 'station-picks-out-of-range'
    /** Různé písmeno tajenky, které nedodá žádné slovo. */
    | 'letter-uncovered'
    /** Různé písmeno tajenky, které dodají dvě slova. Při šibenici dodá každé jen jedno. */
    | 'letter-duplicate'
    /** Slovo stanoviště je zároveň slovem tajenky a prozradilo by kus finále. */
    | 'station-word-in-tajenka'
    /** Skupina bez stanoviště. */
    | 'group-empty'
    /** Stejné slovo na dvou stanovištích. */
    | 'duplicate-station-word'
    /**
     * Slova všech stanovišť, zadaná do zámku a doplněná jako šibenice,
     * nedají přesně finální tajenku. Kontrola, která dělá celou hru.
     */
    | 'lock-mismatch'
    /** Výběr odpovědí: žádná z nabídnutých odpovědí není správný výsledek. */
    | 'choice-missing-answer'
    /** Výběr odpovědí: dvě odpovědi mají stejnou hodnotu nebo stejné písmeno. */
    | 'choice-ambiguous'
  message: string
}
