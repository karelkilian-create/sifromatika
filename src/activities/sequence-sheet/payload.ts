/**
 * Validace payloadu listu číselných řad ze souboru `.sifra`.
 *
 * Stejně jako u šifry: závisí jen na `core`, aby kontrola souboru nemusela
 * vtahovat generátor.
 */

import { clampTaskCount } from '../../core/constraints/index.js'
import type { SequenceSheetConfig } from '../../core/model/index.js'
import { isRecord, parseDifficulty, parseOutput, parseTaskMix } from '../payload-utils.js'

export function parseSequenceSheetPayload(raw: unknown): SequenceSheetConfig | null {
  if (!isRecord(raw)) return null

  const difficulty = parseDifficulty(raw.difficulty)
  if (difficulty === null) return null

  const output = raw.output
  if (!isRecord(output)) return null

  const taskMix = parseTaskMix(raw.taskMix)
  if (taskMix === null) return null

  return {
    taskCount: clampTaskCount(raw.taskCount),
    difficulty,
    taskMix,
    // List řad nemá tajenku, takže se název tiskne, pokud soubor neříká jinak.
    output: parseOutput(output, true),
  }
}
