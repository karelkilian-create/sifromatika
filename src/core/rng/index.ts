/**
 * Seedovaný generátor pseudonáhodných čísel.
 *
 * `Math.random()` se v celém projektu NESMÍ použít. Determinismus je základ:
 *  - `.sifra` ukládá jen konfiguraci + seed a všechno ostatní dopočítá,
 *  - diagnostika od učitele musí jít přesně zopakovat,
 *  - golden testy porovnávají výstup pro daný seed napříč platformami.
 *
 * Algoritmus: xmur3 (seed → 32 bit) + mulberry32 (32 bit → sekvence).
 * Obojí je zvolené pro krátkost a stabilitu, nikoli pro kryptografickou kvalitu.
 * Ta tu není potřeba a nebude — na šifrovací hru pro třeťáky stačí, že to
 * vypadá promíchaně a chová se to pokaždé stejně.
 *
 * ⚠ Změna kteréhokoli řádku níže mění výstup pro všechny existující seedy.
 *   Vyžaduje inkrement `generatorVersion` v ProjectConfig.
 */

export interface Rng {
  /** Rovnoměrně v [0, 1). */
  next(): number
  /** Celé číslo v [min, max] — obě meze VČETNĚ. */
  int(min: number, max: number): number
  /** Náhodný prvek. Vyhodí chybu pro prázdné pole — tichý `undefined` by se propašoval do listu. */
  pick<T>(items: readonly T[]): T
  /** Nové promíchané pole; vstup zůstává beze změny. */
  shuffle<T>(items: readonly T[]): T[]
  /** Výběr podle vah. Nekladné váhy se ignorují. */
  weighted<T>(entries: readonly (readonly [T, number])[]): T
  /** true s pravděpodobností `p`. */
  chance(p: number): boolean
}

/** Řetězcový seed → 32bitové celé číslo. */
function xmur3(seed: string): number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

export function createRng(seed: string): Rng {
  let state = xmur3(seed)

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (min: number, max: number): number => {
    if (max < min) throw new RangeError(`Rng.int: prázdný interval [${min}, ${max}]`)
    return min + Math.floor(next() * (max - min + 1))
  }

  const pick = <T,>(items: readonly T[]): T => {
    if (items.length === 0) throw new RangeError('Rng.pick: prázdné pole')
    return items[int(0, items.length - 1)]!
  }

  const shuffle = <T,>(items: readonly T[]): T[] => {
    const out = [...items]
    // Fisher–Yates odzadu.
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i)
      ;[out[i], out[j]] = [out[j]!, out[i]!]
    }
    return out
  }

  const weighted = <T,>(entries: readonly (readonly [T, number])[]): T => {
    const usable = entries.filter(([, w]) => w > 0)
    if (usable.length === 0) throw new RangeError('Rng.weighted: žádná kladná váha')
    const total = usable.reduce((sum, [, w]) => sum + w, 0)
    let threshold = next() * total
    for (const [item, weight] of usable) {
      threshold -= weight
      if (threshold < 0) return item
    }
    // Nedosažitelné až na zaokrouhlovací chybu v plovoucí čárce.
    return usable[usable.length - 1]![0]
  }

  const chance = (p: number): boolean => next() < p

  return { next, int, pick, shuffle, weighted, chance }
}

/**
 * Nový náhodný seed pro tlačítko „Jiná varianta".
 *
 * Tohle je jediné místo v projektu, kde smí být nedeterminismus — vzniká tu
 * nový seed, který se hned uloží do konfigurace a od té chvíle je vše dané.
 */
export function randomSeed(): string {
  return Math.floor(Math.random() * 0xffffffff).toString(36)
}
