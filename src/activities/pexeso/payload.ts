/**
 * Validace payloadu pexesa ze souboru `.sifra`.
 *
 * Závisí jen na `core`, aby kontrola nedůvěryhodného souboru nemusela vtahovat
 * generátor — totéž pravidlo jako u ostatních aktivit.
 */

import { clampPairCount } from '../../core/constraints/index.js'
import type { PexesoConfig } from '../../core/model/index.js'
import { isRecord, parseDifficulty, parseOutput, parseTaskMix } from '../payload-utils.js'

const GENERATORS = ['arithmetic', 'sequence', 'decimal', 'percent']

export function parsePexesoPayload(raw: unknown): PexesoConfig | null {
  if (!isRecord(raw)) return null

  const difficulty = parseDifficulty(raw.difficulty)
  if (difficulty === null) return null

  const output = raw.output
  if (!isRecord(output)) return null

  const taskMix = parseTaskMix(raw.taskMix)
  if (taskMix === null) return null

  const generatorMix: Record<string, number> = {}
  if (isRecord(raw.generatorMix)) {
    for (const id of GENERATORS) {
      const weight = raw.generatorMix[id]
      if (typeof weight === 'number' && weight > 0) generatorMix[id] = weight
    }
  }

  return {
    pairCount: clampPairCount(raw.pairCount),
    difficulty,
    taskMix,
    generatorMix: Object.keys(generatorMix).length > 0 ? generatorMix : { arithmetic: 1 },
    // Kartičky nemají co prozradit, takže se název tiskne, pokud soubor neříká jinak.
    output: parseOutput(output, true),
  }
}
