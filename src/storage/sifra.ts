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

import { clampTaskCount, gradeProfile } from '../core/constraints/index.js'
import type {
  CipherGridConfig,
  CipherStrategyId,
  Grade,
  OperationTag,
  OutputConfig,
  ProjectConfig,
  SequenceSheetConfig,
} from '../core/model/index.js'

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

const GRADES: Grade[] = [3, 4, 5, 6, 7, 8, 9]
const STRATEGIES: CipherStrategyId[] = ['grid-coord', 'grid-linear']
const OPERATIONS: OperationTag[] = ['add', 'sub', 'mul', 'div']

/**
 * Známá id generátorů úloh.
 *
 * Vypsané ručně, stejně jako `STRATEGIES` a `OPERATIONS` — parser
 * nedůvěryhodného vstupu nemá sahat do registru generátorů. Neznámé id ze
 * souboru z novější verze se tiše zahodí; horší je spadnout na souboru,
 * který kolegyně poslala e-mailem.
 */
const GENERATORS = ['arithmetic', 'sequence']

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

  // Neznámá aktivita = soubor z novější Šifromatiky. Tichý převod na šifru by
  // učiteli podstrčil úplně jiný list, než jaký ukládal.
  if (raw.activity === 'cipher-grid') {
    const payload = parseCipherGridPayload(raw.payload)
    return payload === null ? null : { ...base, activity: 'cipher-grid', payload }
  }
  if (raw.activity === 'sequence-sheet') {
    const payload = parseSequenceSheetPayload(raw.payload)
    return payload === null ? null : { ...base, activity: 'sequence-sheet', payload }
  }
  return null
}

/** Váhy operací. `null` = ani jedna povolená, což je neplatný stav. */
function parseTaskMix(raw: unknown): Partial<Record<OperationTag, number>> | null {
  const taskMix: Partial<Record<OperationTag, number>> = {}
  if (isRecord(raw)) {
    for (const operation of OPERATIONS) {
      const weight = raw[operation]
      if (typeof weight === 'number' && weight > 0) taskMix[operation] = weight
    }
  }
  return Object.keys(taskMix).length === 0 ? null : taskMix
}

function parseOutput(raw: Record<string, unknown>, printTitleByDefault: boolean): OutputConfig {
  return {
    includeSolution: raw.includeSolution !== false,
    paper: 'A4',
    columns: raw.columns === 1 ? 1 : 2,
    printTitleOnWorksheet:
      raw.printTitleOnWorksheet === undefined
        ? printTitleByDefault
        : raw.printTitleOnWorksheet === true,
  }
}

function parseSequenceSheetPayload(raw: unknown): SequenceSheetConfig | null {
  if (!isRecord(raw)) return null

  const difficulty = raw.difficulty
  if (!isRecord(difficulty)) return null
  const grade = difficulty.grade
  if (typeof grade !== 'number' || !GRADES.includes(grade as Grade)) return null

  const output = raw.output
  if (!isRecord(output)) return null

  const taskMix = parseTaskMix(raw.taskMix)
  if (taskMix === null) return null

  return {
    taskCount: clampTaskCount(raw.taskCount),
    difficulty: gradeProfile(grade as Grade),
    taskMix,
    // List řad nemá tajenku, takže se název tiskne, pokud soubor neříká jinak.
    output: parseOutput(output, true),
  }
}

function parseCipherGridPayload(raw: unknown): CipherGridConfig | null {
  if (!isRecord(raw)) return null
  if (typeof raw.message !== 'string') return null

  const difficulty = raw.difficulty
  if (!isRecord(difficulty)) return null
  const grade = difficulty.grade
  if (typeof grade !== 'number' || !GRADES.includes(grade as Grade)) return null

  const cipher = raw.cipher
  if (!isRecord(cipher)) return null
  if (typeof cipher.strategy !== 'string' || !STRATEGIES.includes(cipher.strategy as CipherStrategyId)) {
    return null
  }

  const output = raw.output
  if (!isRecord(output)) return null

  const taskMix = parseTaskMix(raw.taskMix)
  if (taskMix === null) return null

  // Chybí-li `generatorMix`, soubor vznikl dřív, než existovaly další
  // generátory. Doplnit sem dnešní default by znamenalo, že se loni uložená
  // aktivita vytiskne jinak — proto výslovně jen aritmetika.
  const generatorMix: Record<string, number> = {}
  if (isRecord(raw.generatorMix)) {
    for (const id of GENERATORS) {
      const weight = raw.generatorMix[id]
      if (typeof weight === 'number' && weight > 0) generatorMix[id] = weight
    }
  }

  return {
    message: raw.message,
    // Profil obtížnosti se z ročníku odvodí ZNOVU, uložený se ignoruje. Kdyby
    // se přebíral ze souboru, oprava defaultů pro 4. třídu by se do dřív
    // uložených aktivit nikdy nepromítla — a učitel by nechápal proč.
    // Až 0.2 přidá ruční úpravy profilu, uloží se jako výslovný override.
    difficulty: gradeProfile(grade as Grade),
    taskMix,
    generatorMix: Object.keys(generatorMix).length > 0 ? generatorMix : { arithmetic: 1 },
    cipher: {
      strategy: cipher.strategy as CipherStrategyId,
      grid: parseGrid(cipher.grid),
      distinctCellPerOccurrence: cipher.distinctCellPerOccurrence !== false,
      decoyDensity: clamp01(cipher.decoyDensity, 0.35),
    },
    // Šifra má co prozradit, takže se název na žákovský list defaultně netiskne.
    output: parseOutput(output, false),
  }
}

function parseGrid(raw: unknown): { rows: number; cols: number } | undefined {
  if (!isRecord(raw)) return undefined
  const { rows, cols } = raw
  if (typeof rows !== 'number' || typeof cols !== 'number') return undefined
  if (!Number.isInteger(rows) || !Number.isInteger(cols)) return undefined
  if (rows < 1 || cols < 1 || rows > 20 || cols > 20) return undefined
  return { rows, cols }
}

function clamp01(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.min(Math.max(value, 0), 1)
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
