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
import { defaultPexesoConfig, generatePexeso, sheetChecksum, type PexesoSheet } from './index.js'
import { parsePexesoPayload } from './payload.js'
import { pexesoDocument } from './document.js'

/** Pole formuláře, která patří jen pexesu. */
export interface PexesoEditorState {
  /** Kolik DVOJIC. Kartiček je dvakrát tolik. */
  pairCount: number
}

/**
 * Typ je vypsaný schválně: bez něj by se z `fallback` odvodil literál `12`
 * a políčko „Počet dvojic" by nešlo přestavit.
 */
const initialState: PexesoEditorState = {
  pairCount: PAIR_COUNT_LIMITS.fallback,
}

export const pexesoModule = {
  id: 'pexeso',

  info: {
    id: 'pexeso',
    label: 'Pexeso',
    tagline: 'Najdi příklad a jeho výsledek',
    available: true,
  },

  initialState,

  toConfig(state, shared, seed): PexesoProject {
    return applyShared(defaultPexesoConfig(shared.grade, seed, state.pairCount), shared)
  },

  fromConfig(config): PexesoEditorState {
    return { pairCount: config.payload.pairCount }
  },

  parsePayload: parsePexesoPayload,
  generate: generatePexeso,
  checksum: sheetChecksum,
  toDocument: pexesoDocument,
} satisfies ActivityModule<'pexeso', PexesoEditorState, PexesoConfig, PexesoSheet>
