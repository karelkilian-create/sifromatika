/**
 * Formát `.sifra` — uložená aktivita.
 *
 * Soubor obsahuje **výhradně konfiguraci, seed a kontrolní součet**. Tabulka
 * ani příklady se do něj neukládají, protože se deterministicky dopočítají;
 * mít vedle sebe zdroj i odvozeninu znamená dva zdroje pravdy, které se dřív
 * nebo později rozejdou (docs/rozsah-0.1.md §3.4).
 *
 * Tatáž serializace nese i **odkaz na list** (`storage/share-link`) — proto je
 * oddělená od způsobu uložení. Soubor a odkaz se liší jen obalem: jeden je
 * text na disku, druhý base64url ve fragmentu URL. Kontroluje je týž parser,
 * protože obojí přichází zvenčí a obojí může být upravené.
 *
 * ⚠ Vstup je NEDŮVĚRYHODNÝ. Soubor může přijít e-mailem od kolegyně, projít
 *   cizí verzí aplikace nebo být ručně upravený. Proto se všechno kontroluje
 *   a nikde se nepoužije `as` bez ověření.
 */

import { parseActivityProject } from '../activities/registry.js'
import type { ProjectConfig } from '../core/model/index.js'

export const SIFRA_FORMAT = 'sifromatika'
export const SIFRA_SCHEMA_VERSION = 1

export interface SifraFile {
  format: typeof SIFRA_FORMAT
  schemaVersion: number
  /** Součet výstupu v době uložení. Při otevření se porovná s přepočteným. */
  checksum: string
  config: ProjectConfig
}

/**
 * Obsah souboru i odkazu — jedno místo, kde se skládá hlavička.
 *
 * Kdyby si ho odkaz stavěl po svém, rozešel by se se souborem přesně ve chvíli,
 * kdy do hlavičky přibude pole: uložený list by ho měl, sdílený ne.
 */
export function buildSifraFile(config: ProjectConfig, checksum: string): SifraFile {
  return {
    format: SIFRA_FORMAT,
    schemaVersion: SIFRA_SCHEMA_VERSION,
    checksum,
    config,
  }
}

export function serializeSifra(config: ProjectConfig, checksum: string): string {
  // Odsazený zápis jen pro soubor: učitel si ho může otevřít v poznámkovém
  // bloku. Odkaz šetří každý znak, a tak si JSON serializuje sám, kompaktně.
  return `${JSON.stringify(buildSifraFile(config, checksum), null, 2)}\n`
}

/**
 * Odkud konfigurace přišla.
 *
 * Mění **jen znění hlášek**. Kontroly jsou pro soubor i odkaz totožné, protože
 * obojí je stejně nedůvěryhodné — odkaz dokonce o něco víc, ten jde přepsat
 * v adresním řádku.
 *
 * Celé věty místo skloňovaného podstatného jména: „Souboru chybí…" a „Odkazu
 * chybí…" se liší pádem a jedna proměnná uprostřed věty by češtinu nezachránila.
 */
export type SifraSource = 'file' | 'link'

interface SifraMessages {
  unreadable: string
  notSifra: string
  foreign: string
  wrongVersion: (version: string) => string
  missingChecksum: string
  brokenConfig: string
}

const MESSAGES: Record<SifraSource, SifraMessages> = {
  file: {
    unreadable: 'Soubor není platný .sifra — nejde přečíst.',
    notSifra: 'Soubor není platný .sifra.',
    foreign: 'Tenhle soubor nepochází ze Šifromatiky.',
    wrongVersion: (version) =>
      `Soubor je ve formátu verze ${version}, tahle Šifromatika umí ${SIFRA_SCHEMA_VERSION}.`,
    missingChecksum: 'Souboru chybí kontrolní součet.',
    brokenConfig: 'Nastavení v souboru je poškozené.',
  },
  link: {
    unreadable: 'Odkaz se cestou poškodil. Nech si ho poslat znovu, celý.',
    notSifra: 'Tenhle odkaz nevede na list ze Šifromatiky.',
    foreign: 'Tenhle odkaz nepochází ze Šifromatiky.',
    wrongVersion: (version) =>
      `Odkaz je ve formátu verze ${version}, tahle Šifromatika umí ${SIFRA_SCHEMA_VERSION}.`,
    missingChecksum: 'Odkazu chybí kontrolní součet.',
    brokenConfig: 'Nastavení v odkazu je poškozené.',
  },
}

export type SifraParseResult =
  | { ok: true; file: SifraFile }
  | { ok: false; error: string }

export function parseSifra(text: string, source: SifraSource = 'file'): SifraParseResult {
  const messages = MESSAGES[source]

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: messages.unreadable }
  }

  if (!isRecord(raw)) return { ok: false, error: messages.notSifra }
  if (raw.format !== SIFRA_FORMAT) {
    return { ok: false, error: messages.foreign }
  }
  if (raw.schemaVersion !== SIFRA_SCHEMA_VERSION) {
    return { ok: false, error: messages.wrongVersion(String(raw.schemaVersion)) }
  }
  if (typeof raw.checksum !== 'string') {
    return { ok: false, error: messages.missingChecksum }
  }

  const config = parseConfig(raw.config)
  if (config === null) return { ok: false, error: messages.brokenConfig }

  return { ok: true, file: { format: SIFRA_FORMAT, schemaVersion: 1, checksum: raw.checksum, config } }
}

function parseConfig(raw: unknown): ProjectConfig | null {
  if (!isRecord(raw)) return null
  if (raw.schemaVersion !== 1) return null
  if (typeof raw.seed !== 'string' || raw.seed === '') return null
  if (typeof raw.generatorVersion !== 'number') return null
  if (typeof raw.appVersion !== 'string') return null
  if (raw.title !== undefined && typeof raw.title !== 'string') return null

  const base = {
    schemaVersion: 1 as const,
    generatorVersion: raw.generatorVersion,
    appVersion: raw.appVersion,
    seed: raw.seed,
    locale: 'cs' as const,
    title: raw.title,
  }

  // Payload si validuje aktivita sama; tenhle modul zná jen hlavičku.
  // Neznámá aktivita = soubor z novější Šifromatiky, a registr na ni vrátí
  // `null` — tichý převod na šifru by učiteli podstrčil úplně jiný list,
  // než jaký ukládal.
  return parseActivityProject(base, raw.activity, raw.payload)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Název souboru odvozený z názvu aktivity.
 *
 * Diakritika se zachovává — všechny podporované systémy si s ní poradí
 * a „Vánoční stezka.sifra" je pro učitele čitelnější než „Vanocni stezka".
 * Odstraňují se jen znaky, které jsou ve jménech souborů zakázané.
 */
export function suggestFileName(title: string): string {
  const cleaned = title
    .replace(/[/\\:*?"<>|]/gu, ' ') // znaky zakázané ve jménech souborů
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 60)
    .replace(/[.\s]+$/u, '')
  return `${cleaned === '' ? 'sifra' : cleaned}.sifra`
}
