/**
 * Aktivita „pexeso".
 *
 * Kartičky ve dvojicích: na jedné zadání (`7 · 8`), na druhé výsledek (`56`).
 * Dítě otáčí dvě a hledá, co k sobě patří.
 *
 * O matematice tenhle modul neví nic nového — všechno umí vrstva úloh. Přidává
 * jediné pravidlo, a to je pravidlo hry: **hodnoty musí být navzájem různé.**
 * Generátory dnes hlídají jen to, aby se neopakoval výraz (`usedExpressions`),
 * což u šifry stačí. U pexesa ne: kdyby na stole leželo `7 · 8` i `28 + 28`,
 * dítě spáruje `56` s tím druhým, bude mít pravdu a hra mu nevyjde.
 *
 * Vrací DATA, ne JSX — stejně jako ostatní aktivity.
 */

import { hashString } from '../../core/checksum/index.js'
import { PAIR_COUNT_LIMITS, gradeProfile } from '../../core/constraints/index.js'
import type {
  Grade,
  PexesoProject,
  RelaxationLog,
  Task,
  VerificationFailure,
  VerificationReport,
} from '../../core/model/index.js'
import { ALLOW_DECIMAL_RESULTS } from '../../core/model/index.js'
import { formatValue } from '../../core/number/index.js'
import { createRng } from '../../core/rng/index.js'
import {
  verifyDistinctValues,
  verifyTasks,
} from '../../core/verify/index.js'
import { pickGenerator } from '../../tasks/mix.js'
import { taskGenerators } from '../../tasks/registry.js'
import { APP_VERSION, GENERATOR_VERSION } from '../../version.js'

/**
 * Jedna kartička.
 *
 * `kind` je pro testy a diagnostiku, NIKOLI pro sazbu. Zadání a výsledek se
 * musí tisknout úplně stejně — kdyby šly rozeznat podle vzhledu, dítě by nikdy
 * neotočilo dvě zadání a hra by se scvrkla na půlku.
 */
export interface PexesoCard {
  text: string
  kind: 'prompt' | 'value'
  /** Index dvojice, ke které kartička patří. Dvě kartičky s týmž indexem se párují. */
  pairIndex: number
}

export interface PexesoSheet {
  config: PexesoProject
  /** Dvojice v původním pořadí — podklad pro učitelský seznam. */
  tasks: Task[]
  /** Kartičky v pořadí, ve kterém se vytisknou. Zamíchané. */
  cards: PexesoCard[]
  title: string
  titleDerived: boolean
  relaxations: RelaxationLog[]
  verification: VerificationReport
}

export type PexesoOutcome =
  | { ok: true; sheet: PexesoSheet }
  | { ok: false; reason: string; relaxations: RelaxationLog[] }

export function defaultPexesoConfig(
  grade: Grade,
  seed: string,
  pairCount: number = PAIR_COUNT_LIMITS.fallback,
): PexesoProject {
  return {
    schemaVersion: 1,
    generatorVersion: GENERATOR_VERSION,
    appVersion: APP_VERSION,
    activity: 'pexeso',
    seed,
    locale: 'cs',
    payload: {
      pairCount,
      difficulty: gradeProfile(grade),
      taskMix: { add: 1, sub: 1, mul: 1, div: 1 },
      generatorMix: { arithmetic: 1 },
      output: {
        includeSolution: true,
        paper: 'A4',
        columns: 1,
        // Kartičky nemají co prozradit — název patří na učitelský seznam.
        printTitleOnWorksheet: true,
      },
    },
  }
}

const MAX_ATTEMPTS = 6

