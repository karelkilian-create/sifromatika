/**
 * Převod mezi stavem formuláře a `ProjectConfig`.
 *
 * Konfigurace je to, co se ukládá a sdílí; stav formuláře je to, co se
 * ovládá. Držet obojí zvlášť a překládat na jednom místě je levnější než
 * ohýbat formulář do tvaru souboru — a hlavně díky tomu jde `.sifra`
 * načíst zpátky do UI beze změn v generátoru.
 */

import { defaultConfig } from '../../activities/cipher-grid/index.js'
import type { Grade, OperationTag, ProjectConfig } from '../../core/model/index.js'
import type { EditorState } from './EditorPanel.js'

export const INITIAL_EDITOR_STATE: EditorState = {
  message: 'POKLAD JE U BAZÉNU',
  grade: 4,
  title: '',
  operations: { add: true, sub: true, mul: true, div: true },
  decoyDensity: 0.35,
  distinctCellPerOccurrence: true,
  printTitleOnWorksheet: false,
}

export function toConfig(state: EditorState, seed: string): ProjectConfig {
  const config = defaultConfig(state.message, state.grade, seed)

  const mix: Partial<Record<OperationTag, number>> = {}
  for (const [operation, enabled] of Object.entries(state.operations)) {
    if (enabled) mix[operation as OperationTag] = 1
  }

  config.payload.taskMix = mix
  config.payload.cipher.decoyDensity = state.decoyDensity
  config.payload.cipher.distinctCellPerOccurrence = state.distinctCellPerOccurrence
  config.payload.output.printTitleOnWorksheet = state.printTitleOnWorksheet
  if (state.title.trim() !== '') config.title = state.title

  return config
}

export function fromConfig(config: ProjectConfig): { state: EditorState; seed: string } {
  const payload = config.payload
  const enabled = (operation: OperationTag) => (payload.taskMix[operation] ?? 0) > 0

  return {
    seed: config.seed,
    state: {
      message: payload.message,
      grade: payload.difficulty.grade as Grade,
      title: config.title ?? '',
      operations: {
        add: enabled('add'),
        sub: enabled('sub'),
        mul: enabled('mul'),
        div: enabled('div'),
      },
      decoyDensity: payload.cipher.decoyDensity,
      distinctCellPerOccurrence: payload.cipher.distinctCellPerOccurrence,
      printTitleOnWorksheet: payload.output.printTitleOnWorksheet,
    },
  }
}
