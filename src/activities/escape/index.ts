/**
 * Aktivita „úniková hra" — docs/navrh-unikova-hra.md.
 *
 * Hra se skládá ze stanovišť. Stanoviště je mini-šifra, jejíž tajenka je
 * slovo z příběhu (`MAPA`, `TRUHLA`); dítě pozná, že počítalo dobře, protože
 * mu vyšlo slovo. Slova se zadávají do zámku na tabuli a tabule z každého
 * vezme jedno až tři písmena finální tajenky. Která, se na papíře neobjeví.
 *
 * Tři kroky, každý ověřený zvlášť:
 *
 *  1. **Rozdělení tajenky** (`assignLetters`) — různá písmena tajenky mezi
 *     slova slovníku. Každé písmeno dodá právě jedno slovo (šibenice: jedno
 *     `A` ze slova doplní všechna `A` tajenky), každé slovo jedno až tři.
 *  2. **Stanoviště** (`buildStation`) — šifra se slovem jako tajenkou, složená
 *     přímo z vrstvy šifer a úloh. Celá aktivita `cipher-grid` by přinesla
 *     nadpis, řešení a ústupky listu o patnácti příkladech (§8).
 *  3. **Řetěz** (`verifyEscapeChain`) — přehraje zámek tak, jak ho přehraje
 *     třída, a porovná výsledek s tajenkou.
 *
 * Vrací DATA, ne JSX — stejně jako ostatní aktivity.
 */

import { hashString } from '../../core/checksum/index.js'
import {
  ESCAPE_GROUP_LIMITS,
  ESCAPE_MAX_PICKS,
  ESCAPE_STATIONS,
  ESCAPE_WORD_LENGTH,
  gradeProfile,
} from '../../core/constraints/index.js'
import type {
  CipherTable,
  EscapeLength,
  EscapeMode,
  EscapeProject,
  EscapeStationKind,
  Grade,
  OperationTag,
  RelaxationLog,
  Task,
  TaskGenerator,
  VerificationFailure,
  VerificationReport,
} from '../../core/model/index.js'
import { ALL_OPERATIONS, REQUIRE_WHOLE_RESULTS } from '../../core/model/index.js'
import { createRng, type Rng } from '../../core/rng/index.js'
import type { LockColor } from '../../core/screen/index.js'
import { ALPHABET, CZECH_LETTER_WEIGHTS, normalizeMessage, type NormalizedMessage } from '../../core/text/index.js'
import { verifyChoiceSheet, verifyEscapeChain, verifySheet } from '../../core/verify/index.js'
import { buildGrid, coordScheme } from '../../ciphers/grid/index.js'
import { distractorsFor } from '../../tasks/distractors.js'
import { pickGenerator } from '../../tasks/mix.js'
import { findTaskGenerator, taskGenerators } from '../../tasks/registry.js'
import { APP_VERSION, GENERATOR_VERSION } from '../../version.js'
import { defaultStoryId, findStory, type Story, type StoryWord } from './stories.js'

/** Slovo stanoviště v obou podobách a s větami příběhu. */
export interface EscapeWord {
  /** A–Z bez diakritiky — tajenka šifry i to, co se zadává do zámku. */
  letters: string
  story: StoryWord
}

export interface EscapeSlot {
  /** Kód políčka, kam výsledek ukazuje. U výběru odpovědí výsledek sám. */
  code: number
  task: Task
  /**
   * Nabídnuté odpovědi v pořadí na papíře; právě jedna je správná a nese
   * písmeno slova. U šifrovací tabulky prázdné.
   */
  options: { letter: string; value: number }[]
}

export interface EscapeStation {
  word: EscapeWord
  /** Písmena, která tabule ze slova vezme. Na papír se nedostanou. */
  picks: string[]
  /** Index skupiny. V režimu „celá třída" vždy 0. */
  group: number
  /** Pořadí stanoviště ve skupině, od jedničky. */
  numberInGroup: number
  /** Šifrovací tabulka, nebo `null` u výběru odpovědí. */
  table: CipherTable | null
  slots: EscapeSlot[]
}

