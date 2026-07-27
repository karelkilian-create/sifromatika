/**
 * Ovládací panel.
 *
 * Rozvržení plyne z §3.8 návrhu: hlavní obrazovka je *tajenka + ročník +
 * tlačítko*, nic víc. Učitel má mezi hodinami pět minut. Všechno ostatní je
 * schované v „Pokročilém nastavení" a má rozumný default.
 */

import type { Grade, OperationTag } from '../../core/model/index.js'

export interface EditorState {
  message: string
  grade: Grade
  title: string
  operations: Record<OperationTag, boolean>
  decoyDensity: number
  distinctCellPerOccurrence: boolean
  printTitleOnWorksheet: boolean
}

const OPERATION_LABELS: Record<OperationTag, string> = {
  add: 'Sčítání',
  sub: 'Odčítání',
  mul: 'Násobení',
  div: 'Dělení',
}

export interface EditorPanelProps {
  state: EditorState
  onChange: (next: EditorState) => void
  onReroll: () => void
  onPrint: () => void
  onSave: () => void
  onOpen: () => void
  canPrint: boolean
}

export function EditorPanel({
  state,
  onChange,
  onReroll,
  onPrint,
  onSave,
  onOpen,
  canPrint,
}: EditorPanelProps) {
  const patch = (changes: Partial<EditorState>) => onChange({ ...state, ...changes })

  const toggleOperation = (operation: OperationTag) => {
    const next = { ...state.operations, [operation]: !state.operations[operation] }
    // Aspoň jedna operace musí zůstat, jinak nelze vyrobit vůbec nic.
    if (Object.values(next).every((enabled) => !enabled)) return
    patch({ operations: next })
  }

  return (
    <form className="editor no-print" onSubmit={(event) => event.preventDefault()}>
      <div className="editor__primary">
        <label className="field field--grow">
          <span className="field__label">Tajenka</span>
          <input
            className="field__input"
            type="text"
            value={state.message}
            onChange={(event) => patch({ message: event.target.value })}
            placeholder="POKLAD JE U BAZÉNU"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <label className="field">
          <span className="field__label">Ročník</span>
          <select
            className="field__input"
            value={state.grade}
            onChange={(event) => patch({ grade: Number(event.target.value) as Grade })}
          >
            <option value={3}>3. třída</option>
            <option value={4}>4. třída</option>
            <option value={5}>5. třída</option>
          </select>
        </label>

        <button type="button" className="button button--primary" onClick={onReroll}>
          Jiná varianta
        </button>
        <button type="button" className="button" onClick={onPrint} disabled={!canPrint}>
          Vytisknout
        </button>
        <button type="button" className="button" onClick={onSave} disabled={!canPrint}>
          Uložit
        </button>
        <button type="button" className="button" onClick={onOpen}>
          Otevřít
        </button>
      </div>

      <details className="editor__advanced">
        <summary>Pokročilé nastavení</summary>

        <div className="editor__advanced-grid">
          <fieldset className="fieldset">
            <legend className="field__label">Typy příkladů</legend>
            {(Object.keys(OPERATION_LABELS) as OperationTag[]).map((operation) => (
              <label className="checkbox" key={operation}>
                <input
                  type="checkbox"
                  checked={state.operations[operation]}
                  onChange={() => toggleOperation(operation)}
                />
                {OPERATION_LABELS[operation]}
              </label>
            ))}
          </fieldset>

          <div className="fieldset">
            <label className="field">
              <span className="field__label">Název aktivity</span>
              <input
                className="field__input"
                type="text"
                value={state.title}
                onChange={(event) => patch({ title: event.target.value })}
                placeholder="např. Lov pirátského pokladu"
                autoComplete="off"
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={state.printTitleOnWorksheet}
                onChange={() => patch({ printTitleOnWorksheet: !state.printTitleOnWorksheet })}
              />
              Tisknout název i na list pro žáky
            </label>
            <p className="hint">
              Vlastní název se na žákovský list vytiskne jen s tímhle zaškrtnutím. Název odvozený
              z tajenky se na něj nedostane nikdy — prozradil by ji.
            </p>
          </div>

          <div className="fieldset">
            <label className="field">
              <span className="field__label">
                Klamná písmena v tabulce: {Math.round(state.decoyDensity * 100)} %
              </span>
              <input
                type="range"
                min={0}
                max={60}
                step={5}
                value={Math.round(state.decoyDensity * 100)}
                onChange={(event) => patch({ decoyDensity: Number(event.target.value) / 100 })}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={state.distinctCellPerOccurrence}
                onChange={() =>
                  patch({ distinctCellPerOccurrence: !state.distinctCellPerOccurrence })
                }
              />
              Každý výskyt písmene na jiném políčku
            </label>
            <p className="hint">
              Bez klamných písmen jde tajenka uhodnout bez počítání — v tabulce by byla jen
              písmena, která se v ní opravdu vyskytují.
            </p>
          </div>
        </div>
      </details>
    </form>
  )
}
