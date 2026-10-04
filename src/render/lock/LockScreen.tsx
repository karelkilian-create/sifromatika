/**
 * Zámek únikové hry na tabuli — docs/navrh-unikova-hra.md §5.
 *
 * Renderer `LockScreenModel`. O příběhu ani o šifře neví nic: dostane slova,
 * písmena pro tabuli a věty, a obslouží zadávání. Stav hry (která slova jsou
 * uznaná) žije jen tady, v paměti prohlížeče — nic se neukládá ani neodesílá.
 *
 * Pravidla z návrhu, která drží tvar kódu:
 *
 *  - **Finále se otevírá jen slovy.** Políčko na celou tajenku neexistuje.
 *  - **Chybné slovo = zatřesení a nic dalšího.** Žádné počítání chyb ani
 *    zamčení po N pokusech — učitel by před třídou hledal, jak hru odemknout.
 *  - **Písmena:** v „celé třídě" přibývají po každém slově, ve „skupinách"
 *    se ukážou naráz na konci, slovo po slově (§2).
 *  - **Časomíra běží nahoru**, ne dolů. Odpočet mladší děti stresuje.
 *  - **Učitelské ovládání bez PINu** — malé tlačítko v rohu.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LockScreenModel } from '../../core/screen/index.js'
import { normalizeMessage } from '../../core/text/index.js'
import { Scene } from './scenes.js'
import './lock.css'

const KEYBOARD_ROWS = ['QWERTZUIOP', 'ASDFGHJKL', 'YXCVBNM'].map((row) => row.split(''))

/** Jak dlouho se ve skupinách ukazuje jedno slovo při závěrečném odhalení. */
const REVEAL_STEP_MS = 1800

type Phase =
  /** Úvod příběhu, hodiny ještě neběží. */
  | 'intro'
  /** Zadávání slov. */
  | 'play'
  /** Ve skupinách: všechna slova jsou uznaná a písmena se odhalují. */
  | 'reveal'
  /** Zámek je otevřený: tajenka, závěr, čas. */
  | 'open'

/** Slovo z klávesnice na A–Z: `zámek` → `ZAMEK`. */
function plain(input: string): string {
  return normalizeMessage(input).letters.join('')
}

