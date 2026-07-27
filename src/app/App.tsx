/**
 * Aplikační shell.
 *
 * Jediné místo, kde se potkává stav formuláře, generátor a vykreslení.
 * Generování je čistá funkce konfigurace, takže se dá počítat v `useMemo` —
 * žádné efekty, žádná synchronizace stavu.
 */

import { useMemo, useState } from 'react'
import {
  defaultConfig,
  generateCipherGrid,
  solutionTitle,
  worksheetTitle,
} from '../activities/cipher-grid/index.js'
import type { OperationTag } from '../core/model/index.js'
import { randomSeed } from '../core/rng/index.js'
import { EditorPanel, type EditorState } from '../features/editor/EditorPanel.js'
import { SolutionView, WorksheetView } from '../render/screen/index.js'
import '../render/print/print.css'
import './app.css'

const INITIAL_STATE: EditorState = {
  message: 'POKLAD JE U BAZÉNU',
  grade: 4,
  title: '',
  operations: { add: true, sub: true, mul: true, div: true },
  decoyDensity: 0.35,
  distinctCellPerOccurrence: true,
  printTitleOnWorksheet: false,
}

export function App() {
  const [state, setState] = useState<EditorState>(INITIAL_STATE)
  const [seed, setSeed] = useState(() => randomSeed())

  const outcome = useMemo(() => {
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

    return generateCipherGrid(config)
  }, [state, seed])

  const sheet = outcome.ok ? outcome.sheet : null
  // Ústupky se hlásí i při neúspěchu — často právě ony vysvětlují, proč to nešlo.
  const notices = outcome.ok ? outcome.sheet.relaxations : outcome.relaxations

  return (
    <div className="app">
      <header className="app__header no-print">
        <h1 className="app__title">Šifromatika</h1>
        <p className="app__subtitle">Matematická šifrovací hra na pár kliknutí</p>
      </header>

      <EditorPanel
        state={state}
        onChange={setState}
        onReroll={() => setSeed(randomSeed())}
        onPrint={() => window.print()}
        canPrint={sheet !== null}
      />

      {!outcome.ok && (
        <p className="banner banner--error no-print" role="alert">
          {outcome.reason}
        </p>
      )}

      {notices
        .filter((entry) => entry.level !== 'silent')
        .map((entry) => (
          <p className="banner banner--notice no-print" key={entry.code}>
            {entry.message}
          </p>
        ))}

      {sheet !== null && !sheet.verification.ok && (
        <p className="banner banner--error no-print" role="alert">
          Vygenerovaný list neprošel kontrolou, proto se netiskne. Zkus jinou variantu.
        </p>
      )}

      {sheet !== null && sheet.verification.ok && (
        <main className="app__preview">
          <WorksheetView
            title={worksheetTitle(sheet)}
            table={sheet.table}
            slots={sheet.slots}
            wordLengths={sheet.message.wordLengths}
            columns={sheet.config.payload.output.columns}
          />
          <div className="print-page-break">
            <SolutionView
              title={sheet.titleDerived ? null : solutionTitle(sheet)}
              message={sheet.message.original}
              table={sheet.table}
              slots={sheet.slots}
              wordLengths={sheet.message.wordLengths}
            />
          </div>
        </main>
      )}
    </div>
  )
}
