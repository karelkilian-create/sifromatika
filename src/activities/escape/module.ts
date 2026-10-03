/**
 * Úniková hra jako záznam v registru.
 *
 * Navenek vlastní záložka, uvnitř aktivita jako ostatní: z registru dostane
 * ročník a operace, sdílení odkazem, `.sifra` i verifikaci
 * (docs/navrh-unikova-hra.md §8). Jediná novinka v kontraktu je `toScreen`
 * — zámek na tabuli není stránka papíru.
 */

import type { ActivityModule } from '../contract.js'
import { applyShared } from '../shared-state.js'
import { ESCAPE_GROUP_LIMITS } from '../../core/constraints/index.js'
import type {
  EscapeConfig,
  EscapeLength,
  EscapeMode,
  EscapeProject,
  EscapeStationKind,
} from '../../core/model/index.js'
import {
  defaultEscapeConfig,
  defaultStationKind,
  escapeChecksum,
  generateEscape,
  offeredMessage,
  type EscapeSheet,
} from './index.js'
import { parseEscapePayload } from './payload.js'
import { escapeDocument } from './document.js'
import { escapeScreen } from './screen.js'
import { DEFAULT_STORY_ID } from './stories.js'

/** Pole formuláře, která patří jen únikové hře. */
export interface EscapeEditorState {
  story: string
  length: EscapeLength
  /**
   * Tajenka. Nabídne ji příběh podle délky hry; učitel ji smí přepsat.
   * Změna délky ji přepíše jen tehdy, když je pořád ta nabídnutá (§3).
   */
  message: string
  mode: EscapeMode
  groupCount: number
  /**
   * Druh stanoviště. `auto` = podle ročníku (druhá třída výběr odpovědí,
   * ostatní tabulka), takže přepnutí ročníku vybere sám. Jakmile učitel
   * zvolí výslovně, ročník jeho volbu nepřepíše.
   */
  stationKind: 'auto' | EscapeStationKind
}

/**
 * Krátká hra pro celou třídu: nejmenší krok od otevření záložky k první hře.
 * Typ vypsaný kvůli literálům — jinak by `length` nešlo přestavit.
 */
const initialState: EscapeEditorState = {
  story: DEFAULT_STORY_ID,
  length: 'short',
  message: offeredMessage(DEFAULT_STORY_ID, 'short'),
  mode: 'class',
  groupCount: ESCAPE_GROUP_LIMITS.fallback,
  stationKind: 'auto',
}

export const escapeModule = {
  id: 'escape',

  info: {
    id: 'escape',
    label: 'Úniková hra',
    tagline: 'Spočítej a odemkni',
    available: true,
    section: 'escape',
  },

  initialState,

  toConfig(state, shared, seed): EscapeProject {
    const config = applyShared(defaultEscapeConfig(shared.grade, seed, state.length, state.mode), shared)
    config.payload.story = state.story
    config.payload.message = state.message
    config.payload.groupCount = state.groupCount
    // Do souboru jde vždy konkrétní druh, ne `auto`: uložená hra se musí
    // otevřít stejná, i kdyby se výchozí druh pro ročník jednou změnil.
    config.payload.stationKind =
      state.stationKind === 'auto' ? defaultStationKind(shared.grade) : state.stationKind
    return config
  },

  fromConfig(config): EscapeEditorState {
    const payload = config.payload
    return {
      story: payload.story,
      length: payload.length,
      message: payload.message,
      mode: payload.mode,
      groupCount: payload.groupCount,
      // Shoduje-li se s výchozím druhem ročníku, vrací se jako `auto` —
      // ze souboru nejde poznat, jestli ho učitel volil, a `auto` je volba,
      // která ho při změně ročníku nepřekvapí.
      stationKind:
        payload.stationKind === defaultStationKind(payload.difficulty.grade) ? 'auto' : payload.stationKind,
    }
  },

  parsePayload: parseEscapePayload,
  generate: generateEscape,
  checksum: escapeChecksum,
  toDocument: escapeDocument,
  toScreen: escapeScreen,
} satisfies ActivityModule<'escape', EscapeEditorState, EscapeConfig, EscapeSheet>
