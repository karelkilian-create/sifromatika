/**
 * Náhled šifry: pracovní list a k němu list řešení.
 *
 * Odsud, a ne z `App.tsx` — shell nemá vědět, z čeho se skládá která aktivita.
 * JSX je v odděleném souboru schválně: pravidlo „generátor vrací data, ne JSX"
 * (docs/rozsah-0.1.md §3.2) tím zůstává v platnosti a `index.ts` ani jeho testy
 * o Reactu nevědí.
 *
 * V 0.3 tenhle soubor nahradí `toDocument(sheet): DocumentModel`. Shell se
 * přitom nedotkne — proto je náhled v kontraktu pole, ne import.
 */

import { SolutionView, WorksheetView } from '../../render/screen/index.js'
import { solutionTitle, worksheetTitle, type CipherGridSheet } from './index.js'

export function CipherGridView({ sheet }: { sheet: CipherGridSheet }) {
  return (
    <>
      <WorksheetView
        title={worksheetTitle(sheet)}
        table={sheet.table}
        slots={sheet.slots}
        wordLengths={sheet.message.wordLengths}
        columns={sheet.config.payload.output.columns}
      />
      <div className="print-page-break">
        <SolutionView
          // Odvozený název se na řešení netiskne jako nadpis: zněl by
          // „POKLAD JE U BAZÉNU — řešení" a hned pod ním by stálo totéž.
          title={sheet.titleDerived ? null : solutionTitle(sheet)}
          message={sheet.message.original}
          table={sheet.table}
          slots={sheet.slots}
          wordLengths={sheet.message.wordLengths}
        />
      </div>
    </>
  )
}
