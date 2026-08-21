/**
 * Aktivita „domino".
 *
 * Kámen má dvě půlky: vlevo **výsledek**, vpravo **zadání**. Kameny se
 * skládají za sebe tak, aby na sebe navazovaly — zadání jednoho a výsledek
 * dalšího. Vytisknou se zamíchané; správné pořadí zná jen učitelský list.
 *
 * O matematice tenhle modul neví nic nového — všechno umí vrstva úloh.
 * Přidává jediné pravidlo, a to je pravidlo hry: **hodnoty musí tvořit jeden
 * souvislý kruh.** Různé hodnoty (pravidlo pexesa) na to nestačí: osm kamenů
 * s osmi různými hodnotami se dá spojit i jako dva kroužky po čtyřech, ve
 * kterých má každý kámen souseda a dítě je stejně nesloží.
 *
 * Kruh, ne otevřený řetěz. Sebekontrola je celý smysl domina jako pomůcky:
 * učitel rozdá kameny a nemusí u toho stát. Dítě skončí tam, kde začalo —
 * a kruh, který se nezavřel, ukazuje na místo, kde se to zlomilo.
 *
 * Vrací DATA, ne JSX — stejně jako ostatní aktivity.
 */

import { hashString } from '../../core/checksum/index.js'
import { TILE_COUNT_LIMITS, cardGameProfile, gradeProfile } from '../../core/constraints/index.js'
import type {
  DominoProject,
  Grade,
  RelaxationLog,
  Task,
  VerificationFailure,
  VerificationReport,
} from '../../core/model/index.js'
import { ALLOW_DECIMAL_RESULTS } from '../../core/model/index.js'
import { formatValue } from '../../core/number/index.js'
import { createRng } from '../../core/rng/index.js'
import {
  verifyChain,
  verifyDistinctValues,
  verifyTasks,
} from '../../core/verify/index.js'
import { pickGenerator } from '../../tasks/mix.js'
import { taskGenerators } from '../../tasks/registry.js'
import { APP_VERSION, GENERATOR_VERSION } from '../../version.js'

/**
 * Jeden kámen.
 *
 * `chainIndex` je pozice ve správném řetězu — pro učitelský list a pro testy,
 * NIKOLI pro sazbu. Kdyby šlo pořadí vyčíst z papíru, domino by bylo složené
 * dřív, než se rozdá.
 */
export interface DominoTile {
  /** Levá půlka: hotová hodnota (`56`). */
  left: string
  /** Pravá půlka: zadání, jehož výsledek ukazuje na další kámen (`7 · 8`). */
  right: string
  /** Pozice ve správném kruhu, od nuly. */
  chainIndex: number
}

export interface DominoSheet {
  config: DominoProject
  /**
   * Úlohy v pořadí kruhu. Úloha `i` má výsledek, který je vlevo na kameni `i`;
   * zadání s tímhle výsledkem stojí vpravo na kameni `i − 1`.
   */
  tasks: Task[]
  /** Kameny v pořadí, ve kterém se vytisknou. Zamíchané. */
  tiles: DominoTile[]
  title: string
  titleDerived: boolean
  relaxations: RelaxationLog[]
  verification: VerificationReport
}

export type DominoOutcome =
  | { ok: true; sheet: DominoSheet }
  | { ok: false; reason: string; relaxations: RelaxationLog[] }

export function defaultDominoConfig(
  grade: Grade,
  seed: string,
  tileCount: number = TILE_COUNT_LIMITS.fallback,
): DominoProject {
  return {
    schemaVersion: 1,
    generatorVersion: GENERATOR_VERSION,
    appVersion: APP_VERSION,
    activity: 'domino',
    seed,
    locale: 'cs',
    payload: {
      tileCount,
      difficulty: gradeProfile(grade),
      taskMix: { add: 1, sub: 1, mul: 1, div: 1 },
      generatorMix: { arithmetic: 1 },
      output: {
        includeSolution: true,
        paper: 'A4',
        columns: 1,
        // Kameny nemají co prozradit — název patří na učitelský list.
        printTitleOnWorksheet: true,
      },
    },
  }
}

const MAX_ATTEMPTS = 6

