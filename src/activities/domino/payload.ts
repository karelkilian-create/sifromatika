/**
 * Validace payloadu domina ze souboru `.sifra`.
 *
 * Závisí jen na `core`, aby kontrola nedůvěryhodného souboru nemusela vtahovat
 * generátor — totéž pravidlo jako u ostatních aktivit.
 */

import { clampTileCount } from '../../core/constraints/index.js'
import type { DominoConfig } from '../../core/model/index.js'
import { isRecord, parseDifficulty, parseGeneratorMix, parseOutput, parseTaskMix } from '../payload-utils.js'

/** Témata, která má domino ve formuláři — tatáž sada jako pexeso. */
const GENERATORS = ['arithmetic', 'sequence', 'decimal', 'percent', 'powers', 'fractions']

export function parseDominoPayload(raw: unknown): DominoConfig | null {
  if (!isRecord(raw)) return null

  const difficulty = parseDifficulty(raw.difficulty)
  if (difficulty === null) return null

  const output = raw.output
  if (!isRecord(output)) return null

  const taskMix = parseTaskMix(raw.taskMix)
  if (taskMix === null) return null

  const generatorMix = parseGeneratorMix(raw.generatorMix, GENERATORS)

  return {
    tileCount: clampTileCount(raw.tileCount),
    difficulty,
    taskMix,
    generatorMix: Object.keys(generatorMix).length > 0 ? generatorMix : { arithmetic: 1 },
    // Kameny nemají co prozradit, takže se název tiskne, pokud soubor neříká jinak.
    output: parseOutput(output, true),
  }
}