export interface EscapeGroup {
  name: string
  color: LockColor
  /** Indexy do `EscapeSheet.stations`. */
  stations: number[]
}

export interface EscapeSheet {
  config: EscapeProject
  story: Story
  message: NormalizedMessage
  /** Stanoviště v pořadí hry; ve skupinách seřazená po skupinách. */
  stations: EscapeStation[]
  groups: EscapeGroup[]
  title: string
  titleDerived: boolean
  relaxations: RelaxationLog[]
  verification: VerificationReport
}

export type EscapeOutcome =
  | { ok: true; sheet: EscapeSheet }
  | { ok: false; reason: string; relaxations: RelaxationLog[] }

/**
 * Barvy skupin v pořadí, v jakém se rozdávají. Jména jsou to, co učitel
 * řekne nahlas, a co si skupina napíše na kartu.
 */
export const GROUP_COLORS: readonly (readonly [string, LockColor])[] = [
  ['Modrá', 'blue'],
  ['Zelená', 'green'],
  ['Žlutá', 'yellow'],
  ['Červená', 'red'],
  ['Fialová', 'purple'],
  ['Oranžová', 'orange'],
]

/** Délka hry ve větě: „Na krátkou hru…". */
const LENGTH_ACCUSATIVE: Record<EscapeLength, string> = {
  short: 'krátkou',
  medium: 'střední',
  long: 'dlouhou',
}

/**
 * Druh stanoviště, když ho učitel nezvolí: druhá třída výběr odpovědí,
 * ostatní šifrovací tabulku (rozhodnuto 3. 10. 2026).
 */
export function defaultStationKind(grade: Grade): EscapeStationKind {
  return grade === 2 ? 'choice' : 'grid'
}

/** Tajenka, kterou příběh nabízí k dané délce hry. */
export function offeredMessage(storyId: string, length: EscapeLength): string {
  return findStory(storyId)?.messages[length] ?? ''
}

export function defaultEscapeConfig(
  grade: Grade,
  seed: string,
  length: EscapeLength = 'short',
  mode: EscapeMode = 'class',
): EscapeProject {
  return {
    schemaVersion: 1,
    generatorVersion: GENERATOR_VERSION,
    appVersion: APP_VERSION,
    activity: 'escape',
    seed,
    locale: 'cs',
    payload: {
      story: defaultStoryId(grade),
      length,
      message: offeredMessage(defaultStoryId(grade), length),
      mode,
      groupCount: ESCAPE_GROUP_LIMITS.fallback,
      stationKind: defaultStationKind(grade),
      difficulty: gradeProfile(grade),
      taskMix: { add: 1, sub: 1, mul: 1, div: 1 },
      generatorMix: { arithmetic: 1 },
    },
  }
}

/** Slovo jako písmena A–Z, tedy tak, jak ho uvidí šifra a zámek. */
export function plainWord(word: string): string {
  return normalizeMessage(word).letters.join('')
}

/** Slova tajenky jako písmena A–Z: `POKLAD JE NÁŠ` → `POKLAD`, `JE`, `NAS`. */
export function messageWords(message: NormalizedMessage): string[] {
  const words: string[] = []
  let start = 0
  for (const length of message.wordLengths) {
    words.push(message.letters.slice(start, start + length).join(''))
    start += length
  }
  return words
}

/**
 * Slova, která smí na stanoviště: z tematického slovníku, správně dlouhá
 * a nikoli slovo tajenky. Slovo tajenky by prozradilo kus finále (§3).
 */
export function candidateWords(story: Story, message: NormalizedMessage): EscapeWord[] {
  const forbidden = new Set(messageWords(message))
  return story.words
    .map((entry) => ({ letters: plainWord(entry.word), story: entry }))
    .filter(
      (word) =>
        word.letters.length >= ESCAPE_WORD_LENGTH.min &&
        word.letters.length <= ESCAPE_WORD_LENGTH.max &&
        !forbidden.has(word.letters),
    )
}