export function generateDomino(config: DominoProject): DominoOutcome {
  let last: DominoOutcome = { ok: false, reason: 'Neznámá chyba generování.', relaxations: [] }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const attemptConfig: DominoProject =
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

function generateOnce(config: DominoProject): DominoOutcome {
  const rng = createRng(`${config.generatorVersion}|${config.seed}`)
  const payload = config.payload
  const relaxations: RelaxationLog[] = []

  /*
   * Obor čísel oříznutý na kartičku. Profil ročníku je psaný pro pracovní
   * list — dítě u něj má tužku a papír — kdežto tady drží dvanáct kartiček
   * v ruce a páruje je očima. Bez tohohle řádku vycházelo šesťákovi
   * `9678 − 4658 = 5020`. Viz `cardGameProfile`.
   *
   * Nedělá se to už v konfiguraci: `payload.difficulty` má dál poctivě
   * říkat, jaký ročník si učitel zvolil. Jak s ním hra naloží, je věc hry.
   */
  const difficulty = cardGameProfile(payload.difficulty)

  const generatorMix = payload.generatorMix ?? { arithmetic: 1 }
  const generators = taskGenerators.filter(
    (generator) => generator.supports(difficulty) && (generatorMix[generator.id] ?? 0) > 0,
  )
  if (generators.length === 0) {
    return {
      ok: false,
      reason: 'Pro tuto obtížnost není k dispozici žádný generátor úloh.',
      relaxations,
    }
  }

  // Zásoba hodnot pro KAŽDÉ téma zvlášť a téma se losuje podle vah — totéž
  // co u pexesa a ze stejného důvodu: poměr témat nesmí záviset na tom, jak
  // široký obor čísel který generátor náhodou pokrývá.
  const pools = new Map<string, number[]>()
  for (const generator of generators) {
    pools.set(
      generator.id,
      rng.shuffle([
        ...generator.reachableValues(difficulty, payload.taskMix, ALLOW_DECIMAL_RESULTS),
      ]),
    )
  }

  const usedExpressions = new Set<string>()
  const tasks: Task[] = []
  // Hodnoty musí být různé i tady, a je to podmínka kruhu: kdyby dvě zadání
  // dávala 56, pasovaly by na jedno místo dva kameny a řetěz by se rozvětvil.
  const usedValues = new Set<number>()
  const context = {
    profile: difficulty,
    mix: payload.taskMix,
    usedExpressions,
    rules: ALLOW_DECIMAL_RESULTS,
  }

  const maxAttempts = payload.tileCount * 20
  for (let attempt = 0; tasks.length < payload.tileCount && attempt < maxAttempts; attempt++) {
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

  if (tasks.length < TILE_COUNT_LIMITS.min) {
    return {
      ok: false,
      reason:
        'S vybranými operacemi nejde v tomhle ročníku sestavit dost kamenů s různými výsledky.',
      relaxations,
    }
  }
  if (tasks.length < payload.tileCount) {
    // Ústupek se hlásí: učitel si vyžádal počet kamenů, a ten nedostal.
    // Mlčky zkrátit řetěz nejde — počet kamenů je to, co učitel zadal.
    relaxations.push({
      level: 'notice',
      code: 'fewer-tiles',
      message: `Místo ${payload.tileCount} kamenů se podařilo sestavit ${tasks.length} — pro tenhle ročník a výběr operací není dost různých výsledků.`,
    })
  }

  // Zřetězení: kámen `i` nese vlevo hodnotu úlohy `i` a vpravo zadání úlohy
  // NÁSLEDUJÍCÍ, jejíž výsledek je hodnota na kameni `i + 1`. Poslední kámen
  // ukazuje zpátky na první a kruh se uzavírá sám.
  //
  // Směr je závazný, ne libovolný: v učitelské tabulce se pak čte shora dolů
  // („výsledek v řádku je zadáním v řádku následujícím"). Opačné zřetězení dá
  // stejně platný kruh, ale seznam, ve kterém se navazuje o řádek zpátky.
  //
  // ⚠ Míchá se TADY, při generování, a uloží se do listu — ne až v
  //   `toDocument`. Kdyby míchala sazba, potřebovala by generátor náhody, dvě
  //   volání by dala jiné pořadí a `.sifra` uložená loni by vytiskla jiné
  //   kameny.
  const chain = tasks.map(
    (task, index): DominoTile => ({
      left: formatValue(task.value),
      right: tasks[(index + 1) % tasks.length]!.prompt.text,
      chainIndex: index,
    }),
  )
  const tiles = rng.shuffle(chain)

  const titleDerived = config.title === undefined || config.title.trim() === ''
  const title = titleDerived ? `Domino — ${payload.difficulty.grade}. třída` : config.title!.trim()

  return {
    ok: true,
    sheet: {
      config,
      tasks,
      tiles,
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
        verifyDistinctValues(tasks),
        // Z konstrukce výš to vyjít má; ověřuje se to stejně. Verifikace je
        // poslední pojistka před tiskem, ne ozdoba — kdyby se generátor někdy
        // přepsal, musí to spadnout tady, ne u dítěte na koberci.
        verifyChain(
          tiles.map((tile) => ({
            left: tile.left,
            right: tile.right,
            kind: promptKindOf(tasks, tile.right),
          })),
        ),
      ),
    },
  }
}

/**
 * Jak se čte zadání na kameni — výraz, nebo číselná řada?
 *
 * Verifikace to potřebuje vědět, protože řada se nevyhodnocuje jako výraz.
 * Hledá se podle vytištěného textu schválně: kdyby si druh nesl kámen sám,
 * mohl by se s papírem rozejít.
 */
function promptKindOf(tasks: readonly Task[], text: string): Task['prompt']['kind'] {
  return tasks.find((task) => task.prompt.text === text)?.prompt.kind ?? 'expr'
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
 * Zahrnuje pořadí kamenů, ne jen dvojice hodnot: zamíchání je součást toho,
 * co učitel dostane na papíře, a rozejít se s uloženým souborem nesmí.
 */
export function sheetChecksum(sheet: DominoSheet): string {
  return hashString(
    [
      sheet.tiles.map((tile) => `${tile.chainIndex}:${tile.left}|${tile.right}`).join(','),
      sheet.tasks.map((task) => `${task.prompt.text}=${task.value}`).join(','),
    ].join('|'),
  )
}

export function worksheetTitle(sheet: DominoSheet): string {
  return sheet.title
}
