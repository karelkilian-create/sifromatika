/**
 * Vykreslení pracovního listu a řešení.
 *
 * Renderer záměrně nezná aktivitu `cipher-grid` — bere jen datové typy
 * z `core/model`. Díky tomu ho půjde v 0.3 postavit nad `DocumentModel`
 * a v 0.8 znovupoužít pro domino, aniž by se sem sáhlo.
 *
 * ⚠ Na pracovním listu se NIKDY nesmí objevit výsledek příkladu ani písmeno
 *   z tajenky. Kdyby ano, dítě nemusí počítat. Proto se sem předávají úlohy
 *   bez svých hodnot a rozluštění se vykresluje jen v `SolutionView`.
 */

import type { CipherTable, Task } from '../../core/model/index.js'
import './sheet.css'

export interface SheetSlotView {
  /** Číslo buňky, kam výsledek ukazuje. Na žákovský list se nevykresluje. */
  code: number
  task: Task
}

export interface WorksheetViewProps {
  /** `null` = nadpis se tisknout nesmí (viz pravidlo o prozrazení tajenky). */
  title: string | null
  table: CipherTable
  slots: readonly SheetSlotView[]
  /** Délky slov v písmenech — určují mezery mezi rámečky na tajenku. */
  wordLengths: readonly number[]
  columns?: 1 | 2
}

export function WorksheetView({
  title,
  table,
  slots,
  wordLengths,
  columns = 2,
}: WorksheetViewProps) {
  return (
    <article className="sheet">
      {title !== null && <h1 className="sheet__title">{title}</h1>}
      <p className="sheet__instructions">
        {isCoordTable(table) ? (
          <>
            Vypočítej příklady. Výsledek je souřadnice políčka: <strong>první číslice je řádek</strong>{' '}
            a <strong>druhá číslice sloupec</strong>. Například 34 znamená 3. řádek a 4. sloupec.
            Písmeno z políčka zapiš do rámečku se stejným číslem, jaké má příklad.
          </>
        ) : (
          <>
            Vypočítej příklady. Každý výsledek je číslo políčka v tabulce. Písmeno z políčka zapiš do
            rámečku se stejným číslem, jaké má příklad.
          </>
        )}
      </p>

      <CipherTableView table={table} />

      <h2 className="sheet__section-heading">Příklady</h2>
      <ol className={`task-list${columns === 2 ? ' task-list--two-columns' : ''}`}>
        {slots.map((slot, index) => (
          <li className="task-list__item" key={`${slot.task.id}-${index}`}>
            <span className="task-list__number">{index + 1}.</span>
            <span className="task-list__prompt">{slot.task.prompt.text} =</span>
            <span className="task-list__blank" />
          </li>
        ))}
      </ol>

      <h2 className="sheet__section-heading">Tajenka</h2>
      <AnswerRow wordLengths={wordLengths} />
    </article>
  )
}

export interface SolutionViewProps {
  /**
   * Vlastní název aktivity, nebo `null`, když žádný není.
   *
   * `null` se předává i pro název odvozený z tajenky — jinak by nadpis zněl
   * „POKLAD JE U BAZÉNU — řešení" a hned pod ním by stálo totéž ještě jednou.
   */
  title: string | null
  /** Rozluštěná tajenka i s mezerami mezi slovy. */
  message: string
  table: CipherTable
  slots: readonly SheetSlotView[]
  wordLengths: readonly number[]
}

export function SolutionView({ title, message, table, slots, wordLengths }: SolutionViewProps) {
  const letterByCode = new Map(table.cells.map((cell) => [cell.code.n, cell.letter]))
  const tokenByCode = new Map(table.cells.map((cell) => [cell.code.n, cell.code]))
  const coord = isCoordTable(table)

  return (
    <article className="sheet">
      <h1 className="sheet__title">{title === null ? 'Řešení' : `${title} — řešení`}</h1>
      <p className="solution-message">{message}</p>

      <h2 className="sheet__section-heading">Tajenka po písmenech</h2>
      <AnswerRow
        wordLengths={wordLengths}
        letters={slots.map((slot) => letterByCode.get(slot.code) ?? '?')}
      />

      <h2 className="sheet__section-heading">Výsledky příkladů</h2>
      <table className="solution-table">
        <thead>
          <tr>
            <th scope="col">Č.</th>
            <th scope="col">Příklad</th>
            <th scope="col">Výsledek</th>
            {coord && <th scope="col">Řádek / sloupec</th>}
            <th scope="col">Písmeno</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, index) => {
            const token = tokenByCode.get(slot.code)
            return (
              <tr key={`${slot.task.id}-${index}`}>
                <td>{index + 1}.</td>
                <td>{slot.task.prompt.text}</td>
                <td>{slot.task.value}</td>
                {coord && (
                  <td>
                    {token?.kind === 'coord' ? `${token.row}. řádek, ${token.col}. sloupec` : '—'}
                  </td>
                )}
                <td>{letterByCode.get(slot.code) ?? '?'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </article>
  )
}

/** Souřadnicová tabulka? Poznáme z kódu první buňky. */
function isCoordTable(table: CipherTable): boolean {
  return table.cells[0]?.code.kind === 'coord'
}

export function CipherTableView({ table }: { table: CipherTable }) {
  const rows = Array.from({ length: table.rows }, (_, row) =>
    table.cells.slice(row * table.cols, (row + 1) * table.cols),
  )
  const coord = isCoordTable(table)

  return (
    <table className={`cipher-table${coord ? ' cipher-table--coord' : ''}`}>
      <caption className="sheet__section-heading">Šifrovací tabulka</caption>
      {coord && (
        <thead>
          <tr>
            <th className="cipher-table__corner" scope="col" />
            {Array.from({ length: table.cols }, (_, col) => (
              <th className="cipher-table__header" scope="col" key={col}>
                {col + 1}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((cells, rowIndex) => (
          <tr key={rowIndex}>
            {coord && (
              <th className="cipher-table__header" scope="row">
                {rowIndex + 1}
              </th>
            )}
            {cells.map((cell) => (
              <td key={cell.code.n}>
                {/* U souřadnic se číslo do buňky netiskne — dítě ho čte
                    ze záhlaví, a právě to je ta procvičovaná dovednost. */}
                {!coord && <span className="cipher-table__code">{cell.code.n}</span>}
                <span className="cipher-table__letter">{cell.letter}</span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Rámečky na tajenku, rozdělené po slovech.
 *
 * Číslo pod rámečkem odpovídá číslu příkladu — bez něj by dítě nevědělo,
 * kam které písmeno patří.
 */
function AnswerRow({
  wordLengths,
  letters,
}: {
  wordLengths: readonly number[]
  letters?: readonly string[]
}) {
  let position = 0

  return (
    <div className="answer-row">
      {wordLengths.map((length, wordIndex) => {
        const start = position
        position += length
        return (
          <div className="answer-word" key={wordIndex}>
            {Array.from({ length }, (_, offset) => {
              const index = start + offset
              return (
                <div className="answer-box" key={index}>
                  <div
                    className={`answer-box__cell${letters ? ' answer-box__cell--filled' : ''}`}
                  >
                    {letters?.[index] ?? ''}
                  </div>
                  <div className="answer-box__index">{index + 1}</div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
