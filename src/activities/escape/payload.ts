/**
 * Validace payloadu únikové hry ze souboru `.sifra`.
 *
 * Závisí jen na `core` a na příbězích (čistá data) — kontrola nedůvěryhodného
 * souboru nemá vtahovat generátor. Stejné pravidlo jako u ostatních aktivit.
 */

import { ESCAPE_MESSAGE_MAX_CHARS, clampGroupCount } from '../../core/constraints/index.js'
import type { EscapeConfig, EscapeLength, EscapeMode, EscapeStationKind } from '../../core/model/index.js'
import { isRecord, parseDifficulty, parseTaskMix } from '../payload-utils.js'
import { findStory } from './stories.js'

const LENGTHS: EscapeLength[] = ['short', 'medium', 'long']
const MODES: EscapeMode[] = ['class', 'groups']
const STATION_KINDS: EscapeStationKind[] = ['grid', 'choice']

export function parseEscapePayload(raw: unknown): EscapeConfig | null {
  if (!isRecord(raw)) return null

  // Neznámý příběh = soubor z novější verze. Podstrčit jiný příběh by
  // učiteli vyrobilo jinou hru, než jakou ukládal.
  if (typeof raw.story !== 'string' || findStory(raw.story) === undefined) return null
  if (typeof raw.message !== 'string') return null
  if (!LENGTHS.includes(raw.length as EscapeLength)) return null
  if (!MODES.includes(raw.mode as EscapeMode)) return null

  const difficulty = parseDifficulty(raw.difficulty)
  if (difficulty === null) return null

  const taskMix = parseTaskMix(raw.taskMix)
  if (taskMix === null) return null

  return {
    story: raw.story,
    length: raw.length as EscapeLength,
    message: raw.message.slice(0, ESCAPE_MESSAGE_MAX_CHARS),
    mode: raw.mode as EscapeMode,
    groupCount: clampGroupCount(raw.groupCount),
    // Chybí-li, soubor vznikl dřív, než výběr odpovědí existoval — a tehdy
    // měla každá hra šifrovací tabulku.
    stationKind: STATION_KINDS.includes(raw.stationKind as EscapeStationKind)
      ? (raw.stationKind as EscapeStationKind)
      : 'grid',
    difficulty,
    taskMix,
  }
}
