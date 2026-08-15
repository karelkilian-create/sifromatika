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
import type { ActivityId } from '../core/model/index.js'
import { parseSifra, serializeSifra } from '../storage/sifra.js'
import type { SharedEditorState } from './contract.js'
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
    for (const value of ['bingo', 'pexeso', '', 'cipher', null, 42]) {
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

  it.each(ids)('%s: každá aktivita dá pracovní list i řešení', (id) => {
    const run = runActivity(id, initialActivityStates(), shared, 'registr-stranky')
    // Dva listy jsou závazek vůči učiteli, ne detail sazby: bez řešení nemá
    // čím opravovat. Viz docs/rozsah-0.1.md a poznámka o dvou listech v UI.
    expect(run.document?.pages.map((page) => page.label)).toEqual(['Pracovní list', 'Řešení'])
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
