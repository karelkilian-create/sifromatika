/**
 * Váhy témat. Testuje se tu jediná věta, kterou nápověda v editoru slibuje
 * učiteli: **zaškrtnutá témata se míchají rovnoměrně.**
 *
 * Není to samozřejmost. Téma se do vah nepřekládá jedna ku jedné — zlomky
 * se rozpadají na čtyři generátory, protože jinak by o poměru úloh na listu
 * rozhodovala šířka jejich zásoby cílů. Váha se mezi ně proto dělí, a přesně
 * to je tady zamčené: kdyby kdokoli přidal pátý zlomkový generátor s celou
 * váhou, zlomky by nenápadně spolkly list a poznalo by se to až u kopírky.
 */

import { describe, expect, it } from 'vitest'
import { gradeProfile } from '../core/constraints/index.js'
import {
  decompositionAvailable,
  generatorMixFromTopics,
  termsAvailable,
  topicsFromGeneratorMix,
} from './mix.js'
import type { TopicSelection } from './mix.js'

const NOTHING: TopicSelection = {
  arithmetic: false,
  sequences: false,
  decimals: false,
  percents: false,
  powers: false,
  fractions: false,
  equations: false,
  decomposition: false,
  terms: false,
}

/** Id, na která se rozpadá jedno zaškrtávátko „Zlomky". */
const FRACTION_IDS = ['fractions', 'fraction-sums', 'fraction-products', 'fraction-quotients']

function weightOf(mix: Record<string, number>, ids: readonly string[]): number {
  return ids.reduce((sum, id) => sum + (mix[id] ?? 0), 0)
}

describe('generatorMixFromTopics', () => {
  it('zlomky váží jako jedno téma, ne jako čtyři', () => {
    const mix = generatorMixFromTopics(
      { ...NOTHING, arithmetic: true, fractions: true },
      gradeProfile(7),
    )
    expect(weightOf(mix, FRACTION_IDS)).toBe(mix.arithmetic)
  })

  it('uvnitř tématu se váha dělí rovným dílem', () => {
    // Kdyby si část z celku vzala víc než čtvrtinu, vytlačila by ostatní tři:
    // její zásoba cílů je pro sedmý ročník o dva řády větší.
    const mix = generatorMixFromTopics({ ...NOTHING, fractions: true }, gradeProfile(7))
    const shares = FRACTION_IDS.map((id) => mix[id])
    expect(new Set(shares).size, JSON.stringify(mix)).toBe(1)
    expect(shares[0]).toBeGreaterThan(0)
  })

  it('všechna témata sedmé třídy váží stejně', () => {
    const mix = generatorMixFromTopics(
      {
        arithmetic: true,
        sequences: true,
        decimals: true,
        percents: true,
        powers: true,
        fractions: true,
        equations: true,
        decomposition: true,
        terms: true,
      },
      gradeProfile(7),
    )
    // Mocniny sedmá třída neumí, ty ve výběru nejsou.
    const perTopic = [
      weightOf(mix, ['arithmetic']),
      weightOf(mix, ['sequence']),
      weightOf(mix, ['decimal']),
      weightOf(mix, ['percent']),
      weightOf(mix, ['equation']),
      weightOf(mix, FRACTION_IDS),
    ]
    expect(new Set(perTopic).size, JSON.stringify(mix)).toBe(1)
  })

  it('váhy jsou celá čísla — jdou do souboru a do odkazu', () => {
    const mix = generatorMixFromTopics(
      { ...NOTHING, arithmetic: true, fractions: true },
      gradeProfile(7),
    )
    for (const [id, weight] of Object.entries(mix)) {
      expect(Number.isInteger(weight), `${id} = ${weight}`).toBe(true)
    }
  })

  it('kterékoli zlomkové id vrátí ve formuláři zaškrtnuté zlomky', () => {
    // Soubor uložený dřív nese jen dvě z těch id. Zaškrtávátko musí zaškrtnout
    // i tak, jinak by se učiteli téma tiše ztratilo.
    for (const id of FRACTION_IDS) {
      expect(topicsFromGeneratorMix({ [id]: 3 }).fractions, id).toBe(true)
    }
  })
})

/**
 * Rozklad na desítky a jednotky je jediné téma s mezí SHORA. Ostatní
 * s ročníkem přibývají, tohle s ním mizí.
 */
describe('rozklad na desítky a jednotky', () => {
  it('nabízí se do třetí třídy', () => {
    expect(decompositionAvailable(gradeProfile(2))).toBe(true)
    expect(decompositionAvailable(gradeProfile(3))).toBe(true)
    expect(decompositionAvailable(gradeProfile(4))).toBe(false)
  })

  it('ve čtvrté třídě vypadne z mixu, i když zůstane zaškrtnutý', () => {
    const topics = { ...NOTHING, arithmetic: true, decomposition: true }
    expect(generatorMixFromTopics(topics, gradeProfile(2)).decomposition).toBeGreaterThan(0)
    expect(generatorMixFromTopics(topics, gradeProfile(4)).decomposition).toBeUndefined()
  })

  it('váha se překládá tam i zpátky', () => {
    expect(topicsFromGeneratorMix({ decomposition: 12 }).decomposition).toBe(true)
    expect(topicsFromGeneratorMix({ arithmetic: 12 }).decomposition).toBe(false)
  })
})

/**
 * Věty s pojmy: jedno zaškrtávátko, tři rodiny — „o kolik“, násobení
 * a dělení. Bez vlastních zásob by dělení na kartičkách skoro nebylo.
 */
describe('věty s pojmy', () => {
  it('nabízí se od třetí třídy', () => {
    expect(termsAvailable(gradeProfile(2))).toBe(false)
    expect(termsAvailable(gradeProfile(3))).toBe(true)
    expect(termsAvailable(gradeProfile(8))).toBe(true)
  })

  it('váha tématu se dělí mezi tři rodiny, nedostane ji každá celou', () => {
    const mix = generatorMixFromTopics({ ...NOTHING, arithmetic: true, terms: true }, gradeProfile(3))
    const terms = mix.terms! + mix['terms-products']! + mix['terms-quotients']!
    expect(terms).toBe(mix.arithmetic)
    expect(mix.terms).toBe(mix['terms-quotients'])
  })

  it('ve druhé třídě vypadne z mixu, i když zůstane zaškrtnuté', () => {
    const mix = generatorMixFromTopics({ ...NOTHING, arithmetic: true, terms: true }, gradeProfile(2))
    expect(Object.keys(mix)).toEqual(['arithmetic'])
  })

  it('kterákoli rodina v souboru znamená zaškrtnuté téma', () => {
    for (const id of ['terms', 'terms-products', 'terms-quotients']) {
      expect(topicsFromGeneratorMix({ [id]: 4 }).terms, id).toBe(true)
    }
    expect(topicsFromGeneratorMix({ arithmetic: 12 }).terms).toBe(false)
  })
})
