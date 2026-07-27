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
  | 'arit.prechod-pres-desitku'
  | 'arit.mala-nasobilka'
  | 'arit.deleni-beze-zbytku'
  | 'arit.deleni-se-zbytkem'

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
 * Zadání úlohy. Ve verzi 0.1 má unie jediného člena — a to je v pořádku.
 * Tři řádky s nulovou režií znamenají, že přidání slovních úloh v 0.5 bude
 * přidáním členu, ne úpravou každého místa pracujícího s `prompt`.
 */
export type PromptNode = { kind: 'expr'; text: string }

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

/** Ve verzi 0.1 existuje jen `linear`; `coord` přijde v 0.2 se šifrou grid-coord. */
export type CodeToken = { kind: 'linear'; n: number }

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
}

export interface CipherGridConfig {
  message: string
  difficulty: DifficultyProfile
  /** Váhy jednotlivých typů úloh, nikoli booleany. */
  taskMix: Partial<Record<OperationTag, number>>
  cipher: {
    strategy: 'grid-linear'
    /** Volitelný override. Když chybí, odvodí se z tajenky a obtížnosti. */
    grid?: { rows: number; cols: number }
    distinctCellPerOccurrence: boolean
    /** Podíl klamných písmen v tabulce, 0–1. */
    decoyDensity: number
  }
  output: {
    includeSolution: boolean
    paper: 'A4'
    columns: 1 | 2
    /**
     * Tisknout název aktivity na ŽÁKOVSKÝ list?
     *
     * Defaultně `false` a při automaticky odvozeném `title` se ignoruje úplně —
     * nadpis odvozený z tajenky by ji prozradil dřív, než dítě spočítá první
     * příklad. Viz docs/rozsah-0.1.md §3.6.
     */
    printTitleOnWorksheet: boolean
  }
}

export interface ProjectConfig {
  schemaVersion: 1
  /** Mění deterministický výstup. Změna = staré seedy generují jiný list. */
  generatorVersion: number
  /** Odlišuje chybu v generátoru od chyby v UI, renderu nebo importu. */
  appVersion: string
  activity: 'cipher-grid'
  seed: string
  locale: 'cs'
  /** Prázdné = odvodí se z tajenky; odvozený název se na žákovský list nikdy netiskne. */
  title?: string
  payload: CipherGridConfig
}

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

export type VerificationReport =
  | { ok: true }
  | { ok: false; failures: VerificationFailure[] }

export interface VerificationFailure {
  code:
    | 'task-value-mismatch'
    | 'ambiguous-code'
    | 'decoded-message-mismatch'
    | 'value-not-in-table'
  message: string
}
