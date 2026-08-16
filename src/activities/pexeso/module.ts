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

/**
 * Pole formuláře, která patří jen pexesu.
 *
 * Zaškrtávátka témat jsou tu jinak než u šifry, a je to záměr. Šifra je list
 * na hodinu, takže v ní počítání zůstává vždycky a témata se k němu přimíchávají
 * v poměru 3 : 1. Pexeso je hra na jedno téma — učitel musí umět složit celé
 * pexeso ze samých mocnin, tedy i **počítání odškrtnout**. Proto má vlastní
 * příznak a všechna témata mají váhu 1.
 */
export interface PexesoEditorState {
  /** Kolik DVOJIC. Kartiček je dvakrát tolik. */
  pairCount: number
  /** Běžné příklady (`7 · 8`). Na rozdíl od šifry se smí vypnout. */
  arithmetic: boolean
  /** Číselné řady (`4 10 16 22 ?`). */
  sequences: boolean
  /** Desetinná čísla (`3,5 · 4`). Od 5. ročníku. */
  decimals: boolean
  /** Procenta (`25 % z 80`). Od 7. ročníku. */
  percents: boolean
  /** Mocniny a odmocniny (`7²`, `√81`). 8. ročník. */
  powers: boolean
}

/**
 * Typ je vypsaný schválně: bez něj by se z `fallback` odvodil literál `12`
 * a políčko „Počet dvojic" by nešlo přestavit.
 */
const initialState: PexesoEditorState = {
  pairCount: PAIR_COUNT_LIMITS.fallback,
  arithmetic: true,
  sequences: false,
  decimals: false,
  percents: false,
  powers: false,
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
    const config = applyShared(defaultPexesoConfig(shared.grade, seed, state.pairCount), shared)

    // Téma, které ročník neumí, se do konfigurace nedostane, i kdyby v
    // formuláři zůstalo zaškrtnuté po přepnutí ročníku. Bez téhle pojistky by
    // osmák s mocninami přepnutý na šestou třídu dostal místo pexesa hlášku,
    // že pro tuhle obtížnost není žádný generátor.
    const profile = config.payload.difficulty
    const generatorMix: Record<string, number> = {}
    if (state.arithmetic) generatorMix.arithmetic = 1
    if (state.sequences) generatorMix.sequence = 1
    if (state.decimals && profile.decimals > 0) generatorMix.decimal = 1
    if (state.percents && profile.percents) generatorMix.percent = 1
    if (state.powers && profile.powers) generatorMix.powers = 1

    // Váhy jsou rovnoměrné — viz komentář u `PexesoEditorState`.
    config.payload.generatorMix =
      Object.keys(generatorMix).length > 0 ? generatorMix : { arithmetic: 1 }
    return config
  },

  fromConfig(config): PexesoEditorState {
    const mix = config.payload.generatorMix
    const enabled = (id: string) => (mix?.[id] ?? 0) > 0
    return {
      pairCount: config.payload.pairCount,
      // Soubor bez `generatorMix` vznikl dřív, než volba témat existovala —
      // `parsePexesoPayload` v něm doplní samotnou aritmetiku, takže sem
      // dorazí zaškrtnuté „Počítání" a nic jiného.
      arithmetic: enabled('arithmetic'),
      sequences: enabled('sequence'),
      decimals: enabled('decimal'),
      percents: enabled('percent'),
      powers: enabled('powers'),
    }
  },

  parsePayload: parsePexesoPayload,
  generate: generatePexeso,
  checksum: sheetChecksum,
  toDocument: pexesoDocument,
} satisfies ActivityModule<'pexeso', PexesoEditorState, PexesoConfig, PexesoSheet>
