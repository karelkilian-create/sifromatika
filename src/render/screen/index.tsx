/**
 * Vykreslení `DocumentModel` do HTML.
 *
 * Renderer nezná žádnou aktivitu — bere jen bloky z `core/document`. Díky tomu
 * ho bingo, pexeso ani domino nebudou muset měnit, a v 0.3 vedle něj může
 * vzniknout renderer do PDF nad tímtéž modelem.
 *
 * ⚠ Renderer NEROZHODUJE o obsahu. Žádné `if` typu „u souřadnicové tabulky
 *   napiš jinou instrukci" — to všechno patří do `toDocument` té které
 *   aktivity. Sem patří výhradně převod bloku na značky.
 *
 * ⚠ Na pracovním listu se NIKDY nesmí objevit výsledek příkladu ani písmeno
 *   z tajenky. Model to hlídá tvarem: `task-list` nese jen text zadání a
 *   `answer-row` bez `letters` je prázdná mřížka rámečků.
 */

import { useLayoutEffect } from 'react'

import type {
  CardFace,
  DocumentBlock,
  DocumentModel,
  DocumentPage,
  InlineRun,
} from '../../core/document/index.js'
import type { CipherTable } from '../../core/model/index.js'
import { MathText } from './math.js'
import { alignVinculum } from './vinculum.js'
import './sheet.css'

export function DocumentView({ document }: { document: DocumentModel }) {
  // Před vykreslením, ne po něm: kdyby se čára nad odmocninou usadila až po
  // prvním snímku, viděl by učitel poskočit sazbu.
  useLayoutEffect(alignVinculum, [])

  return (
    <>
      {document.pages.map((page, index) => (
        // Zalomení nese obal, ne stránka sama: první list žádné nemá a
        // `break-before` na něm by v některých prohlížečích vyrobil prázdný
        // papír navíc.
        <div className={index === 0 ? undefined : 'print-page-break'} key={index}>
          <PageView page={page} />
        </div>
      ))}
    </>
  )
}

function PageView({ page }: { page: DocumentPage }) {
  return (
    <article className="sheet" aria-label={page.label}>
      {page.blocks.map((block, index) => (
        <BlockView block={block} key={index} />
      ))}
    </article>
  )
}

function BlockView({ block }: { block: DocumentBlock }) {
  switch (block.kind) {
    case 'heading':
      return block.level === 1 ? (
        <h1 className="sheet__title">{block.text}</h1>
      ) : (
        <h2 className="sheet__section-heading">{block.text}</h2>
      )

    case 'paragraph':
      return (
        <p className="sheet__instructions">
          {block.runs.map((run, index) => (
            <RunView run={run} key={index} />
          ))}
        </p>
      )

    case 'callout':
      return <p className="solution-message">{block.text}</p>

    case 'task-list':
      return <TaskListView columns={block.columns} items={block.items} />

    case 'cipher-table':
      return (
        <CipherTableView
          caption={block.caption}
          table={block.table}
          coordinates={block.coordinates}
        />
      )

    case 'answer-row':
      return <AnswerRow wordLengths={block.wordLengths} letters={block.letters} />

    case 'table':
      return <TableView columns={block.columns} rows={block.rows} />

    case 'card-grid':
      return (
        <CardGridView
          cards={block.cards}
          columns={block.columns}
          widthMm={block.cardWidthMm}
          heightMm={block.cardHeightMm}
        />
      )

    case 'print-scale-check':
      return <PrintScaleCheck lengthMm={block.lengthMm} />
  }
}

/**
 * Mřížka kartiček k vystřižení.
 *
 * Linky jsou na kartičce vpravo a dole, na mřížce nahoře a vlevo. Díky tomu
 * mají sousedící kartičky JEDNU společnou linku, ne dvě vedle sebe — a učitel
 * vede řezačkou jeden rovný řez přes celý list, ne dva těsně u sebe.
 */
function CardGridView({
  cards,
  columns,
  widthMm,
  heightMm,
}: {
  cards: readonly CardFace[]
  columns: number
  widthMm: number
  heightMm: number
}) {
  return (
    <div
      className="card-grid"
      style={{ gridTemplateColumns: `repeat(${columns}, ${widthMm}mm)` }}
    >
      {cards.map((card, index) => (
        <div
          className={`card${cardModifier(card)}`}
          style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}
          key={index}
        >
          <CardFaceView card={card} />
        </div>
      ))}
    </div>
  )
}

/** Třída podle tvaru kartičky. Sazbu řeší CSS, tvar rozhoduje jen o třídě. */
function cardModifier(card: CardFace): string {
  if ('text' in card) return ''
  return 'left' in card ? ' card--split' : ' card--grid'
}

