/**
 * Stav formuláře a jeho převod na `ProjectConfig`.
 *
 * Konfigurace je to, co se ukládá a sdílí; stav formuláře je to, co se
 * ovládá. Držet obojí zvlášť a překládat na jednom místě je levnější než
 * ohýbat formulář do tvaru souboru — a hlavně díky tomu jde `.sifra`
 * načíst zpátky do UI beze změn v generátoru.
 *
 * Stav je rozdělený na jmenné prostory podle aktivity, ne na unii. Učitel,
 * který přepne ze šifry na list řad a zpátky, musí najít svou tajenku tam,
 * kde ji nechal — a to plyne z toho, že přepnutí mění jedině `activity`.
 * Slice ostatních aktivit zůstávají netknuté, jen se na ně nesahá.
 *
 * Samotný převod dělají moduly aktivit; tady zůstala společná pole a lepidlo.
 */

import {
  activityStateFromConfig,
  configFor,
  initialActivityStates,
  type ActivityStates,
} from '../../activities/registry.js'
import { sharedFromConfig } from '../../activities/shared-state.js'
import type { SharedEditorState } from '../../activities/contract.js'
import type { ActivityId, ProjectConfig } from '../../core/model/index.js'

export interface EditorState {
  activity: ActivityId
  /** Ročník, název a operace — společné všem aktivitám. */
  shared: SharedEditorState
  /** Pole jednotlivých aktivit, každé ve svém jmenném prostoru. */
  byActivity: ActivityStates
}

export const INITIAL_EDITOR_STATE: EditorState = {
  activity: 'cipher-grid',
  shared: {
    grade: 4,
    title: '',
    operations: { add: true, sub: true, mul: true, div: true },
  },
  byActivity: initialActivityStates(),
}

export function toConfig(state: EditorState, seed: string): ProjectConfig {
  return configFor(state.activity, state.byActivity, state.shared, seed)
}

export function fromConfig(config: ProjectConfig): { state: EditorState; seed: string } {
  return {
    seed: config.seed,
    state: {
      activity: config.activity,
      shared: sharedFromConfig(config),
      // Aktivity, kterých se soubor netýká, se vrací na výchozí hodnoty.
      // Prázdná tajenka po otevření listu řad by vypadala jako ztracená data.
      byActivity: { ...initialActivityStates(), ...activityStateFromConfig(config) },
    },
  }
}
