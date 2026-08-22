/**
 * Míchání témat — losování generátoru a překlad zaškrtávátek na váhy.
 *
 * Do verze s pexesem stál tenhle kód dvakrát doslova stejně (v šifře
 * a v pexesu) a u druhé kopie byla poznámka „až přibude domino, bude důvod".
 * Ten důvod přišel: třetí kopie je ta, u které se opravy začnou rozcházet.
 *
 * ⚠ Nic tady NESMÍ změnit pořadí dotazů na generátor náhody. Kdyby se
 *   změnilo, rozejdou se golden snapshoty a s nimi každá `.sifra`, kterou má
 *   někdo uloženou. Proto se sem kód přesunul beze změny těla — refaktoring,
 *   ne vylepšení.
 *
 * Patří do `tasks`, a ne do `activities`, protože obojí je vlastnost vrstvy
 * úloh: která témata existují a jak se mezi nimi losuje. Aktivita jen říká,
 * co má učitel zaškrtnuté.
 */

import type { DifficultyProfile } from '../core/model/index.js'
import type { Rng } from '../core/rng/index.js'

/**
 * Který generátor dostane tuhle hodnotu.
 *
 * ⚠ Jediný generátor se vrací BEZ dotazu na `rng`. Není to optimalizace:
 *   kdyby se i v tom případě losovalo, posunula by se celá sekvence
 *   náhodných čísel a listy uložené před přidáním dalších generátorů by se
 *   vytiskly jinak.
 */
export function pickGenerator<T extends { id: string }>(
  generators: readonly T[],
  weights: Readonly<Record<string, number>>,
  rng: Rng,
): T {
  if (generators.length === 1) return generators[0]!
  return rng.weighted(generators.map((generator) => [generator, weights[generator.id] ?? 1] as const))
}

/**
 * Témata tak, jak je vidí učitel ve formuláři.
 *
 * Jména jsou z formuláře („sequences"), ne z registru generátorů
 * („sequence"). Překlad mezi obojím dělá `generatorMixFromTopics` — a je to
 * jediné místo, kde se ta dvě názvosloví potkají.
 */
export interface TopicSelection {
  /** Běžné příklady (`7 · 8`). U her se smí vypnout, u šifry ne. */
  arithmetic: boolean
  /** Číselné řady (`4 10 16 22 ?`). */
  sequences: boolean
  /** Desetinná čísla (`3,5 · 4`). Od 5. ročníku. */
  decimals: boolean
  /** Procenta (`25 % z 80`). Od 7. ročníku. */
  percents: boolean
  /** Mocniny a odmocniny (`7²`, `√81`). Od 8. ročníku. */
  powers: boolean
  /** Zlomky jako část celku (`3/4 z 80`). Od 7. ročníku. */
  fractions: boolean
}

/**
 * Zaškrtávátka → váhy generátorů. Váhy jsou rovnoměrné.
 *
 * Téma, které ročník neumí, se do mixu nedostane, i kdyby ve formuláři
 * zůstalo zaškrtnuté po přepnutí ročníku. Bez téhle pojistky by osmák
 * s mocninami přepnutý na šestou třídu dostal místo hry hlášku, že pro
 * tuhle obtížnost není žádný generátor.
 *
 * Prázdný výběr se nahradí samotnou aritmetikou — z ničeho se hra nesloží.
 */
export function generatorMixFromTopics(
  topics: TopicSelection,
  profile: DifficultyProfile,
): Record<string, number> {
  const usable = usableTopics(topics, profile)
  const mix: Record<string, number> = {}
  if (usable.arithmetic) mix.arithmetic = 1
  if (usable.sequences) mix.sequence = 1
  if (usable.decimals) mix.decimal = 1
  if (usable.percents) mix.percent = 1
  if (usable.powers) mix.powers = 1
  if (usable.fractions) mix.fractions = 1
  return Object.keys(mix).length > 0 ? mix : { arithmetic: 1 }
}

/**
 * Zaškrtnutá témata omezená na ta, která ročník opravdu umí.
 *
 * Potřebuje to i formulář, ne jen převod na konfiguraci: zaškrtnutá „Procenta"
 * u čtvrťáka nesmí vypadat jako zapnuté téma, ze kterého se dá složit hra.
 * Kdyby si tenhle výběr dělal formulář sám, rozešel by se s tím, co pak
 * dostane generátor — a poznalo by se to až podle prázdného náhledu.
 */
export function usableTopics(topics: TopicSelection, profile: DifficultyProfile): TopicSelection {
  return {
    arithmetic: topics.arithmetic,
    sequences: topics.sequences,
    decimals: topics.decimals && profile.decimals > 0,
    percents: topics.percents && profile.percents,
    powers: topics.powers && profile.powers,
    fractions: topics.fractions && profile.fractions,
  }
}

/** Zbylo aspoň jedno téma, ze kterého se dá v tomhle ročníku hrát? */
export function hasUsableTopic(topics: TopicSelection, profile: DifficultyProfile): boolean {
  return Object.values(usableTopics(topics, profile)).some((enabled) => enabled)
}

/**
 * Váhy → zaškrtávátka. Protipól `generatorMixFromTopics`.
 *
 * Soubor bez `generatorMix` vznikl dřív, než volba témat existovala; parsery
 * aktivit v něm doplní samotnou aritmetiku, takže sem dorazí zaškrtnuté
 * „Počítání" a nic jiného.
 */
export function topicsFromGeneratorMix(
  mix: Readonly<Record<string, number>> | undefined,
): TopicSelection {
  const enabled = (id: string) => (mix?.[id] ?? 0) > 0
  return {
    arithmetic: enabled('arithmetic'),
    sequences: enabled('sequence'),
    decimals: enabled('decimal'),
    percents: enabled('percent'),
    powers: enabled('powers'),
    fractions: enabled('fractions'),
  }
}
