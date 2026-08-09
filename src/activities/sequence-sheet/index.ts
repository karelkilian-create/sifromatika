/**
 * Aktivita „list číselných řad".
 *
 * Nejjednodušší možná aktivita v projektu — a právě proto dobrý test toho, že
 * oddělení vrstev opravdu funguje. Nepřidává jediné pravidlo o matematice:
 * všechno umí `tasks/sequence`, tenhle modul jen vybere hodnoty a poskládá list.
 *
 * Proti šifře tu chybí tajenka, a s ní i mřížka, klamná písmena a rámečky na
 * odpovědi. Zbývá seznam úloh a k němu řešení pro učitele.
 *
 * Vrací DATA, ne JSX — stejně jako `cipher-grid`.
 */

import { hashString } from '../../core/checksum/index.js'
import { gradeProfile, TASK_COUNT_LIMITS } from '../../core/constraints/index.js'
import type {
  Grade,
  RelaxationLog,
  SequenceSheetProject,
  Task,
  VerificationReport,
} from '../../core/model/index.js'
import { createRng } from '../../core/rng/index.js'
import { verifyTasks } from '../../core/verify/index.js'
import { findTaskGenerator } from '../../tasks/registry.js'
import { APP_VERSION, GENERATOR_VERSION } from '../../version.js'

export interface SequenceSheet {
  config: SequenceSheetProject
  tasks: Task[]
  title: string
  /** `true`, když název nezadal učitel. Na rozdíl od šifry se tiskne i tak. */
  titleDerived: boolean
  relaxations: RelaxationLog[]
  verification: VerificationReport
}

export type SequenceSheetOutcome =
  | { ok: true; sheet: SequenceSheet }
  | { ok: false; reason: string; relaxations: RelaxationLog[] }

export function defaultSequenceSheetConfig(
  grade: Grade,
  seed: string,
  taskCount: number = TASK_COUNT_LIMITS.fallback,
): SequenceSheetProject {
  return {
    schemaVersion: 1,
    generatorVersion: GENERATOR_VERSION,
    appVersion: APP_VERSION,
    activity: 'sequence-sheet',
    seed,
    locale: 'cs',
    payload: {
      taskCount,
      difficulty: gradeProfile(grade),
      taskMix: { add: 1, sub: 1, mul: 1, div: 1 },
      output: {
        includeSolution: true,
        paper: 'A4',
        columns: 2,
        // Není co prozradit — list nemá tajenku, takže název patří i na něj.
        printTitleOnWorksheet: true,
      },
    },
  }
}

const MAX_ATTEMPTS = 6

/**
 * Vygeneruje list. Stejně jako u šifry platí, že neověřený list se ven
 * nedostane — raději se to zkusí s jiným seedem a pak se to vzdá.
 */
export function generateSequenceSheet(config: SequenceSheetProject): SequenceSheetOutcome {
  let last: SequenceSheetOutcome = {
    ok: false,
    reason: 'Neznámá chyba generování.',
    relaxations: [],
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const attemptConfig: SequenceSheetProject =
      attempt === 0 ? config : { ...config, seed: `${config.seed}#${attempt}` }
    const outcome = generateOnce(attemptConfig)

    if (outcome.ok && outcome.sheet.verification.ok) return outcome

    last = outcome.ok
      ? {
          ok: false,
          reason: outcome.sheet.verification.ok
            ? last.reason
            : outcome.sheet.verification.failures.map((failure) => failure.message).join(' '),
          relaxations: outcome.sheet.relaxations,
        }
      : outcome
  }
  return last
}

function generateOnce(config: SequenceSheetProject): SequenceSheetOutcome {
  const rng = createRng(`${config.generatorVersion}|${config.seed}`)
  const payload = config.payload
  const relaxations: RelaxationLog[] = []

  const generator = findTaskGenerator('sequence')
  if (generator === undefined || !generator.supports(payload.difficulty)) {
    return {
      ok: false,
      reason: 'V tomhle ročníku je obor čísel příliš malý na to, aby se do něj vešla číselná řada.',
      relaxations,
    }
  }

  // Hodnoty, které umí generátor řad vyrobit. Na rozdíl od šifry si je tady
  // nikdo nediktuje — list není na nic navázaný, takže se prostě vyberou.
  const pool = rng.shuffle([...generator.reachableValues(payload.difficulty, payload.taskMix)])
  if (pool.length === 0) {
    return {
      ok: false,
      reason: 'S vybranými operacemi nejde v tomhle ročníku sestavit žádná řada.',
      relaxations,
    }
  }

  const usedExpressions = new Set<string>()
  const tasks: Task[] = []

  for (const target of pool) {
    if (tasks.length >= payload.taskCount) break
    const task = generator.generateForValue(
      target,
      { profile: payload.difficulty, mix: payload.taskMix, usedExpressions },
      rng,
    )
    if (task !== null) tasks.push(task)
  }

  if (tasks.length === 0) {
    return {
      ok: false,
      reason: 'S vybranými operacemi nejde v tomhle ročníku sestavit žádná řada.',
      relaxations,
    }
  }
  if (tasks.length < payload.taskCount) {
    // Ústupek se hlásí: učitel si vyžádal počet úloh, a ten nedostal.
    relaxations.push({
      level: 'notice',
      code: 'fewer-tasks',
      message: `Podařilo se sestavit ${tasks.length} různých řad místo ${payload.taskCount}. Pomůže vyšší ročník nebo víc povolených operací.`,
    })
  }

  const titleDerived = config.title === undefined || config.title.trim() === ''

  return {
    ok: true,
    sheet: {
      config,
      tasks,
      title: titleDerived ? `Číselné řady — ${payload.difficulty.grade}. třída` : config.title!.trim(),
      titleDerived,
      relaxations,
      verification: verifyTasks(
        tasks.map((task) => ({
          taskText: task.prompt.text,
          declaredValue: task.value,
          kind: task.prompt.kind,
        })),
      ),
    },
  }
}

/**
 * Název pro žákovský list.
 *
 * Na rozdíl od šifry se vrací vždycky: list nemá tajenku, takže nadpis nemá
 * co prozradit. „Číselné řady — 4. třída" dítěti spíš pomůže.
 */
export function worksheetTitle(sheet: SequenceSheet): string {
  return sheet.title
}

export function solutionTitle(sheet: SequenceSheet): string {
  return sheet.title
}

/** Kontrolní součet listu pro `.sifra` — zahrnuje vše, co je na papíře. */
export function sheetChecksum(sheet: SequenceSheet): string {
  return hashString(sheet.tasks.map((task) => `${task.prompt.text}=${task.value}`).join(','))
}
