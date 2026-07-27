/**
 * Aktivita „šifrovací mřížka" — složení vrstvy šifer a vrstvy úloh.
 *
 * Tenhle modul je jediné místo, které ví o obojím. Šifra i generátory úloh
 * o sobě navzájem nevědí; propojuje je až tady seznam cílových hodnot.
 *
 * Vrací DATA, ne JSX. Díky tomu půjde v 0.3 vložit doprostřed `DocumentModel`
 * bez zásahu do generátoru (docs/rozsah-0.1.md §3.2).
 */

import { hashString } from '../../core/checksum/index.js'
import { gradeProfile } from '../../core/constraints/index.js'
import type {
  CipherTable,
  Grade,
  ProjectConfig,
  RelaxationLog,
  Task,
  VerificationReport,
} from '../../core/model/index.js'
import { createRng } from '../../core/rng/index.js'
import { normalizeMessage, plainLetters, type NormalizedMessage } from '../../core/text/index.js'
import { verifySheet } from '../../core/verify/index.js'
import { cipherScheme } from '../../ciphers/registry.js'
import { buildGrid } from '../../ciphers/grid/index.js'
import { taskGenerators } from '../../tasks/registry.js'
import { APP_VERSION, GENERATOR_VERSION } from '../../version.js'

export interface CipherGridSlot {
  /** Číslo buňky, kam výsledek ukazuje. */
  code: number
  task: Task
}

export interface CipherGridSheet {
  config: ProjectConfig
  message: NormalizedMessage
  table: CipherTable
  slots: CipherGridSlot[]
  /** Název aktivity — buď od učitele, nebo odvozený z tajenky. */
  title: string
  /** `true`, když název vznikl z tajenky. Pak se na žákovský list nesmí nikdy dostat. */
  titleDerived: boolean
  relaxations: RelaxationLog[]
  verification: VerificationReport
}

export type CipherGridOutcome =
  | { ok: true; sheet: CipherGridSheet }
  | { ok: false; reason: string; relaxations: RelaxationLog[] }

/** Výchozí konfigurace: učitel zadá tajenku a ročník, zbytek se odvodí. */
export function defaultConfig(message: string, grade: Grade, seed: string): ProjectConfig {
  return {
    schemaVersion: 1,
    generatorVersion: GENERATOR_VERSION,
    appVersion: APP_VERSION,
    activity: 'cipher-grid',
    seed,
    locale: 'cs',
    payload: {
      message,
      difficulty: gradeProfile(grade),
      taskMix: { add: 1, sub: 1, mul: 1, div: 1 },
      cipher: {
        strategy: 'grid-coord',
        distinctCellPerOccurrence: true,
        decoyDensity: 0.35,
      },
      output: {
        includeSolution: true,
        paper: 'A4',
        columns: 2,
        printTitleOnWorksheet: false,
      },
    },
  }
}

const MAX_ATTEMPTS = 6

/**
 * Vygeneruje list. Při selhání verifikace to zkusí znovu s odvozeným seedem —
 * teprve po vyčerpání pokusů to vzdá. Neověřený list se ven nikdy nedostane.
 */
export function generateCipherGrid(config: ProjectConfig): CipherGridOutcome {
  let lastReason = 'Neznámá chyba generování.'
  let lastRelaxations: RelaxationLog[] = []

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const attemptConfig: ProjectConfig =
      attempt === 0 ? config : { ...config, seed: `${config.seed}#${attempt}` }
    const outcome = generateOnce(attemptConfig)

    if (!outcome.ok) {
      lastReason = outcome.reason
      lastRelaxations = outcome.relaxations
      continue
    }
    if (outcome.sheet.verification.ok) return outcome

    // Verifikace neprošla — nejde o očekávaný stav, ale o pojistku.
    // Zkusíme jiný seed místo toho, abychom učiteli podstrčili rozbitý list.
    lastReason = outcome.sheet.verification.ok
      ? lastReason
      : outcome.sheet.verification.failures.map((failure) => failure.message).join(' ')
    lastRelaxations = outcome.sheet.relaxations
  }

  return { ok: false, reason: lastReason, relaxations: lastRelaxations }
}

