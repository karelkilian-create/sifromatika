/**
 * Převod mezi stavem formuláře a `ProjectConfig`.
 *
 * Konfigurace je to, co se ukládá a sdílí; stav formuláře je to, co se
 * ovládá. Držet obojí zvlášť a překládat na jednom místě je levnější než
 * ohýbat formulář do tvaru souboru — a hlavně díky tomu jde `.sifra`
 * načíst zpátky do UI beze změn v generátoru.
 *
 * Stav je jeden plochý objekt pro všechny aktivity, ne unie. Učitel, který
 * přepne ze šifry na list řad a zpátky, musí najít svou tajenku tam, kde ji
 * nechal — a to je přesně to, co plochý stav zadarmo zařídí.
 */

import { defaultConfig } from '../../activities/cipher-grid/index.js'
import { defaultSequenceSheetConfig } from '../../activities/sequence-sheet/index.js'
import { TASK_COUNT_LIMITS } from '../../core/constraints/index.js'
import type { ActivityId, Grade, OperationTag, ProjectConfig } from '../../core/model/index.js'
import type { EditorState } from './EditorPanel.js'

export const INITIAL_EDITOR_STATE: EditorState = {
  activity: 'cipher-grid',
  message: 'POKLAD JE U BAZÉNU',
  grade: 4,
  title: '',
  operations: { add: true, sub: true, mul: true, div: true },
  sequences: false,
  taskCount: TASK_COUNT_LIMITS.fallback,
  decoyDensity: 0.35,
  distinctCellPerOccurrence: true,
  printTitleOnWorksheet: false,
}

function operationMix(state: EditorState): Partial<Record<OperationTag, number>> {
  const mix: Partial<Record<OperationTag, number>> = {}
  for (const [operation, enabled] of Object.entries(state.operations)) {
    if (enabled) mix[operation as OperationTag] = 1
  }
  return mix
}

export function toConfig(state: EditorState, seed: string): ProjectConfig {
  const title = state.title.trim()

  if (state.activity === 'sequence-sheet') {
    const config = defaultSequenceSheetConfig(state.grade, seed, state.taskCount)
    config.payload.taskMix = operationMix(state)
    if (title !== '') config.title = title
    return config
  }

  const config = defaultConfig(state.message, state.grade, seed)
  config.payload.taskMix = operationMix(state)
  // Poměr 3 : 1. Řada zabere dítěti víc času než příklad, takže „každá čtvrtá“
  // je zhruba to, co udrží délku listu na jedné hodině.
  config.payload.generatorMix = state.sequences ? { arithmetic: 3, sequence: 1 } : { arithmetic: 1 }
  config.payload.cipher.decoyDensity = state.decoyDensity
  config.payload.cipher.distinctCellPerOccurrence = state.distinctCellPerOccurrence
  config.payload.output.printTitleOnWorksheet = state.printTitleOnWorksheet
  if (title !== '') config.title = title

  return config
}

export function fromConfig(config: ProjectConfig): { state: EditorState; seed: string } {
  const payload = config.payload
  const enabled = (operation: OperationTag) => (payload.taskMix[operation] ?? 0) > 0

  // Pole, která se druhé aktivity netýkají, se drží na výchozích hodnotách.
  // Prázdná tajenka po otevření listu řad by vypadala jako ztracená data.
  const shared = {
    ...INITIAL_EDITOR_STATE,
    activity: config.activity satisfies ActivityId,
    grade: payload.difficulty.grade as Grade,
    title: config.title ?? '',
    operations: {
      add: enabled('add'),
      sub: enabled('sub'),
      mul: enabled('mul'),
      div: enabled('div'),
    },
  }

  if (config.activity === 'sequence-sheet') {
    return { seed: config.seed, state: { ...shared, taskCount: config.payload.taskCount } }
  }

  return {
    seed: config.seed,
    state: {
      ...shared,
      message: config.payload.message,
      sequences: (config.payload.generatorMix?.sequence ?? 0) > 0,
      decoyDensity: config.payload.cipher.decoyDensity,
      distinctCellPerOccurrence: config.payload.cipher.distinctCellPerOccurrence,
      printTitleOnWorksheet: config.payload.output.printTitleOnWorksheet,
    },
  }
}
