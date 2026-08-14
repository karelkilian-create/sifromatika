/**
 * Překlad polí formuláře, která má každá aktivita.
 *
 * Ročník, název a povolené operace nepatří žádné aktivitě zvlášť, takže je
 * nepřekládá modul, ale tohle jedno místo. Kdyby si je moduly řešily samy,
 * čtvrtá aktivita by přinesla čtvrtou kopii téhož převodu — a s ní čtvrtou
 * příležitost, jak se rozejít v maličkosti.
 */

import type {
  ActivityId,
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

/** Payload s váhami operací — společný jmenovatel všech dosavadních aktivit. */
interface WithTaskMix {
  taskMix: Partial<Record<OperationTag, number>>
}

/**
 * Doplní do hotové konfigurace to, co je společné: operace a název.
 *
 * Mutuje `config` schválně — dostává čerstvý objekt z `defaultConfig`, ne
 * cizí stav.
 */
export function applyShared<Id extends ActivityId, P extends WithTaskMix>(
  config: Project<Id, P>,
  shared: SharedEditorState,
): Project<Id, P> {
  config.payload.taskMix = operationMix(shared.operations)
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
    title: config.title ?? '',
    operations: {
      add: enabled('add'),
      sub: enabled('sub'),
      mul: enabled('mul'),
      div: enabled('div'),
    },
  }
}
