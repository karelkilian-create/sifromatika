/**
 * List číselných řad jako záznam v registru.
 *
 * Nejmenší možný modul — a proto dobrá kontrola, že kontrakt nevyžaduje nic
 * zbytečného. Aktivita bez tajenky, bez mřížky a bez klamných písmen se do něj
 * musí vejít bez jediného prázdného pole.
 */

import type { ActivityModule } from '../contract.js'
import { applyShared } from '../shared-state.js'
import { TASK_COUNT_LIMITS } from '../../core/constraints/index.js'
import type { SequenceSheetConfig, SequenceSheetProject } from '../../core/model/index.js'
import {
  defaultSequenceSheetConfig,
  generateSequenceSheet,
  sheetChecksum,
  type SequenceSheet,
} from './index.js'
import { parseSequenceSheetPayload } from './payload.js'
import { SequenceSheetView } from './view.js'

/** Pole formuláře, která patří jen listu řad. */
export interface SequenceSheetEditorState {
  /** Kolik řad bude na listu. */
  taskCount: number
}

/**
 * Typ je vypsaný schválně: bez něj by se z `fallback` odvodil literál `12`
 * a políčko „Počet úloh" by nešlo přestavit.
 */
const initialState: SequenceSheetEditorState = {
  taskCount: TASK_COUNT_LIMITS.fallback,
}

export const sequenceSheetModule = {
  id: 'sequence-sheet',

  info: {
    id: 'sequence-sheet',
    label: 'Číselné řady',
    tagline: 'Co bude následovat?',
    available: true,
  },

  initialState,

  toConfig(state, shared, seed): SequenceSheetProject {
    return applyShared(
      defaultSequenceSheetConfig(shared.grade, seed, state.taskCount),
      shared,
    )
  },

  fromConfig(config): SequenceSheetEditorState {
    return { taskCount: config.payload.taskCount }
  },

  parsePayload: parseSequenceSheetPayload,
  generate: generateSequenceSheet,
  checksum: sheetChecksum,
  View: SequenceSheetView,
} satisfies ActivityModule<
  'sequence-sheet',
  SequenceSheetEditorState,
  SequenceSheetConfig,
  SequenceSheet
>
