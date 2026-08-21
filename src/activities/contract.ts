/**
 * Kontrakt aktivity.
 *
 * Odpověď na otázku „která aktivita" byla dřív napsaná ručně na šesti místech:
 * v generování, v kontrolním součtu, ve dvou blocích náhledu, v překladu stavu
 * formuláře a v parseru `.sifra`. Se dvěma aktivitami to nikoho netrápilo,
 * s pátou by to bylo šest souběžných větvení — a zapomenutá větev v parseru
 * znamená soubor, který jde uložit a nejde otevřít.
 *
 * Odsud dál platí: **přidání aktivity je nový adresář a jeden řádek
 * v registru.** Žádný soubor mimo `activities/` se kvůli ní neotevírá.
 *
 * Modul je záměrně jen popis — data a funkce, žádná dědičnost. Stejný princip
 * už v projektu funguje pro `tasks/registry.ts` a `ciphers/registry.ts`.
 */

import type { DocumentModel } from '../core/document/index.js'
import type {
  ActivityId,
  Grade,
  OperationTag,
  Project,
  RelaxationLog,
  VerificationReport,
} from '../core/model/index.js'

/**
 * Aktivity v katalogu — hotové i připravované.
 *
 * Dnes se rovná `ActivityId`, protože chystaná není žádná. Typ zůstává
 * samostatný: až se do `plannedActivities` vrátí slib, přibude sem jeho id
 * a nikdo jiný se toho nedotkne.
 */
export type CatalogId = ActivityId

export interface ActivityInfo {
  id: CatalogId
  label: string
  /**
   * Co má žák udělat, aby úkol vyřešil — rozkazovacím způsobem a ve dvou
   * až třech slovech („Najdi tajenku", „Vypočti a škrtni").
   *
   * Není to popis pro dítě ani slogan: v katalogu stojí pět taglinů vedle
   * sebe a učitel je čte jako jeden seznam. Jakmile jeden z nich přejde do
   * jiného stylu — otázka, podstatné jméno, celá věta o tabulce — vypadne
   * z řady a katalog se rozpadne na pět nesouvisejících nápisů.
   */
  tagline: string
  /** `false` = v katalogu je vidět, ale vybrat ji nejde. */
  available: boolean
}

/**
 * Pole formuláře, která má každá aktivita.
 *
 * Ročník, název a operace nejsou vlastnictvím žádné z nich — přepnutí
 * aktivity je nesmí přepsat. Proto se předávají modulu zvlášť, ne jako
 * součást jeho vlastního stavu.
 */
export interface SharedEditorState {
  grade: Grade
  title: string
  operations: Record<OperationTag, boolean>
}

/**
 * Co musí umět list každé aktivity.
 *
 * Krátký seznam schválně — je to jediné, co o listu ví shell. Verifikace je
 * v něm proto, že **neověřený list se nikdy nesmí dostat k tisku**; kdyby ji
 * kontrakt nevyžadoval, šlo by přidat aktivitu, která se tiskne bez kontroly.
 */
export interface ActivitySheet {
  /** Název pro správu souborů. Co se tiskne na papír, si řeší náhled sám. */
  title: string
  relaxations: RelaxationLog[]
  verification: VerificationReport
}

/**
 * Výsledek generování.
 *
 * Neúspěch nese `relaxations` stejně jako úspěch — často právě ústupky
 * vysvětlují, proč to nešlo.
 */
export type GenerateOutcome<Sheet> =
  | { ok: true; sheet: Sheet }
  | { ok: false; reason: string; relaxations: RelaxationLog[] }

/**
 * Jedna aktivita, celá.
 *
 * `State` je slice formuláře jen pro tuhle aktivitu, `Cfg` její payload
 * v `.sifra`, `Sheet` výsledek generování. `Id` váže všechno dohromady:
 * modul zapsaný v registru pod `cipher-grid` nemůže vracet projekt řad.
 */
export interface ActivityModule<Id extends ActivityId, State, Cfg, Sheet extends ActivitySheet> {
  id: Id
  info: ActivityInfo
  /** Výchozí hodnoty slice formuláře. */
  initialState: State
  /** Formulář → konfigurace. Společná pole přicházejí zvlášť. */
  toConfig(state: State, shared: SharedEditorState, seed: string): Project<Id, Cfg>
  /** Konfigurace → slice formuláře. Společná pole si přečte shell sám. */
  fromConfig(config: Project<Id, Cfg>): State
  /**
   * Validace payloadu z `.sifra`. `null` = poškozený nebo cizí.
   *
   * ⚠ Vstup je NEDŮVĚRYHODNÝ — soubor může přijít e-mailem od kolegyně nebo
   *   projít cizí verzí aplikace. Implementace nesmí použít `as` bez ověření.
   */
  parsePayload(raw: unknown): Cfg | null
  generate(config: Project<Id, Cfg>): GenerateOutcome<Sheet>
  checksum(sheet: Sheet): string
  /**
   * Popis vytištěných stránek — u dnešních aktivit pracovní list a řešení,
   * u binga a pexesa jich bude víc.
   *
   * Bere jen `sheet`, protože ten svou konfiguraci nese s sebou; druhá cesta
   * k témuž by se při opakovaném pokusu o generování rozešla v seedu.
   *
   * ⚠ Vrací data, ne JSX. Aktivita tak nemůže obejít renderer vlastní sazbou
   *   a všechny listy zůstanou stejné — což je jediný důvod, proč se dítěti
   *   nestane, že mu dvě aktivity ukážou tutéž věc dvěma způsoby.
   *
   * Zapsáno jako metoda, ne jako pole s funkčním typem — jen tak zůstane
   * modul přiřaditelný na `AnyActivityModule` uvnitř registru.
   */
  toDocument(sheet: Sheet): DocumentModel
}

/**
 * Modul s odloženými typovými parametry.
 *
 * Existuje jen pro vnitřek registru: `activityModules[id]` je unie modulů
 * a metoda unie s různými parametry není volatelná. Nikdo mimo `registry.ts`
 * tenhle typ nepotřebuje — a taky ho nemá používat.
 */
export type AnyActivityModule = ActivityModule<ActivityId, unknown, unknown, ActivitySheet>
