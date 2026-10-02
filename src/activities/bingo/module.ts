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
 * a políčko „Počet karet" by nešlo přestavit.
 */
const initialState: BingoEditorState = {
  cardCount: CARD_COUNT_LIMITS.fallback,
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
