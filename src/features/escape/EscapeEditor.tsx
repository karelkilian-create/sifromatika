/**
 * Formulář únikové hry.
 *
 * Vlastní komponenta, ne další větev `EditorPanel`: únikovka má jiný první
 * řádek (příběh, délka hry, tajenka), jiné akce (Spustit zámek) a hlavně
 * upozornění, které musí učitel přečíst dřív, než začne vyplňovat
 * (docs/navrh-unikova-hra.md §5). Ročník a operace sdílí s ostatními
 * aktivitami přes `state.shared`, takže se přepnutím záložky neztratí.
 *
 * Hra je hotová na dvě kliknutí: příběh a délka hry nabídnou tajenku, zbytek
 * má rozumný default.
 */

import type { EscapeLength, EscapeMode, Grade, OperationTag } from '../../core/model/index.js'
import type { SharedEditorState } from '../../activities/contract.js'
import {
  ESCAPE_GROUP_LIMITS,
  ESCAPE_MESSAGE_MAX_CHARS,
  ESCAPE_STATIONS,
  crossesTenIsChoice,
  gradeProfile,
} from '../../core/constraints/index.js'
import { hasUsableTopic, type TopicSelection } from '../../tasks/mix.js'
import { normalizeMessage } from '../../core/text/index.js'
import { defaultStationKind, escapeStationCount, offeredMessage } from '../../activities/escape/index.js'
import { resolveStory, type EscapeEditorState } from '../../activities/escape/module.js'
import { STORIES, defaultStoryId, findStory } from '../../activities/escape/stories.js'
import type { EditorState } from '../editor/state.js'

const LENGTH_NAMES: Record<EscapeLength, string> = { short: 'Krátká', medium: 'Střední', long: 'Dlouhá' }

/** Odhad pro celou třídu, od stolu (§4). Ve skupinách rozhoduje nejpomalejší skupina. */
const CLASS_DURATION: Record<EscapeLength, string> = {
  short: '20–30 min',
  medium: '30–45 min',
  long: 'kolem hodiny',
}

/**
 * Popisek délky hry. Ve skupinách počet stanovišť NA SKUPINU, protože ten
 * učitele zajímá — kolik stanovišť se vytiskne celkem, ukáže náhled.
 */
function lengthLabel(length: EscapeLength, mode: EscapeMode, groupCount: number): string {
  if (mode === 'class') {
    return `${LENGTH_NAMES[length]} — ${stationsText(ESCAPE_STATIONS[length])}, ${CLASS_DURATION[length]}`
  }
  const perGroup = escapeStationCount(length, groupCount) / groupCount
  return `${LENGTH_NAMES[length]} — ${stationsText(perGroup)} na skupinu`
}

const OPERATION_LABELS: Record<OperationTag, string> = {
  add: 'Sčítání',
  sub: 'Odčítání',
  mul: 'Násobení',
  div: 'Dělení',
}

/** „1 různé písmeno", „3 různá písmena", „7 různých písmen". */
function distinctLettersText(count: number): string {
  if (count === 1) return '1 různé písmeno'
  if (count >= 2 && count <= 4) return `${count} různá písmena`
  return `${count} různých písmen`
}

/** „4 stanoviště", „6 stanovišť". */
function stationsText(count: number): string {
  if (count === 1) return '1 stanoviště'
  return count >= 2 && count <= 4 ? `${count} stanoviště` : `${count} stanovišť`
}

export interface EscapeEditorProps {
  state: EditorState
  onChange: (next: EditorState) => void
  onReroll: () => void
  onPrint: () => void
  onSave: () => void
  onShare: () => void
  onOpen: () => void
  onStartLock: () => void
  /** Hra prošla kontrolou — smí se tisknout, ukládat, sdílet i spustit. */
  canPrint: boolean
}

