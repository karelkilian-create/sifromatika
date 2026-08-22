/**
 * Validace payloadu pexesa ze souboru `.sifra`.
 *
 * Závisí jen na `core`, aby kontrola nedůvěryhodného souboru nemusela vtahovat
 * generátor — totéž pravidlo jako u ostatních aktivit.
 */

import { clampPairCount } from '../../core/constraints/index.js'
import type { PexesoConfig } from '../../core/model/index.js'
import { isRecord, parseDifficulty, parseGeneratorMix, parseOutput, parseTaskMix } from '../payload-utils.js'

/**
 * ⚠ Jen pexeso zná `powers`. Šifra ho ve svém seznamu nemá schválně: nemá pro
 *   mocniny zaškrtávátko, takže by je soubor uměl zapnout, ale formulář by to
 *   po načtení neuměl ukázat ani vypnout.
 */
const GENERATORS = ['arithmetic', 'sequence', 'decimal', 'percent', 'powers', 'fractions']

export function parsePexesoPayload(raw: unknown): PexesoConfig | null {
  if (!isRecord(raw)) return null

  const difficulty = parseDifficulty(raw.difficulty)
  if (difficulty === null) return null

  const output = raw.output
  if (!isRecord(output)) return null

  const taskMix = parseTaskMix(raw.taskMix)
  if (taskMix === null) return null

  const generatorMix = parseGeneratorMix(raw.generatorMix, GENERATORS)

  return {
    pairCount: clampPairCount(raw.pairCount),
    difficulty,
    taskMix,
    generatorMix: Object.keys(generatorMix).length > 0 ? generatorMix : { arithmetic: 1 },
    // Kartičky nemají co prozradit, takže se název tiskne, pokud soubor neříká jinak.
    output: parseOutput(output, true),
  }
}
