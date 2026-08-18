/**
 * Registr aktivit — jediné místo, které o všech aktivitách ví najednou.
 *
 * Dvojí role, obojí schválně na jedné hromadě:
 *
 *  1. **Katalog pro učitele.** Nástroj, u kterého není na první pohled vidět,
 *     co všechno umí, se použije jednou a pak už ne. Proto jsou v katalogu
 *     i aktivity, které ještě nejsou hotové — ale poctivě označené.
 *  2. **Registr modulů pro kód.** Generování, kontrolní součet, náhled,
 *     překlad formuláře i validace souboru — všechno na jednom řádku.
 *
 * ⚠ `available: false` znamená „ještě to neexistuje", ne „je to skryté".
 *   Zapnout aktivitu, která nejde vygenerovat, je horší než ji neukázat:
 *   učitel by klikl, nic by nedostal a podruhé už nepřijde.
 *
 * Přidání aktivity = nový adresář v `activities/` a jeden řádek v mapě níž.
 * Když k `ActivityId` v `core/model` chybí modul, spadne překlad — ne až
 * aplikace v ruce učitele.
 */

import type { DocumentModel } from '../core/document/index.js'
import type { ActivityId, ProjectBase, ProjectConfig } from '../core/model/index.js'
import { cipherGridModule } from './cipher-grid/module.js'
import { dominoModule } from './domino/module.js'
import { pexesoModule } from './pexeso/module.js'
import { sequenceSheetModule } from './sequence-sheet/module.js'
import type {
  ActivityInfo,
  ActivitySheet,
  AnyActivityModule,
  CatalogId,
  GenerateOutcome,
  SharedEditorState,
} from './contract.js'

export type { ActivityInfo, CatalogId } from './contract.js'

export const activityModules = {
  'cipher-grid': cipherGridModule,
  'sequence-sheet': sequenceSheetModule,
  pexeso: pexesoModule,
  domino: dominoModule,
} satisfies Record<ActivityId, AnyActivityModule>

type ActivityModules = typeof activityModules

/** Stav formuláře pro každou aktivitu zvlášť, odvozený z modulů. */
export type ActivityStates = {
  [K in ActivityId]: ActivityModules[K]['initialState']
}

/** Aktivity, které v katalogu jsou vidět, ale ještě nejdou vybrat. */
const plannedActivities: readonly ActivityInfo[] = [
  {
    id: 'bingo',
    label: 'Bingo',
    tagline: 'Připravujeme',
    available: false,
  },
]

/** Katalog v pořadí, v jakém ho uvidí učitel: hotové napřed, pak chystané. */
export const activityCatalog: readonly ActivityInfo[] = [
  ...Object.values(activityModules).map((module) => module.info),
  ...plannedActivities,
]

export function isAvailableActivity(id: CatalogId): id is ActivityId {
  return activityCatalog.some((activity) => activity.id === id && activity.available)
}

/** Je to id aktivity, kterou tahle verze zná? Pro vstup ze souboru. */
export function isActivityId(value: unknown): value is ActivityId {
  return typeof value === 'string' && value in activityModules
}

export function initialActivityStates(): ActivityStates {
  const states = Object.fromEntries(
    Object.entries(activityModules).map(([id, module]) => [id, module.initialState]),
  )
  // Klíče i hodnoty pocházejí z `activityModules`, takže tvar sedí; typ
  // `Object.fromEntries` je jen širší, než co dokáže překladač odvodit.
  return states as ActivityStates
}

export interface ActivityRun {
  config: ProjectConfig
  outcome: GenerateOutcome<ActivitySheet>
  /**
   * Stránky k vytištění, nebo `null`, když se list nepovedl nebo neprošel
   * kontrolou. Neověřený list se do dokumentu nedostane vůbec — nemá tedy
   * jak proklouznout do náhledu ani do tisku.
   */
  document: DocumentModel | null
}

/**
 * Stav formuláře → konfigurace.
 *
 * Bere celý `ActivityStates`, ne jeden slice: kdyby si volající vybíral sám,
 * překladač by mu nedokázal ohlídat, že podal stav té aktivity, kterou žádá.
 */
export function configFor(
  activity: ActivityId,
  states: ActivityStates,
  shared: SharedEditorState,
  seed: string,
): ProjectConfig {
  const module = activityModules[activity] as AnyActivityModule
  // Mapa modulů garantuje, že modul pod `activity` vrací projekt téže
  // aktivity — `satisfies Record<ActivityId, …>` výš to hlídá při překladu.
  return module.toConfig(states[activity], shared, seed) as ProjectConfig
}

/** Vygeneruje aktivitu podle stavu formuláře a připraví její stránky. */
export function runActivity(
  activity: ActivityId,
  states: ActivityStates,
  shared: SharedEditorState,
  seed: string,
): ActivityRun {
  const module = activityModules[activity] as AnyActivityModule
  const config = configFor(activity, states, shared, seed)
  const outcome = module.generate(config)
  const verified = outcome.ok && outcome.sheet.verification.ok

  return {
    config,
    outcome,
    document: outcome.ok && verified ? module.toDocument(outcome.sheet) : null,
  }
}

/**
 * Kontrolní součet listu pro danou konfiguraci.
 *
 * Počítá se z nově vygenerovaného listu, ne z toho na obrazovce — právě to
 * z něj dělá test determinismu při otevírání souboru. `null` = z konfigurace
 * žádný list nevznikne.
 */
export function checksumForConfig(config: ProjectConfig): string | null {
  const module = activityModules[config.activity] as AnyActivityModule
  const outcome = module.generate(config)
  return outcome.ok ? module.checksum(outcome.sheet) : null
}

/** Stav formuláře pro tu aktivitu, které konfigurace patří. */
export function activityStateFromConfig(config: ProjectConfig): Partial<ActivityStates> {
  const module = activityModules[config.activity] as AnyActivityModule
  return { [config.activity]: module.fromConfig(config) }
}

/**
 * Složí projekt z hlavičky a nedůvěryhodného payloadu.
 *
 * `null` u neznámé aktivity je záměr: soubor z novější Šifromatiky se odmítne,
 * protože tichý převod na šifru by učiteli podstrčil úplně jiný list, než jaký
 * ukládal.
 */
export function parseActivityProject(
  base: ProjectBase,
  activity: unknown,
  rawPayload: unknown,
): ProjectConfig | null {
  if (!isActivityId(activity)) return null
  const module = activityModules[activity] as AnyActivityModule
  const payload = module.parsePayload(rawPayload)
  if (payload === null) return null
  // Tentýž klíč vybral modul i cílovou variantu unie, takže k sobě patří.
  return { ...base, activity, payload } as ProjectConfig
}
