/**
 * Bingo jako `DocumentModel`: stránky karet a k nim list pro učitele.
 *
 * Papír je zděděný po pexesu a dominu — mřížka, střihové linky i kontrolní
 * úsečka jsou tytéž. Nová je jen mřížka UVNITŘ karty, a tu řeší renderer
 * podle tvaru `CardFace`.
 */

import { BINGO_SIDE } from '../../core/constraints/index.js'
import { chunkCards, planCardLayout } from '../../core/document/cards.js'
import type { DocumentBlock, DocumentModel, DocumentPage } from '../../core/document/index.js'
import { worksheetTitle, type BingoSheet } from './index.js'

/**
 * Rozměr karty.
 *
 * ⚠ Návrh počítal s 88 mm a bylo to špatně — na stránku se pak vejdou jen
 *   čtyři karty (2 × 2 = 176 mm z 253 mm) a **třetina každé stránky zůstane
 *   prázdná**. Ukázal to až náhled. 82 mm dá tři řady, tedy šest karet na
 *   stránku, a dvanáct karet se vejde na dva listy místo tří.
 *
 * Políčko vychází na 19,5 mm. Pořád se do něj vejde i čtyřciferné číslo z osmé
 * třídy a pořád se do něj dá **škrtnout tužkou** tak, aby to bylo vidět —
 * a bingo je z celé Šifromatiky nejdražší na papír, takže ušetřená třetina
 * váží víc než ty dva a půl milimetru.
 */
export const CARD_SIDE_MM = 82

/** Délka kontrolní úsečky. Kulaté číslo, které se dobře měří pravítkem. */
const SCALE_CHECK_MM = 100

const INSTRUCTIONS =
  'Karty rozstříhej podle linek — vedou přes celý list, takže stačí pár rovných řezů.' +
  ' Tenké linky uvnitř karty se NESTŘÍHAJÍ. Každé dítě dostane jednu kartu; každá je jiná.' +
  ' Čti příklady ze seznamu níž, jeden po druhém, a odškrtávej si je. Dítě spočítá výsledek' +
  ' a najde ho na své kartě. Kdo má celý řádek, sloupec nebo úhlopříčku, volá bingo.' +
  ' Na delší hru se dá hrát na plnou kartu.'

function cardPages(sheet: BingoSheet): DocumentPage[] {
  const layout = planCardLayout({ cardWidthMm: CARD_SIDE_MM, cardHeightMm: CARD_SIDE_MM })
  if (layout === null) {
    // Nestane se při dnešních rozměrech; kdyby karta přerostla papír, je lepší
    // vytisknout prázdno než mlčky zmenšit to, co dítě dostane do ruky.
    return []
  }

  return chunkCards(sheet.cards, layout.perPage).map((cards, index, all) => ({
    label: all.length === 1 ? 'Karty' : `Karty ${index + 1}/${all.length}`,
    blocks: [
      {
        kind: 'card-grid',
        cards: cards.map((card) => ({ grid: card })),
        columns: layout.columns,
        cardWidthMm: CARD_SIDE_MM,
        cardHeightMm: CARD_SIDE_MM,
      },
      // Patička s kontrolní úsečkou je na KAŽDÉ stránce karet — měřítko se může
      // mezi stránkami lišit, když se tisknou na dvakrát.
      { kind: 'print-scale-check', lengthMm: SCALE_CHECK_MM },
    ],
  }))
}

function teacherPage(sheet: BingoSheet): DocumentBlock[] {
  return [
    // Závorka, ne další pomlčka: název už jednu obsahuje („Bingo — 5. třída")
    // a „Bingo — 5. třída — pro učitele" se čte špatně.
    { kind: 'heading', level: 1, text: `${worksheetTitle(sheet)} (pro učitele)` },
    { kind: 'paragraph', runs: [{ text: INSTRUCTIONS }] },
    { kind: 'heading', level: 2, text: 'Co vyvolávat' },
    {
      kind: 'paragraph',
      runs: [
        {
          text: `Čti v tomhle pořadí — je zamíchané schválně. Kdyby čísla šla od nejmenšího, děti by škrtaly odshora dolů a nic by nepočítaly. Výsledek je tu jen pro tebe; nahlas se čte příklad.`,
        },
      ],
    },
    {
      kind: 'table',
      columns: ['Č.', 'Příklad', 'Výsledek'],
      rows: sheet.tasks.map((task, index) => [
        `${index + 1}.`,
        task.prompt.text,
        String(task.value),
      ]),
    },
  ]
}

export function bingoDocument(sheet: BingoSheet): DocumentModel {
  // Mřížka karty je čtvercová; kdyby se `BINGO_SIDE` někdy změnilo, změní se
  // s ním sazba i tenhle rozměr. Odkaz je tu proto, aby to bylo vidět.
  void BINGO_SIDE

  return {
    pages: [...cardPages(sheet), { label: 'Pro učitele', blocks: teacherPage(sheet) }],
  }
}
