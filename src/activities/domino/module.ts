/**
 * Domino jako záznam v registru.
 *
 * Druhá aktivita s kartičkami — a první, která z toho nic nepřidala do
 * infrastruktury kromě tvaru kamene. Sazba, stránkování i volba témat byly
 * hotové po pexesu; přibylo jediné pravidlo hry, a to je v `index.ts`.
 */

import type { ActivityModule } from '../contract.js'
import { applyShared } from '../shared-state.js'
import { TILE_COUNT_LIMITS } from '../../core/constraints/index.js'
import type { DominoConfig, DominoProject } from '../../core/model/index.js'
import {
  generatorMixFromTopics,
  topicsFromGeneratorMix,
  type TopicSelection,
} from '../../tasks/mix.js'
import { defaultDominoConfig, generateDomino, sheetChecksum, type DominoSheet } from './index.js'
import { parseDominoPayload } from './payload.js'
import { dominoDocument } from './document.js'

/**
 * Pole formuláře, která patří jen dominu.
 *
 * Témata jsou tatáž jako u pexesa, včetně toho, že **počítání jde odškrtnout**.
 * Domino je hra na jedno téma stejně jako pexeso — celé domino ze samých
 * mocnin nebo samých procent je legitimní zadání, kdežto list na hodinu ze
 * samých mocnin není.
 */
export interface DominoEditorState extends TopicSelection {
  /** Kolik KAMENŮ. Každý nese jednu hodnotu a jedno zadání. */
  tileCount: number
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
 * zůstane zaškrtnuté (`generatorMixFromTopics` v `tasks/mix.ts`).
 *
 * Typ je vypsaný schválně: bez něj by se z `fallback` odvodil literál `12`
 * a políčko „Počet kamenů" by nešlo přestavit.
 */
const initialState: DominoEditorState = {
  tileCount: TILE_COUNT_LIMITS.fallback,
  arithmetic: true,
  sequences: true,
  decimals: true,
  percents: true,
  powers: true,
  fractions: true,
  equations: true,
  decomposition: true,
  terms: true,
}

export const dominoModule = {
  id: 'domino',

  info: {
    id: 'domino',
    label: 'Domino',
    tagline: 'Navazuj úlohy',
    available: true,
    section: 'worksheets',
  },

  initialState,

  toConfig(state, shared, seed): DominoProject {
    const config = applyShared(defaultDominoConfig(shared.grade, seed, state.tileCount), shared)
    // Váhy jsou rovnoměrné a téma, které ročník neumí, se do konfigurace
    // nedostane — obojí řeší `generatorMixFromTopics`, stejně jako u pexesa.
    config.payload.generatorMix = generatorMixFromTopics(state, config.payload.difficulty)
    return config
  },

  fromConfig(config): DominoEditorState {
    return {
      tileCount: config.payload.tileCount,
      ...topicsFromGeneratorMix(config.payload.generatorMix),
    }
  },

  parsePayload: parseDominoPayload,
  generate: generateDomino,
  checksum: sheetChecksum,
  toDocument: dominoDocument,
} satisfies ActivityModule<'domino', DominoEditorState, DominoConfig, DominoSheet>
