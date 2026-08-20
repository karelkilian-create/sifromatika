/**
 * Domino jako `DocumentModel`: stránky kamenů a k nim učitelský list.
 *
 * Papír je zděděný po pexesu — mřížka i střihové linky jsou tytéž.
 * Nový je jen tvar kamene a dělicí čára uprostřed, a obojí řeší
 * renderer podle tvaru `CardFace`. Stránkování si počítá aktivita a vydává
 * jeden `card-grid` na stránku; viz komentář v `core/document/cards.ts`.
 */

import { chunkCards, planCardLayout } from '../../core/document/cards.js'
import type { DocumentBlock, DocumentModel, DocumentPage } from '../../core/document/index.js'
import { worksheetTitle, type DominoSheet } from './index.js'

/**
 * Rozměr kamene.
 *
 * Obdélník 2 : 1, tedy dvě čtvercové půlky po 42 mm. Dvanáct kamenů je pak
 * přesně jeden list A4 — učitel zkopíruje jednu stránku na skupinu a je hotov.
 *
 * Půlka je menší než pexesová kartička (60 mm) a je to jediné číslo, které má
 * ověřit zkušební tisk. Kdyby bylo těsné, je záloha 90 × 45 mm za cenu dvou
 * stránek na dvanáct kamenů.
 */
export const TILE_WIDTH_MM = 84
export const TILE_HEIGHT_MM = 42

const INSTRUCTIONS =
  'Kameny rozstříhej podle linek — vedou přes celý list, takže stačí pár rovných řezů.' +
  ' Tenká čára uprostřed kamene se NESTŘÍHÁ, jen odděluje jeho půlky.' +
  ' Pak kameny zamíchej a rozdej. Skládají se za sebe tak, aby na sebe navazovaly:' +
  ' k zadání se přiloží kámen s jeho výsledkem. Začít se dá kterýmkoli kamenem —' +
  ' řetěz se uzavírá do kruhu, takže se dítě vrátí tam, kde začalo. Když se kruh' +
  ' nezavře, ukazuje to na místo, kde se to zlomilo.'

function tilePages(sheet: DominoSheet): DocumentPage[] {
  const layout = planCardLayout({ cardWidthMm: TILE_WIDTH_MM, cardHeightMm: TILE_HEIGHT_MM })
  if (layout === null) {
    // Nestane se při dnešních rozměrech; kdyby kámen přerostl papír, je lepší
    // vytisknout prázdno než mlčky zmenšit to, co dítě dostane do ruky.
    return []
  }

  return chunkCards(sheet.tiles, layout.perPage).map((tiles, index, all) => ({
    label: all.length === 1 ? 'Kameny' : `Kameny ${index + 1}/${all.length}`,
    blocks: [
      {
        kind: 'card-grid',
        // Dvě půlky, ne jeden text — o dělicí čáře rozhodne renderer podle
        // tvaru. Že je vlevo výsledek a vpravo zadání, je pravidlo domina.
        cards: tiles.map((tile) => ({ left: tile.left, right: tile.right })),
        columns: layout.columns,
        cardWidthMm: TILE_WIDTH_MM,
        cardHeightMm: TILE_HEIGHT_MM,
      },
    ],
  }))
}

function teacherPage(sheet: DominoSheet): DocumentBlock[] {
  // Kameny v pořadí kruhu, ne v pořadí tisku. Právě tohle je to, co učitel
  // nemá jak zjistit z papíru: rozstříhané kameny jsou zamíchané schválně.
  const chain = [...sheet.tiles].sort((a, b) => a.chainIndex - b.chainIndex)

  return [
    // Závorka, ne další pomlčka: název už jednu obsahuje („Domino — 7. třída")
    // a „Domino — 7. třída — pro učitele" se čte špatně.
    { kind: 'heading', level: 1, text: `${worksheetTitle(sheet)} (pro učitele)` },
    { kind: 'paragraph', runs: [{ text: INSTRUCTIONS }] },
    { kind: 'heading', level: 2, text: 'Správné pořadí' },
    {
      kind: 'paragraph',
      runs: [
        {
          text: `Kameny jdou po sobě takto a poslední navazuje zpátky na první. Zkontrolovat to jde i bez skládání — výsledek v každém řádku je zadáním v řádku následujícím.`,
        },
      ],
    },
    {
      kind: 'table',
      columns: ['Č.', 'Výsledek', 'Zadání'],
      rows: chain.map((tile, index) => [`${index + 1}.`, tile.left, tile.right]),
    },
  ]
}

export function dominoDocument(sheet: DominoSheet): DocumentModel {
  return {
    pages: [...tilePages(sheet), { label: 'Pro učitele', blocks: teacherPage(sheet) }],
  }
}
