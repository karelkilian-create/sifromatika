/**
 * Úniková hra — docs/navrh-unikova-hra.md §9 a docs/unikova-hra-poklad.md.
 *
 * Tři patra: slovník a věty příběhu (kurátorská práce, kterou stroj umí
 * zkontrolovat jen zčásti), generátor (meze, hlášky, determinismus) a řetěz
 * od stanovišť k zámku (kontroly, které musí chytit poškozenou hru).
 */

import { describe, expect, it } from 'vitest'
import {
  ESCAPE_GROUP_LIMITS,
  ESCAPE_MAX_PICKS,
  ESCAPE_STATIONS,
  ESCAPE_WORD_LENGTH,
} from '../../core/constraints/index.js'
import type { EscapeLength, EscapeMode, EscapeStationKind, Grade } from '../../core/model/index.js'
import { createRng } from '../../core/rng/index.js'
import { normalizeMessage } from '../../core/text/index.js'
import { verifyChoiceSheet, verifyEscapeChain, type EscapeChain } from '../../core/verify/index.js'
import { escapeDocument } from './document.js'
import {
  dealToGroups,
  defaultEscapeConfig,
  escapeChecksum,
  escapeStationCount,
  generateEscape,
  messageWords,
  offeredMessage,
  plainWord,
  type EscapeSheet,
} from './index.js'
import { parseEscapePayload } from './payload.js'
import { escapeScreen } from './screen.js'
import { escapeModule } from './module.js'
import { STORIES, defaultStoryId } from './stories.js'

const LENGTHS: EscapeLength[] = ['short', 'medium', 'long']

function game(
  length: EscapeLength,
  seed: string,
  options: {
    mode?: EscapeMode
    grade?: Grade
    story?: string
    message?: string
    groupCount?: number
    stationKind?: EscapeStationKind
  } = {},
) {
  const config = defaultEscapeConfig(options.grade ?? 4, seed, length, options.mode ?? 'class')
  if (options.story !== undefined) {
    config.payload.story = options.story
    config.payload.message = offeredMessage(options.story, length)
  }
  if (options.stationKind !== undefined) config.payload.stationKind = options.stationKind
  if (options.message !== undefined) config.payload.message = options.message
  if (options.groupCount !== undefined) config.payload.groupCount = options.groupCount
  return generateEscape(config)
}

function sheetOf(outcome: ReturnType<typeof generateEscape>): EscapeSheet {
  if (!outcome.ok) throw new Error(outcome.reason)
  return outcome.sheet
}

/** Text A–Z s mezerami mezi slovy — pro hledání slov ve větách. */
function plainText(text: string): string {
  return ` ${text
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toUpperCase()
    .replace(/[^A-Z]+/gu, ' ')} `
}