export function generatePexeso(config: PexesoProject): PexesoOutcome {
  let last: PexesoOutcome = { ok: false, reason: 'Neznámá chyba generování.', relaxations: [] }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const attemptConfig: PexesoProject =
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

function generateOnce(config: PexesoProject): PexesoOutcome {
  const rng = createRng(`${config.generatorVersion}|${config.seed}`)
  const payload = config.payload
  const relaxations: RelaxationLog[] = []

  const generatorMix = payload.generatorMix ?? { arithmetic: 1 }
  const generators = taskGenerators.filter(
    (generator) => generator.supports(payload.difficulty) && (generatorMix[generator.id] ?? 0) > 0,
  )
  if (generators.length === 0) {
    return {
      ok: false,
      reason: 'Pro tuto obtížnost není k dispozici žádný generátor úloh.',
      relaxations,
    }
  }

  // Hodnoty, ze kterých se vybírá. Nikdo si je nediktuje — pexeso není na nic
  // navázané, na rozdíl od šifry, kde je určuje mřížka.
  //
  // ⚠ Zásoba se vede pro KAŽDÉ téma zvlášť a téma se losuje podle vah. Dřív se
  //   všechny hodnoty slily do jednoho pytle a losoval se z něj cíl — jenže
  //   aritmetika osmého ročníku jich nabízí přes deset tisíc a mocniny sto,
  //   takže zaškrtnutí mocnin vedle počítání se na kartičkách neprojevilo
  //   prakticky nikdy. Poměr témat nesmí záviset na tom, jak široký obor čísel
  //   který generátor náhodou pokrývá.
  const pools = new Map<string, number[]>()
  for (const generator of generators) {
    pools.set(
      generator.id,
      rng.shuffle([
        ...generator.reachableValues(payload.difficulty, payload.taskMix, ALLOW_DECIMAL_RESULTS),
      ]),
    )
  }

  const usedExpressions = new Set<string>()
  const tasks: Task[] = []
  // Klíčové místo celé aktivity: každá hodnota nejvýš jednou.
  const usedValues = new Set<number>()
  const context = {
    profile: payload.difficulty,
    mix: payload.taskMix,
    usedExpressions,
    rules: ALLOW_DECIMAL_RESULTS,
  }

  // Strop pokusů: každé kolo spotřebuje jednu hodnotu ze zásoby vylosovaného
  // tématu, takže bez něj by se cyklilo jen do vyčerpání — ale to je u velkých
  // oborů deset tisíc kol na dvanáct kartiček.
  const maxAttempts = payload.pairCount * 20
  for (let attempt = 0; tasks.length < payload.pairCount && attempt < maxAttempts; attempt++) {
    const available = generators.filter((generator) => (pools.get(generator.id)?.length ?? 0) > 0)
    if (available.length === 0) break

    const generator = pickGenerator(available, generatorMix, rng)
    const target = pools.get(generator.id)!.pop()!
    if (usedValues.has(target)) continue

    const task = generator.generateForValue(target, context, rng)
    if (task === null) continue

    tasks.push(task)
    usedValues.add(task.value)
  }

  if (tasks.length < PAIR_COUNT_LIMITS.min) {
    return {
      ok: false,
      reason:
        'S vybranými operacemi nejde v tomhle ročníku sestavit dost dvojic s různými výsledky.',
      relaxations,
    }
  }
  if (tasks.length < payload.pairCount) {
    // Ústupek se hlásí: učitel si vyžádal počet dvojic, a ten nedostal.
    relaxations.push({
      level: 'notice',
      code: 'fewer-pairs',
      message: `Místo ${payload.pairCount} dvojic se podařilo sestavit ${tasks.length} — pro tenhle ročník a výběr operací není dost různých výsledků.`,
    })
  }

  // ⚠ Míchá se TADY, při generování, a uloží se do listu — ne až v `toDocument`.
  //   Kdyby míchala sazba, potřebovala by generátor náhody, dvě volání by dala
  //   jiné pořadí a `.sifra` uložená loni by vytiskla jiné kartičky.
  const cards = rng.shuffle(
    tasks.flatMap((task, pairIndex): PexesoCard[] => [
      { text: task.prompt.text, kind: 'prompt', pairIndex },
      { text: formatValue(task.value), kind: 'value', pairIndex },
    ]),
  )

  const titleDerived = config.title === undefined || config.title.trim() === ''
  const title = titleDerived ? `Pexeso — ${payload.difficulty.grade}. třída` : config.title!.trim()

  return {
    ok: true,
    sheet: {
      config,
      tasks,
      cards,
      title,
      titleDerived,
      relaxations,
      verification: combine(
        verifyTasks(
          tasks.map((task) => ({
            taskText: task.prompt.text,
            declaredValue: task.value,
            kind: task.prompt.kind,
          })),
          // Celý výsledek je požadavek ŠIFRY (kód políčka v mřížce), ne
          // tohohle listu. Viz `TaskRules` v `core/model`.
          ALLOW_DECIMAL_RESULTS,
        ),
        // Bez téhle kontroly je hra vadná, i když je každá úloha spočítaná
        // správně. Proto je součástí verifikace, ne jen přáním generátoru.
        verifyDistinctValues(tasks),
      ),
    },
  }
}

function combine(...reports: VerificationReport[]): VerificationReport {
  const failures: VerificationFailure[] = []
  for (const report of reports) {
    if (!report.ok) failures.push(...report.failures)
  }
  return failures.length === 0 ? { ok: true } : { ok: false, failures }
}

/**
 * Kontrolní součet listu pro `.sifra`.
 *
 * Zahrnuje pořadí kartiček, ne jen dvojice: zamíchání je součást toho, co
 * učitel dostane na papíře, a rozejít se s uloženým souborem nesmí.
 */
export function sheetChecksum(sheet: PexesoSheet): string {
  return hashString(
    [
      sheet.cards.map((card) => `${card.pairIndex}:${card.text}`).join(','),
      sheet.tasks.map((task) => `${task.prompt.text}=${task.value}`).join(','),
    ].join('|'),
  )
}

export function worksheetTitle(sheet: PexesoSheet): string {
  return sheet.title
}