/** Kolik kroků smí hledání udělat, než to vzdá. Pojistka, ne ladicí knoflík. */
const SEARCH_STEP_LIMIT = 50_000

/**
 * Rozdělí různá písmena tajenky mezi `stationCount` různých slov.
 *
 * Každé písmeno dodá právě jedno slovo, které ho obsahuje; každé slovo dodá
 * jedno až `maxPicks` písmen. Víc písmen ze slova je možnost, ne požadavek.
 *
 * Prohledávání s návratem, se semínkem: písmena s nejméně kandidáty jdou
 * napřed (`Š` dřív než `A`), a mezi kandidáty se losuje — různé seedy tak
 * dávají různé hry. `null` = slovník to nepostaví.
 */
export function assignLetters(
  letters: readonly string[],
  words: readonly string[],
  stationCount: number,
  maxPicks: number,
  rng: Rng,
): { word: string; picks: string[] }[] | null {
  const candidates = new Map(letters.map((letter) => [letter, words.filter((word) => word.includes(letter))]))
  // Zamíchat a pak stabilně seřadit: shodně omezená písmena jdou v náhodném pořadí.
  const order = rng
    .shuffle(letters)
    .sort((a, b) => candidates.get(a)!.length - candidates.get(b)!.length)

  const chosen = new Map<string, string[]>()
  let steps = 0

  const search = (index: number): boolean => {
    if (++steps > SEARCH_STEP_LIMIT) return false
    const remaining = order.length - index
    const missing = stationCount - chosen.size
    if (remaining === 0) return missing === 0
    // Každé ještě nevybrané slovo potřebuje aspoň jedno písmeno…
    if (missing > remaining) return false
    // …a víc písmen, než se vejde do zbylých míst, nezbude kam dát.
    let capacity = missing * maxPicks
    for (const picks of chosen.values()) capacity += maxPicks - picks.length
    if (remaining > capacity) return false

    const letter = order[index]!
    const options = rng.shuffle(
      candidates.get(letter)!.filter((word) => {
        const picks = chosen.get(word)
        return picks === undefined ? chosen.size < stationCount : picks.length < maxPicks
      }),
    )
    for (const word of options) {
      const picks = chosen.get(word)
      if (picks === undefined) chosen.set(word, [letter])
      else picks.push(letter)

      if (search(index + 1)) return true

      if (picks === undefined) chosen.delete(word)
      else picks.pop()
    }
    return false
  }

  if (!search(0)) return null
  return [...chosen].map(([word, picks]) => ({ word, picks: [...picks] }))
}

/** Kolik rozdělení tajenky se zkusí, než se vybere to nejvyrovnanější. */
const BALANCE_ATTEMPTS = 8

/**
 * Kolik stanovišť hra má. V celé třídě přesně tolik, kolik říká délka hry;
 * ve skupinách se počet zaokrouhlí nahoru na násobek počtu skupin, aby měly
 * všechny skupiny stejně stanovišť.
 *
 * Hru to neprodlouží: ve skupinách trvá tak dlouho, jak dlouho pracuje
 * nejvytíženější skupina, a ta má tolik stanovišť jako dřív. Ostatní jen
 * nečekají. Bez zaokrouhlení dostala při 4 stanovištích a 3 skupinách jedna
 * skupina dvě a dvě po jednom, tedy až trojnásobek práce (§4, 3. 10. 2026).
 */
export function escapeStationCount(length: EscapeLength, groupCount: number): number {
  const base = ESCAPE_STATIONS[length]
  return Math.ceil(base / groupCount) * groupCount
}

