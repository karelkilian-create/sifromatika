/**
 * Co smí a nesmí být na žákovském listu.
 *
 * Dokud byl náhled JSX, dalo se tohle pravidlo držet jen komentářem v
 * `render/screen` a kázní při čtení diffu. `DocumentModel` je data, takže se
 * na stránku jde zeptat — a tenhle soubor se ptá.
 */

import { describe, expect, it } from 'vitest'
import type { DocumentBlock, DocumentPage } from '../../core/document/index.js'
import type { Grade } from '../../core/model/index.js'
import { cipherGridDocument } from './document.js'
import { defaultConfig, generateCipherGrid, type CipherGridSheet } from './index.js'

function build(message: string, grade: Grade, seed: string): CipherGridSheet {
  const outcome = generateCipherGrid(defaultConfig(message, grade, seed))
  if (!outcome.ok) throw new Error(outcome.reason)
  return outcome.sheet
}

/** Všechen text, který se ze stránky vytiskne. Bez tabulky šifry. */
function textOf(page: DocumentPage): string {
  return page.blocks.flatMap(textOfBlock).join(' ')
}

function textOfBlock(block: DocumentBlock): string[] {
  switch (block.kind) {
    case 'heading':
      return [block.text]
    case 'paragraph':
      return block.runs.map((run) => run.text)
    case 'callout':
      return [block.text]
    case 'task-list':
      return block.items.map((item) => item.text)
    case 'table':
      return block.rows.flatMap((row) => [...row])
    case 'answer-row':
      return [...(block.letters ?? [])]
    case 'cipher-table':
      // Tabulka na listu být musí — dítě z ní čte. Do porovnávání s tajenkou
      // se ale nepočítá: obsahuje všechna písmena včetně klamných.
      return []
    case 'card-grid':
      // Všechny podoby kartičky, ne jen ta pexesová: kdyby se sem dostal kámen
      // domina nebo bingo karta, hlídač úniku řešení by mlčky přeskočil kus
      // papíru.
      return block.cards.flatMap((card) => {
        if ('text' in card) return [card.text]
        if ('left' in card) return [card.left, card.right]
        return card.grid.flatMap((row) => [...row])
      })
  }
}

describe('žákovský list nesmí prozradit řešení', () => {
  const sheet = build('POKLAD JE U BAZÉNU', 4, 'dokument-1')
  const document = cipherGridDocument(sheet)
  const [worksheet, solution] = document.pages

  it('má právě dvě stránky: list a řešení', () => {
    expect(document.pages.map((page) => page.label)).toEqual(['Pracovní list', 'Řešení'])
  })

  it('rámečky na tajenku jsou na listu prázdné a na řešení vyplněné', () => {
    const onWorksheet = worksheet!.blocks.filter((block) => block.kind === 'answer-row')
    const onSolution = solution!.blocks.filter((block) => block.kind === 'answer-row')

    expect(onWorksheet.length).toBeGreaterThan(0)
    expect(onWorksheet.every((block) => block.letters === undefined)).toBe(true)
    expect(onSolution.every((block) => (block.letters?.length ?? 0) > 0)).toBe(true)
  })

  it('tajenka se na listu neobjeví, na řešení ano', () => {
    expect(textOf(worksheet!)).not.toContain('POKLAD')
    expect(textOf(solution!)).toContain('POKLAD JE U BAZÉNU')
  })

  it('výsledky příkladů jsou jen na řešení', () => {
    // Tabulka výsledků je jediný blok `table` v dokumentu. Kdyby ji někdo
    // omylem přidal i na list, dítě by nemuselo počítat vůbec.
    expect(worksheet!.blocks.some((block) => block.kind === 'table')).toBe(false)
    expect(solution!.blocks.some((block) => block.kind === 'table')).toBe(true)
  })

  it('zadání příkladů je na listu doslova to, co vygeneroval generátor', () => {
    const items = worksheet!.blocks.find((block) => block.kind === 'task-list')?.items ?? []
    expect(items.map((item) => item.text)).toEqual(sheet.slots.map((slot) => slot.task.prompt.text))
  })
})

describe('sazba se řídí obsahem, ne rendererem', () => {
  it('u souřadnicové šifry se čísla do buněk netisknou a zadání to vysvětluje', () => {
    const sheet = build('AHOJ', 3, 'dokument-coord')
    const [worksheet] = cipherGridDocument(sheet).pages
    const table = worksheet!.blocks.find((block) => block.kind === 'cipher-table')

    expect(table?.coordinates).toBe(true)
    expect(textOf(worksheet!)).toContain('první číslice je řádek')
  })

  it('u lineární šifry se čísla tisknou a zadání o souřadnicích mlčí', () => {
    const config = defaultConfig('AHOJ', 3, 'dokument-linear')
    config.payload.cipher.strategy = 'grid-linear'
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)

    const [worksheet] = cipherGridDocument(outcome.sheet).pages
    const table = worksheet!.blocks.find((block) => block.kind === 'cipher-table')

    expect(table?.coordinates).toBe(false)
    expect(textOf(worksheet!)).not.toContain('souřadnice')
  })

  it('číselná řada nedostane za otazník rovnítko', () => {
    const config = defaultConfig('TAJNA STEZKA', 4, 'golden-rady')
    config.payload.generatorMix = { arithmetic: 3, sequence: 1 }
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)

    const [worksheet] = cipherGridDocument(outcome.sheet).pages
    const items = worksheet!.blocks.find((block) => block.kind === 'task-list')?.items ?? []

    expect(items.some((item) => !item.showEquals)).toBe(true)
    outcome.sheet.slots.forEach((slot, index) => {
      expect(items[index]?.showEquals).toBe(slot.task.prompt.kind !== 'sequence')
    })
  })
})

describe('nadpis na žákovském listu', () => {
  it('odvozený z tajenky se na list nikdy nedostane', () => {
    const sheet = build('POKLAD JE U BAZÉNU', 4, 'dokument-nadpis')
    expect(sheet.titleDerived).toBe(true)

    const [worksheet, solution] = cipherGridDocument(sheet).pages
    expect(worksheet!.blocks.some((block) => block.kind === 'heading' && block.level === 1)).toBe(
      false,
    )
    // Na řešení taky ne jako nadpis — stálo by tam totéž dvakrát pod sebou.
    expect(solution!.blocks[0]).toEqual({ kind: 'heading', level: 1, text: 'Řešení' })
  })

  it('vlastní název se na list tiskne, když si to učitel přeje', () => {
    const config = defaultConfig('POKLAD JE U BAZÉNU', 4, 'dokument-vlastni')
    config.title = 'Šifra na pátek'
    config.payload.output.printTitleOnWorksheet = true
    const outcome = generateCipherGrid(config)
    if (!outcome.ok) throw new Error(outcome.reason)

    const [worksheet, solution] = cipherGridDocument(outcome.sheet).pages
    expect(worksheet!.blocks[0]).toEqual({ kind: 'heading', level: 1, text: 'Šifra na pátek' })
    expect(solution!.blocks[0]).toEqual({
      kind: 'heading',
      level: 1,
      text: 'Šifra na pátek — řešení',
    })
  })
})
