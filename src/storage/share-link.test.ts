/**
 * Testy odkazu na list.
 *
 * Parametrizované registrem, ne vyjmenované — nová aktivita se sem přidá sama
 * a rovnou se pozná, když se do odkazu nevejde nebo se z něj nevrátí stejná.
 */

import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  activityModules,
  checksumForConfig,
  configFor,
  initialActivityStates,
} from '../activities/registry.js'
import type { SharedEditorState } from '../activities/contract.js'
import { MESSAGE_LETTER_LIMITS } from '../core/constraints/index.js'
import type { ActivityId, ProjectConfig } from '../core/model/index.js'
import { buildShareLink, readShareLink } from './share-link.js'
import { buildSifraFile } from './sifra.js'

const ids = Object.keys(activityModules) as ActivityId[]

const BASE = 'https://sifromatika.cz/'

/** Netriviální nastavení: výchozí hodnoty by zamaskovaly ztrátu pole. */
const shared: SharedEditorState = {
  grade: 5,
  title: 'Zkouška odkazu',
  operations: { add: true, sub: true, mul: true, div: false },
}

function configOf(activity: ActivityId, overrides: Partial<SharedEditorState> = {}): ProjectConfig {
  return configFor(activity, initialActivityStates(), { ...shared, ...overrides }, 'odkaz-seed')
}

/** Odkaz → fragment, tak jak ho aplikaci podá `location.hash`. */
function hashOf(link: string): string {
  return `#${link.split('#')[1] ?? ''}`
}

/** Zkratka pro odkaz sestavený z konfigurace i s jejím kontrolním součtem. */
function linkFor(config: ProjectConfig): string {
  const checksum = checksumForConfig(config)
  if (checksum === null) throw new Error('Z konfigurace nevznikl list')
  return buildShareLink(BASE, config, checksum)
}

describe('odkaz na list — tam a zpátky', () => {
  it.each(ids)('%s: z odkazu se vrátí tatáž konfigurace i tentýž list', (activity) => {
    const config = configOf(activity)
    const parsed = readShareLink(hashOf(linkFor(config)))

    expect(parsed?.ok).toBe(true)
    if (parsed === null || !parsed.ok) return

    expect(parsed.file.config).toEqual(config)
    // Konfigurace může sedět a list se přesto lišit, kdyby se cestou ztratil
    // seed. Kontrolní součet je jediné, co to pozná.
    expect(checksumForConfig(parsed.file.config)).toBe(checksumForConfig(config))
  })

  it('odkaz sedí na tentýž obsah jako soubor .sifra', () => {
    const config = configOf('cipher-grid')
    const checksum = checksumForConfig(config)
    if (checksum === null) throw new Error('Z konfigurace nevznikl list')

    const parsed = readShareLink(hashOf(buildShareLink(BASE, config, checksum)))
    expect(parsed?.ok).toBe(true)
    if (parsed === null || !parsed.ok) return

    // Soubor a odkaz jsou dva obaly téhož. Kdyby se hlavička odkazu stavěla
    // po svém, tenhle test padne dřív, než se rozejdou v ruce učitele.
    expect(parsed.file).toEqual(buildSifraFile(config, checksum))
  })

  it('diakritika v tajence i v názvu přežije', () => {
    const config = configOf('cipher-grid', { title: 'Vánoční stezka — 5. třída' })
    const parsed = readShareLink(hashOf(linkFor(config)))

    expect(parsed?.ok).toBe(true)
    if (parsed === null || !parsed.ok) return
    expect(parsed.file.config.title).toBe('Vánoční stezka — 5. třída')
    if (parsed.file.config.activity !== 'cipher-grid') throw new Error('Očekávána šifra')
    expect(parsed.file.config.payload.message).toBe('POKLAD JE U BAZÉNU')
  })

  it('název plný znaků z URL se nerozbije o vlastní odkaz', () => {
    // `#`, `=`, `&` a `%` mají v URL svůj význam. V base64url žádný z nich není,
    // takže se do fragmentu nemají jak dostat — a tenhle test to drží.
    const config = configOf('pexeso', { title: 'A#B=C&D%E+F/G?H' })
    const parsed = readShareLink(hashOf(linkFor(config)))

    expect(parsed?.ok).toBe(true)
    if (parsed === null || !parsed.ok) return
    expect(parsed.file.config.title).toBe('A#B=C&D%E+F/G?H')
  })

  it('libovolný název projde beze změny', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'grapheme' }), (title) => {
        const config = configOf('sequence-sheet', { title })
        const parsed = readShareLink(hashOf(linkFor(config)))
        return parsed !== null && parsed.ok && parsed.file.config.title === config.title
      }),
      { numRuns: 40 }, // generování listu je drahé, tolik stačí
    )
  })
})

describe('odkaz na list — nedůvěryhodný vstup', () => {
  it('bez fragmentu se nic neděje', () => {
    expect(readShareLink('')).toBeNull()
    expect(readShareLink('#')).toBeNull()
    expect(readShareLink('#neco=jineho')).toBeNull()
  })

  const broken: [string, string][] = [
    ['prázdný klíč', '#s='],
    ['obsah není base64url', '#s=@@@@'],
    ['base64url, ale ne JSON', `#s=${btoa('tohle není JSON')}`],
    ['JSON, ale ne .sifra', `#s=${btoa('{"format":"neco-jineho"}')}`],
    ['neznámá aktivita', `#s=${btoa('{"format":"sifromatika","schemaVersion":1,"checksum":"x","config":{"schemaVersion":1,"generatorVersion":5,"appVersion":"0.1.0-dev","seed":"a","activity":"kviz","payload":{}}}')}`],
  ]

  it.each(broken)('%s: hláška, ne výjimka', (_name, hash) => {
    const parsed = readShareLink(hash)
    expect(parsed?.ok).toBe(false)
    if (parsed === null || parsed.ok) return
    // Učitel drží v ruce odkaz, ne soubor — hláška o souboru by ho poslala
    // hledat něco, co nemá.
    expect(parsed.error.toLowerCase()).toContain('odkaz')
  })

  it('useknutý odkaz se nepřečte jako kratší list', () => {
    const link = linkFor(configOf('cipher-grid'))
    const hash = hashOf(link)

    // Mailový klient dlouhý odkaz zalomí a člověk zkopíruje jen půlku.
    for (const cut of [0.25, 0.5, 0.75, 0.9]) {
      const parsed = readShareLink(hash.slice(0, Math.floor(hash.length * cut)))
      expect(parsed?.ok).toBe(false)
    }
  })
})

describe('odkaz na list — délka', () => {
  const LIMIT = 1500

  it.each(ids)('%s: nejdelší zadání se vejde pod strop', (activity) => {
    const config = configOf(activity, {
      // Nejdelší název, jaký učitel rozumně napíše, a u šifry k tomu nejdelší
      // přípustná tajenka (`MESSAGE_LETTER_LIMITS.max`) plným písmem.
      title: 'Ě'.repeat(60),
    })
    if (config.activity === 'cipher-grid') {
      config.payload.message = 'Ř'.repeat(MESSAGE_LETTER_LIMITS.max)
    }
    const checksum = checksumForConfig(config) ?? 'x'.repeat(16)

    // Pojistka proti tomu, aby budoucí pole v konfiguraci nafoukla odkaz,
    // aniž by si toho někdo všiml. Strop není technický limit fragmentu
    // (ten je řádově dál), ale mez čitelnosti v Messengeru a v mailu.
    expect(buildShareLink(BASE, config, checksum).length).toBeLessThan(LIMIT)
  })
})
