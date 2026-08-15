/**
 * Ovládací panel.
 *
 * Rozvržení plyne z §3.8 návrhu: hlavní obrazovka je *zadání + ročník +
 * tlačítko*, nic víc. Učitel má mezi hodinami pět minut. Všechno ostatní je
 * schované v „Pokročilém nastavení" a má rozumný default.
 *
 * Panel se přizpůsobuje vybrané aktivitě. Volby, které pro ni nedávají smysl,
 * se neschovávají do neaktivního stavu, ale úplně mizí — zašedlé políčko
 * „Klamná písmena" na listu bez tajenky je jen šum.
 */

import type { Grade, OperationTag } from '../../core/model/index.js'
import type { SharedEditorState } from '../../activities/contract.js'
import {
  MESSAGE_LETTER_LIMITS,
  ONE_PAGE_LETTERS,
  PAIR_COUNT_LIMITS,
  TASK_COUNT_LIMITS,
  gradeProfile,
} from '../../core/constraints/index.js'
import { normalizeMessage, truncateToLetters } from '../../core/text/index.js'
import type { EditorState } from './state.js'

/** „1 písmeno", „3 písmena", „7 písmen" — jinak by hláška drhla při každém psaní. */
function czechLetterWord(count: number): string {
  if (count === 1) return 'písmeno'
  if (count >= 2 && count <= 4) return 'písmena'
  return 'písmen'
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
  const isCipher = state.activity === 'cipher-grid'
  const isPexeso = state.activity === 'pexeso'
  const cipher = state.byActivity['cipher-grid']
  const sequence = state.byActivity['sequence-sheet']
  const pexeso = state.byActivity.pexeso

  // Volby, které ročník neumí, se neschovávají do neaktivního stavu, ale
  // úplně mizí — zašedlá „Procenta" u čtvrťáka je jen šum.
  const profile = gradeProfile(state.shared.grade)

  // Počet PÍSMEN, ne znaků: mezery a interpunkce se do příkladů nepromítnou.
  const messageLetters = normalizeMessage(cipher.message).letters.length

  const patchShared = (changes: Partial<SharedEditorState>) =>
    onChange({ ...state, shared: { ...state.shared, ...changes } })

  // Zápis vždy jen do slice vybrané aktivity. Pole ostatních aktivit se tím
  // nemají jak přepsat — proto se učiteli po přepnutí a návratu vrátí tajenka.
  const patchCipher = (changes: Partial<typeof cipher>) =>
    onChange({ ...state, byActivity: { ...state.byActivity, 'cipher-grid': { ...cipher, ...changes } } })

  const patchPexeso = (changes: Partial<typeof pexeso>) =>
    onChange({ ...state, byActivity: { ...state.byActivity, pexeso: { ...pexeso, ...changes } } })

  const patchSequence = (changes: Partial<typeof sequence>) =>
    onChange({
      ...state,
      byActivity: { ...state.byActivity, 'sequence-sheet': { ...sequence, ...changes } },
    })

  const toggleOperation = (operation: OperationTag) => {
    const next = { ...state.shared.operations, [operation]: !state.shared.operations[operation] }
    // Aspoň jedna operace musí zůstat, jinak nelze vyrobit vůbec nic.
    if (Object.values(next).every((enabled) => !enabled)) return
    patchShared({ operations: next })
  }

  return (
    <form className="editor no-print" onSubmit={(event) => event.preventDefault()}>
      <div className="editor__primary">
        {isCipher ? (
          <label className="field field--grow">
            <span className="field__label">Tajenka</span>
            <input
              className="field__input"
              type="text"
              value={cipher.message}
              onChange={(event) =>
                // Ořez při psaní, ne až při generování: učitel musí vidět, kde
                // je mez, dřív než si vymyslí tajenku, která se do ní nevejde.
                patchCipher({
                  message: truncateToLetters(event.target.value, MESSAGE_LETTER_LIMITS.max),
                })
              }
              placeholder="POKLAD JE U BAZÉNU"
              autoComplete="off"
              spellCheck={false}
            />
            {/* Vazba „jedno písmeno = jeden příklad" nebyla nikde vidět.
                Učitel napsal hezkou dlouhou větu a teprve z tiskárny zjistil,
                že po dětech chce třicet výpočtů na dvou stranách. */}
            <span className="field__hint">
              {messageLetters} {czechLetterWord(messageLetters)} = {messageLetters}{' '}
              {messageLetters === 1 ? 'příklad' : messageLetters < 5 ? 'příklady' : 'příkladů'}
              {messageLetters > ONE_PAGE_LETTERS && ' — vytiskne se na dvě strany'}
            </span>
          </label>
        ) : isPexeso ? (
          <label className="field">
            <span className="field__label">Počet dvojic</span>
            <input
              className="field__input"
              type="number"
              min={PAIR_COUNT_LIMITS.min}
              max={PAIR_COUNT_LIMITS.max}
              value={pexeso.pairCount}
              onChange={(event) => patchPexeso({ pairCount: Number(event.target.value) })}
            />
            {/* Kartiček je dvakrát tolik než dvojic — a to učitel u kopírky
                potřebuje vědět dřív, než zjistí, kolik listů mu vyleze. */}
            <span className="field__hint">
              {pexeso.pairCount * 2} kartiček na {Math.ceil((pexeso.pairCount * 2) / 12)}{' '}
              {Math.ceil((pexeso.pairCount * 2) / 12) === 1 ? 'listu' : 'listech'} plus seznam pro
              učitele
            </span>
          </label>
        ) : (
          <label className="field">
            <span className="field__label">Počet úloh</span>
            <input
              className="field__input"
              type="number"
              min={TASK_COUNT_LIMITS.min}
              max={TASK_COUNT_LIMITS.max}
              value={sequence.taskCount}
              onChange={(event) => patchSequence({ taskCount: Number(event.target.value) })}
            />
          </label>
        )}

        <label className="field">
          <span className="field__label">Ročník</span>
          <select
            className="field__input"
            value={state.shared.grade}
            onChange={(event) => patchShared({ grade: Number(event.target.value) as Grade })}
          >
            <option value={3}>3. třída</option>
            <option value={4}>4. třída</option>
            <option value={5}>5. třída</option>
            {/* 9. ročník se nenabízí, dokud nemá vlastní profil —
                viz komentář v `core/constraints`. */}
            <option value={6}>6. třída</option>
            <option value={7}>7. třída</option>
            <option value={8}>8. třída</option>
          </select>
        </label>

        {/* Tlačítka drží pohromadě v jednom prvku, aby na telefonu mohla
            zůstat v řádku i ve chvíli, kdy se pole nad nimi skládají pod sebe. */}
        <div className="editor__actions">
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
            Otevřít zadání
          </button>
        </div>
      </div>

      <details className="editor__advanced">
        <summary>Pokročilé nastavení</summary>

        <div className="editor__advanced-grid">
          <fieldset className="fieldset">
            <legend className="field__label">
              {isCipher ? 'Typy příkladů' : 'Povolené operace'}
            </legend>
            {(Object.keys(OPERATION_LABELS) as OperationTag[]).map((operation) => (
              <label className="checkbox" key={operation}>
                <input
                  type="checkbox"
                  checked={state.shared.operations[operation]}
                  onChange={() => toggleOperation(operation)}
                />
                {OPERATION_LABELS[operation]}
              </label>
            ))}

            {isCipher ? (
              <>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={cipher.sequences}
                    onChange={() => patchCipher({ sequences: !cipher.sequences })}
                  />
                  Číselné řady
                </label>
                {profile.decimals > 0 && (
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={cipher.decimals}
                      onChange={() => patchCipher({ decimals: !cipher.decimals })}
                    />
                    Desetinná čísla
                  </label>
                )}
                {profile.percents && (
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={cipher.percents}
                      onChange={() => patchCipher({ percents: !cipher.percents })}
                    />
                    Procenta
                  </label>
                )}
                <p className="hint">
                  Řada („4 10 16 22 ?“), desetinná čísla („3,5 · 4“) i procenta („25 % z 80“) jsou
                  samostatné volby a s operacemi platí zároveň — řada s podílem i procento se
                  objeví jen při zapnutém násobení. Výsledek zůstává vždy celé číslo, protože je
                  to kód políčka v tabulce.
                </p>
              </>
            ) : (
              <p className="hint">
                Určují, jak řada postupuje. Bez násobení se neobjeví řady jako „3, 6, 12, 24, ?“,
                bez odčítání zase klesající řady.
              </p>
            )}
          </fieldset>

          <div className="fieldset">
            <label className="field">
              <span className="field__label">Název aktivity</span>
              <input
                className="field__input"
                type="text"
                value={state.shared.title}
                onChange={(event) => patchShared({ title: event.target.value })}
                placeholder={isCipher ? 'např. Lov pirátského pokladu' : 'např. Rozcvička na řady'}
                autoComplete="off"
              />
            </label>
            {isCipher ? (
              <>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={cipher.printTitleOnWorksheet}
                    onChange={() =>
                      patchCipher({ printTitleOnWorksheet: !cipher.printTitleOnWorksheet })
                    }
                  />
                  Tisknout název i na list pro žáky
                </label>
                <p className="hint">
                  Vlastní název se na žákovský list vytiskne jen s tímhle zaškrtnutím. Název
                  odvozený z tajenky se na něj nedostane nikdy — prozradil by ji.
                </p>
              </>
            ) : (
              <p className="hint">
                Na list řad se název tiskne vždycky. Není tu žádná tajenka, kterou by mohl
                prozradit.
              </p>
            )}
          </div>

          {isCipher && (
            <div className="fieldset">
              {/* Posuvník na hustotu klamných písmen tu býval. Zmizel spolu
                  s proměnnou velikostí tabulky: při pevných 9×9 jsou klamná
                  všechna políčka, která nedostala písmeno tajenky, a dávkovat
                  se nedají. Ovladač, který nic neřídí, je horší než žádný. */}
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={cipher.distinctCellPerOccurrence}
                  onChange={() =>
                    patchCipher({ distinctCellPerOccurrence: !cipher.distinctCellPerOccurrence })
                  }
                />
                Každý výskyt písmene na jiném políčku
              </label>
              <p className="hint">
                Bez klamných písmen jde tajenka uhodnout bez počítání — v tabulce by byla jen
                písmena, která se v ní opravdu vyskytují.
              </p>
            </div>
          )}
        </div>
      </details>
    </form>
  )
}
