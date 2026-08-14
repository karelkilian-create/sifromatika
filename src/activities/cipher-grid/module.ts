/**
 * Šifrovací mřížka jako záznam v registru.
 *
 * Adaptér, nic víc: skládá dohromady generátor (`index.ts`), validaci souboru
 * (`payload.ts`) a náhled (`view.tsx`) a přidává překlad stavu formuláře.
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
import { CipherGridView } from './view.js'

/** Pole formuláře, která patří jen šifře. */
export interface CipherGridEditorState {
  message: string
  /** Míchat mezi příklady i číselné řady („co bude následovat?"). */
  sequences: boolean
  /** Podíl klamných písmen v tabulce, 0–1. */
  decoyDensity: number
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
  decoyDensity: 0.35,
  distinctCellPerOccurrence: true,
  printTitleOnWorksheet: false,
}

export const cipherGridModule = {
  id: 'cipher-grid',

  info: {
    id: 'cipher-grid',
    label: 'Šifra',
    tagline: 'Tajenka schovaná v tabulce',
    available: true,
  },

  initialState,

  toConfig(state, shared, seed): CipherGridProject {
    const config = applyShared(defaultConfig(state.message, shared.grade, seed), shared)
    // Poměr 3 : 1. Řada zabere dítěti víc času než příklad, takže „každá čtvrtá"
    // je zhruba to, co udrží délku listu na jedné hodině.
    config.payload.generatorMix = state.sequences ? { arithmetic: 3, sequence: 1 } : { arithmetic: 1 }
    config.payload.cipher.decoyDensity = state.decoyDensity
    config.payload.cipher.distinctCellPerOccurrence = state.distinctCellPerOccurrence
    config.payload.output.printTitleOnWorksheet = state.printTitleOnWorksheet
    return config
  },

  fromConfig(config): CipherGridEditorState {
    const payload = config.payload
    return {
      message: payload.message,
      sequences: (payload.generatorMix?.sequence ?? 0) > 0,
      decoyDensity: payload.cipher.decoyDensity,
      distinctCellPerOccurrence: payload.cipher.distinctCellPerOccurrence,
      printTitleOnWorksheet: payload.output.printTitleOnWorksheet,
    }
  },

  parsePayload: parseCipherGridPayload,
  generate: generateCipherGrid,
  checksum: sheetChecksum,
  View: CipherGridView,
} satisfies ActivityModule<'cipher-grid', CipherGridEditorState, CipherGridConfig, CipherGridSheet>
