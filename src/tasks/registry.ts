/**
 * Registr generátorů úloh.
 *
 * Přidání nového typu úloh (slovní, geometrie, převody) = jeden adresář
 * a jeden řádek tady. Nic jiného se měnit nesmí — to je celá podstata toho,
 * proč je vrstva úloh oddělená od šifer a aktivit.
 */

import type { TaskGenerator } from '../core/model/index.js'
import { arithmeticGenerator } from './arithmetic/index.js'
import { sequenceGenerator } from './sequence/index.js'

/**
 * ⚠ Samotné přidání generátoru do tohohle pole NESMÍ změnit výstup dosud
 *   uložených aktivit. O tom, které generátory se pro konkrétní list použijí,
 *   rozhoduje `generatorMix` v konfiguraci — a jeho absence znamená pouze
 *   aritmetiku. Viz `CipherGridConfig.generatorMix`.
 */
export const taskGenerators: readonly TaskGenerator[] = [arithmeticGenerator, sequenceGenerator]

export function findTaskGenerator(id: string): TaskGenerator | undefined {
  return taskGenerators.find((generator) => generator.id === id)
}
