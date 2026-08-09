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
  | 'rady.konstantni-krok'
  | 'rady.stridavy-krok'
  | 'rady.rostouci-krok'
  | 'rady.nasobeni-delenim'

export type OperationTag = 'add' | 'sub' | 'mul' | 'div'

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

export interface Task {
  id: string
  generatorId: string
  /** Výsledek úlohy. Musí souhlasit s nezávislým přepočtem ve `core/verify`. */
  value: number
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

export type Grade = 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface DifficultyProfile {
  grade: Grade
  numberRange: { min: number; max: number }
  allowNegatives: boolean
  crossesTen: boolean
  multiplicationTables: number[]
  divisionExactOnly: boolean
  maxOperands: number
  /** Smí se objevit druhá a třetí mocnina a druhá odmocnina? Od 8. ročníku. */
  powers: boolean
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
  cipher: {
    strategy: CipherStrategyId
    /** Volitelný override. Když chybí, odvodí se z tajenky a obtížnosti. */
    grid?: { rows: number; cols: number }
    distinctCellPerOccurrence: boolean
    /** Podíl klamných písmen v tabulce, 0–1. */
    decoyDensity: number
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
// Projekt
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityId = 'cipher-grid' | 'sequence-sheet'

interface ProjectBase {
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

export interface CipherGridProject extends ProjectBase {
  activity: 'cipher-grid'
  payload: CipherGridConfig
}

export interface SequenceSheetProject extends ProjectBase {
  activity: 'sequence-sheet'
  payload: SequenceSheetConfig
}

/**
 * Uložitelná aktivita. Rozlišená unie podle `activity` — přidání další hry
 * je nový člen, ne další volitelná pole v jednom společném objektu.
 */
export type ProjectConfig = CipherGridProject | SequenceSheetProject

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
 * Kontext jednoho generování. `usedExpressions` brání tomu, aby na listu
 * byla pětkrát tatáž úloha — naivní výběr to dělá překvapivě často.
 */
export interface GenContext {
  profile: DifficultyProfile
  /** Váhy povolených operací. Prázdné = všechny se stejnou vahou. */
  mix: Partial<Record<OperationTag, number>>
  usedExpressions: Set<string>
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
    /** Chybný matematický zápis, například dva operátory vedle sebe. */
    | 'malformed-notation'
  message: string
}
