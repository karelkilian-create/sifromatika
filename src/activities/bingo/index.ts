/**
 * Aktivita „bingo".
 *
 * Učitel čte příklady ze svého seznamu, dítě spočítá a škrtne výsledek na své
 * kartě. Kdo má celý řádek, sloupec nebo úhlopříčku, volá bingo.
 *
 * Na kartě jsou **výhradně výsledky**. Kdyby na ní byly příklady, dítě si je
 * spočítá dopředu a ze hry zbyde hledání čísla — bingo je jediná aktivita
 * v Šifromatice, kde se počítá z hlavy a hned.
 *
 * O matematice tenhle modul neví nic nového — všechno umí vrstva úloh. Přidává
 * dvě pravidla, obě pravidla hry:
 *
 *  1. **Každé číslo na kartě musí jít vyvolat.** Dítě s číslem, které učitel
 *     nikdy nepřečte, nemůže vyhrát a nepozná, že to není jeho chyba.
 *  2. **Karty jsou navzájem různé.** Dvě stejné znamenají dvě děti volající
 *     bingo naráz a jedno z nich s pocitem, že ho někdo opsal.
 *
 * Vrací DATA, ne JSX — stejně jako ostatní aktivity.
 */

import { hashString } from '../../core/checksum/index.js'
import {
  BINGO_CELLS,
  BINGO_POOL_RATIO,
  BINGO_SIDE,
  CARD_COUNT_LIMITS,
  gradeProfile,
} from '../../core/constraints/index.js'
import type {
  BingoProject,
  Grade,
  RelaxationLog,
  Task,
  VerificationFailure,
  VerificationReport,
} from '../../core/model/index.js'
import { formatValue } from '../../core/number/index.js'
import { createRng } from '../../core/rng/index.js'
import {
  ALLOW_DECIMAL_RESULTS,
  verifyBingoCards,
  verifyDistinctValues,
  verifyTasks,
} from '../../core/verify/index.js'
import { pickGenerator } from '../../tasks/mix.js'
import { taskGenerators } from '../../tasks/registry.js'
import { APP_VERSION, GENERATOR_VERSION } from '../../version.js'

/** Jedna karta: `BINGO_SIDE` řádků po `BINGO_SIDE` vytištěných číslech. */
export type BingoCard = string[][]

export interface BingoSheet {
  config: BingoProject
  /**
   * Vyvolávací seznam v pořadí, ve kterém ho učitel čte. Zamíchaný.
   *
   * ⚠ Pořadí je hra sama. Kdyby se vyvolávalo od nejmenšího čísla, děti by
   *   škrtaly odshora dolů a nic by nepočítaly.
   */
  tasks: Task[]
  /** Karty v pořadí tisku. Každá jiná. */
  cards: BingoCard[]
  title: string
  titleDerived: boolean
  relaxations: RelaxationLog[]
  verification: VerificationReport
}

export type BingoOutcome =
  | { ok: true; sheet: BingoSheet }
  | { ok: false; reason: string; relaxations: RelaxationLog[] }

export function defaultBingoConfig(
  grade: Grade,
  seed: string,
  cardCount: number = CARD_COUNT_LIMITS.fallback,
): BingoProject {
  return {
    schemaVersion: 1,
    generatorVersion: GENERATOR_VERSION,
    appVersion: APP_VERSION,
    activity: 'bingo',
    seed,
    locale: 'cs',
    payload: {
      cardCount,
      difficulty: gradeProfile(grade),
      taskMix: { add: 1, sub: 1, mul: 1, div: 1 },
      generatorMix: { arithmetic: 1 },
      output: {
        includeSolution: true,
        paper: 'A4',
        columns: 1,
        // Karty nemají co prozradit — název patří na list pro učitele.
        printTitleOnWorksheet: true,
      },
    },
  }
}

const MAX_ATTEMPTS = 6

