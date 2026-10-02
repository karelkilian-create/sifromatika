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
  /** Zlomky (`3/4 z 80`, ve hrách i `1/2 + 1/4` a `2/3 · 3/5`). Od 7. ročníku. */
  fractions: boolean
  /** Rovnice s chybějícím číslem (`? + 15 = 40`). Od 2. ročníku. */
  equations: boolean
  /** Rozklad na desítky a jednotky (`3 · 10 + 7`). Do 3. ročníku. */
  decomposition: boolean
  /** Věty s pojmy (`Kolik je součin čísel 6 a 7?`). Od 3. ročníku. */
  terms: boolean
}

/**
 * Kolik váhy dostane JEDNO zaškrtnuté téma.
 *
 * Není to jednička, protože zlomky se dělí na čtyři generátory a váha se
 * mezi ně musí rozdělit celočíselně. Dvanáctka je nejmenší číslo, které to
 * unese pro dvě, tři i čtyři rodiny — a nechává rezervu, kdyby se takhle
 * jednou rozpadlo i jiné téma.
 *
 * ⚠ Přenásobení všech vah touž konstantou samo o sobě NEMĚNÍ výstup:
 *   `rng.weighted` losuje z `next() · součet vah`, takže se pravděpodobnosti
 *   ani sekvence náhodných čísel nepohnou. Změní se jen to, co se změnit má —
 *   podíl zlomků.
 */
const TOPIC_WEIGHT = 12

/**
 * Zaškrtávátka → váhy generátorů. Každé zaškrtnuté téma váží stejně.
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
  if (usable.arithmetic) mix.arithmetic = TOPIC_WEIGHT
  if (usable.sequences) mix.sequence = TOPIC_WEIGHT
  if (usable.decimals) mix.decimal = TOPIC_WEIGHT
  if (usable.percents) mix.percent = TOPIC_WEIGHT
  if (usable.powers) mix.powers = TOPIC_WEIGHT
  if (usable.equations) mix.equation = TOPIC_WEIGHT
  if (usable.decomposition) mix.decomposition = TOPIC_WEIGHT
  // Jedno zaškrtávátko, ČTYŘI generátory: `3/4 z 80`, `1/2 + 1/4`,
  // `2/3 · 3/5` a `1/2 : 1/4` jsou pro učitele jedno téma, ale každý musí mít
  // svou zásobu cílů — jinak by o poměru na listu rozhodovalo to, jak široký
  // obor která rodina náhodou pokrývá (644 hodnot proti 19, 15 a 25). Viz
  // `resultGenerator` v `tasks/fractions`.
  //
  // ⚠ Váha se mezi ně DĚLÍ, nedostane každý celou. Do verze 10 měly zlomky
  //   dvě id po jedničce, takže vedle samotného počítání zabraly dvě třetiny
  //   listu — a nápověda v editoru přitom slibuje, že se témata míchají
  //   rovnoměrně. Se čtyřmi id by to byly čtyři pětiny.
  if (usable.fractions) {
    const share = TOPIC_WEIGHT / 4
    mix.fractions = share
    mix['fraction-sums'] = share
    mix['fraction-products'] = share
    mix['fraction-quotients'] = share
  }
  // Věty s pojmy: totéž ze stejného důvodu. „Pětkrát menší“ a „kolikrát“
  // dávají jen výsledky do deseti, součet a rozdíl celou stovku — s jedním
  // id by z dvanácti kartiček nebyla dělení ani jedna. Viz `familyGenerator`
  // v `tasks/terms`.
  if (usable.terms) {
    const share = TOPIC_WEIGHT / 3
    mix.terms = share
    mix['terms-products'] = share
    mix['terms-quotients'] = share
  }
  return Object.keys(mix).length > 0 ? mix : { arithmetic: TOPIC_WEIGHT }
}

/**
 * Profil oříznutý o témata, která si učitel odškrtl.
 *
 * Váhy v `generatorMix` říkají, KTERÉ generátory poběží. To ale nestačí:
 * aritmetika osmého ročníku má mocninné tvary v sobě (`POWER_SHAPES`
 * v `tasks/shapes.ts`) a bere si je podle profilu, ne podle vah. Odškrtnuté
 * „Mocniny a odmocniny" tak z listu vyhodily samostatný generátor `powers`,
 * ale `7² − 8` na kartičkách zůstalo — učitel odškrtl téma a dostal ho dál.
 *
 * ⚠ Volají to jen HRY. Šifra pro mocniny zaškrtávátko nemá (viz `GENERATORS`
 *   v `cipher-grid/payload.ts`), takže u ní není co ctít: kdyby si tenhle
 *   ořez vzala taky, přišla by osmá třída o složené výrazy s mocninou, aniž
 *   by si to kdokoli přál.
 */
export function profileForMix(
  profile: DifficultyProfile,
  mix: Readonly<Record<string, number>>,
): DifficultyProfile {
  return (mix.powers ?? 0) > 0 ? profile : { ...profile, powers: false }
}

/**
 * Nabízí se v tomhle ročníku rozklad na desítky a jednotky?
 *
 * Dvojka ho má jako látku, trojka jako opakování; od čtvrté třídy je rozklad
 * čtení čísla, ne úloha. Je to jediné téma s mezí SHORA — ostatní s ročníkem
 * přibývají.
 *
 * Funkce, ne podmínka na dvou místech: ptá se na to `usableTopics` i formulář,
 * a kdyby se rozešly, zaškrtávátko by slibovalo téma, které se do mixu
 * nedostane. Generátor si tutéž mez drží ještě jednou ve svém `supports` —
 * ten je poslední pojistkou pro soubor z cizí ruky.
 */
export function decompositionAvailable(profile: DifficultyProfile): boolean {
  return profile.grade <= 3
}

/**
 * Nabízí se v tomhle ročníku věty s matematickými pojmy?
 *
 * Od trojky. Druhák čte slabikovaně a věta „O kolik je součet čísel 12 a 4
 * větší než jejich rozdíl?“ by pro něj byla čtení, ne matematika. Shora meze
 * není — ve vyšších ročnících je to opakování.
 *
 * Funkce ze stejného důvodu jako `decompositionAvailable`: ptá se formulář
 * i `usableTopics` a nesmí se rozejít. Generátor si tutéž mez drží ve svém
 * `supports`.
 */
export function termsAvailable(profile: DifficultyProfile): boolean {
  return profile.grade >= 3
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
    // Žádná mez ročníku: chybějící číslo je látka od druhé třídy (`? + 5 = 13`)
    // a zápis s otazníkem drží až do sedmé. `x` přijde s osmičkou a bude to
    // tvar téhož generátoru, ne jiné téma.
    //
    // ⚠ Že tu mez není, musí krýt generátor: nejnižší `minGrade` v jeho
    //   `SHAPES` je proto 2, ne 3. Kdyby byl vyšší než nejnižší nabízený
    //   ročník, zaškrtávátko by tu slibovalo téma, ze kterého nic nevypadne.
    equations: topics.equations,
    decomposition: topics.decomposition && decompositionAvailable(profile),
    terms: topics.terms && termsAvailable(profile),
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
    fractions:
      enabled('fractions') ||
      enabled('fraction-sums') ||
      enabled('fraction-products') ||
      enabled('fraction-quotients'),
    equations: enabled('equation'),
    decomposition: enabled('decomposition'),
    terms: enabled('terms') || enabled('terms-products') || enabled('terms-quotients'),
  }
}
