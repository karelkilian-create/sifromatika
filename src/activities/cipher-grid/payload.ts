/**
 * Validace payloadu šifry ze souboru `.sifra`.
 *
 * Oddělené od generátoru schválně: parser nedůvěryhodného vstupu má vystačit
 * s `core` a nemá kvůli kontrole souboru vtahovat vrstvu úloh ani šifer.
 */

import type { CipherGridConfig, CipherStrategyId } from '../../core/model/index.js'
import {
  isRecord,
  parseDifficulty,
  parseOutput,
  parseTaskMix,
} from '../payload-utils.js'

const STRATEGIES: CipherStrategyId[] = ['grid-coord', 'grid-linear']

/**
 * Známá id generátorů úloh.
 *
 * Vypsané ručně, stejně jako `STRATEGIES` — parser nedůvěryhodného vstupu
 * nemá sahat do registru generátorů. Neznámé id ze souboru z novější verze
 * se tiše zahodí; horší je spadnout na souboru, který kolegyně poslala e-mailem.
 */
const GENERATORS = ['arithmetic', 'sequence', 'decimal', 'percent']

export function parseCipherGridPayload(raw: unknown): CipherGridConfig | null {
  if (!isRecord(raw)) return null
  if (typeof raw.message !== 'string') return null

  const difficulty = parseDifficulty(raw.difficulty)
  if (difficulty === null) return null

  const cipher = raw.cipher
  if (!isRecord(cipher)) return null
  if (typeof cipher.strategy !== 'string' || !STRATEGIES.includes(cipher.strategy as CipherStrategyId)) {
    return null
  }

  const output = raw.output
  if (!isRecord(output)) return null

  const taskMix = parseTaskMix(raw.taskMix)
  if (taskMix === null) return null

  // Chybí-li `generatorMix`, soubor vznikl dřív, než existovaly další
  // generátory. Doplnit sem dnešní default by znamenalo, že se loni uložená
  // aktivita vytiskne jinak — proto výslovně jen aritmetika.
  const generatorMix: Record<string, number> = {}
  if (isRecord(raw.generatorMix)) {
    for (const id of GENERATORS) {
      const weight = raw.generatorMix[id]
      if (typeof weight === 'number' && weight > 0) generatorMix[id] = weight
    }
  }

  return {
    message: raw.message,
    difficulty,
    taskMix,
    generatorMix: Object.keys(generatorMix).length > 0 ? generatorMix : { arithmetic: 1 },
    // `grid` a `decoyDensity` ze starších souborů se sem záměrně nepřenášejí:
    // mřížka je pevná a klamná písmena se nedávkují. Ignorovat je je správně,
    // odmítnout soubor kvůli nim by bylo zbytečně kruté.
    cipher: {
      strategy: cipher.strategy as CipherStrategyId,
      distinctCellPerOccurrence: cipher.distinctCellPerOccurrence !== false,
    },
    // Šifra má co prozradit, takže se název na žákovský list defaultně netiskne.
    output: parseOutput(output, false),
  }
}
