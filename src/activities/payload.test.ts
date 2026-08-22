/**
 * Zámek na past, do které spadly zlomky: generátor se generuje, projde testy
 * i náhledem — a ztratí se teprve cestou přes `.sifra` nebo sdílecí odkaz.
 *
 * Každá aktivita si prosívá `generatorMix` vlastním seznamem známých id
 * (schválně, viz `parseGeneratorMix`), takže nový generátor se musí dopsat na
 * tolik míst, kolik aktivit pro něj má zaškrtávátko. Zapomenout se dá tiše:
 * parser neznámé id nezahlásí, jen ho zahodí a list se vygeneruje bez něj.
 *
 * Tenhle test to hlídá zvenčí: co formulář umí zapnout, to musí přežít cestu
 * tam a zpátky.
 */

import { describe, expect, it } from 'vitest'
import { gradeProfile } from '../core/constraints/index.js'
import type { DifficultyProfile, Grade } from '../core/model/index.js'
import { defaultConfig } from './cipher-grid/index.js'
import { parseCipherGridPayload } from './cipher-grid/payload.js'
import { defaultPexesoConfig } from './pexeso/index.js'
import { parsePexesoPayload } from './pexeso/payload.js'
import { defaultDominoConfig } from './domino/index.js'
import { parseDominoPayload } from './domino/payload.js'
import { defaultBingoConfig } from './bingo/index.js'
import { parseBingoPayload } from './bingo/payload.js'
import { generatorMixFromTopics } from '../tasks/mix.js'
import type { TopicSelection } from '../tasks/mix.js'

/** Všechna témata zapnutá — z nich se vybere to, co ročník umí. */
const ALL_TOPICS: TopicSelection = {
  arithmetic: true,
  sequences: true,
  decimals: true,
  percents: true,
  powers: true,
  fractions: true,
}

/** Osmá třída umí ze všech ročníků nejvíc témat, takže prosívá nejšíř. */
const GRADE: Grade = 8

function payloadOf(profile: DifficultyProfile) {
  const mix = generatorMixFromTopics(ALL_TOPICS, profile)
  // Přes JSON schválně: `.sifra` i odkaz nesou text, ne objekt.
  return { mix, clone: (payload: unknown) => JSON.parse(JSON.stringify(payload)) as unknown }
}

describe('zaškrtnuté téma přežije cestu přes payload', () => {
  const profile = gradeProfile(GRADE)
  const { mix, clone } = payloadOf(profile)

  it('formulář osmé třídy nabízí víc než jen počítání', () => {
    // Kdyby se sem někdy dostal profil bez témat, testy níž by prošly naprázdno.
    expect(Object.keys(mix).length).toBeGreaterThan(3)
  })

  it('pexeso', () => {
    const config = defaultPexesoConfig(GRADE, 'payload-pexeso', 12)
    config.payload.generatorMix = mix
    expect(parsePexesoPayload(clone(config.payload))?.generatorMix).toEqual(mix)
  })

  it('domino', () => {
    const config = defaultDominoConfig(GRADE, 'payload-domino', 12)
    config.payload.generatorMix = mix
    expect(parseDominoPayload(clone(config.payload))?.generatorMix).toEqual(mix)
  })

  it('bingo', () => {
    const config = defaultBingoConfig(GRADE, 'payload-bingo', 12)
    config.payload.generatorMix = mix
    expect(parseBingoPayload(clone(config.payload))?.generatorMix).toEqual(mix)
  })

  it('šifra — bez mocnin, ty pro ni volba nejsou', () => {
    // Šifra mocniny v seznamu nemá schválně: nemá pro ně zaškrtávátko, takže
    // by je soubor uměl zapnout, ale formulář ani ukázat, ani vypnout.
    const { powers: _powers, ...cipherMix } = mix
    const config = defaultConfig('ZLOMEK', GRADE, 'payload-sifra')
    config.payload.generatorMix = cipherMix
    expect(parseCipherGridPayload(clone(config.payload))?.generatorMix).toEqual(cipherMix)
  })

  it('zlomky konkrétně — na těch se ta past ukázala', () => {
    const config = defaultConfig('ZLOMEK', GRADE, 'payload-zlomky')
    config.payload.generatorMix = { arithmetic: 3, fractions: 1 }
    expect(parseCipherGridPayload(clone(config.payload))?.generatorMix).toEqual({
      arithmetic: 3,
      fractions: 1,
    })
  })
})
