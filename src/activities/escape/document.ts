/**
 * Úniková hra jako `DocumentModel` — to, co se tiskne (docs/navrh-unikova-hra.md §7).
 *
 * Pořadí stránek je pořadí balíčků: stanoviště skupina po skupině, aby šly
 * listy rozdat tak, jak vylezou z tiskárny. Přehled pro učitele je poslední.
 *
 * Karta skupiny tu byla do 4. 10. 2026 a Karel ji zrušil: úvod čte tabule,
 * barvu nese nadpis stanoviště a rámečky na slova opakovaly ty pod tabulkou.
 * Zbyl z ní jen pokyn, kdy jít k tabuli, a ten je na každém stanovišti.
 *
 * ⚠ Na listu stanoviště NIC nevyznačuje, které písmeno se bude počítat.
 *   Kdyby bylo, děti spočítají jen ten jeden příklad (§2). Písmena pro
 *   tabuli jsou jen v přehledu pro učitele.
 *
 * ⚠ Název příběhu ani název hry se na papír pro děti nedostane — „Poklad"
 *   prozrazuje krátkou tajenku (docs/unikova-hra-poklad.md, Rozhodnuto).
 */

import type { DocumentBlock, DocumentModel, DocumentPage } from '../../core/document/index.js'
import { formatValue } from '../../core/number/index.js'
import type { EscapeSheet, EscapeStation } from './index.js'

const INSTRUCTIONS =
  ' Výsledek je souřadnice políčka: první číslice je řádek a druhá sloupec.' +
  ' Písmeno z políčka zapiš do rámečku se stejným číslem, jaké má příklad.'

function stationHeading(sheet: EscapeSheet, station: EscapeStation): string {
  if (sheet.config.payload.mode === 'class') {
    return `Stanoviště ${station.numberInGroup}`
  }
  const group = sheet.groups[station.group]!
  return `Skupina ${group.name} · stanoviště ${station.numberInGroup} z ${group.stations.length}`
}

/** Úloha tak, jak ji vysází seznam: rovnítko dopisuje sazba jen výrazu. */
function taskItem(slot: EscapeStation['slots'][number]) {
  return {
    text: slot.task.prompt.text,
    showEquals: slot.task.prompt.kind === 'expr',
    kind: slot.task.prompt.kind,
  }
}

/** Šifra: tabulka a pod ní příklady. */
function gridBlocks(station: EscapeStation & { table: NonNullable<EscapeStation['table']> }): DocumentBlock[] {
  return [
    { kind: 'paragraph', runs: [{ text: 'Vypočítej příklady.' }, { text: INSTRUCTIONS }] },
    { kind: 'cipher-table', caption: 'Šifrovací tabulka', table: station.table, coordinates: true },
    { kind: 'heading', level: 2, text: 'Příklady' },
    { kind: 'task-list', columns: 2, items: station.slots.map(taskItem) },
  ]
}

/** Výběr odpovědí: příklady, každý se třemi výsledky s písmeny. */
function choiceBlocks(station: EscapeStation): DocumentBlock[] {
  return [
    {
      kind: 'paragraph',
      runs: [
        { text: 'Vypočítej příklad a ' },
        { text: 'zakroužkuj správný výsledek', strong: true },
        { text: '. Písmeno u něj napiš do rámečku se stejným číslem, jaké má příklad.' },
      ],
    },
    {
      kind: 'choice-list',
      items: station.slots.map((slot) => ({
        ...taskItem(slot),
        options: slot.options.map((option) => ({ letter: option.letter, text: formatValue(option.value) })),
      })),
    },
  ]
}

function stationPage(sheet: EscapeSheet, station: EscapeStation): DocumentPage {
  const blocks: DocumentBlock[] = [
    { kind: 'heading', level: 1, text: stationHeading(sheet, station) },
    { kind: 'paragraph', runs: [{ text: station.word.story.sheet, strong: true }] },
    ...(station.table === null ? choiceBlocks(station) : gridBlocks({ ...station, table: station.table })),
    { kind: 'heading', level: 2, text: 'Vyšlo vám slovo' },
    { kind: 'answer-row', wordLengths: [station.word.letters.length] },
  ]
  if (sheet.config.payload.mode === 'groups') blocks.push(boardNote(sheet, station))
  return { label: stationHeading(sheet, station), blocks }
}