describe.each(STORIES.map((story) => [story.id, story] as const))('příběh %s', (_, story) => {
  const words = story.words.map((entry) => plainWord(entry.word))
  const tajenkaWords = new Set(
    LENGTHS.flatMap((length) => messageWords(normalizeMessage(story.messages[length]))),
  )

  it('slova mají 4–6 písmen, žádné dvakrát a žádné CH', () => {
    for (const word of words) {
      expect(word.length, word).toBeGreaterThanOrEqual(ESCAPE_WORD_LENGTH.min)
      expect(word.length, word).toBeLessThanOrEqual(ESCAPE_WORD_LENGTH.max)
      // Šifra z CH dělá dvě políčka a druhák ho čte jako jedno písmeno.
      if (story.audience === 'younger') expect(word, word).not.toContain('CH')
    }
    expect(new Set(words).size).toBe(words.length)
  })

  it('žádné slovo stanoviště není slovem tajenky', () => {
    for (const word of words) expect(tajenkaWords.has(word), word).toBe(false)
  })

  it('věta na listu neobsahuje své slovo', () => {
    // Kmen bez posledního písmene chytí i jiný tvar: TRUHLA → „truhly".
    for (const entry of story.words) {
      const stem = plainWord(entry.word).slice(0, -1)
      expect(plainText(entry.sheet), `${entry.word}: ${entry.sheet}`).not.toContain(stem)
    }
  })

  it('žádná věta mimo závěr neprozradí slovo tajenky', () => {
    const texts = [story.intro, story.motto, ...story.words.flatMap((entry) => [entry.sheet, entry.board])]
    for (const text of texts) {
      for (const word of tajenkaWords) {
        // Spojky a zájmena (JE) jsou v každé větě a nic neprozradí. Pravidlo
        // míří na slova s obsahem: dlouhá i v jiném tvaru (kapitánovi),
        // krátká jen celá (NÁŠ).
        if (word.length < 3) continue
        const pattern = word.length >= 5 ? word.slice(0, -1) : ` ${word} `
        expect(plainText(text), text).not.toContain(pattern)
      }
    }
  })

  it.each(LENGTHS)('nabízená tajenka sedí k délce hry: %s', (length) => {
    const distinct = normalizeMessage(story.messages[length]).histogram.size
    expect(distinct).toBeGreaterThanOrEqual(ESCAPE_STATIONS[length])
    expect(distinct).toBeLessThanOrEqual(ESCAPE_STATIONS[length] * ESCAPE_MAX_PICKS)
  })

  /*
   * Každá nabízená tajenka jde postavit jen z tematického slovníku, a to
   * s rezervou: různé seedy musí dávat různé hry, ne jedno jediné rozdělení.
   */
  it.each(LENGTHS)('%s hra se postaví a dává různé hry', (length) => {
    const variants = new Set<string>()
    for (let seed = 0; seed < 25; seed++) {
      const sheet = sheetOf(game(length, `rezerva-${seed}`, { story: story.id }))
      expect(sheet.verification).toEqual({ ok: true })
      variants.add(
        sheet.stations
          .map((station) => `${station.word.letters}:${station.picks.join('')}`)
          .sort()
          .join(' '),
      )
    }
    expect(variants.size).toBeGreaterThanOrEqual(10)
  })

  /*
   * Ve skupinách se počet stanovišť zaokrouhluje na násobek skupin, takže
   * krátká hra má při třech skupinách šest stanovišť a tajenka šest různých
   * písmen. `FARAON` s pěti tudy neprošel (4. 10. 2026).
   */
  it.each(LENGTHS)('%s hra se postaví pro každý počet skupin', (length) => {
    for (let groupCount = ESCAPE_GROUP_LIMITS.min; groupCount <= ESCAPE_GROUP_LIMITS.max; groupCount++) {
      const sheet = sheetOf(game(length, `skupiny-${groupCount}`, { story: story.id, mode: 'groups', groupCount }))
      expect(sheet.verification, `${groupCount} skupin`).toEqual({ ok: true })
    }
  })
})

describe('příběh podle ročníku', () => {
  it('první stupeň dostane Poklad, druhý Hrobku', () => {
    expect(defaultStoryId(2)).toBe('poklad')
    expect(defaultStoryId(5)).toBe('poklad')
    expect(defaultStoryId(6)).toBe('hrobka')
    expect(defaultStoryId(8)).toBe('hrobka')
  })

  it('výchozí stav vybere příběh i tajenku podle ročníku', () => {
    const shared = {
      grade: 7 as Grade,
      title: '',
      operations: { add: true, sub: true, mul: true, div: true },
      crossesTen: true,
    }
    const config = escapeModule.toConfig(escapeModule.initialState, shared, 'seed')
    expect(config.payload.story).toBe('hrobka')
    expect(config.payload.message).toBe('KLETBA')
  })

  it('soubor se vrátí jako „podle ročníku", jen když se s ročníkem shoduje', () => {
    const own = defaultEscapeConfig(7, 'seed', 'medium')
    own.payload.story = 'poklad'
    own.payload.message = 'VÝLET'
    expect(escapeModule.fromConfig(own)).toMatchObject({ story: 'poklad', message: 'VÝLET' })
    expect(escapeModule.fromConfig(defaultEscapeConfig(7, 'seed', 'medium'))).toMatchObject({
      story: 'auto',
      message: null,
    })
  })
})

