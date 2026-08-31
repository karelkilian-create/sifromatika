/**
 * Překlad polí formuláře, která má každá aktivita.
 *
 * Ročník, název a povolené operace nepatří žádné aktivitě zvlášť, takže je
 * nepřekládá modul, ale tohle jedno místo. Kdyby si je moduly řešily samy,
 * čtvrtá aktivita by přinesla čtvrtou kopii téhož převodu — a s ní čtvrtou
 * příležitost, jak se rozejít v maličkosti.
 */

import { crossesTenIsChoice } from '../core/constraints/index.js'
import type {
  ActivityId,
  DifficultyProfile,
  OperationTag,
  Project,
  ProjectConfig,
} from '../core/model/index.js'
import type { SharedEditorState } from './contract.js'

/** Zaškrtávátka → váhy. Váhy proto, že generátory umí i nerovnoměrný poměr. */
export function operationMix(
  operations: Record<OperationTag, boolean>,
): Partial<Record<OperationTag, number>> {
  const mix: Partial<Record<OperationTag, number>> = {}
  for (const [operation, enabled] of Object.entries(operations)) {
    if (enabled) mix[operation as OperationTag] = 1
  }
  return mix
}

/** Payload se sdílenými poli — společný jmenovatel všech dosavadních aktivit. */
interface WithSharedFields {
  taskMix: Partial<Record<OperationTag, number>>
  difficulty: DifficultyProfile
}

/**
 * Doplní do hotové konfigurace to, co je společné: operace a název.
 *
 * Mutuje `config` schválně — dostává čerstvý objekt z `defaultConfig`, ne
 * cizí stav.
 */
export function applyShared<Id extends ActivityId, P extends WithSharedFields>(
  config: Project<Id, P>,
  shared: SharedEditorState,
): Project<Id, P> {
  config.payload.taskMix = operationMix(shared.operations)
  // Ročníky, kde přechod přes desítku není volba, si nechají hodnotu
  // z profilu. Odškrtnutí u druhé třídy se tak nepropíše do třetí, kterou si
  // učitel zobrazí vzápětí — a po návratu na dvojku ho zas najde odškrtnuté,
  // stejně jako zaškrtnutá témata.
  if (crossesTenIsChoice(shared.grade)) config.payload.difficulty.crossesTen = shared.crossesTen
  const title = shared.title.trim()
  if (title !== '') config.title = title
  return config
}

/** Konfigurace → společná pole formuláře. Protipól `applyShared`. */
export function sharedFromConfig(config: ProjectConfig): SharedEditorState {
  const payload = config.payload
  const enabled = (operation: OperationTag) => (payload.taskMix[operation] ?? 0) > 0

  return {
    grade: payload.difficulty.grade,
    crossesTen: payload.difficulty.crossesTen,
    title: config.title ?? '',
    operations: {
      add: enabled('add'),
      sub: enabled('sub'),
      mul: enabled('mul'),
      div: enabled('div'),
    },
  }
}
