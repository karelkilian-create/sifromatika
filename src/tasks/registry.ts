/**
 * Registr generátorů úloh.
 *
 * Přidání nového typu úloh (slovní, geometrie, převody) = jeden adresář
 * a jeden řádek tady. Nic jiného se měnit nesmí — to je celá podstata toho,
 * proč je vrstva úloh oddělená od šifer a aktivit.
 */

import type { TaskGenerator } from '../core/model/index.js'
import { arithmeticGenerator } from './arithmetic/index.js'

export const taskGenerators: readonly TaskGenerator[] = [arithmeticGenerator]

export function findTaskGenerator(id: string): TaskGenerator | undefined {
  return taskGenerators.find((generator) => generator.id === id)
}