describe('generátor únikové hry', () => {
  it.each([2, 3, 4, 5, 6, 7, 8] as Grade[])('%i. třída: dlouhá hra ve skupinách projde kontrolou', (grade) => {
    const sheet = sheetOf(game('long', `rocnik-${grade}`, { grade, mode: 'groups', groupCount: 6 }))
    expect(sheet.verification).toEqual({ ok: true })
    // Osm stanovišť na šest skupin se zaokrouhlí na dvanáct, dvě na skupinu.
    expect(sheet.stations).toHaveLength(12)
  })

  it('stanoviště má tolik příkladů, kolik má slovo písmen', () => {
    const sheet = sheetOf(game('medium', 'delka'))
    for (const station of sheet.stations) {
      expect(station.slots).toHaveLength(station.word.letters.length)
      expect(station.picks.length).toBeGreaterThanOrEqual(1)
      expect(station.picks.length).toBeLessThanOrEqual(ESCAPE_MAX_PICKS)
    }
  })

  it('ve skupinách se stanoviště zaokrouhlí na násobek skupin', () => {
    expect(escapeStationCount('short', 1)).toBe(4)
    expect(escapeStationCount('short', 3)).toBe(6)
    expect(escapeStationCount('short', 6)).toBe(6)
    expect(escapeStationCount('medium', 4)).toBe(8)
    expect(escapeStationCount('long', 4)).toBe(8)
    expect(escapeStationCount('long', 5)).toBe(10)
    const sheet = sheetOf(game('medium', 'skupiny', { mode: 'groups', groupCount: 4 }))
    expect(sheet.groups.map((group) => group.stations.length)).toEqual([2, 2, 2, 2])
    expect(sheet.groups.map((group) => group.name)).toEqual(['Modrá', 'Zelená', 'Žlutá', 'Červená'])
  })

  /*
   * Skupiny mají mít srovnatelně práce. Do 3. 10. 2026 se stanoviště
   * rozdávala dokola, a při 4 stanovištích a 3 skupinách dostala jedna
   * skupina až trojnásobek příkladů. Hlídá se každá kombinace nabízené
   * tajenky a počtu skupin, přes víc seedů.
   */
  it.each(
    LENGTHS.flatMap((length) =>
      [2, 3, 4, 5, 6].map((groupCount) => [length, groupCount] as [EscapeLength, number]),
    ),
  )('%s hra pro %i skupin: stejně stanovišť a vyrovnaná práce', (length, groupCount) => {
    for (let seed = 0; seed < 8; seed++) {
      const sheet = sheetOf(game(length, `vyrovnani-${seed}`, { mode: 'groups', groupCount }))
      expect(sheet.verification).toEqual({ ok: true })
      const counts = new Set(sheet.groups.map((group) => group.stations.length))
      expect(counts.size).toBe(1)
      const loads = sheet.groups.map((group) =>
        group.stations.reduce((sum, index) => sum + sheet.stations[index]!.slots.length, 0),
      )
      // Dvě úlohy jsou mez, kterou délky slov 4–6 v praxi drží; víc znamená,
      // že se vyrovnání rozbilo.
      expect(Math.max(...loads) - Math.min(...loads), loads.join(' / ')).toBeLessThanOrEqual(2)
    }
  })

  it('rozdání drží stejný počet stanovišť a vyrovná délky', () => {
    const lengths = [6, 6, 6, 4, 4, 4]
    const deal = dealToGroups(lengths, 3, createRng('rozdani'))
    expect(deal.map((indices) => indices.length)).toEqual([2, 2, 2])
    expect(deal.map((indices) => indices.reduce((sum, index) => sum + lengths[index]!, 0))).toEqual([10, 10, 10])
  })

  it('stejný seed dá stejnou hru', () => {
    const first = sheetOf(game('long', 'determinismus', { mode: 'groups' }))
    const second = sheetOf(game('long', 'determinismus', { mode: 'groups' }))
    expect(escapeChecksum(first)).toBe(escapeChecksum(second))
  })

  it('jiný seed dá jinou hru', () => {
    expect(escapeChecksum(sheetOf(game('short', 'a')))).not.toBe(escapeChecksum(sheetOf(game('short', 'b'))))
  })

  it('vlastní tajenka z písmen příběhu projde', () => {
    const sheet = sheetOf(game('short', 'vlastni', { message: 'MALÍ PIRÁTI' }))
    expect(sheet.verification).toEqual({ ok: true })
  })

  it('čárka v tajence nevadí a nehlásí se', () => {
    const sheet = sheetOf(game('long', 'carka'))
    expect(sheet.relaxations).toEqual([])
  })
})

