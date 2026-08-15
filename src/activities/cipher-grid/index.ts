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
import { gradeProfile, relaxation } from '../../core/constraints/index.js'
import { ALL_OPERATIONS } from '../../core/model/index.js'
import type {
  CipherGridProject,
  CipherTable,
  Grade,
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
  config: CipherGridProject
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
export function defaultConfig(message: string, grade: Grade, seed: string): CipherGridProject {
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
      // Číselné řady jsou ve výchozím stavu vypnuté. Zapnout je znamená změnit
      // obsah listu, což je rozhodnutí učitele — ne vedlejší efekt aktualizace.
      generatorMix: { arithmetic: 1 },
      cipher: {
        strategy: 'grid-coord',
        distinctCellPerOccurrence: true,
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
 * Kolik úloh musí připadnout na každou zaškrtnutou operaci, aby list nebyl
 * „chudý" — polovina spravedlivého podílu, nejméně však jedna.
 *
 * Při patnácti příkladech a čtyřech operacích vychází dvě. Zní to málo, ale
 * je to práh pro ZAHOZENÍ, ne cíl: rozprostření písmen po skupinách trefuje
 * podstatně víc a tenhle práh odchytává jen výstřelky. Přísnější mez by
 * u třeťáka zahodila skoro každý list, protože malá násobilka v oboru do sta
 * tolik různých výsledků nemá.
 */
function minimumPerOperation(taskCount: number, operationCount: number): number {
  return Math.max(1, Math.round(taskCount / operationCount / 2))
}

/**
 * O kolik úloh list nedosahuje na zvolený poměr operací. `0` = v pořádku.
 *
 * Počítá se z `didactic.operations`, ne z textu příkladu: `(24 − 8) · 2`
 * procvičuje odčítání i násobení a do obou se má počítat.
 */
function mixShortfall(sheet: CipherGridSheet): number {
  const mix = sheet.config.payload.taskMix
  const requested = ALL_OPERATIONS.filter((operation) => (mix[operation] ?? 0) > 0)
  const operations = requested.length > 0 ? requested : ALL_OPERATIONS
  const minimum = minimumPerOperation(sheet.slots.length, operations.length)

  let shortfall = 0
  for (const operation of operations) {
    const count = sheet.slots.filter((slot) =>
      slot.task.didactic.operations.includes(operation),
    ).length
    if (count < minimum) shortfall += minimum - count
  }
  return shortfall
}

/**
 * Vygeneruje list. Při selhání verifikace to zkusí znovu s odvozeným seedem —
 * teprve po vyčerpání pokusů to vzdá. Neověřený list se ven nikdy nedostane.
 *
 * Ověřený, ale chudý na některou zaškrtnutou operaci se taky zahazuje, jen
 * mírněji: schová se stranou a zkusí se jiný seed. Zhruba každý desátý list
 * pro třeťáka a čtvrťáka vycházel s jediným příkladem na násobení nebo dělení,
 * což učiteli, který si obojí zaškrtl, není co nabídnout. Po vyčerpání pokusů
 * se vrátí ten nejvyváženější — a řekne se to nahlas, protože §3.1 zakazuje
 * tiše měnit, co uživatel nastavil.
 */
export function generateCipherGrid(config: CipherGridProject): CipherGridOutcome {
  let lastReason = 'Neznámá chyba generování.'
  let lastRelaxations: RelaxationLog[] = []
  let best: { outcome: CipherGridOutcome & { ok: true }; shortfall: number } | null = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const attemptConfig: CipherGridProject =
      attempt === 0 ? config : { ...config, seed: `${config.seed}#${attempt}` }
    const outcome = generateOnce(attemptConfig)

    if (!outcome.ok) {
      lastReason = outcome.reason
      lastRelaxations = outcome.relaxations
      continue
    }

    if (outcome.sheet.verification.ok) {
      const shortfall = mixShortfall(outcome.sheet)
      if (shortfall === 0) return outcome
      if (best === null || shortfall < best.shortfall) best = { outcome, shortfall }
      continue
    }

    // Verifikace neprošla — nejde o očekávaný stav, ale o pojistku.
    // Zkusíme jiný seed místo toho, abychom učiteli podstrčili rozbitý list.
    lastReason = outcome.sheet.verification.failures.map((failure) => failure.message).join(' ')
    lastRelaxations = outcome.sheet.relaxations
  }

  if (best !== null) {
    best.outcome.sheet.relaxations.push(
      relaxation.notice(
        'operation-mix-thin',
        'Některá ze zvolených operací je na listu zastoupená jen málo — pro tenhle ročník' +
          ' není dost výsledků, které by šly vyrobit. Pomůže vyšší ročník nebo méně operací.',
      ),
    )
    return best.outcome
  }

  return { ok: false, reason: lastReason, relaxations: lastRelaxations }
}

function generateOnce(config: CipherGridProject): CipherGridOutcome {
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

  // Chybějící `generatorMix` = jen aritmetika. Bez tohohle defaultu by každý
  // nový generátor v registru přepsal výstup všech dřív uložených `.sifra`.
  const generatorMix = payload.generatorMix ?? { arithmetic: 1 }
  const generators = taskGenerators.filter(
    (generator) => generator.supports(payload.difficulty) && (generatorMix[generator.id] ?? 0) > 0,
  )
  if (generators.length === 0) {
    return { ok: false, reason: 'Pro tuto obtížnost není k dispozici žádný generátor úloh.', relaxations }
  }

  // Obor hodnot, které vrstva úloh umí vyrobit. Tohle je celé, co se šifra
  // o matematice dozví.
  const reachable = new Set<number>()
  for (const generator of generators) {
    for (const value of generator.reachableValues(payload.difficulty, payload.taskMix)) {
      reachable.add(value)
    }
  }

  // Totéž rozdělené po jednotlivých operacích. Šifra podle toho rozprostře
  // písmena, aby se na list dostalo i to, co jde vyrobit jen vzácně — viz
  // `GridRequest.reachablePools`.
  const chosenOperations = ALL_OPERATIONS.filter((operation) => (payload.taskMix[operation] ?? 0) > 0)
  const reachablePools = (chosenOperations.length > 0 ? chosenOperations : ALL_OPERATIONS).map(
    (operation) => {
      const pool = new Set<number>()
      for (const generator of generators) {
        for (const value of generator.reachableValues(payload.difficulty, { [operation]: 1 })) {
          pool.add(value)
        }
      }
      return pool
    },
  )

  const cipher = buildGrid(
    {
      message,
      reachable,
      reachablePools,
      distinctCellPerOccurrence: payload.cipher.distinctCellPerOccurrence,
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
    let task = pickGenerator(generators, generatorMix, rng).generateForValue(code, context, rng)

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
      // Poslední pokus se musí zeptat VŠECH generátorů, ne jednoho vylosovaného.
      // Každý umí jiný obor hodnot — 14 vyrobí aritmetika jako 2 · 7, ale
      // pětičlenná řada se s ním do malého oboru nevejde. Zeptat se jen řad
      // a pak to vzdát by zahodilo hotový list kvůli jediné úloze.
      const relaxed = { profile: payload.difficulty, mix: payload.taskMix, usedExpressions: new Set<string>() }
      for (const generator of generators) {
        task = generator.generateForValue(code, relaxed, rng)
        if (task !== null) break
      }
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
      kind: slot.task.prompt.kind,
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

/**
 * Který generátor dostane tuhle hodnotu.
 *
 * ⚠ Jediný generátor se vrací BEZ dotazu na `rng`. Není to optimalizace:
 *   kdyby se i v tom případě losovalo, posunula by se celá sekvence
 *   náhodných čísel a listy uložené před přidáním dalších generátorů by se
 *   vytiskly jinak.
 */
function pickGenerator(
  generators: readonly (typeof taskGenerators)[number][],
  weights: Readonly<Record<string, number>>,
  rng: ReturnType<typeof createRng>,
) {
  if (generators.length === 1) return generators[0]!
  return rng.weighted(generators.map((generator) => [generator, weights[generator.id] ?? 1] as const))
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
