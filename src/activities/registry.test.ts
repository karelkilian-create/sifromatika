/**
 * Testy kontraktu aktivit.
 *
 * Píšou se jednou a platí pro každou budoucí aktivitu — jsou parametrizované
 * registrem, ne vyjmenované. Přesně to je jejich smysl: zapomenutá větev
 * v parseru dřív znamenala soubor, který jde uložit a nejde otevřít, a nic
 * na to neupozornilo. Odsud dál se to pozná hned u nové aktivity.
 *
 * Co nejde otestovat za běhu, hlídá překladač: `ActivityId` bez modulu
 * v registru je chyba překladu (`satisfies Record<ActivityId, …>`).
 */

import { describe, expect, it } from 'vitest'
import { CARD_VALUE_MAX } from '../core/constraints/index.js'
import type { ActivityId, Grade, Task } from '../core/model/index.js'
import { parseSifra, serializeSifra } from '../storage/sifra.js'
import type { ActivitySheet, SharedEditorState } from './contract.js'
import {
  activityCatalog,
  activityModules,
  activityStateFromConfig,
  checksumForConfig,
  configFor,
  initialActivityStates,
  isActivityId,
  isAvailableActivity,
  runActivity,
} from './registry.js'
import { sharedFromConfig } from './shared-state.js'

const ids = Object.keys(activityModules) as ActivityId[]

/** Netriviální nastavení: kdyby se cokoli ztrácelo, výchozí hodnoty to zamaskují. */
const shared: SharedEditorState = {
  grade: 5,
  title: 'Zkouška registru',
  operations: { add: true, sub: true, mul: true, div: false },
}

describe('katalog aktivit', () => {
  it('každá dostupná položka katalogu má modul', () => {
    for (const entry of activityCatalog) {
      if (entry.available) expect(entry.id in activityModules).toBe(true)
    }
  })

  it('připravované aktivity modul nemají a vybrat je nejde', () => {
    for (const entry of activityCatalog) {
      if (!entry.available) {
        expect(entry.id in activityModules).toBe(false)
        expect(isAvailableActivity(entry.id)).toBe(false)
      }
    }
  })

  it.each(ids)('%s: je v katalogu označená jako dostupná', (id) => {
    expect(isAvailableActivity(id)).toBe(true)
    expect(isActivityId(id)).toBe(true)
  })

  it('id z novější verze neprojde jako známé', () => {
    // Domino a bingo tu bývaly taky — od chvíle, kdy existují, jsou to známá id.
    for (const value of ['magicky-ctverec', 'osmismerka', '', 'cipher', null, 42]) {
      expect(isActivityId(value)).toBe(false)
    }
  })
})