describe('hlášky místo potichu upravené hry', () => {
  it('málo různých písmen na zvolenou délku', () => {
    const outcome = game('long', 'malo', { message: 'MAPA' })
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.reason).toContain('kratší hru')
  })

  it('moc různých písmen na zvolenou délku', () => {
    // Dlouhá tajenka má přesně dvanáct různých, tedy krátkou hru těsně unese.
    const outcome = game('short', 'moc', { message: 'POKLAD JE NÁŠ, KAPITÁNE, HURÁ' })
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.reason).toContain('delší hru')
  })

  it('víc skupin než stanovišť není chyba: každá skupina dostane jedno', () => {
    const sheet = sheetOf(game('short', 'skupiny', { mode: 'groups', groupCount: ESCAPE_GROUP_LIMITS.max }))
    expect(sheet.groups.map((group) => group.stations.length)).toEqual([1, 1, 1, 1, 1, 1])
  })

  it('písmeno, které nemá žádné slovo příběhu, se řekne jménem', () => {
    const outcome = game('short', 'chybi', { message: 'BYLO NEBYLO' })
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.reason).toContain('B')
  })

  it('tajenka bez písmen', () => {
    expect(game('short', 'prazdna', { message: '123 ?' }).ok).toBe(false)
  })
})

describe('kontrola řetězu chytí poškozenou hru', () => {
  const sheet = sheetOf(game('medium', 'retez', { mode: 'groups' }))
  /** Řetěz s měnitelnými poli — testy ho schválně poškozují. */
  type Editable = EscapeChain & {
    messageWords: string[]
    stations: { word: string; picks: string[] }[]
    groups: number[][]
  }
  const chain = (): Editable => ({
    messageLetters: sheet.message.letters,
    messageWords: messageWords(sheet.message),
    dictionary: new Set(sheet.story.words.map((entry) => plainWord(entry.word))),
    stations: sheet.stations.map((station) => ({ word: station.word.letters, picks: [...station.picks] })),
    groups: sheet.groups.map((group) => [...group.stations]),
    maxPicks: ESCAPE_MAX_PICKS,
  })
  const codes = (input: EscapeChain) => {
    const report = verifyEscapeChain(input)
    return report.ok ? [] : report.failures.map((failure) => failure.code)
  }

  it('nepoškozená hra projde', () => {
    expect(codes(chain())).toEqual([])
  })

  it('chybějící písmeno', () => {
    const broken = chain()
    broken.stations[0]!.picks.pop()
    if (broken.stations[0]!.picks.length === 0) broken.stations[0]!.picks.push(broken.stations[0]!.word[0]!)
    expect(codes(broken)).toContain('letter-uncovered')
  })

  it('totéž písmeno ze dvou slov', () => {
    const broken = chain()
    const letter = broken.stations[0]!.picks[0]!
    const other = broken.stations.findIndex((station, index) => index > 0 && station.word.includes(letter))
    if (other === -1) return
    broken.stations[other]!.picks.push(letter)
    expect(codes(broken)).toContain('letter-duplicate')
  })

  it('písmeno, které ve slově není', () => {
    const broken = chain()
    broken.stations[0]!.picks = ['Q']
    expect(codes(broken)).toEqual(expect.arrayContaining(['picked-letter-not-in-word', 'lock-mismatch']))
  })

  it('slovo mimo slovník, dvakrát totéž slovo, prázdná skupina', () => {
    const broken = chain()
    broken.stations[1]!.word = broken.stations[0]!.word
    broken.stations.push({ word: 'BAZEN', picks: ['B'] })
    broken.groups = [...broken.groups, []]
    expect(codes(broken)).toEqual(
      expect.arrayContaining(['duplicate-station-word', 'station-word-unknown', 'group-empty']),
    )
  })

  it('slovo stanoviště v tajence', () => {
    const broken = chain()
    broken.messageWords = [...broken.messageWords, broken.stations[0]!.word]
    expect(codes(broken)).toContain('station-word-in-tajenka')
  })

  it('víc než tři písmena ze slova', () => {
    const broken = chain()
    broken.stations[0]!.picks = ['A', 'B', 'C', 'D']
    expect(codes(broken)).toContain('station-picks-out-of-range')
  })
})

