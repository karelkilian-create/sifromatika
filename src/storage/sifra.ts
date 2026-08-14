/**
 * Formát `.sifra` — uložená aktivita.
 *
 * Soubor obsahuje **výhradně konfiguraci, seed a kontrolní součet**. Tabulka
 * ani příklady se do něj neukládají, protože se deterministicky dopočítají;
 * mít vedle sebe zdroj i odvozeninu znamená dva zdroje pravdy, které se dřív
 * nebo později rozejdou (docs/rozsah-0.1.md §3.4).
 *
 * Tatáž serializace poslouží v 0.4 pro sdílení odkazem — proto je oddělená
 * od způsobu uložení.
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

export function serializeSifra(config: ProjectConfig, checksum: string): string {
  const file: SifraFile = {
    format: SIFRA_FORMAT,
    schemaVersion: SIFRA_SCHEMA_VERSION,
    checksum,
    config,
  }
  return `${JSON.stringify(file, null, 2)}\n`
}

export type SifraParseResult =
  | { ok: true; file: SifraFile }
  | { ok: false; error: string }

export function parseSifra(text: string): SifraParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Soubor není platný .sifra — nejde přečíst.' }
  }

  if (!isRecord(raw)) return { ok: false, error: 'Soubor není platný .sifra.' }
  if (raw.format !== SIFRA_FORMAT) {
    return { ok: false, error: 'Tenhle soubor nepochází ze Šifromatiky.' }
  }
  if (raw.schemaVersion !== SIFRA_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Soubor je ve formátu verze ${String(raw.schemaVersion)}, tahle Šifromatika umí ${SIFRA_SCHEMA_VERSION}.`,
    }
  }
  if (typeof raw.checksum !== 'string') {
    return { ok: false, error: 'Souboru chybí kontrolní součet.' }
  }

  const config = parseConfig(raw.config)
  if (config === null) return { ok: false, error: 'Nastavení v souboru je poškozené.' }

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
