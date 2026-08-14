/**
 * Společné kousky validace payloadu z `.sifra`.
 *
 * ⚠ Vstup je NEDŮVĚRYHODNÝ. Soubor může přijít e-mailem od kolegyně, projít
 *   cizí verzí aplikace nebo být ručně upravený. Proto se všechno kontroluje
 *   a nikde se nepoužije `as` bez ověření.
 *
 * Sdílí se jen to, co má u všech aktivit stejný význam: ročník, váhy operací
 * a nastavení výstupu. Zbytek si každá aktivita validuje sama — pravidlo
 * o klamných písmenech nemá co dělat v listu číselných řad.
 */

import { gradeProfile } from '../core/constraints/index.js'
import type {
  DifficultyProfile,
  Grade,
  OperationTag,
  OutputConfig,
} from '../core/model/index.js'

const GRADES: Grade[] = [3, 4, 5, 6, 7, 8, 9]
const OPERATIONS: OperationTag[] = ['add', 'sub', 'mul', 'div']

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Profil obtížnosti z ročníku v souboru.
 *
 * Odvozuje se ZNOVU, uložený profil se ignoruje. Kdyby se přebíral ze
 * souboru, oprava defaultů pro 4. třídu by se do dřív uložených aktivit
 * nikdy nepromítla — a učitel by nechápal proč. Až přijdou ruční úpravy
 * profilu, uloží se jako výslovný override.
 */
export function parseDifficulty(raw: unknown): DifficultyProfile | null {
  if (!isRecord(raw)) return null
  const grade = raw.grade
  if (typeof grade !== 'number' || !GRADES.includes(grade as Grade)) return null
  return gradeProfile(grade as Grade)
}

/** Váhy operací. `null` = ani jedna povolená, což je neplatný stav. */
export function parseTaskMix(raw: unknown): Partial<Record<OperationTag, number>> | null {
  const taskMix: Partial<Record<OperationTag, number>> = {}
  if (isRecord(raw)) {
    for (const operation of OPERATIONS) {
      const weight = raw[operation]
      if (typeof weight === 'number' && weight > 0) taskMix[operation] = weight
    }
  }
  return Object.keys(taskMix).length === 0 ? null : taskMix
}

export function parseOutput(raw: Record<string, unknown>, printTitleByDefault: boolean): OutputConfig {
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

export function clamp01(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.min(Math.max(value, 0), 1)
}