function formatTime(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

/** „L", „L a A", „K, O a P". */
function listLetters(letters: readonly string[]): string {
  if (letters.length <= 1) return letters.join('')
  return `${letters.slice(0, -1).join(', ')} a ${letters[letters.length - 1]}`
}

export interface LockScreenProps {
  model: LockScreenModel
  onClose: () => void
}

export function LockScreen({ model, onClose }: LockScreenProps) {
  const [phase, setPhase] = useState<Phase>('intro')
  /** Uznaná stanoviště v pořadí uznání. Krok zpět bere poslední. */
  const [accepted, setAccepted] = useState<number[]>([])
  /** Ve skupinách vybraná skupina; `null` = ukazují se tlačítka skupin. */
  const [group, setGroup] = useState<number | null>(model.mode === 'class' ? 0 : null)
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(0)
  /** Stanoviště, jehož věta příběhu se právě ukazuje. */
  const [justAccepted, setJustAccepted] = useState<number | null>(null)
  /** Ve fázi `reveal`: kolik uznaných slov už odhalilo svá písmena. */
  const [revealed, setRevealed] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [endedAt, setEndedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [menuOpen, setMenuOpen] = useState(false)

  const total = model.stations.length
  const acceptedSet = useMemo(() => new Set(accepted), [accepted])

  /** Stanoviště, jehož slovo se teď čeká, nebo `null`. */
  const expected = useMemo(() => {
    if (group === null) return null
    return model.groups[group]?.stations.find((index) => !acceptedSet.has(index)) ?? null
  }, [group, model.groups, acceptedSet])

  // Písmena v rámečcích. Ve skupinách až při odhalení, slovo po slově.
  const shownLetters = useMemo(() => {
    const sources = model.mode === 'class' || phase === 'open' ? accepted : accepted.slice(0, revealed)
    return new Set(sources.flatMap((index) => model.stations[index]!.picks))
  }, [model, phase, accepted, revealed])

  // Hodiny. Interval jen kvůli překreslení; čas se počítá z razítek.
  useEffect(() => {
    if (phase === 'intro' || phase === 'open') return
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [phase])

  // Závěrečné odhalení ve skupinách: slovo po slově, pak otevření.
  useEffect(() => {
    if (phase !== 'reveal') return
    const timer = window.setTimeout(() => {
      if (revealed < accepted.length) setRevealed(revealed + 1)
      else {
        setEndedAt((current) => current ?? Date.now())
        setPhase('open')
      }
    }, revealed === 0 ? 600 : REVEAL_STEP_MS)
    return () => window.clearTimeout(timer)
  }, [phase, revealed, accepted.length])

  const accept = useCallback(
    (station: number) => {
      setAccepted([...accepted, station])
      setInput('')
      setJustAccepted(station)
    },
    [accepted],
  )

  const submit = useCallback(() => {
    if (expected === null || input === '') return
    if (plain(input) === model.stations[expected]!.word) accept(expected)
    else setShake((count) => count + 1)
  }, [expected, input, model.stations, accept])

  const typing = phase === 'play' && expected !== null && justAccepted === null

  // Fyzická klávesnice. Diakritiku zahodí `plain`, takže ZÁMEK = ZAMEK.
  useEffect(() => {
    if (!typing) return
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key === 'Enter') {
        event.preventDefault()
        submit()
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        setInput((value) => value.slice(0, -1))
      } else if (event.key.length === 1) {
        const letter = plain(event.key)
        if (letter.length === 1) setInput((value) => (value.length < 12 ? value + letter : value))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [typing, submit])

  const undo = () => {
    setMenuOpen(false)
    const last = accepted[accepted.length - 1]
    if (last === undefined) return
    setAccepted(accepted.slice(0, -1))
    setJustAccepted(null)
    setEndedAt(null)
    setRevealed(0)
    setPhase('play')
    if (model.mode === 'groups') {
      setGroup(model.groups.findIndex((candidate) => candidate.stations.includes(last)))
    }
  }

  const forceAccept = () => {
    setMenuOpen(false)
    if (expected !== null && phase === 'play') accept(expected)
  }

  /** Po větě příběhu dál: v celé třídě další stanoviště, ve skupinách další slovo. */
  const continueAfterSentence = () => {
    setJustAccepted(null)
    if (accepted.length === total) {
      // Poslední slovo. V celé třídě jsou písmena už vidět, takže se rovnou
      // otevírá; ve skupinách přijde nejdřív společné odhalení.
      if (model.mode === 'class') {
        setEndedAt(Date.now())
        setPhase('open')
      } else {
        setGroup(null)
        setRevealed(0)
        setPhase('reveal')
      }
      return
    }
    // Skupina s hotovými slovy se vrací k výběru skupin.
    if (model.mode === 'groups' && expected === null) setGroup(null)
  }

  const elapsed = startedAt === null ? 0 : (endedAt ?? now) - startedAt

  return (
    <div className="lock" role="dialog" aria-modal="true" aria-label="Zámek únikové hry">
      <header className="lock__top">
        <span className="lock__progress">
          {accepted.length} / {total} {total >= 5 ? 'slov' : 'slova'}
        </span>
        <span className="lock__time" aria-label="Čas hry">
          {formatTime(elapsed)}
        </span>
        <div className="lock__teacher">
          <button
            type="button"
            className="lock__teacher-toggle"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            Učitel
          </button>
          {menuOpen && (
            <div className="lock__teacher-menu">
              <button type="button" onClick={undo} disabled={accepted.length === 0}>
                Vrátit poslední slovo
              </button>
              <button type="button" onClick={forceAccept} disabled={!typing}>
                Uznat slovo bez zadání
              </button>
              <button type="button" onClick={onClose}>
                Ukončit hru
              </button>
            </div>
          )}
        </div>
      </header>

      <Boxes model={model} shown={shownLetters} open={phase === 'open'} />
      {phase !== 'open' && <p className="lock__motto">{model.motto}</p>}

      <main className="lock__stage">
        {phase === 'intro' && (
          <div className="lock__panel">
            <Scene id={model.scene} />
            <p className="lock__story">{model.intro}</p>
            <button
              type="button"
              className="lock__big-button"
              onClick={() => {
                setStartedAt(Date.now())
                setNow(Date.now())
                setPhase('play')
              }}
            >
              Začít hru
            </button>
          </div>
        )}

        {phase === 'play' && justAccepted !== null && (
          <AcceptedPanel
            model={model}
            station={justAccepted}
            last={accepted.length === total}
            nextNumber={accepted.length + 1}
            groupHasMore={expected !== null}
            onContinue={continueAfterSentence}
          />
        )}

        {phase === 'play' && justAccepted === null && group === null && (
          <div className="lock__panel">
            <p className="lock__prompt">Která skupina jde zadat slova?</p>
            <div className="lock__groups">
              {model.groups.map((candidate, index) => {
                const done = candidate.stations.every((station) => acceptedSet.has(station))
                return (
                  <button
                    type="button"
                    key={candidate.name}
                    className={`lock__group lock__group--${candidate.color}`}
                    disabled={done}
                    onClick={() => setGroup(index)}
                  >
                    {candidate.name}
                    <span className="lock__group-state">{done ? '✓ hotovo' : '…'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {typing && expected !== null && (
          <div className="lock__panel">
            <p className="lock__prompt">
              {model.mode === 'class'
                ? `Slovo ze stanoviště ${accepted.length + 1}`
                : `Skupina ${model.groups[group!]!.name}: slovo ze stanoviště ${
                    model.groups[group!]!.stations.indexOf(expected) + 1
                  }`}
            </p>
            <div className="lock__input" key={shake} data-shake={shake > 0 ? 'yes' : undefined}>
              {input === '' ? <span className="lock__placeholder">napište slovo</span> : input}
            </div>
            <Keyboard
              onLetter={(letter) => setInput((value) => (value.length < 12 ? value + letter : value))}
              onDelete={() => setInput((value) => value.slice(0, -1))}
              onSubmit={submit}
            />
            {model.mode === 'groups' && (
              <button type="button" className="lock__link" onClick={() => setGroup(null)}>
                Zpět na výběr skupiny
              </button>
            )}
          </div>
        )}

        {phase === 'reveal' && (
          <div className="lock__panel">
            <p className="lock__prompt">Všechny skupiny mají svá slova!</p>
            <ul className="lock__reveal">
              {accepted.slice(0, revealed).map((index) => {
                const station = model.stations[index]!
                const owner = model.groups.find((candidate) => candidate.stations.includes(index))
                return (
                  <li key={index} className={owner ? `lock__reveal-item lock__reveal-item--${owner.color}` : undefined}>
                    <strong>{station.display}</strong> → {listLetters(station.picks)}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {phase === 'open' && (
          <div className="lock__panel lock__panel--open">
            <div className="lock__padlock lock__padlock--open" aria-hidden="true" />
            <p className="lock__message">{model.messageText}</p>
            <p className="lock__story">{model.outro}</p>
            <p className="lock__final-time">Čas: {formatTime(elapsed)}</p>
            <button type="button" className="lock__big-button" onClick={onClose}>
              Zavřít
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

/**
 * Rámečky tajenky. Prázdné od začátku, mezery mezi slovy vidět — děti znají
 * délku celku, ne to, kolik dá které slovo (§5).
 */
function Boxes({ model, shown, open }: { model: LockScreenModel; shown: ReadonlySet<string>; open: boolean }) {
  let position = 0
  return (
    <div className={`lock__boxes${open ? ' lock__boxes--open' : ''}`} aria-label="Tajenka">
      {model.wordLengths.map((length, wordIndex) => {
        const start = position
        position += length
        return (
          <div className="lock__word" key={wordIndex}>
            {model.messageLetters.slice(start, start + length).map((letter, offset) => {
              const visible = shown.has(letter)
              return (
                <span
                  className={`lock__box${visible ? ' lock__box--filled' : ''}`}
                  key={`${start + offset}-${visible ? letter : '?'}`}
                >
                  {visible ? letter : ''}
                </span>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function AcceptedPanel({
  model,
  station,
  last,
  nextNumber,
  groupHasMore,
  onContinue,
}: {
  model: LockScreenModel
  station: number
  last: boolean
  nextNumber: number
  groupHasMore: boolean
  onContinue: () => void
}) {
  const entry = model.stations[station]!
  const classMode = model.mode === 'class'

  const nextLabel = classMode
    ? last
      ? 'Otevřít zámek'
      : `Otočte na stanoviště ${nextNumber}`
    : last
      ? 'Odhalit tajenku'
      : groupHasMore
        ? 'Další slovo'
        : 'Hotovo, další skupina'

  return (
    <div className="lock__panel lock__panel--accepted">
      <p className="lock__ok">✓ Slovo {entry.display} platí!</p>
      <p className="lock__story">{entry.boardSentence}</p>
      {/* Ve skupinách jsou písmena do konce schovaná (§2). */}
      {classMode && (
        <p className="lock__picks">
          Ze slova {entry.display} bereme <strong>{listLetters(entry.picks)}</strong>.
        </p>
      )}
      <button type="button" className="lock__big-button" onClick={onContinue} autoFocus>
        {nextLabel}
      </button>
    </div>
  )
}

function Keyboard({
  onLetter,
  onDelete,
  onSubmit,
}: {
  onLetter: (letter: string) => void
  onDelete: () => void
  onSubmit: () => void
}) {
  return (
    <div className="lock__keyboard">
      {KEYBOARD_ROWS.map((row, index) => (
        <div className="lock__keys" key={index}>
          {row.map((letter) => (
            <button type="button" className="lock__key" key={letter} onClick={() => onLetter(letter)}>
              {letter}
            </button>
          ))}
        </div>
      ))}
      <div className="lock__keys">
        <button type="button" className="lock__key lock__key--wide" onClick={onDelete}>
          Smazat
        </button>
        <button type="button" className="lock__key lock__key--wide lock__key--submit" onClick={onSubmit}>
          Odeslat
        </button>
      </div>
    </div>
  )
}
