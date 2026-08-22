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
  CARD_COUNT_LIMITS,
  MESSAGE_LETTER_LIMITS,
  ONE_PAGE_LETTERS,
  PAIR_COUNT_LIMITS,
  TASK_COUNT_LIMITS,
  TILE_COUNT_LIMITS,
  gradeProfile,
} from '../../core/constraints/index.js'
import { hasUsableTopic, usableTopics, type TopicSelection } from '../../tasks/mix.js'
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
  onShare: () => void
  onOpen: () => void
  canPrint: boolean
}

export function EditorPanel({
  state,
  onChange,
  onReroll,
  onPrint,
  onSave,
  onShare,
  onOpen,
  canPrint,
}: EditorPanelProps) {
  const isCipher = state.activity === 'cipher-grid'
  const isPexeso = state.activity === 'pexeso'
  const isDomino = state.activity === 'domino'
  const isBingo = state.activity === 'bingo'
  /** Kartičkové hry. Liší se počítaným kusem, zbytek formuláře mají stejný. */
  const isCards = isPexeso || isDomino || isBingo
  const cipher = state.byActivity['cipher-grid']
  const sequence = state.byActivity['sequence-sheet']
  const pexeso = state.byActivity.pexeso
  const domino = state.byActivity.domino
  const bingo = state.byActivity.bingo

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

  const patchDomino = (changes: Partial<typeof domino>) =>
    onChange({ ...state, byActivity: { ...state.byActivity, domino: { ...domino, ...changes } } })

  const patchBingo = (changes: Partial<typeof bingo>) =>
    onChange({ ...state, byActivity: { ...state.byActivity, bingo: { ...bingo, ...changes } } })

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

  // Témata mají pexeso, domino i bingo stejná — jedna sada zaškrtávátek, jeden
  // zdroj pravdy. Kdyby si je každá hra vedla zvlášť, opravovaly by se třikrát.
  const topicsState: TopicSelection = isBingo ? bingo : isDomino ? domino : pexeso
  const patchTopics = (changes: Partial<TopicSelection>) =>
    isBingo ? patchBingo(changes) : isDomino ? patchDomino(changes) : patchPexeso(changes)

  /** Zaškrtnutá témata omezená na ta, která ročník opravdu umí. */
  const topics = usableTopics(topicsState, profile)

  const toggleTopic = (topic: keyof TopicSelection) => {
    // Aspoň jedno téma musí zůstat — ze žádného se kartičky složit nedají.
    // Počítá se jen to, co ročník umí: samotné odškrtnutelné „Procenta"
    // u čtvrťáka by hru nechala prázdnou.
    const next = { ...topics, [topic]: !topics[topic] }
    if (Object.values(next).every((enabled) => !enabled)) return
    patchTopics({ [topic]: !topicsState[topic] })
  }

  const changeGrade = (grade: Grade) => {
    // Zaškrtnutá témata se přepnutím ročníku NEMAŽOU — učitel, který se vrátí
    // z šesté do osmé, má své mocniny najít tam, kde je nechal. Doplní se jen
    // záchrana pro případ, že by v novém ročníku nezbylo použitelné nic —
    // a to zvlášť pro každou hru, protože každá si témata drží samostatně.
    const next = gradeProfile(grade)
    const rescue = <S extends TopicSelection>(slice: S): S =>
      hasUsableTopic(slice, next) ? slice : { ...slice, arithmetic: true }

    onChange({
      ...state,
      shared: { ...state.shared, grade },
      byActivity: {
        ...state.byActivity,
        pexeso: rescue(pexeso),
        domino: rescue(domino),
        bingo: rescue(bingo),
      },
    })
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
        ) : isDomino ? (
          <label className="field">
            <span className="field__label">Počet kamenů</span>
            <input
              className="field__input"
              type="number"
              min={TILE_COUNT_LIMITS.min}
              max={TILE_COUNT_LIMITS.max}
              value={domino.tileCount}
              onChange={(event) => patchDomino({ tileCount: Number(event.target.value) })}
            />
            {/* Dvanáct kamenů je přesně jeden list — a to učitel u kopírky
                potřebuje vědět dřív, než zjistí, kolik listů mu vyleze. */}
            <span className="field__hint">
              {Math.ceil(domino.tileCount / 12) === 1
                ? 'na jednom listu'
                : `na ${Math.ceil(domino.tileCount / 12)} listech`}{' '}
              plus list pro učitele se správným pořadím
            </span>
          </label>
        ) : isBingo ? (
          <label className="field">
            <span className="field__label">Počet karet</span>
            <input
              className="field__input"
              type="number"
              min={CARD_COUNT_LIMITS.min}
              max={CARD_COUNT_LIMITS.max}
              value={bingo.cardCount}
              onChange={(event) => patchBingo({ cardCount: Number(event.target.value) })}
            />
            {/* Každé dítě má jinou kartu, takže počet karet = počet dětí.
                Šest na stránku — a to učitel u kopírky potřebuje vědět dřív,
                než zjistí, kolik listů mu vyleze. */}
            <span className="field__hint">
              jedna na dítě, každá jiná — {Math.ceil(bingo.cardCount / 6)}{' '}
              {Math.ceil(bingo.cardCount / 6) === 1 ? 'list' : 'listy'} karet plus list pro
              učitele s příklady
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
            onChange={(event) => changeGrade(Number(event.target.value) as Grade)}
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
          {/* Blokované stejně jako Uložit a Vytisknout: list, který neprošel
              kontrolou, se nemá jak dostat ke kolegyni. */}
          <button type="button" className="button" onClick={onShare} disabled={!canPrint}>
            Sdílet
          </button>
          <button type="button" className="button" onClick={onOpen}>
            Otevřít zadání
          </button>
        </div>
      </div>

      {/* Jen u kartičkových aktivit, a schválně tady, ne na papíře.
          Do 20. 8. 2026 stála na každé stránce kartiček kontrolní úsečka
          s touhle instrukcí — jenže kdo ji čte, čte ji až po tisku, a devět
          milimetrů, které si brala z rozpočtu stránky, stačilo na to, aby
          patička odešla na prázdný list navíc. Věta patří tam, kde učitel
          v tu chvíli je: vedle tlačítka, těsně před dialogem tisku. */}
      {isCards && (
        <p className="editor__print-hint">
          V dialogu tisku nech měřítko na 100 % a vypni záhlaví a zápatí. Při „Přizpůsobit
          stránce" se vytiskne menší to, co dítě dostane do ruky.
        </p>
      )}

      <details className="editor__advanced">
        <summary>Pokročilé nastavení</summary>

        <div className="editor__advanced-grid">
          <fieldset className="fieldset">
            <legend className="field__label">
              {isCipher || isCards ? 'Typy příkladů' : 'Povolené operace'}
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
                {profile.fractions && (
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={cipher.fractions}
                      onChange={() => patchCipher({ fractions: !cipher.fractions })}
                    />
                    Zlomky
                  </label>
                )}
                <p className="hint">
                  Řada („4 10 16 22 ?“), desetinná čísla („3,5 · 4“), procenta („25 % z 80“)
                  i zlomky („3/4 z 80“) jsou samostatné volby a s operacemi platí zároveň — řada
                  s podílem i procento se objeví jen při zapnutém násobení, zlomek při násobení
                  nebo dělení. Výsledek zůstává vždy celé číslo, protože je to kód políčka
                  v tabulce.
                </p>
              </>
            ) : isCards ? (
              <>
                {/* Na rozdíl od šifry jde odškrtnout i počítání. Kartičková hra
                    je hra na jedno téma — celé pexeso nebo domino ze samých
                    mocnin je legitimní zadání, kdežto list na hodinu ze samých
                    mocnin není. */}
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={topics.arithmetic}
                    onChange={() => toggleTopic('arithmetic')}
                  />
                  Počítání
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={topics.sequences}
                    onChange={() => toggleTopic('sequences')}
                  />
                  Číselné řady
                </label>
                {profile.decimals > 0 && (
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={topics.decimals}
                      onChange={() => toggleTopic('decimals')}
                    />
                    Desetinná čísla
                  </label>
                )}
                {profile.percents && (
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={topics.percents}
                      onChange={() => toggleTopic('percents')}
                    />
                    Procenta
                  </label>
                )}
                {profile.powers && (
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={topics.powers}
                      onChange={() => toggleTopic('powers')}
                    />
                    Mocniny a odmocniny
                  </label>
                )}
                {profile.fractions && (
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={topics.fractions}
                      onChange={() => toggleTopic('fractions')}
                    />
                    Zlomky
                  </label>
                )}
                <p className="hint">
                  Zaškrtnuté typy se míchají rovnoměrně. Necháte-li zaškrtnutý jediný, bude z něj
                  celé {isBingo ? 'bingo' : isDomino ? 'domino' : 'pexeso'} — třeba samé mocniny
                  („7²“, „√81“, „2³ − 8“). Operace platí zároveň, ale holé mocniny se objeví
                  i bez nich.
                  {profile.decimals > 0 && (
                    <>
                      {' '}
                      Tady smí desetinné číslo i vyjít („0,5 · 5 = 2,5“) — na rozdíl od šifry, kde
                      je výsledek kód políčka, a tedy vždy celý.
                    </>
                  )}
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
                placeholder={
                  isCipher
                    ? 'např. Lov pirátského pokladu'
                    : isPexeso
                      ? 'např. Mocniny na kartičkách'
                      : isDomino
                        ? 'např. Procenta v kruhu'
                        : isBingo
                          ? 'např. Násobilkové bingo'
                          : 'např. Rozcvička na řady'
                }
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
            ) : isCards ? (
              <p className="hint">
                Název se tiskne na list pro učitele. Na{' '}
                {isBingo ? 'karty' : isDomino ? 'kameny' : 'kartičky'} ne — na těch by zabral
                místo a dítěti neřekne nic.
              </p>
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
