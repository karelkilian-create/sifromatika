/**
 * Které stanoviště napsané slovo odevzdává.
 *
 * Ve skupinách si děti balíček rozdělí a druhé stanoviště může být hotové dřív
 * než první. Tabule proto nevyžaduje pořadí: uzná slovo kteréhokoli dosud
 * neuznaného stanoviště vybrané skupiny. Slova jiných skupin neuzná.
 */

import type { LockScreenModel } from '../../core/screen/index.js'

/** Index stanoviště ze `remaining`, jehož slovo je `word` (už A–Z), nebo `null`. */
export function matchStation(model: LockScreenModel, remaining: readonly number[], word: string): number | null {
  if (word === '') return null
  return remaining.find((index) => model.stations[index]!.word === word) ?? null
}
