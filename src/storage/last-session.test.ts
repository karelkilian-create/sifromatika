/**
 * Testy zapamatovaného nastavení.
 *
 * Běží bez prohlížeče, takže si `localStorage` podstrčí samy. Zajímavé jsou
 * hlavně případy, kdy úložiště selže: tam se nesmí stát nic než prázdný
 * formulář.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { checksumForConfig, configFor, initialActivityStates } from '../activities/registry.js'
import type { SharedEditorState } from '../activities/contract.js'
import type { ProjectConfig } from '../core/model/index.js'
import { readLastSession, saveLastSession } from './last-session.js'

const shared: SharedEditorState = {
  grade: 5,
  title: 'Zkouška paměti',
  operations: { add: true, sub: true, mul: false, div: true },
}

function config(): ProjectConfig {
  return configFor('cipher-grid', initialActivityStates(), shared, 'pamet-seed')
}

/** Úložiště v paměti, ať testy nezávisí na prohlížeči ani jeden na druhém. */
function fakeStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => data.delete(key),
    setItem: (key: string, value: string) => data.set(key, value),
  } as Storage
}

function useStorage(store: Storage | undefined): void {
  Object.defineProperty(globalThis, 'localStorage', { value: store, configurable: true })
}

afterEach(() => {
  useStorage(undefined)
})

describe('zapamatované nastavení', () => {
  it('uložené nastavení se vrátí i se semínkem', () => {
    useStorage(fakeStorage())
    const original = config()
    const checksum = checksumForConfig(original)
    if (checksum === null) throw new Error('Z konfigurace nevznikl list')

    saveLastSession(original, checksum)
    const restored = readLastSession()

    expect(restored?.config).toEqual(original)
    // Semínko je to, co dělá rozdíl mezi „moje včerejší tajenka" a „jiná
    // varianta téhož zadání". Bez něj by se učiteli list zítra změnil.
    expect(restored?.config.seed).toBe(original.seed)
    expect(restored?.checksum).toBe(checksum)
  })

  it('bez uloženého záznamu se nic nevrací', () => {
    useStorage(fakeStorage())
    expect(readLastSession()).toBeNull()
  })

  it('poškozený záznam je totéž jako žádný — bez hlášky a bez výjimky', () => {
    const store = fakeStorage()
    useStorage(store)

    for (const junk of ['', 'nesmysl', '{}', '{"format":"neco-jineho"}', '[]']) {
      store.setItem('sifromatika:posledni:1', junk)
      expect(readLastSession()).toBeNull()
    }
  })

  it('chybějící úložiště nic neshodí', () => {
    useStorage(undefined)
    expect(() => saveLastSession(config(), 'abc')).not.toThrow()
    expect(readLastSession()).toBeNull()
  })

  it('úložiště, které hází výjimky, nic neshodí', () => {
    // Soukromé okno, zakázané cookies, zaplněná kvóta — všechno tohle vypadá
    // takhle. Zapamatování je pohodlí, ne funkce; nesmí zabít start aplikace.
    useStorage({
      getItem: () => {
        throw new Error('zakázáno')
      },
      setItem: () => {
        throw new Error('kvóta')
      },
    } as unknown as Storage)

    expect(() => saveLastSession(config(), 'abc')).not.toThrow()
    expect(readLastSession()).toBeNull()
  })
})