export function generateBingo(config: BingoProject): BingoOutcome {
  let last: BingoOutcome = { ok: false, reason: 'Neznámá chyba generování.', relaxations: [] }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const attemptConfig: BingoProject =
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

function generateOnce(config: BingoProject): BingoOutcome {
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

  // Zásoba hodnot pro každé téma zvlášť a téma se losuje podle vah — totéž co
  // u pexesa a domina a ze stejného důvodu: poměr témat nesmí záviset na tom,
  // jak široký obor čísel který generátor náhodou pokrývá.
  const pools = new Map<string, number[]>()
  for (const generator of generators) {
    pools.set(
      generator.id,
      rng.shuffle([...generator.reachableValues(payload.difficulty, payload.taskMix)]),
    )
  }

  // Kolik čísel se bude vyvolávat. Víc než políček na kartě — jinak by musel
  // učitel přečíst úplně všechno a vyhráli by všichni naráz.
  const wantedValues = Math.round(BINGO_CELLS * BINGO_POOL_RATIO)

  const usedExpressions = new Set<string>()
  const tasks: Task[] = []
  const usedValues = new Set<number>()
  const context = { profile: payload.difficulty, mix: payload.taskMix, usedExpressions }

  const maxAttempts = wantedValues * 20
  for (let attempt = 0; tasks.length < wantedValues && attempt < maxAttempts; attempt++) {
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

  // ⚠ Šestnáct různých hodnot je tvrdé minimum a zmenšit kartu nejde — mřížka
  //   má šestnáct políček a prázdné by dítě škrtlo hned. Tady se tedy nedělá
  //   ústupek, ale končí se hláškou, ze které učitel pozná, co má změnit.
  if (tasks.length < BINGO_CELLS) {
    return {
      ok: false,
      reason: `Na bingo kartu je potřeba ${BINGO_CELLS} různých výsledků a s tímhle ročníkem a výběrem operací jich vyšlo jen ${tasks.length}. Zkus zaškrtnout víc operací nebo témat.`,
      relaxations,
    }
  }
  if (tasks.length < wantedValues) {
    // Kratší zásoba je kratší hra, ne rozbitá karta — proto ústupek, ne chyba.
    relaxations.push({
      level: 'notice',
      code: 'fewer-values',
      message: `Vyvolávat se bude ${tasks.length} čísel místo ${wantedValues} — pro tenhle ročník a výběr operací není víc různých výsledků. Hra bude kratší.`,
    })
  }

  // ⚠ Míchá se TADY, při generování, a uloží se do listu — ne až v
  //   `toDocument`. Kdyby míchala sazba, potřebovala by generátor náhody, dvě
  //   volání by dala jiné pořadí a `.sifra` uložená loni by vytiskla jiné karty.
  const values = tasks.map((task) => formatValue(task.value))
  const cards = buildCards(values, payload.cardCount, rng)

  const titleDerived = config.title === undefined || config.title.trim() === ''
  const title = titleDerived ? `Bingo — ${payload.difficulty.grade}. třída` : config.title!.trim()

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
          // tohohle listu. Viz `TaskRules` v `core/verify`.
          ALLOW_DECIMAL_RESULTS,
        ),
        // Dva příklady s týmž výsledkem by znamenaly dvě škrtnutí téhož
        // políčka — a jedno z nich nadarmo.
        verifyDistinctValues(tasks),
        verifyBingoCards({ cards, called: values }),
      ),
    },
  }
}

/**
 * Karty jako náhodné podvýběry zásoby.
 *
 * Každá karta je jiná. Když se podvýběr zopakuje, losuje se znovu — a po
 * několika marných pokusech se to vzdá a karta se pustí dál. Verifikace ji pak
 * zachytí; tichá duplicita by byla horší než hláška.
 *
 * ⚠ Při krátké zásobě je různých karet konečně mnoho. Šestnáct z osmnácti dá
 *   153 kombinací, a to je pořád víc než třicet karet — ale rozmístění v
 *   mřížce se počítá taky, takže se v praxi shodné karty nevyskytnou.
 */
function buildCards(
  values: readonly string[],
  cardCount: number,
  rng: ReturnType<typeof createRng>,
): BingoCard[] {
  const seen = new Set<string>()
  const cards: BingoCard[] = []

  for (let index = 0; index < cardCount; index++) {
    let card: BingoCard | null = null

    for (let attempt = 0; attempt < 20; attempt++) {
      const picked = rng.shuffle(values).slice(0, BINGO_CELLS)
      const fingerprint = picked.join('|')
      if (seen.has(fingerprint)) continue
      seen.add(fingerprint)
      card = toGrid(picked)
      break
    }

    cards.push(card ?? toGrid(rng.shuffle(values).slice(0, BINGO_CELLS)))
  }
  return cards
}

/** Šestnáct čísel do mřížky 4 × 4, řádek po řádku. */
function toGrid(values: readonly string[]): BingoCard {
  const rows: string[][] = []
  for (let row = 0; row < BINGO_SIDE; row++) {
    rows.push([...values.slice(row * BINGO_SIDE, (row + 1) * BINGO_SIDE)])
  }
  return rows
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
 * Zahrnuje karty i pořadí vyvolávání: obojí je součást toho, co učitel dostane
 * na papíře, a rozejít se s uloženým souborem nesmí.
 */
export function sheetChecksum(sheet: BingoSheet): string {
  return hashString(
    [
      sheet.cards.map((card) => card.flat().join(',')).join(';'),
      sheet.tasks.map((task) => `${task.prompt.text}=${task.value}`).join(','),
    ].join('|'),
  )
}

export function worksheetTitle(sheet: BingoSheet): string {
  return sheet.title
}