export function EscapeEditor({
  state,
  onChange,
  onReroll,
  onPrint,
  onSave,
  onShare,
  onOpen,
  onStartLock,
  canPrint,
}: EscapeEditorProps) {
  const escape = state.byActivity.escape
  const storyId = resolveStory(escape, state.shared.grade)
  const offered = offeredMessage(storyId, escape.length)
  const message = escape.message ?? offered
  const distinct = normalizeMessage(message).histogram.size
  const totalStations = escapeStationCount(escape.length, escape.mode === 'groups' ? escape.groupCount : 1)

  const patchEscape = (changes: Partial<EscapeEditorState>) =>
    onChange({ ...state, byActivity: { ...state.byActivity, escape: { ...escape, ...changes } } })

  const patchShared = (changes: Partial<SharedEditorState>) =>
    onChange({ ...state, shared: { ...state.shared, ...changes } })

  /**
   * Ročník je sdílený, takže se přepne i hrám v „Pracovních listech". Táž
   * záchrana jako v `EditorPanel`: hra, které by v novém ročníku nezbylo
   * žádné téma, dostane zpátky počítání.
   */
  const changeGrade = (grade: Grade) => {
    const next = gradeProfile(grade)
    const rescue = <S extends TopicSelection>(slice: S): S =>
      hasUsableTopic(slice, next) ? slice : { ...slice, arithmetic: true }
    const { pexeso, domino, bingo } = state.byActivity
    onChange({
      ...state,
      shared: { ...state.shared, grade },
      byActivity: { ...state.byActivity, pexeso: rescue(pexeso), domino: rescue(domino), bingo: rescue(bingo) },
    })
  }

  const toggleOperation = (operation: OperationTag) => {
    const next = { ...state.shared.operations, [operation]: !state.shared.operations[operation] }
    // Aspoň jedna operace musí zůstat, jinak nelze vyrobit vůbec nic.
    if (Object.values(next).every((enabled) => !enabled)) return
    patchShared({ operations: next })
  }

  return (
    <form className="editor no-print" onSubmit={(event) => event.preventDefault()}>
      {/* Dřív než první pole: kdo tabuli ani projektor nemá, má to vědět,
          než si hru připraví a vytiskne (§5, Karel 2. 10. 2026). */}
      <p className="escape-requirement">
        <strong>Hra potřebuje obrazovku, kterou vidí celá třída, a počítač, na kterém se zadávají
        slova.</strong>{' '}
        Nejpohodlnější je interaktivní tabule; stačí i projektor s počítačem a klávesnicí. Bez
        obrazovky se dá hrát jen napůl — podle přehledu pro učitele.
      </p>

      <div className="editor__primary">
        <label className="field">
          <span className="field__label">Příběh</span>
          <select
            className="field__input"
            value={escape.story}
            onChange={(event) => patchEscape({ story: event.target.value, message: null })}
          >
            <option value="auto">Podle ročníku — {findStory(defaultStoryId(state.shared.grade))?.label}</option>
            {STORIES.map((story) => (
              <option value={story.id} key={story.id}>
                {story.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Délka hry</span>
          <select
            className="field__input"
            value={escape.length}
            onChange={(event) => patchEscape({ length: event.target.value as EscapeLength })}
          >
            {(Object.keys(LENGTH_NAMES) as EscapeLength[]).map((length) => (
              <option value={length} key={length}>
                {lengthLabel(length, escape.mode, escape.groupCount)}
              </option>
            ))}
          </select>
        </label>

        <label className="field field--grow">
          <span className="field__label">Tajenka</span>
          <input
            className="field__input"
            type="text"
            value={message}
            maxLength={ESCAPE_MESSAGE_MAX_CHARS}
            // Kdo dopíše přesně nabídnutou tajenku, dostane zpátky nabídku:
            // změna délky nebo příběhu ji pak zase přepíše.
            onChange={(event) =>
              patchEscape({ message: event.target.value === offered ? null : event.target.value })
            }
            placeholder={offered}
            autoComplete="off"
            spellCheck={false}
          />
          {/* Délku hry dělají RŮZNÁ písmena, ne délka textu (šibenice, §2). */}
          <span className="field__hint">
            {distinctLettersText(distinct)} na {stationsText(totalStations)}
            {message === offered ? ' · nabídl příběh' : ''}
            {message !== offered && (
              <>
                {' · '}
                <button type="button" className="link-button" onClick={() => patchEscape({ message: null })}>
                  vrátit {offered}
                </button>
              </>
            )}
          </span>
        </label>
      </div>

      <div className="editor__primary">
        <label className="field">
          <span className="field__label">Ročník</span>
          <select
            className="field__input"
            value={state.shared.grade}
            onChange={(event) => changeGrade(Number(event.target.value) as Grade)}
          >
            <option value={2}>2. třída</option>
            <option value={3}>3. třída</option>
            <option value={4}>4. třída</option>
            <option value={5}>5. třída</option>
            <option value={6}>6. třída</option>
            <option value={7}>7. třída</option>
            <option value={8}>8. třída</option>
          </select>
        </label>

        <label className="field">
          <span className="field__label">Kdo hraje</span>
          <select
            className="field__input"
            value={escape.mode}
            onChange={(event) => patchEscape({ mode: event.target.value as EscapeMode })}
          >
            <option value="class">Celá třída — stanoviště za sebou</option>
            <option value="groups">Skupiny — každá má svá stanoviště</option>
          </select>
        </label>

        {escape.mode === 'groups' && (
          <label className="field">
            <span className="field__label">Počet skupin</span>
            <input
              className="field__input"
              type="number"
              min={ESCAPE_GROUP_LIMITS.min}
              max={ESCAPE_GROUP_LIMITS.max}
              value={escape.groupCount}
              onChange={(event) => patchEscape({ groupCount: Number(event.target.value) })}
            />
          </label>
        )}

        <label className="field">
          <span className="field__label">Stanoviště</span>
          <select
            className="field__input"
            value={escape.stationKind}
            onChange={(event) => patchEscape({ stationKind: event.target.value as EscapeEditorState['stationKind'] })}
          >
            <option value="auto">
              Podle ročníku — {defaultStationKind(state.shared.grade) === 'choice' ? 'výběr odpovědí' : 'šifrovací tabulka'}
            </option>
            <option value="grid">Šifrovací tabulka</option>
            <option value="choice">Výběr ze tří odpovědí</option>
          </select>
        </label>

        {crossesTenIsChoice(state.shared.grade) && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={state.shared.crossesTen}
              onChange={() => patchShared({ crossesTen: !state.shared.crossesTen })}
            />
            Sčítání a odčítání s přechodem přes desítku
          </label>
        )}
      </div>

      <div className="editor__actions">
        {/* Hlavní akce ve třídě. Zbytek je příprava. */}
        <button type="button" className="button button--primary" onClick={onStartLock} disabled={!canPrint}>
          Spustit zámek
        </button>
        <button type="button" className="button" onClick={onReroll}>
          Jiná varianta
        </button>
        <button type="button" className="button" onClick={onPrint} disabled={!canPrint}>
          Vytisknout
        </button>
        <button type="button" className="button" onClick={onSave} disabled={!canPrint}>
          Uložit
        </button>
        <button type="button" className="button" onClick={onShare} disabled={!canPrint}>
          Sdílet
        </button>
        <button type="button" className="button" onClick={onOpen}>
          Otevřít zadání
        </button>
      </div>

      <p className="editor__print-hint">
        {escape.mode === 'groups'
          ? 'Vytiskněte jednou na skupinu. Listy vylezou po balíčcích, skupina po skupině.'
          : 'Stanoviště vytiskněte jednou na dítě nebo dvojici; přehled pro učitele stačí jednou.'}{' '}
        Kolik kopií, nastavíte v dialogu tisku.
      </p>

      <details className="editor__advanced">
        <summary>Pokročilé nastavení obsahu</summary>
        <div className="editor__advanced-grid">
          <fieldset className="fieldset">
            <legend className="field__label">Povolené operace</legend>
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
            <p className="hint">
              U šifrovací tabulky je výsledek souřadnice políčka, takže vyjde vždy celé číslo od 11
              do 99. Výběr odpovědí tuhle mez nemá — proto se do druhé třídy dostane i dělení.
              Špatné odpovědi vycházejí z typických chyb (zaměněná operace, zapomenutý přechod
              přes desítku).
            </p>
          </fieldset>

          <div className="fieldset">
            <label className="field">
              <span className="field__label">Název hry</span>
              <input
                className="field__input"
                type="text"
                value={state.shared.title}
                onChange={(event) => patchShared({ title: event.target.value })}
                placeholder="např. Ostrov 4.B"
                autoComplete="off"
              />
            </label>
            <p className="hint">
              Název je jen v přehledu pro učitele a v názvu souboru. Děti ho nevidí — ani název
              příběhu, ten by prozradil tajenku.
            </p>
          </div>
        </div>
      </details>
    </form>
  )
}