/** „6 stanovišť", ve skupinách „6 stanovišť, 2 na skupinu". */
function stationsPhrase(stationCount: number, groupCount: number): string {
  const total = stationCount >= 2 && stationCount <= 4 ? `${stationCount} stanoviště` : `${stationCount} stanovišť`
  return groupCount === 1 ? total : `${total}, ${stationCount / groupCount} na skupinu`
}

/**
 * Rozdá stanoviště skupinám: každá dostane stejně stanovišť a co nejpodobnější
 * počet příkladů. Hladově od nejdelšího slova ke skupině s nejméně příklady.
 * Vrací indexy do `lengths` po skupinách.
 *
 * Pořadí skupin se před rozdáním zamíchá, jinak by Modrá dostávala vždycky
 * to nejdelší slovo.
 */
export function dealToGroups(lengths: readonly number[], groupCount: number, rng: Rng): number[][] {
  const perGroup = lengths.length / groupCount
  const groups = Array.from({ length: groupCount }, () => ({ indices: [] as number[], load: 0 }))
  const groupOrder = rng.shuffle(groups.map((_, index) => index))
  const order = rng
    .shuffle(lengths.map((_, index) => index))
    .sort((a, b) => lengths[b]! - lengths[a]!)
  for (const index of order) {
    let target = -1
    for (const candidate of groupOrder) {
      const group = groups[candidate]!
      if (group.indices.length >= perGroup) continue
      if (target === -1 || group.load < groups[target]!.load) target = candidate
    }
    groups[target]!.indices.push(index)
    groups[target]!.load += lengths[index]!
  }
  return groups.map((group) => group.indices)
}

/** Rozdíl v počtu příkladů mezi nejvytíženější a nejméně vytíženou skupinou. */
function loadSpread(deal: readonly (readonly number[])[], lengths: readonly number[]): number {
  const loads = deal.map((indices) => indices.reduce((sum, index) => sum + lengths[index]!, 0))
  return Math.max(...loads) - Math.min(...loads)
}

/** Kolik pokusů má jedno stanoviště, než se hra vzdá. Jako u šifry. */
const STATION_ATTEMPTS = 6

/**
 * Generátory úloh, které hra smí použít (zaškrtnutá témata, která ročník
 * umí), a jejich obory výsledků. Chybějící `generatorMix` = jen aritmetika,
 * tedy hra uložená před tématy.
 *
 * Počítá se JEDNOU na hru, ne na stanoviště: obor desetinných čísel nebo
 * zlomků v šesté třídě trvá desítky milisekund a stanovišť s pokusy je
 * přes padesát. Bez téhle mezipaměti se hra generovala půldruhé sekundy.
 */
interface StationTasks {
  generators: TaskGenerator[]
  mix: Readonly<Record<string, number>>
  /** Obor výsledků daných generátorů pro danou směs operací. */
  reachable: (generators: readonly TaskGenerator[], taskMix: Partial<Record<OperationTag, number>>) => Set<number>
}

function stationTasks(config: EscapeProject): StationTasks {
  const mix = config.payload.generatorMix ?? { arithmetic: 1 }
  const supported = taskGenerators.filter(
    (generator) => generator.supports(config.payload.difficulty) && (mix[generator.id] ?? 0) > 0,
  )
  const cache = new Map<string, Set<number>>()
  const reachable: StationTasks['reachable'] = (generators, taskMix) => {
    const key = `${generators.map((generator) => generator.id).join('+')}|${JSON.stringify(taskMix)}`
    let values = cache.get(key)
    if (values === undefined) {
      values = new Set<number>()
      for (const generator of generators) {
        for (const value of generator.reachableValues(config.payload.difficulty, taskMix, REQUIRE_WHOLE_RESULTS)) {
          values.add(value)
        }
      }
      cache.set(key, values)
    }
    return values
  }
  return { generators: supported.length > 0 ? supported : [findTaskGenerator('arithmetic')!], mix, reachable }
}