describe('papír a tabule', () => {
  it('list stanoviště nic nevyznačuje a název příběhu nenese', () => {
    const sheet = sheetOf(game('medium', 'papir', { mode: 'groups' }))
    const pages = escapeDocument(sheet).pages
    const stationPages = pages.filter((page) => page.label.includes('stanoviště') || page.label.startsWith('Stanoviště'))
    expect(stationPages).toHaveLength(ESCAPE_STATIONS.medium)

    for (const page of pages.slice(0, -1)) {
      const text = JSON.stringify(page.blocks)
      expect(text).not.toContain('Poklad')
      expect(text).not.toContain('POKLAD')
      for (const block of page.blocks) {
        if (block.kind === 'answer-row') expect(block.letters).toBeUndefined()
      }
    }
    expect(pages[pages.length - 1]!.label).toBe('Přehled pro učitele')
  })

  it('ve skupinách jdou stanoviště po skupinách a každé říká, kdy k tabuli', () => {
    const sheet = sheetOf(game('short', 'karty', { mode: 'groups', groupCount: 2 }))
    const pages = escapeDocument(sheet).pages
    // Karta skupiny je pryč (4. 10. 2026): jen stanoviště a přehled.
    expect(pages.map((page) => page.label)).toEqual([
      'Skupina Modrá · stanoviště 1 z 2',
      'Skupina Modrá · stanoviště 2 z 2',
      'Skupina Zelená · stanoviště 1 z 2',
      'Skupina Zelená · stanoviště 2 z 2',
      'Přehled pro učitele',
    ])
    const last = pages[0]!.blocks.at(-1)!
    expect(last.kind === 'paragraph' && last.runs.map((run) => run.text).join('')).toBe(
      'Až bude mít vaše skupina obě slova, jděte k tabuli, vyberte barvu skupiny (modrá) a slova zadejte.',
    )
  })

  it('v celé třídě pokyn k tabuli na listu není', () => {
    const pages = escapeDocument(sheetOf(game('short', 'trida'))).pages
    expect(pages[0]!.blocks.at(-1)!.kind).toBe('answer-row')
  })

  it('zámek dostane slova i písmena všech stanovišť', () => {
    const sheet = sheetOf(game('short', 'zamek'))
    const screen = escapeScreen(sheet)
    expect(screen.stations.map((station) => station.word)).toEqual(sheet.stations.map((s) => s.word.letters))
    expect(screen.groups).toHaveLength(1)
    expect(screen.messageLetters.join('')).toBe('POKLAD')
  })
})