function generateOnce(config: ProjectConfig): CipherGridOutcome {
  const rng = createRng(`${config.generatorVersion}|${config.seed}`)
  const payload = config.payload
  const message = normalizeMessage(payload.message)
  const relaxations: RelaxationLog[] = []

  if (message.dropped.length > 0) {
    relaxations.push({
      level: 'notice',
      code: 'dropped-characters',
      message: `Znaky ${message.dropped.join(' ')} nelze do tajenky zašifrovat, byly vynechány.`,
    })
  }

  const generators = taskGenerators.filter((generator) => generator.supports(payload.difficulty))
  if (generators.length === 0) {
    return { ok: false, reason: 'Pro tuto obtížnost není k dispozici žádný generátor úloh.', relaxations }
  }

  // Obor hodnot, které vrstva úloh umí vyrobit. Tohle je celé, co se šifra
  // o matematice dozví — a co určí velikost mřížky.
  const reachable = new Set<number>()
  for (const generator of generators) {
    for (const value of generator.reachableValues(payload.difficulty, payload.taskMix)) {
      reachable.add(value)
    }
  }

  const cipher = buildGrid(
    {
      message,
      reachable,
      decoyDensity: payload.cipher.decoyDensity,
      distinctCellPerOccurrence: payload.cipher.distinctCellPerOccurrence,
      gridOverride: payload.cipher.grid,
    },
    rng,
    cipherScheme(payload.cipher.strategy),
  )
  relaxations.push(...cipher.relaxations)
  if (!cipher.ok) return { ok: false, reason: cipher.reason, relaxations }

  const usedExpressions = new Set<string>()
  const slots: CipherGridSlot[] = []

  for (const code of cipher.artifact.requiredValues) {
    const context = { profile: payload.difficulty, mix: payload.taskMix, usedExpressions }
    let task = pickGenerator(generators, rng).generateForValue(code, context, rng)

    // Nepovedlo se kvůli kolizi s už použitým výrazem? Zkusíme ostatní
    // generátory, a teprve pak povolíme opakování — opakovaný příklad je
    // horší list, ale žádný list je horší než to.
    if (task === null) {
      for (const generator of generators) {
        task = generator.generateForValue(code, context, rng)
        if (task !== null) break
      }
    }
    if (task === null) {
      const relaxed = { profile: payload.difficulty, mix: payload.taskMix, usedExpressions: new Set<string>() }
      task = pickGenerator(generators, rng).generateForValue(code, relaxed, rng)
      if (task !== null) {
        relaxations.push({
          level: 'silent',
          code: 'duplicate-expression',
          message: `Pro výsledek ${code} se opakuje již použitý příklad.`,
        })
      }
    }
    if (task === null) {
      return { ok: false, reason: `Pro výsledek ${code} nelze v této obtížnosti vytvořit příklad.`, relaxations }
    }
    slots.push({ code, task })
  }

  const derivedTitle = deriveTitle(payload.message)
  const titleDerived = config.title === undefined || config.title.trim() === ''

  const verification = verifySheet({
    table: cipher.artifact.table,
    slots: slots.map((slot) => ({
      taskText: slot.task.prompt.text,
      declaredValue: slot.task.value,
    })),
    expectedMessage: plainLetters(message),
  })

  return {
    ok: true,
    sheet: {
      config,
      message,
      table: cipher.artifact.table,
      slots,
      title: titleDerived ? derivedTitle : config.title!.trim(),
      titleDerived,
      relaxations,
      verification,
    },
  }
}

function pickGenerator(generators: readonly (typeof taskGenerators)[number][], rng: ReturnType<typeof createRng>) {
  return generators.length === 1 ? generators[0]! : rng.pick(generators)
}

/** Název odvozený z tajenky. Slouží jen ke správě souborů, na list se netiskne. */
function deriveTitle(message: string): string {
  const trimmed = message.trim().replace(/\s+/gu, ' ')
  if (trimmed.length === 0) return 'Bez názvu'
  return trimmed.length <= 30 ? trimmed : `${trimmed.slice(0, 30).trimEnd()}…`
}

/**
 * Název, který se smí vytisknout na ŽÁKOVSKÝ list.
 *
 * Odvozený název je vždy `null`: „Poklad u bazénu" nad listem s tajenkou
 * POKLAD JE U BAZÉNU by ji prozradil dřív, než dítě spočítá první příklad.
 * Viz docs/rozsah-0.1.md §3.6.
 */
export function worksheetTitle(sheet: CipherGridSheet): string | null {
  if (sheet.titleDerived) return null
  return sheet.config.payload.output.printTitleOnWorksheet ? sheet.title : null
}

/** Na řešení se název tiskne vždy — je určeno učiteli. */
export function solutionTitle(sheet: CipherGridSheet): string {
  return sheet.title
}

/**
 * Kontrolní součet listu pro `.sifra`.
 *
 * Zahrnuje všechno, co učitel uvidí na papíře: rozložení tabulky i znění
 * a pořadí příkladů. Nezahrnuje nic, co se netiskne — jinak by se soubory
 * hlásily jako změněné kvůli detailu, který nikoho nezajímá.
 */
export function sheetChecksum(sheet: CipherGridSheet): string {
  const table = sheet.table.cells.map((cell) => `${cell.code.n}:${cell.letter}`).join(',')
  const tasks = sheet.slots.map((slot) => `${slot.code}=${slot.task.prompt.text}`).join(',')
  return hashString(`${sheet.table.rows}x${sheet.table.cols}|${table}|${tasks}`)
}