/**
 * Šifra se slovem jako tajenkou.
 *
 * Totéž co `generateOnce` u šifry, jen menší: slovo místo věty, žádný
 * nadpis ani řešení. Písmena se rozprostřou mezi zaškrtnuté operace, aby
 * čtyři příklady nebyly čtyři součty, a témata se losují ve stejném poměru
 * jako na šifře (`gridGeneratorMix`).
 */
function buildStation(
  word: string,
  config: EscapeProject,
  tasks: StationTasks,
  rng: Rng,
): { table: CipherTable; slots: EscapeSlot[]; verification: VerificationReport } | { reason: string } {
  const payload = config.payload
  const { generators, mix } = tasks
  const message = normalizeMessage(word)

  const reachableFor = (taskMix: Partial<Record<OperationTag, number>>) => tasks.reachable(generators, taskMix)
  const reachable = reachableFor(payload.taskMix)
  const chosenOperations = ALL_OPERATIONS.filter((operation) => (payload.taskMix[operation] ?? 0) > 0)
  const reachablePools = (chosenOperations.length > 0 ? chosenOperations : ALL_OPERATIONS).map((operation) =>
    reachableFor({ [operation]: 1 }),
  )

  const cipher = buildGrid(
    { message, reachable, reachablePools, distinctCellPerOccurrence: true },
    rng,
    coordScheme,
  )
  if (!cipher.ok) return { reason: cipher.reason }

  const usedExpressions = new Set<string>()
  const slots: EscapeSlot[] = []
  for (const code of cipher.artifact.requiredValues) {
    const context = { profile: payload.difficulty, mix: payload.taskMix, usedExpressions, rules: REQUIRE_WHOLE_RESULTS }
    // Pořadí pokusů je u samotné aritmetiky stejné jako před tématy (jeden
    // generátor, `pickGenerator` nelosuje), takže uložené hry se nezmění.
    let task = pickGenerator(generators, mix, rng).generateForValue(code, context, rng)
    if (task === null && generators.length > 1) {
      for (const generator of generators) {
        task = generator.generateForValue(code, context, rng)
        if (task !== null) break
      }
    }
    if (task === null) {
      const relaxed = { ...context, usedExpressions: new Set<string>() }
      for (const generator of generators) {
        task = generator.generateForValue(code, relaxed, rng)
        if (task !== null) break
      }
    }
    if (task === null) return { reason: `Pro výsledek ${code} nelze v této obtížnosti vytvořit příklad.` }
    slots.push({ code, task, options: [] })
  }

  const verification = verifySheet({
    table: cipher.artifact.table,
    slots: slots.map((slot) => ({
      taskText: slot.task.prompt.text,
      declaredValue: slot.task.value,
      kind: slot.task.prompt.kind,
    })),
    expectedMessage: word,
  })
  return { table: cipher.artifact.table, slots, verification }
}

/** Kolik odpovědí se u příkladu nabízí. Jedna správná, dvě špatné. */
const CHOICE_OPTIONS = 3

/**
 * Stanoviště s výběrem odpovědí: ke každému písmenu slova příklad a tři
 * výsledky s písmeny. Písmeno správného výsledku je písmeno slova.
 *
 * Výsledek tu není kód políčka, takže smí být jakýkoli kladný — proto se do
 * druhé třídy dostane i dělení (`18 : 2 = 9`), které by v souřadnicové
 * tabulce nemělo kam ukázat. Operace se střídají dokola, aby čtyři příklady
 * nebyly čtyři součty.
 */
