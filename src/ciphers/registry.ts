/**
 * Registr šifrovacích strategií.
 *
 * Přidání další šifry = jeden záznam tady. Vrstva úloh ani aktivity se
 * nemění — komunikace mezi vrstvami je jen seznam cílových hodnot.
 */

import type { CipherStrategyId } from '../core/model/index.js'
import { coordScheme, linearScheme, type GridScheme } from './grid/index.js'

export const cipherSchemes: Record<CipherStrategyId, GridScheme> = {
  'grid-coord': coordScheme,
  'grid-linear': linearScheme,
}

export function cipherScheme(id: CipherStrategyId): GridScheme {
  return cipherSchemes[id]
}