describe('kontrakt aktivity', () => {
  it.each(ids)('%s: vygeneruje ověřený list a k němu stránky', (id) => {
    const run = runActivity(id, initialActivityStates(), shared, 'registr-nahled')

    expect(run.outcome.ok).toBe(true)
    if (!run.outcome.ok) return
    // Neověřený list se nesmí dostat k tisku, takže ani do dokumentu.
    expect(run.outcome.sheet.verification.ok).toBe(true)
    expect(run.document).not.toBeNull()
    expect(run.outcome.sheet.title.length).toBeGreaterThan(0)
  })

  it.each(ids)('%s: učitel vždycky dostane výsledky na vlastní stránce', (id) => {
    const run = runActivity(id, initialActivityStates(), shared, 'registr-stranky')
    const pages = run.document?.pages ?? []

    // Podklad pro učitele je závazek, ne detail sazby: bez výsledků nemá čím
    // opravovat. KOLIK stránek jich je, se ale aktivita od aktivity liší —
    // šifra má list a řešení, pexeso dvě stránky kartiček a k tomu seznam.
    // Test proto hlídá ten závazek, ne konkrétní počet.
    expect(pages.length).toBeGreaterThanOrEqual(2)

    const last = pages[pages.length - 1]!
    expect(
      last.blocks.some((block) => block.kind === 'table'),
      `poslední stránka „${last.label}" nemá tabulku s výsledky`,
    ).toBe(true)
  })

  /*
   * Kartičková hra se počítá z hlavy u stolu, ne tužkou na papíře. Profil
   * ročníku je psaný pro pracovní list — šestka, osmička i devítka mají obor
   * do deseti tisíc — takže bez `cardGameProfile` vycházelo šesťákovi na
   * pexesu `9678 − 4658 = 5020`. Hlídá se to i tady, ne jen ve snímku:
   * snímek chytí změnu jednoho seedu, tohle to pravidlo.
   */
  it.each([
    ['pexeso', 6],
    ['pexeso', 8],
    ['domino', 6],
    ['domino', 9],
    ['bingo', 6],
    ['bingo', 8],
  ] as [ActivityId, Grade][])('%s v %i. ročníku nepřeleze na kartičce tisícovku', (id, grade) => {
    for (let seed = 0; seed < 5; seed++) {
      const run = runActivity(id, initialActivityStates(), { ...shared, grade }, `obor-${id}-${seed}`)
      expect(run.outcome.ok).toBe(true)
      if (!run.outcome.ok) return

      // Úlohy nejsou v `ActivitySheet` — šifra je má ve `slots` s kódem
      // políčka, hry v `tasks`. Zúžení je tu proto schválně: kontrakt kvůli
      // testu rozšiřovat nechci, tenhle test se ptá jen her.
      const { tasks } = run.outcome.sheet as ActivitySheet & { tasks: readonly Task[] }
      expect(tasks.length).toBeGreaterThan(0)

      for (const task of tasks) {
        expect(Math.abs(task.value), `${task.prompt.text} = ${task.value}`).toBeLessThanOrEqual(
          CARD_VALUE_MAX,
        )
        // Nejen výsledek: `9678 − 8678 = 1000` je pro kartičku stejně mimo.
        for (const number of task.prompt.text.matchAll(/\d+(?:,\d+)?/gu)) {
          const value = Number(number[0]!.replace(',', '.'))
          expect(value, task.prompt.text).toBeLessThanOrEqual(CARD_VALUE_MAX)
        }
      }
    }
  })

  it('učitelská stránka není mezi tím, co se rozdává dětem', () => {
    // U pexesa je to jediné, co brání tomu, aby učitel rozdal i řešení:
    // seznam dvojic musí být až za kartičkami, ne mezi nimi.
    const run = runActivity('pexeso', initialActivityStates(), shared, 'registr-poradi')
    const labels = run.document?.pages.map((page) => page.label) ?? []

    expect(labels[labels.length - 1]).toBe('Pro učitele')
    expect(labels.slice(0, -1).every((label) => label.startsWith('Kartičky'))).toBe(true)
  })

  it.each(ids)('%s: formulář → konfigurace → formulář nic neztratí', (id) => {
    const states = initialActivityStates()
    const config = configFor(id, states, shared, 'registr-kolecko')

    expect(config.activity).toBe(id)
    expect(sharedFromConfig(config)).toEqual(shared)
    expect(activityStateFromConfig(config)).toEqual({ [id]: states[id] })
  })

  it.each(ids)('%s: uložení do .sifra a otevření dá tutéž konfiguraci', (id) => {
    const config = configFor(id, initialActivityStates(), shared, 'registr-soubor')
    const checksum = checksumForConfig(config)
    if (checksum === null) throw new Error(`${id}: z konfigurace nevznikl list`)

    const parsed = parseSifra(serializeSifra(config, checksum))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.file.config).toEqual(config)
    // A hlavně: dopočítaný list je tentýž, jaký učitel ukládal.
    expect(checksumForConfig(parsed.file.config)).toBe(checksum)
  })

  it.each(ids)('%s: parsePayload odmítne balast místo pádu', (id) => {
    for (const raw of [null, undefined, 'text', 42, true, [], {}, { payload: 1 }]) {
      expect(activityModules[id].parsePayload(raw)).toBeNull()
    }
  })

  it.each(ids)('%s: tentýž seed dá tentýž kontrolní součet', (id) => {
    const config = configFor(id, initialActivityStates(), shared, 'registr-determinismus')
    expect(checksumForConfig(config)).toBe(checksumForConfig(config))
  })
})