function buildChoiceStation(
  word: string,
  config: EscapeProject,
  tasks: StationTasks,
  rng: Rng,
): { table: null; slots: EscapeSlot[]; verification: VerificationReport } | { reason: string } {
  const payload = config.payload
  const { generators, mix } = tasks
  const arithmetic = findTaskGenerator('arithmetic')!
  const chosen = ALL_OPERATIONS.filter((operation) => (payload.taskMix[operation] ?? 0) > 0)
  const positiveValues = (generator: TaskGenerator, taskMix: Partial<Record<OperationTag, number>>) =>
    [...tasks.reachable([generator], taskMix)]
      .filter((value) => value > 0)
      .sort((a, b) => a - b)
  // Ke každé operaci její obor výsledků. Příklad pak vyrobí právě ta
  // operace, ze které se cíl losoval — jinak by z podílu 1 bylo `20 − 19`
  // a dělení by se na list nedostalo, i když je zaškrtnuté.
  const pools = (chosen.length > 0 ? chosen : ALL_OPERATIONS)
    .map((operation) => ({
      mix: { [operation]: 1 },
      values: positiveValues(arithmetic, { [operation]: 1 }),
    }))
    .filter((pool) => pool.values.length > 0)
  if (pools.length === 0) return { reason: 'Pro tuto obtížnost nejde vytvořit žádný příklad.' }
  const order = rng.shuffle(pools.map((_, index) => index))
  // Obory ostatních témat, počítané až když je los poprvé vybere.
  const topicValues = new Map<string, number[]>()

  const usedExpressions = new Set<string>()
  const slots: EscapeSlot[] = []
  for (const [position, letter] of [...word].entries()) {
    let task: Task | null = null
    // Téma se losuje jen při víc než jednom generátoru — samotná aritmetika
    // tak táhne náhodu stejně jako před tématy a uložené hry se nezmění.
    const topic = pickGenerator(generators, mix, rng)
    if (topic.id !== arithmetic.id) {
      if (!topicValues.has(topic.id)) topicValues.set(topic.id, positiveValues(topic, payload.taskMix))
      const values = topicValues.get(topic.id)!
      const context = { profile: payload.difficulty, mix: payload.taskMix, usedExpressions, rules: REQUIRE_WHOLE_RESULTS }
      for (let attempt = 0; attempt < 20 && task === null && values.length > 0; attempt++) {
        task = topic.generateForValue(rng.pick(values), context, rng)
      }
    }
    // Aritmetika, a záchrana pro téma, ze kterého nic nevypadlo.
    for (let attempt = 0; attempt < 20 && task === null; attempt++) {
      const pool = pools[order[(position + attempt) % order.length]!]!
      const context = { profile: payload.difficulty, mix: pool.mix, usedExpressions, rules: REQUIRE_WHOLE_RESULTS }
      task = arithmetic.generateForValue(rng.pick(pool.values), context, rng)
    }
    if (task === null) return { reason: 'Pro tuto obtížnost nejde vytvořit dost různých příkladů.' }

    const wrong = distractorsFor(task, CHOICE_OPTIONS - 1, payload.difficulty.numberRange.max, rng)
    const letters = [letter]
    while (letters.length < CHOICE_OPTIONS) {
      const decoy = rng.weighted(
        ALPHABET.filter((candidate) => !letters.includes(candidate)).map(
          (candidate) => [candidate, CZECH_LETTER_WEIGHTS[candidate] ?? 0.1] as const,
        ),
      )
      letters.push(decoy)
    }
    const options = rng.shuffle([
      { letter, value: task.value },
      ...wrong.map((value, index) => ({ letter: letters[index + 1]!, value })),
    ])
    slots.push({ code: task.value, task, options })
  }

  const verification = verifyChoiceSheet({
    slots: slots.map((slot) => ({
      taskText: slot.task.prompt.text,
      declaredValue: slot.task.value,
      kind: slot.task.prompt.kind,
      options: slot.options,
    })),
    expectedMessage: word,
  })
  return { table: null, slots, verification }
}

/** Znaky, které tajenka smí mít a na tabuli se jen nevyplňují. */
const PUNCTUATION = new Set([',', '.', '!', '?', ':', ';', '-', '–', '—', '…', '"', '„', '“'])

/**
 * Vygeneruje celou hru. Neověřená hra se nevytiskne ani nespustí — o tom
 * rozhoduje `verification`, které shell čte stejně jako u každé aktivity.
 */
