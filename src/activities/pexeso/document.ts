/**
 * Pexeso jako `DocumentModel`: stránky kartiček a k nim seznam pro učitele.
 *
 * Stránkování si počítá aktivita a vydává jeden `card-grid` na stránku. Kdyby
 * si kartičky lámal renderer, vznikl by dokument, jehož stránky nesouhlasí
 * s papírem — viz komentář v `core/document/cards.ts`.
 */

import { chunkCards, planCardLayout } from '../../core/document/cards.js'
import type { DocumentBlock, DocumentModel, DocumentPage } from '../../core/document/index.js'
import { worksheetTitle, type PexesoSheet } from './index.js'

/**
 * Rozměr kartičky.
 *
 * Čtverec schválně: pexeso se hraje lícem dolů a obdélník by šlo otáčet dvěma
 * způsoby, což dětem přidává práci, která s matematikou nesouvisí. 60 mm se
 * dobře drží v dětské ruce a unese `(24 − 8) · 2` v čitelném stupni písma.
 */
export const CARD_WIDTH_MM = 60
export const CARD_HEIGHT_MM = 60

/** Délka kontrolní úsečky. Kulaté číslo, které se dobře měří pravítkem. */
const SCALE_CHECK_MM = 100

const INSTRUCTIONS =
  'Kartičky rozstříhej podle linek — vedou přes celý list, takže stačí pár rovných řezů.' +
  ' Pak je zamíchej a rozlož lícem dolů. Hráč otočí dvě: patří k sobě, když je na jedné' +
  ' příklad a na druhé jeho výsledek.'

function cardPages(sheet: PexesoSheet): DocumentPage[] {
  const layout = planCardLayout({ cardWidthMm: CARD_WIDTH_MM, cardHeightMm: CARD_HEIGHT_MM })
  if (layout === null) {
    // Nestane se při dnešních rozměrech; kdyby se kartička zvětšila nad papír,
    // je lepší vytisknout prázdno než mlčky zmenšit to, co dítě dostane do ruky.
    return []
  }

  return chunkCards(sheet.cards, layout.perPage).map((cards, index, all) => ({
    label: all.length === 1 ? 'Kartičky' : `Kartičky ${index + 1}/${all.length}`,
    blocks: [
      {
        kind: 'card-grid',
        cards: cards.map((card) => ({ text: card.text })),
        columns: layout.columns,
        cardWidthMm: CARD_WIDTH_MM,
        cardHeightMm: CARD_HEIGHT_MM,
      },
      // Patička s kontrolní úsečkou je na KAŽDÉ stránce kartiček — měřítko se
      // může mezi stránkami lišit, když se tisknou na dvakrát.
      { kind: 'print-scale-check', lengthMm: SCALE_CHECK_MM },
    ],
  }))
}

function teacherPage(sheet: PexesoSheet): DocumentBlock[] {
  return [
    // Závorka, ne další pomlčka: název už jednu obsahuje („Pexeso — 4. třída")
    // a „Pexeso — 4. třída — pro učitele" se čte špatně.
    { kind: 'heading', level: 1, text: `${worksheetTitle(sheet)} (pro učitele)` },
    { kind: 'paragraph', runs: [{ text: INSTRUCTIONS }] },
    { kind: 'heading', level: 2, text: 'Dvojice' },
    {
      kind: 'table',
      columns: ['Č.', 'Zadání', 'Výsledek'],
      rows: sheet.tasks.map((task, index) => [
        `${index + 1}.`,
        task.prompt.text,
        String(task.value),
      ]),
    },
  ]
}

export function pexesoDocument(sheet: PexesoSheet): DocumentModel {
  return {
    pages: [...cardPages(sheet), { label: 'Pro učitele', blocks: teacherPage(sheet) }],
  }
}
