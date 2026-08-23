/**
 * Zámek na rozestup řádků v seznamu úloh.
 *
 * Míra je naměřená tiskem, ne odhadnutá: dvacet řad se šestimilimetrovou
 * mezerou se na stránku ještě vejde, jednadvacátá už ne. Layout se v `node`
 * prostředí měřit nedá, takže se hlídá to, co o něm rozhoduje — třída.
 */

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DocumentView } from './index.js'
import type { DocumentModel } from '../../core/document/index.js'

function sheet(
  count: number,
  showEquals: boolean,
  columns: 1 | 2 = 1,
  kind: 'expr' | 'sequence' | 'equation' = showEquals ? 'expr' : 'sequence',
): string {
  const model: DocumentModel = {
    pages: [
      {
        label: 'Pracovní list',
        blocks: [
          {
            kind: 'task-list',
            columns,
            items: Array.from({ length: count }, (_, index) => ({
              text: `${index} 2 4 ? 8`,
              showEquals,
              kind,
            })),
          },
        ],
      },
    ],
  }
  return renderToStaticMarkup(<DocumentView document={model} />)
}

describe('rozestup řádků v seznamu úloh', () => {
  it('krátký list řad dostane vzduch mezi řádky', () => {
    expect(sheet(12, false)).toContain('task-list--roomy')
  })

  it('na hranici dvaceti ještě ano, nad ní ne', () => {
    expect(sheet(20, false)).toContain('task-list--roomy')
    expect(sheet(21, false)).not.toContain('task-list--roomy')
  })

  it('šifra vzduch nedostane, i když má úloh málo', () => {
    // Pod seznamem jí stojí tabulka a rámečky na tajenku; ty se při první
    // milimetrové změně sesypou na druhý list.
    expect(sheet(12, true)).not.toContain('task-list--roomy')
  })

  it('rovnice vzduch nedostane — je to seznam příkladů, ne řad', () => {
    // Rovnice taky nemá rovnítko od sazby, ale řádek si nevyžádá: `? + 15 = 40`
    // je krátké a na listu jich bývá tolik co příkladů.
    expect(sheet(12, false, 1, 'equation')).not.toContain('task-list--roomy')
  })

  it('rozestupy členů dostane jen řada, ne rovnice', () => {
    // `3 · ? = 84` se s rozestupy řady rozpadne na čtyři kusy.
    expect(sheet(12, false, 1, 'sequence')).toContain('task-list__item--sequence')
    expect(sheet(12, false, 1, 'equation')).not.toContain('task-list__item--sequence')
  })

  it('dvousloupcová sazba vzduch nedostane', () => {
    // Ve dvou sloupcích není co vyplňovat — místo zbývá vedle, ne pod.
    expect(sheet(12, false, 2)).not.toContain('task-list--roomy')
  })
})
