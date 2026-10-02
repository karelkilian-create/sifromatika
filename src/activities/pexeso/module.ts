/**
 * Pexeso jako záznam v registru.
 *
 * První aktivita, která tiskne kartičky místo listu. Do kontraktu se přitom
 * vešla beze změny — `toDocument` vrací víc stránek než dvě a shell si toho
 * nemá jak všimnout. To byl smysl `DocumentModel`.
 */

import type { ActivityModule } from '../contract.js'
import { applyShared } from '../shared-state.js'
import { PAIR_COUNT_LIMITS } from '../../core/constraints/index.js'
import type { PexesoConfig, PexesoProject } from '../../core/model/index.js'
import {
  generatorMixFromTopics,
  topicsFromGeneratorMix,
  type TopicSelection,
} from '../../tasks/mix.js'
import { defaultPexesoConfig, generatePexeso, sheetChecksum, type PexesoSheet } from './index.js'
import { parsePexesoPayload } from './payload.js'
import { pexesoDocument } from './document.js'

/**
 * Pole formuláře, která patří jen pexesu.
 *
 * Zaškrtávátka témat jsou tu jinak než u šifry, a je to záměr. Šifra je list
 * na hodinu, takže v ní počítání zůstává vždycky a témata se k němu přimíchávají
 * v poměru 3 : 1. Pexeso je hra na jedno téma — učitel musí umět složit celé
 * pexeso ze samých mocnin, tedy i **počítání odškrtnout**. Proto má vlastní
 * příznak a všechna témata mají váhu 1.
 */
export interface PexesoEditorState extends TopicSelection {
  /** Kolik DVOJIC. Kartiček je dvakrát tolik. */
  pairCount: number
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
 * a políčko „Počet dvojic" by nešlo přestavit.
 */
const initialState: PexesoEditorState = {
  pairCount: PAIR_COUNT_LIMITS.fallback,
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

export const pexesoModule = {
  id: 'pexeso',

  info: {
    id: 'pexeso',
    label: 'Pexeso',
    tagline: 'Hledej dvojice',
    available: true,
  },

  initialState,

  toConfig(state, shared, seed): PexesoProject {
    const config = applyShared(defaultPexesoConfig(shared.grade, seed, state.pairCount), shared)

    // Váhy jsou rovnoměrné a téma, které ročník neumí, se do konfigurace
    // nedostane — obojí řeší `generatorMixFromTopics`, protože je to pravidlo
    // vrstvy úloh, ne pexesa. Domino ho má stejné.
    config.payload.generatorMix = generatorMixFromTopics(state, config.payload.difficulty)
    return config
  },

  fromConfig(config): PexesoEditorState {
    return {
      pairCount: config.payload.pairCount,
      ...topicsFromGeneratorMix(config.payload.generatorMix),
    }
  },

  parsePayload: parsePexesoPayload,
  generate: generatePexeso,
  checksum: sheetChecksum,
  toDocument: pexesoDocument,
} satisfies ActivityModule<'pexeso', PexesoEditorState, PexesoConfig, PexesoSheet>
