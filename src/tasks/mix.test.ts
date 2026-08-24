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
import { generatorMixFromTopics, topicsFromGeneratorMix } from './mix.js'
import type { TopicSelection } from './mix.js'

const NOTHING: TopicSelection = {
  arithmetic: false,
  sequences: false,
  decimals: false,
  percents: false,
  powers: false,
  fractions: false,
  equations: false,
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
