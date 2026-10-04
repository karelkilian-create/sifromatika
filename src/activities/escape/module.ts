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
  Grade,
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
import { defaultStoryId } from './stories.js'

/** Pole formuláře, která patří jen únikové hře. */
export interface EscapeEditorState {
  /**
   * Příběh. `auto` = podle ročníku (mladší Poklad, starší Hrobka), stejně
   * jako druh stanoviště. Ročník je sdílený a pamatuje se, takže kdo přijde
   * z šestkového listu, nesmí v únikovce najít pirátskou truhlu.
   */
  story: 'auto' | string
  length: EscapeLength
  /**
   * Tajenka. `null` = ta, kterou nabízí příběh k délce hry (§3). Změna
   * délky, příběhu nebo ročníku ji tak přepíše jen tehdy, když ji učitel
   * nepsal sám.
   */
  message: string | null
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
  story: 'auto',
  length: 'short',
  message: null,
  mode: 'class',
  groupCount: ESCAPE_GROUP_LIMITS.fallback,
  stationKind: 'auto',
}

/** Příběh, který hra opravdu použije: zvolený, nebo ten podle ročníku. */
export function resolveStory(state: EscapeEditorState, grade: Grade): string {
  return state.story === 'auto' ? defaultStoryId(grade) : state.story
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
    // Do souboru jde vždy konkrétní příběh a tajenka, ze stejného důvodu
    // jako druh stanoviště níž.
    const story = resolveStory(state, shared.grade)
    config.payload.story = story
    config.payload.message = state.message ?? offeredMessage(story, state.length)
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
      story: payload.story === defaultStoryId(payload.difficulty.grade) ? 'auto' : payload.story,
      length: payload.length,
      message: payload.message === offeredMessage(payload.story, payload.length) ? null : payload.message,
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