/** Ve skupinách: kdy a s čím jít k tabuli. V „celé třídě" to řídí tabule. */
function boardNote(sheet: EscapeSheet, station: EscapeStation): DocumentBlock {
  const group = sheet.groups[station.group]!
  const count = group.stations.length
  return {
    kind: 'paragraph',
    runs: [
      { text: 'Až bude mít vaše skupina ' },
      // Skupina má jedno až čtyři stanoviště (nejdelší hra na dvě skupiny).
      { text: count === 1 ? 'tohle slovo' : count === 2 ? 'obě slova' : `všechna ${count} slova`, strong: true },
      {
        text:
          `, jděte k tabuli, vyberte barvu skupiny (${group.name.toLowerCase()})` +
          ` a ${count === 1 ? 'slovo' : 'slova'} zadejte.`,
      },
    ],
  }
}

function overviewPage(sheet: EscapeSheet): DocumentPage {
  const groups = sheet.config.payload.mode === 'groups'
  const pickList = (station: EscapeStation) => station.picks.join(', ')

  const overviewColumns = groups
    ? ['Skupina', 'Stanoviště', 'Slovo', 'Tabule bere']
    : ['Stanoviště', 'Slovo', 'Tabule bere']
  const overviewRows = sheet.stations.map((station) => {
    const cells = [String(station.numberInGroup), station.word.story.word, pickList(station)]
    return groups ? [sheet.groups[station.group]!.name, ...cells] : cells
  })

  const solutionRows = sheet.stations.flatMap((station) => {
    // Písmeno správné odpovědi: u tabulky z políčka, u výběru z odpovědí
    // TÉHOŽ příkladu — špatná odpověď jednoho může mít hodnotu správné
    // odpovědi jiného, takže hledat přes celé stanoviště nejde.
    const letterByCode = new Map(station.table?.cells.map((cell) => [cell.code.n, cell.letter] as const) ?? [])
    const letterOf = (slot: EscapeStation['slots'][number]) =>
      station.table === null
        ? slot.options.find((option) => option.value === slot.task.value)?.letter
        : letterByCode.get(slot.code)
    const label = groups
      ? `${sheet.groups[station.group]!.name} ${station.numberInGroup}`
      : String(station.numberInGroup)
    return station.slots.map((slot, index) => [
      index === 0 ? label : '',
      slot.task.prompt.text,
      String(slot.task.value),
      letterOf(slot) ?? '?',
    ])
  })

  const steps = groups
    ? '1. Každé skupině dejte listy jejích stanovišť. ' +
      '2. Na počítači u tabule klikněte na „Spustit zámek" a přečtěte úvod. ' +
      '3. Skupina, která má všechna slova, jde k tabuli, vybere svou barvu a slova zadá. ' +
      '4. Písmena tajenky tabule ukáže, až budou mít slova všechny skupiny. ' +
      '5. Zasekne-li se hra, tlačítko v rohu tabule umí uznat slovo bez zadání.'
    : '1. Každému dítěti nebo dvojici dejte listy stanovišť. ' +
      '2. Na počítači u tabule klikněte na „Spustit zámek" a přečtěte úvod. ' +
      '3. Všichni řeší stanoviště 1; slovo zadá na tabuli jeden za třídu. ' +
      '4. Tabule přidá písmena do tajenky a řekne, ať otočíte na další stanoviště. ' +
      '5. Zasekne-li se hra, tlačítko v rohu tabule umí uznat slovo bez zadání.'

  return {
    label: 'Přehled pro učitele',
    blocks: [
      { kind: 'heading', level: 1, text: `${sheet.title} — přehled pro učitele` },
      { kind: 'callout', text: sheet.message.original },
      { kind: 'paragraph', runs: [{ text: steps }] },
      {
        kind: 'paragraph',
        runs: [
          {
            text:
              'Bez obrazovky, kterou vidí celá třída, se dá hrát jen napůl: slova zkontrolujete' +
              ' podle tabulky níž a písmena tajenky dopíšete na tabuli sami.',
          },
        ],
      },
      { kind: 'heading', level: 2, text: 'Slova a písmena do tajenky' },
      { kind: 'table', columns: overviewColumns, rows: overviewRows },
      { kind: 'heading', level: 2, text: 'Řešení stanovišť' },
      { kind: 'table', columns: ['Stanoviště', 'Příklad', 'Výsledek', 'Písmeno'], rows: solutionRows },
    ],
  }
}

export function escapeDocument(sheet: EscapeSheet): DocumentModel {
  const pages: DocumentPage[] = []
  sheet.groups.forEach((group) => {
    for (const index of group.stations) pages.push(stationPage(sheet, sheet.stations[index]!))
  })
  pages.push(overviewPage(sheet))
  return { pages }
}
