/**
 * Šifra jako `DocumentModel`: pracovní list a k němu list řešení.
 *
 * Nahradilo `view.tsx`. Rozdíl není v tom, že ubyl JSX — je v tom, že veškerá
 * rozhodnutí o obsahu (co je nadpis, jaké je zadání pro děti, které sloupce má
 * tabulka řešení) jsou teď tady, v aktivitě. Renderer už jen kreslí.
 *
 * Soubor je čistý TypeScript bez Reactu. Pravidlo „generátor vrací data, ne
 * JSX" (docs/rozsah-0.1.md §3.2) tím přestalo být slib a stalo se vlastností
 * typu: `DocumentModel` prostě žádný uzel Reactu pojmout neumí.
 */

import type { DocumentBlock, DocumentModel, InlineRun } from '../../core/document/index.js'
import type { CipherTable } from '../../core/model/index.js'
import { solutionTitle, worksheetTitle, type CipherGridSheet } from './index.js'

/**
 * Souřadnicová tabulka? Poznáme z kódu první buňky.
 *
 * Rozhoduje se to tady, a ne v rendereru: na téhle jedné odpovědi visí zároveň
 * znění zadání pro děti a sloupec „Řádek / sloupec" v řešení. Kdyby si na ni
 * odpovídal každý zvlášť, mohl by list říkat něco jiného než tabulka.
 */
function isCoordTable(table: CipherTable): boolean {
  return table.cells[0]?.code.kind === 'coord'
}

const SEQUENCE_NOTE = ' U číselné řady doplň číslo, které patří místo otazníku.'

function instructions(sheet: CipherGridSheet): InlineRun[] {
  const runs: InlineRun[] = isCoordTable(sheet.table)
    ? [
        { text: 'Vypočítej příklady. Výsledek je souřadnice políčka: ' },
        { text: 'první číslice je řádek', strong: true },
        { text: ' a ' },
        { text: 'druhá číslice sloupec', strong: true },
        {
          text:
            '. Například 34 znamená 3. řádek a 4. sloupec.' +
            ' Písmeno z políčka zapiš do rámečku se stejným číslem, jaké má příklad.',
        },
      ]
    : [
        {
          text:
            'Vypočítej příklady. Každý výsledek je číslo políčka v tabulce.' +
            ' Písmeno z políčka zapiš do rámečku se stejným číslem, jaké má příklad.',
        },
      ]

  if (sheet.slots.some((slot) => slot.task.prompt.kind === 'sequence')) {
    runs.push({ text: SEQUENCE_NOTE })
  }
  return runs
}

function worksheetPage(sheet: CipherGridSheet): DocumentBlock[] {
  const title = worksheetTitle(sheet)
  const blocks: DocumentBlock[] = []

  // Odvozený název ani zakázaný nadpis se na žákovský list nedostane vůbec —
  // prozradil by tajenku dřív, než dítě spočítá první příklad.
  if (title !== null) blocks.push({ kind: 'heading', level: 1, text: title })

  blocks.push(
    { kind: 'paragraph', runs: instructions(sheet) },
    {
      kind: 'cipher-table',
      caption: 'Šifrovací tabulka',
      table: sheet.table,
      coordinates: isCoordTable(sheet.table),
    },
    { kind: 'heading', level: 2, text: 'Příklady' },
    {
      kind: 'task-list',
      columns: sheet.config.payload.output.columns,
      items: sheet.slots.map((slot) => ({
        text: slot.task.prompt.text,
        showEquals: slot.task.prompt.kind !== 'sequence',
      })),
    },
    { kind: 'heading', level: 2, text: 'Tajenka' },
    { kind: 'answer-row', wordLengths: sheet.message.wordLengths },
  )

  return blocks
}

function solutionPage(sheet: CipherGridSheet): DocumentBlock[] {
  const coord = isCoordTable(sheet.table)
  const letterByCode = new Map(sheet.table.cells.map((cell) => [cell.code.n, cell.letter]))
  const tokenByCode = new Map(sheet.table.cells.map((cell) => [cell.code.n, cell.code]))

  // Odvozený název se na řešení netiskne jako nadpis: zněl by
  // „POKLAD JE U BAZÉNU — řešení" a hned pod ním by stálo totéž ještě jednou.
  const title = sheet.titleDerived ? null : solutionTitle(sheet)

  const columns = coord
    ? ['Č.', 'Příklad', 'Výsledek', 'Řádek / sloupec', 'Písmeno']
    : ['Č.', 'Příklad', 'Výsledek', 'Písmeno']

  const rows = sheet.slots.map((slot, index) => {
    const token = tokenByCode.get(slot.code)
    const letter = letterByCode.get(slot.code) ?? '?'
    const cells = [`${index + 1}.`, slot.task.prompt.text, String(slot.task.value)]
    if (coord) {
      cells.push(token?.kind === 'coord' ? `${token.row}. řádek, ${token.col}. sloupec` : '—')
    }
    cells.push(letter)
    return cells
  })

  return [
    { kind: 'heading', level: 1, text: title === null ? 'Řešení' : `${title} — řešení` },
    { kind: 'callout', text: sheet.message.original },
    { kind: 'heading', level: 2, text: 'Tajenka po písmenech' },
    {
      kind: 'answer-row',
      wordLengths: sheet.message.wordLengths,
      letters: sheet.slots.map((slot) => letterByCode.get(slot.code) ?? '?'),
    },
    { kind: 'heading', level: 2, text: 'Výsledky příkladů' },
    { kind: 'table', columns, rows },
  ]
}

export function cipherGridDocument(sheet: CipherGridSheet): DocumentModel {
  return {
    pages: [
      { label: 'Pracovní list', blocks: worksheetPage(sheet) },
      { label: 'Řešení', blocks: solutionPage(sheet) },
    ],
  }
}