export function generateEscape(config: EscapeProject): EscapeOutcome {
  const payload = config.payload
  const relaxations: RelaxationLog[] = []
  const story = findStory(payload.story)
  if (story === undefined) {
    return { ok: false, reason: 'Tenhle příběh tahle verze Šifromatiky nezná.', relaxations }
  }

  const message = normalizeMessage(payload.message)
  const dropped = message.dropped.filter((char) => !PUNCTUATION.has(char))
  if (dropped.length > 0) {
    relaxations.push({
      level: 'notice',
      code: 'dropped-characters',
      message: `Znaky ${dropped.join(' ')} do tajenky zadat nejde, na tabuli zůstanou bez rámečku.`,
    })
  }
  if (message.letters.length === 0) {
    return { ok: false, reason: 'Tajenka neobsahuje žádné písmeno.', relaxations }
  }

  const groupCount = payload.mode === 'groups' ? payload.groupCount : 1
  const stationCount = escapeStationCount(payload.length, groupCount)
  const lengthWord = LENGTH_ACCUSATIVE[payload.length]
  const distinct = [...message.histogram.keys()]

  // Meze z §4 — hlášené, ne potichu upravené.
  if (distinct.length < stationCount) {
    return {
      ok: false,
      reason:
        `Na ${lengthWord} hru (${stationsPhrase(stationCount, groupCount)}) má tajenka málo různých` +
        ` písmen: ${distinct.length}.` +
        ' Každé slovo musí dát aspoň jedno. Zvolte kratší hru, nebo tajenku prodlužte.',
      relaxations,
    }
  }
  if (distinct.length > stationCount * ESCAPE_MAX_PICKS) {
    return {
      ok: false,
      reason:
        `Na ${lengthWord} hru (${stationsPhrase(stationCount, groupCount)}) má tajenka moc různých` +
        ` písmen: ${distinct.length}, vejde se nejvýš` +
        ` ${stationCount * ESCAPE_MAX_PICKS}. Zvolte delší hru, nebo tajenku zkraťte.`,
      relaxations,
    }
  }
  const words = candidateWords(story, message)
  // Obecný slovník v první verzi není (rozhodnuto při implementaci, 3. 10.
  // 2026): písmeno, které nemá žádné slovo příběhu, se proto řekne jménem.
  const orphans = distinct.filter((letter) => !words.some((word) => word.letters.includes(letter)))
  if (orphans.length > 0) {
    return {
      ok: false,
      reason:
        `Ve slovech příběhu ${orphans.length === 1 ? 'chybí písmeno' : 'chybí písmena'} ${orphans.join(', ')}.` +
        ' Tajenku s nimi zatím postavit nejde — zkuste ji napsat jinak.',
      relaxations,
    }
  }

  const rng = createRng(`${config.generatorVersion}|${config.seed}|escape`)

  // Několik rozdělení, a z nich to, kde mají skupiny nejpodobnější počet
  // příkladů. Slova mají 4–6 písmen, takže bez výběru dostane jedna skupina
  // až o polovinu víc práce než jiná (rozhodnuto 3. 10. 2026, §4).
  let best: { assignment: { word: string; picks: string[] }[]; deal: number[][]; spread: number } | null = null
  for (let attempt = 0; attempt < BALANCE_ATTEMPTS; attempt++) {
    const assignment = assignLetters(
      distinct,
      words.map((word) => word.letters),
      stationCount,
      ESCAPE_MAX_PICKS,
      rng,
    )
    if (assignment === null) break
    const lengths = assignment.map((entry) => entry.word.length)
    const deal = dealToGroups(lengths, groupCount, rng)
    const spread = loadSpread(deal, lengths)
    if (best === null || spread < best.spread) best = { assignment, deal, spread }
    // Jedna nebo žádná úloha rozdílu je to nejlepší, co délky slov dovolí.
    if (groupCount === 1 || spread <= 1) break
  }
  if (best === null) {
    return {
      ok: false,
      reason: `Slova příběhu tuhle tajenku na ${lengthWord} hru nepostaví. Zkuste jinou délku hry, nebo jinou tajenku.`,
      relaxations,
    }
  }

  const groups: EscapeGroup[] = Array.from({ length: groupCount }, (_, index) => {
    const [name, color] = GROUP_COLORS[index]!
    return { name: payload.mode === 'groups' ? name : 'Třída', color, stations: [] }
  })
  // Pořadí stanovišť ve skupině je náhodné, aby nejdelší slovo nebylo vždycky první.
  const { assignment, deal } = best
  const byGroup = deal.map((indices) => rng.shuffle(indices).map((index) => assignment[index]!))

  const stations: EscapeStation[] = []
  const failures: VerificationFailure[] = []
  const tasks = stationTasks(config)
  for (const [group, entries] of byGroup.entries()) {
    for (const [position, entry] of entries.entries()) {
      const word = words.find((candidate) => candidate.letters === entry.word)!
      const stationIndex = stations.length
      const build = payload.stationKind === 'choice' ? buildChoiceStation : buildStation
      let built: ReturnType<typeof build> = { reason: 'Neznámá chyba generování.' }
      for (let attempt = 0; attempt < STATION_ATTEMPTS; attempt++) {
        built = build(
          entry.word,
          config,
          tasks,
          createRng(`${config.generatorVersion}|${config.seed}|stanoviste-${stationIndex}#${attempt}`),
        )
        if ('slots' in built && built.verification.ok) break
      }
      if (!('slots' in built)) return { ok: false, reason: built.reason, relaxations }
      if (!built.verification.ok) {
        failures.push(
          ...built.verification.failures.map((failure) => ({
            ...failure,
            message: `Stanoviště ${entry.word}: ${failure.message}`,
          })),
        )
      }
      groups[group]!.stations.push(stationIndex)
      stations.push({
        word,
        picks: entry.picks,
        group,
        numberInGroup: position + 1,
        table: built.table,
        slots: built.slots,
      })
    }
  }

  const chain = verifyEscapeChain({
    messageLetters: message.letters,
    messageWords: messageWords(message),
    dictionary: new Set(story.words.map((entry) => plainWord(entry.word))),
    stations: stations.map((station) => ({ word: station.word.letters, picks: station.picks })),
    groups: groups.map((group) => group.stations),
    maxPicks: ESCAPE_MAX_PICKS,
  })
  if (!chain.ok) failures.push(...chain.failures)

  const titleDerived = config.title === undefined || config.title.trim() === ''
  return {
    ok: true,
    sheet: {
      config,
      story,
      message,
      stations,
      groups,
      title: titleDerived ? `Úniková hra — ${story.label}` : config.title!.trim(),
      titleDerived,
      relaxations,
      verification: failures.length === 0 ? { ok: true } : { ok: false, failures },
    },
  }
}

/**
 * Kontrolní součet hry pro `.sifra`: všechno, co je na papíře a na tabuli.
 * Slova, písmena pro tabuli, rozdělení do skupin, tabulky i příklady.
 */
export function escapeChecksum(sheet: EscapeSheet): string {
  const stations = sheet.stations.map((station) => {
    const table = station.table?.cells.map((cell) => `${cell.code.n}:${cell.letter}`).join(',') ?? 'vyber'
    const tasks = station.slots
      .map((slot) => {
        const options = slot.options.map((option) => `${option.letter}${option.value}`).join('/')
        return `${slot.code}=${slot.task.prompt.text}${options === '' ? '' : `[${options}]`}`
      })
      .join(',')
    return `${station.group}/${station.word.letters}/${station.picks.join('')}|${table}|${tasks}`
  })
  return hashString(`${sheet.message.letters.join('')}|${stations.join(';')}`)
}
