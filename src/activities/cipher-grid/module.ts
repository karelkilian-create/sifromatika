/**
 * Šifrovací mřížka jako záznam v registru.
 *
 * Adaptér, nic víc: skládá dohromady generátor (`index.ts`), validaci souboru
 * (`payload.ts`) a sazbu (`document.ts`) a přidává překlad stavu formuláře.
 * Veškerá znalost o tom, co je šifra, zůstává v těch třech souborech.
 */

import type { ActivityModule } from '../contract.js'
import { applyShared } from '../shared-state.js'
import type { CipherGridConfig, CipherGridProject } from '../../core/model/index.js'
import {
  defaultConfig,
  generateCipherGrid,
  sheetChecksum,
  type CipherGridSheet,
} from './index.js'
import { parseCipherGridPayload } from './payload.js'
import { cipherGridDocument } from './document.js'

/** Pole formuláře, která patří jen šifře. */
export interface CipherGridEditorState {
  message: string
  /** Míchat mezi příklady i číselné řady („co bude následovat?"). */
  sequences: boolean
  /** Míchat mezi příklady i desetinná čísla (`3,5 · 4`). Od 5. ročníku. */
  decimals: boolean
  /** Míchat mezi příklady i procenta (`25 % z 80`). Od 7. ročníku. */
  percents: boolean
  /** Míchat mezi příklady i zlomky (`3/4 z 80`). Od 7. ročníku. */
  fractions: boolean
  distinctCellPerOccurrence: boolean
  printTitleOnWorksheet: boolean
}

/**
 * Typ je vypsaný schválně: bez něj by se `sequences: false` odvodilo jako
 * literál `false` a formulář by to zaškrtávátko odmítl zapnout.
 */
const initialState: CipherGridEditorState = {
  message: 'POKLAD JE U BAZÉNU',
  sequences: false,
  decimals: false,
  percents: false,
  fractions: false,
  distinctCellPerOccurrence: true,
  printTitleOnWorksheet: false,
}

export const cipherGridModule = {
  id: 'cipher-grid',

  info: {
    id: 'cipher-grid',
    label: 'Šifra',
    tagline: 'Najdi tajenku',
    available: true,
  },

  initialState,

  toConfig(state, shared, seed): CipherGridProject {
    const config = applyShared(defaultConfig(state.message, shared.grade, seed), shared)
    // Poměr 3 : 1 ke každému zapnutému zpestření. Řada i procento zaberou
    // dítěti víc času než příklad, takže „každá čtvrtá" je zhruba to, co udrží
    // délku listu na jedné hodině.
    const generatorMix: Record<string, number> = { arithmetic: 3 }
    if (state.sequences) generatorMix.sequence = 1
    if (state.decimals) generatorMix.decimal = 1
    if (state.percents) generatorMix.percent = 1
    if (state.fractions) generatorMix.fractions = 1
    // Sama aritmetika se zapisuje vahou 1, aby uložené soubory bez zpestření
    // vypadaly přesně jako dřív — jinak by se listu změnil obsah.
    config.payload.generatorMix =
      Object.keys(generatorMix).length === 1 ? { arithmetic: 1 } : generatorMix
    config.payload.cipher.distinctCellPerOccurrence = state.distinctCellPerOccurrence
    config.payload.output.printTitleOnWorksheet = state.printTitleOnWorksheet
    return config
  },

  fromConfig(config): CipherGridEditorState {
    const payload = config.payload
    return {
      message: payload.message,
      sequences: (payload.generatorMix?.sequence ?? 0) > 0,
      decimals: (payload.generatorMix?.decimal ?? 0) > 0,
      percents: (payload.generatorMix?.percent ?? 0) > 0,
      fractions: (payload.generatorMix?.fractions ?? 0) > 0,
      distinctCellPerOccurrence: payload.cipher.distinctCellPerOccurrence,
      printTitleOnWorksheet: payload.output.printTitleOnWorksheet,
    }
  },

  parsePayload: parseCipherGridPayload,
  generate: generateCipherGrid,
  checksum: sheetChecksum,
  toDocument: cipherGridDocument,
} satisfies ActivityModule<'cipher-grid', CipherGridEditorState, CipherGridConfig, CipherGridSheet>
