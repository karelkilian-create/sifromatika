/**
 * Náhled listu číselných řad: zadání a k němu řešení pro učitele.
 *
 * Zadání pro děti patří sem, ne do shellu — je to vlastnost téhle aktivity.
 * Šifra žádné nemá, protože instrukce plynou z tabulky.
 */

import { TaskSheetView, TaskSolutionView } from '../../render/screen/index.js'
import { worksheetTitle, type SequenceSheet } from './index.js'

const INSTRUCTIONS =
  'U každé řady nejdřív zjisti, podle jakého pravidla čísla postupují. Potom doplň číslo, které patří místo otazníku.'

export function SequenceSheetView({ sheet }: { sheet: SequenceSheet }) {
  return (
    <>
      <TaskSheetView
        title={worksheetTitle(sheet)}
        instructions={INSTRUCTIONS}
        tasks={sheet.tasks}
        columns={sheet.config.payload.output.columns}
      />
      <div className="print-page-break">
        <TaskSolutionView title={worksheetTitle(sheet)} tasks={sheet.tasks} />
      </div>
    </>
  )
}
