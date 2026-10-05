/**
 * Šifrovací mřížka jako záznam v registru.
 *
 * Adaptér, nic víc: skládá dohromady generátor (`index.ts`), validaci souboru
 * (`payload.ts`) a sazbu (`document.ts`) a přidává překlad stavu formuláře.
 * Veškerá znalost o tom, co je šifra, zůstává v těch třech souborech.
 */

import type { ActivityModule } from '../contract.js'
import { applyShared } from '../shared-state.js'
import { gridGeneratorMix } from '../../tasks/mix.js'
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
  /** Míchat mezi příklady i rovnice s chybějícím číslem (`? + 15 = 40`). */
  equations: boolean
  /** Míchat mezi příklady i rozklad na desítky a jednotky. Do 3. ročníku. */
  decomposition: boolean
  /** Míchat mezi příklady i věty s pojmy (`Kolik je součin čísel 6 a 7?`). Od 3. ročníku. */
  terms: boolean
  distinctCellPerOccurrence: boolean
  printTitleOnWorksheet: boolean
}

/**
 * Všechna témata zapnutá.
 *
 * Učitel, který přijde poprvé, nemá jak tušit, co je pod „Pokročilým
 * nastavením obsahu" schované. Když si vybere osmou třídu a dostane samé
 * sčítání do sta, odejde s tím, že nástroj umí čtvrtou třídu — a podruhé
 * nepřijde. Zapnuté téma jde odškrtnout, vypnuté se musí najít.
 *
 * Ročník má přednost: téma, které neumí, se do mixu nedostane, i když tu
 * zůstane zaškrtnuté — viz `toConfig` níž.
 *
 * Typ je vypsaný schválně: bez něj by se `sequences: true` odvodilo jako
 * literál `true` a formulář by to zaškrtávátko odmítl vypnout.
 */
const initialState: CipherGridEditorState = {
  message: 'POKLAD JE U BAZÉNU',
  sequences: true,
  decimals: true,
  percents: true,
  fractions: true,
  equations: true,
  decomposition: true,
  terms: true,
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
    section: 'worksheets',
  },

  initialState,

  toConfig(state, shared, seed): CipherGridProject {
    const config = applyShared(defaultConfig(state.message, shared.grade, seed), shared)
    // Téma, které ročník neumí, se do mixu nedostane, i kdyby ve formuláři
    // zůstalo zaškrtnuté. Generátory by ho stejně zahodily (`supports`),
    // ale uložený soubor a sdílený odkaz by pak slibovaly obsah, který na
    // listu není. Poměr témat viz `gridGeneratorMix`.
    config.payload.generatorMix = gridGeneratorMix(state, config.payload.difficulty)
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
      equations: (payload.generatorMix?.equation ?? 0) > 0,
      fractions: (payload.generatorMix?.fractions ?? 0) > 0,
      decomposition: (payload.generatorMix?.decomposition ?? 0) > 0,
      terms:
        (payload.generatorMix?.terms ?? 0) > 0 || (payload.generatorMix?.['terms-products'] ?? 0) > 0,
      distinctCellPerOccurrence: payload.cipher.distinctCellPerOccurrence,
      printTitleOnWorksheet: payload.output.printTitleOnWorksheet,
    }
  },

  parsePayload: parseCipherGridPayload,
  generate: generateCipherGrid,
  checksum: sheetChecksum,
  toDocument: cipherGridDocument,
} satisfies ActivityModule<'cipher-grid', CipherGridEditorState, CipherGridConfig, CipherGridSheet>