/**
 * Obsah kartičky podle jejího tvaru.
 *
 * Rozlišená unie znamená, že překladač ukáže každý tvar, který tahle funkce
 * neumí — na rozdíl od nepovinných polí, kde by chybějící větev skončila
 * prázdným místem na papíře.
 */
function CardFaceView({ card }: { card: CardFace }) {
  if ('text' in card) {
    return (
      <span className="card__text">
        <MathText text={card.text} />
      </span>
    )
  }

  if ('left' in card) {
    return (
      <>
        <span className="card__text card__half">
          <MathText text={card.left} />
        </span>
        {/* Čára, ne rámeček: dělí půlky kamene a nesmí vypadat jako
            střihová linka. O tvaru rozhoduje CSS, viz `.card__divider`. */}
        <span className="card__divider" aria-hidden="true" />
        <span className="card__text card__half">
          <MathText text={card.right} />
        </span>
      </>
    )
  }

  // Mřížka bingo karty. Buňky mají vlastní linky — na rozdíl od kartiček se
  // uvnitř karty NEstříhá, takže se linky nesmí zaměnit se střihovými:
  // vnitřní jsou tenčí a nedosahují k okraji karty.
  return (
    <div
      className="card__grid"
      style={{ gridTemplateColumns: `repeat(${card.grid[0]?.length ?? 1}, 1fr)` }}
    >
      {card.grid.flatMap((row, rowIndex) =>
        row.map((cell, cellIndex) => (
          <span className="card__cell" key={`${rowIndex}-${cellIndex}`}>
            <MathText text={cell} />
          </span>
        )),
      )}
    </div>
  )
}

function PrintScaleCheck({ lengthMm }: { lengthMm: number }) {
  return (
    <div className="print-scale-check">
      <div className="print-scale-check__ruler" style={{ width: `${lengthMm}mm` }} />
      {/* Krátce schválně: popisek stojí VEDLE úsečky, takže na něj zbývá
          osmdesát milimetrů. Delší text se zalomí a patička zase naroste. */}
      <p className="print-scale-check__note">
        Než začneš stříhat, přilož pravítko: úsečka musí měřit {lengthMm}&nbsp;mm. Když neměří,
        nastav v dialogu tisku měřítko 100&nbsp;%.
      </p>
    </div>
  )
}

function RunView({ run }: { run: InlineRun }) {
  return run.strong === true ? (
    <strong>
      <MathText text={run.text} />
    </strong>
  ) : (
    <MathText text={run.text} />
  )
}

/**
 * Očíslovaný seznam úloh s linkou na odpověď.
 *
 * Číslo je pozice v seznamu, ne údaj z modelu — rámečky na tajenku se číslují
 * stejně a kdyby si obojí neslo vlastní číslování, mohlo by se rozejít.
 */
function TaskListView({
  columns,
  items,
}: {
  columns: 1 | 2
  items: readonly { text: string; showEquals: boolean }[]
}) {
  return (
    <ol className={`task-list${columns === 2 ? ' task-list--two-columns' : ''}`}>
      {items.map((item, index) => (
        <li
          className={`task-list__item${item.showEquals ? '' : ' task-list__item--sequence'}`}
          key={index}
        >
          <span className="task-list__number">{index + 1}.</span>
          <span className="task-list__prompt">
            <MathText text={item.text} />
            {item.showEquals ? ' =' : ''}
          </span>
          <span className="task-list__blank" />
        </li>
      ))}
    </ol>
  )
}

function TableView({
  columns,
  rows,
}: {
  columns: readonly string[]
  rows: readonly (readonly string[])[]
}) {
  return (
    <table className="solution-table">
      <thead>
        <tr>
          {columns.map((column, index) => (
            <th scope="col" key={index}>
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>
                <MathText text={cell} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CipherTableView({
  caption,
  table,
  coordinates,
}: {
  caption: string
  table: CipherTable
  coordinates: boolean
}) {
  const rows = Array.from({ length: table.rows }, (_, row) =>
    table.cells.slice(row * table.cols, (row + 1) * table.cols),
  )

  return (
    <table className={`cipher-table${coordinates ? ' cipher-table--coord' : ''}`}>
      <caption className="sheet__section-heading">{caption}</caption>
      {coordinates && (
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
            {coordinates && (
              <th className="cipher-table__header" scope="row">
                {rowIndex + 1}
              </th>
            )}
            {cells.map((cell) => (
              <td key={cell.code.n}>
                {!coordinates && <span className="cipher-table__code">{cell.code.n}</span>}
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
                  <div className={`answer-box__cell${letters ? ' answer-box__cell--filled' : ''}`}>
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