describe('výběr odpovědí', () => {
  it('druhá třída ho dostane sama, ostatní šifrovací tabulku', () => {
    expect(defaultEscapeConfig(2, 'v').payload.stationKind).toBe('choice')
    expect(defaultEscapeConfig(3, 'v').payload.stationKind).toBe('grid')
  })

  it.each([2, 3, 4, 5, 6, 7, 8] as Grade[])('%i. třída: dlouhá hra s výběrem projde kontrolou', (grade) => {
    for (let seed = 0; seed < 4; seed++) {
      const sheet = sheetOf(game('long', `vyber-${grade}-${seed}`, { grade, stationKind: 'choice', mode: 'groups' }))
      expect(sheet.verification).toEqual({ ok: true })
      const max = sheet.config.payload.difficulty.numberRange.max
      for (const station of sheet.stations) {
        expect(station.table).toBeNull()
        station.slots.forEach((slot, index) => {
          expect(slot.options).toHaveLength(3)
          // Správná je právě jedna a nese písmeno slova.
          const correct = slot.options.filter((option) => option.value === slot.task.value)
          expect(correct).toHaveLength(1)
          expect(correct[0]!.letter).toBe(station.word.letters[index])
          for (const option of slot.options) {
            expect(option.value).toBeGreaterThan(0)
            expect(option.value).toBeLessThanOrEqual(Math.max(max, slot.task.value))
          }
        })
      }
    }
  })

  /*
   * Kvůli tomu výběr vznikl: v souřadnicové tabulce je výsledek kód 11–99,
   * takže podíl malé násobilky (jednociferný) do druhé třídy neprošel.
   */
  it('do druhé třídy se dostane dělení', () => {
    const operators = new Set<string>()
    for (let seed = 0; seed < 5; seed++) {
      const sheet = sheetOf(game('medium', `deleni-${seed}`, { grade: 2 }))
      for (const station of sheet.stations) {
        for (const slot of station.slots) operators.add(slot.task.prompt.text.includes(':') ? ':' : 'jiné')
      }
    }
    expect(operators.has(':')).toBe(true)
  })

  it('správná odpověď není pořád na stejném místě', () => {
    const positions = new Set<number>()
    const sheet = sheetOf(game('long', 'pozice', { grade: 2 }))
    for (const station of sheet.stations) {
      for (const slot of station.slots) positions.add(slot.options.findIndex((option) => option.value === slot.task.value))
    }
    expect(positions).toEqual(new Set([0, 1, 2]))
  })

  it('list má kroužkování místo tabulky, přehled má správná písmena', () => {
    const sheet = sheetOf(game('short', 'list-vyber', { grade: 2 }))
    const pages = escapeDocument(sheet).pages
    const kinds = pages[0]!.blocks.map((block) => block.kind)
    expect(kinds).toContain('choice-list')
    expect(kinds).not.toContain('cipher-table')

    const overview = pages[pages.length - 1]!
    const solution = overview.blocks.find((block) => block.kind === 'table-sections')
    if (solution?.kind !== 'table-sections') throw new Error('chybí řešení stanovišť')
    const letters = solution.sections.flatMap((section) => section.rows.map((row) => row[2])).join('')
    expect(letters).toBe(sheet.stations.map((station) => station.word.letters).join(''))
  })

  it('kontrola chytí dvě stejná písmena i chybějící výsledek', () => {
    const slot = { taskText: '7 + 5', declaredValue: 12, kind: 'expr' as const }
    const codes = (options: { letter: string; value: number }[]) => {
      const report = verifyChoiceSheet({ slots: [{ ...slot, options }], expectedMessage: 'K' })
      return report.ok ? [] : report.failures.map((failure) => failure.code)
    }
    expect(codes([{ letter: 'K', value: 12 }, { letter: 'M', value: 13 }, { letter: 'T', value: 2 }])).toEqual([])
    expect(codes([{ letter: 'K', value: 12 }, { letter: 'K', value: 13 }, { letter: 'T', value: 2 }])).toContain(
      'choice-ambiguous',
    )
    expect(codes([{ letter: 'K', value: 11 }, { letter: 'M', value: 13 }, { letter: 'T', value: 2 }])).toContain(
      'choice-missing-answer',
    )
  })
})

describe('payload', () => {
  const config = defaultEscapeConfig(5, 'payload', 'medium', 'groups')
  const clone = (value: unknown) => JSON.parse(JSON.stringify(value)) as unknown

  it('projde cestou tam a zpátky', () => {
    expect(parseEscapePayload(clone(config.payload))).toEqual(config.payload)
  })

  it('soubor bez druhu stanoviště má šifrovací tabulku', () => {
    const { stationKind: _, ...older } = config.payload
    expect(parseEscapePayload(clone(older))?.stationKind).toBe('grid')
  })

  it('neznámý příběh se odmítne', () => {
    expect(parseEscapePayload({ ...config.payload, story: 'drak' })).toBeNull()
  })

  it('nesmyslná délka nebo režim se odmítne, počet skupin se ořízne', () => {
    expect(parseEscapePayload({ ...config.payload, length: 'nekonecna' })).toBeNull()
    expect(parseEscapePayload({ ...config.payload, mode: 'zavod' })).toBeNull()
    expect(parseEscapePayload({ ...config.payload, groupCount: 99 })?.groupCount).toBe(ESCAPE_GROUP_LIMITS.max)
  })
})
