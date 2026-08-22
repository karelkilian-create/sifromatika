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
 * Typ je vypsaný schválně: bez něj by se z `fallback` odvodil literál `12`
 * a políčko „Počet kamenů" by nešlo přestavit.
 */
const initialState: DominoEditorState = {
  tileCount: TILE_COUNT_LIMITS.fallback,
  arithmetic: true,
  sequences: false,
  decimals: false,
  percents: false,
  powers: false,
  fractions: false,
}

export const dominoModule = {
  id: 'domino',

  info: {
    id: 'domino',
    label: 'Domino',
    tagline: 'Navazuj úlohy',
    available: true,
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
