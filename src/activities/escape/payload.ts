/**
 * Validace payloadu únikové hry ze souboru `.sifra`.
 *
 * Závisí jen na `core` a na příbězích (čistá data) — kontrola nedůvěryhodného
 * souboru nemá vtahovat generátor. Stejné pravidlo jako u ostatních aktivit.
 */

import {
  ESCAPE_MESSAGE_MAX_CHARS,
  clampGroupCount,
  upToTwentyIsChoice,
  withUpToTwenty,
} from '../../core/constraints/index.js'
import type { EscapeConfig, EscapeLength, EscapeMode, EscapeStationKind } from '../../core/model/index.js'
import { isRecord, parseDifficulty, parseGeneratorMix, parseTaskMix } from '../payload-utils.js'
import { findStory } from './stories.js'

const LENGTHS: EscapeLength[] = ['short', 'medium', 'long']
const MODES: EscapeMode[] = ['class', 'groups']
const STATION_KINDS: EscapeStationKind[] = ['grid', 'choice']

/**
 * Známá id generátorů úloh — tatáž jako u šifry, protože stanoviště je
 * šifrovací tabulka (`gridGeneratorMix`). Vypsaná ručně ze stejného důvodu
 * jako tam: parser nemá sahat do registru generátorů.
 */
const GENERATORS = [
  'arithmetic',
  'sequence',
  'decimal',
  'percent',
  'fractions',
  'equation',
  'decomposition',
  'terms',
  'terms-products',
]

export function parseEscapePayload(raw: unknown): EscapeConfig | null {
  if (!isRecord(raw)) return null

  // Neznámý příběh = soubor z novější verze. Podstrčit jiný příběh by
  // učiteli vyrobilo jinou hru, než jakou ukládal.
  if (typeof raw.story !== 'string' || findStory(raw.story) === undefined) return null
  if (typeof raw.message !== 'string') return null
  if (!LENGTHS.includes(raw.length as EscapeLength)) return null
  if (!MODES.includes(raw.mode as EscapeMode)) return null

  const parsed = parseDifficulty(raw.difficulty)
  if (parsed === null) return null

  const taskMix = parseTaskMix(raw.taskMix)
  if (taskMix === null) return null

  // Chybí-li, hra vznikla dřív, než únikovka znala témata — a tehdy měla
  // jen aritmetiku. Stejně jako u šifry.
  const generatorMix = parseGeneratorMix(raw.generatorMix, GENERATORS)

  // Chybí-li, soubor vznikl dřív, než výběr odpovědí existoval — a tehdy
  // měla každá hra šifrovací tabulku.
  const stationKind = STATION_KINDS.includes(raw.stationKind as EscapeStationKind)
    ? (raw.stationKind as EscapeStationKind)
    : 'grid'
  // „Do 20" jen tam, kde je to volba; jinde by soubor tvrdil něco, co hra
  // nedělá.
  const upToTwenty = raw.upToTwenty === true && upToTwentyIsChoice(parsed.grade, stationKind)
  const difficulty = upToTwenty ? withUpToTwenty(parsed) : parsed

  return {
    story: raw.story,
    length: raw.length as EscapeLength,
    message: raw.message.slice(0, ESCAPE_MESSAGE_MAX_CHARS),
    mode: raw.mode as EscapeMode,
    groupCount: clampGroupCount(raw.groupCount),
    stationKind,
    difficulty,
    taskMix,
    generatorMix: Object.keys(generatorMix).length > 0 ? generatorMix : { arithmetic: 1 },
    ...(upToTwenty ? { upToTwenty: true } : {}),
  }
}
