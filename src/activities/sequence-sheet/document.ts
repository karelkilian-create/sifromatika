/**
 * List číselných řad jako `DocumentModel`: zadání a k němu řešení pro učitele.
 *
 * Zadání pro děti patří sem, ne do rendereru — je to vlastnost téhle aktivity.
 * Šifra žádné nemá, protože instrukce plynou z tabulky.
 */

import type { DocumentBlock, DocumentModel } from '../../core/document/index.js'
import { worksheetTitle, type SequenceSheet } from './index.js'

const INSTRUCTIONS =
  'U každé řady nejdřív zjisti, podle jakého pravidla čísla postupují. Potom doplň číslo, které patří místo otazníku.'

function worksheetPage(sheet: SequenceSheet): DocumentBlock[] {
  return [
    { kind: 'heading', level: 1, text: worksheetTitle(sheet) },
    { kind: 'paragraph', runs: [{ text: INSTRUCTIONS }] },
    {
      kind: 'task-list',
      columns: sheet.config.payload.output.columns,
      // Řada už otazník obsahuje — rovnítko za ní by bylo navíc.
      items: sheet.tasks.map((task) => ({ text: task.prompt.text, showEquals: false })),
    },
  ]
}

function solutionPage(sheet: SequenceSheet): DocumentBlock[] {
  return [
    { kind: 'heading', level: 1, text: `${worksheetTitle(sheet)} — řešení` },
    {
      kind: 'table',
      // Sloupec „Pravidlo" je tu kvůli opravování: z výsledku samotného se
      // nepozná, jestli dítě uvažovalo správně, nebo mělo štěstí.
      columns: ['Č.', 'Zadání', 'Výsledek', 'Pravidlo'],
      rows: sheet.tasks.map((task, index) => [
        `${index + 1}.`,
        task.prompt.text,
        String(task.value),
        task.solutionSteps[0]?.text ?? '—',
      ]),
    },
  ]
}

export function sequenceSheetDocument(sheet: SequenceSheet): DocumentModel {
  return {
    pages: [
      { label: 'Pracovní list', blocks: worksheetPage(sheet) },
      { label: 'Řešení', blocks: solutionPage(sheet) },
    ],
  }
}
