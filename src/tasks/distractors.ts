/**
 * Špatné odpovědi k příkladu s výběrem — takové, ke kterým dítě opravdu dojde.
 *
 * Náhodné číslo jako špatná odpověď nic neprověří: `7 + 5` s nabídkou 12, 83
 * a 41 vyřeší i ten, kdo nepočítá. Odpověď, která vyjde z typické chyby,
 * naopak chybu chytí — a protože má jiné písmeno, dítěti nevyjde slovo
 * a ví, že se má vrátit. Nápad z únikovek v Genially (`57 − 7 · 4` nabízí
 * 200, tedy výpočet bez přednosti násobení).
 *
 * Typické chyby se poznají jen u jednoduchého `a ○ b`. U složitějšího zadání
 * zbudou odpovědi o kousek vedle; i ty chytí překlep o jedničku.
 *
 * O šifrách ani aktivitách tenhle modul neví nic — dostane úlohu a vrátí čísla.
 */

import type { Task } from '../core/model/index.js'
import type { Rng } from '../core/rng/index.js'

const SIMPLE = /^(\d+) ([+−·:]) (\d+)$/u

/** Typické chyby u `a ○ b`. Nejsou to odpovědi, jen kandidáti. */
function typicalErrors(a: number, operator: string, b: number): number[] {
  const units = (n: number) => n % 10
  const tens = (n: number) => Math.floor(n / 10)
  switch (operator) {
    case '+':
      return [
        a - b, // zaměněná operace
        // zapomenutý přechod přes desítku: 27 + 15 → 32
        units(a) + units(b) >= 10 ? (tens(a) + tens(b)) * 10 + units(units(a) + units(b)) : a + b + 10,
      ]
    case '−':
      return [
        a + b,
        // menší od většího v jednotkách: 15 − 8 → 13
        units(a) < units(b) ? (tens(a) - tens(b)) * 10 + (units(b) - units(a)) : a - b - 10,
      ]
    case '·':
      return [a + b, a * (b + 1), a * (b - 1)]
    case ':':
      return [a - b, b, a / b + 1, a / b - 1]
    default:
      return []
  }
}

/**
 * `count` různých špatných odpovědí k úloze. Vždy celá kladná čísla nejvýš
 * `max`, různá od správného výsledku a od sebe navzájem.
 *
 * `max` je horní mez oboru ročníku. Druhák počítá do sta, takže `148` mezi
 * odpověďmi vyloučí i ten, kdo nepočítá; stejně tak nula u `33 + 33`.
 *
 * Typické chyby mají přednost; doplní se odpověďmi o jedna, dva a deset
 * vedle. Losuje se, aby správná odpověď nebyla poznat podle toho, že je
 * vždycky „ta prostřední".
 */
export function distractorsFor(task: Task, count: number, max: number, rng: Rng): number[] {
  const value = task.value
  const match = SIMPLE.exec(task.prompt.text)
  const typical = match ? typicalErrors(Number(match[1]), match[2]!, Number(match[3])) : []
  const near = [value + 1, value - 1, value + 10, value - 10, value + 2, value - 2]

  const usable = (candidate: number) =>
    Number.isInteger(candidate) && candidate > 0 && candidate <= max && candidate !== value

  const picked: number[] = []
  for (const pool of [rng.shuffle(typical), rng.shuffle(near)]) {
    for (const candidate of pool) {
      if (picked.length === count) return picked
      if (usable(candidate) && !picked.includes(candidate)) picked.push(candidate)
    }
  }
  // Pojistka pro okraje oboru, kde `near` z velké části vypadne: nahoru od
  // výsledku, a když není kam, dolů.
  for (let step = 3; picked.length < count; step++) {
    for (const candidate of [value + step, value - step]) {
      if (picked.length < count && usable(candidate) && !picked.includes(candidate)) picked.push(candidate)
    }
    if (step > max) throw new RangeError(`Ke ${value} nejde najít ${count} špatné odpovědi do ${max}.`)
  }
  return picked
}
