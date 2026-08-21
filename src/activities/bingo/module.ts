/**
 * Bingo jako záznam v registru.
 *
 * Pátá aktivita a první, která hraje s celou třídou najednou. Do kontraktu se
 * vešla beze změny; z infrastruktury si vyžádala jedinou věc — třetí tvar
 * `CardFace` (mřížka uvnitř kartičky).
 */

import type { ActivityModule } from '../contract.js'
import { applyShared } from '../shared-state.js'
import { CARD_COUNT_LIMITS } from '../../core/constraints/index.js'
import type { BingoConfig, BingoProject } from '../../core/model/index.js'
import {
  generatorMixFromTopics,
  topicsFromGeneratorMix,
  type TopicSelection,
} from '../../tasks/mix.js'
import { defaultBingoConfig, generateBingo, sheetChecksum, type BingoSheet } from './index.js'
import { parseBingoPayload } from './payload.js'
import { bingoDocument } from './document.js'

/**
 * Pole formuláře, která patří jen bingu.
 *
 * Témata jsou tatáž jako u pexesa a domina, včetně toho, že počítání jde
 * odškrtnout. Bingo ze samých procent je legitimní zadání.
 */
export interface BingoEditorState extends TopicSelection {
  /** Kolik KARET, tedy pro kolik dětí. Každá je jiná. */
  cardCount: number
}

/**
 * Typ je vypsaný schválně: bez něj by se z `fallback` odvodil literál `12`
 * a políčko „Počet karet" by nešlo přestavit.
 */
const initialState: BingoEditorState = {
  cardCount: CARD_COUNT_LIMITS.fallback,
  arithmetic: true,
  sequences: false,
  decimals: false,
  percents: false,
  powers: false,
}

export const bingoModule = {
  id: 'bingo',

  info: {
    id: 'bingo',
    label: 'Bingo',
    tagline: 'Vypočti a škrtni',
    available: true,
  },

  initialState,

  toConfig(state, shared, seed): BingoProject {
    const config = applyShared(defaultBingoConfig(shared.grade, seed, state.cardCount), shared)
    // Váhy jsou rovnoměrné a téma, které ročník neumí, se do konfigurace
    // nedostane — obojí řeší `generatorMixFromTopics`, stejně jako u pexesa.
    config.payload.generatorMix = generatorMixFromTopics(state, config.payload.difficulty)
    return config
  },

  fromConfig(config): BingoEditorState {
    return {
      cardCount: config.payload.cardCount,
      ...topicsFromGeneratorMix(config.payload.generatorMix),
    }
  },

  parsePayload: parseBingoPayload,
  generate: generateBingo,
  checksum: sheetChecksum,
  toDocument: bingoDocument,
} satisfies ActivityModule<'bingo', BingoEditorState, BingoConfig, BingoSheet>
