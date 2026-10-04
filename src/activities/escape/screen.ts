/**
 * Úniková hra jako `ScreenModel` — zámek na tabuli (docs/navrh-unikova-hra.md §5).
 *
 * Jen překlad hotové hry do popisu obrazovky. Co se kdy ukáže a jak se
 * zadává, rozhoduje renderer v `render/lock`; tady se rozhoduje jen obsah.
 */

import type { LockScreenModel } from '../../core/screen/index.js'
import type { EscapeSheet } from './index.js'

export function escapeScreen(sheet: EscapeSheet): LockScreenModel {
  return {
    kind: 'lock',
    mode: sheet.config.payload.mode,
    scene: sheet.story.id,
    intro: sheet.story.intro,
    motto: sheet.story.motto,
    outro: sheet.story.outro,
    messageText: sheet.message.original.trim(),
    messageLetters: sheet.message.letters,
    wordLengths: sheet.message.wordLengths,
    stations: sheet.stations.map((station) => ({
      word: station.word.letters,
      display: station.word.story.word,
      picks: station.picks,
      boardSentence: station.word.story.board,
    })),
    groups: sheet.groups.map((group) => ({
      name: group.name,
      color: group.color,
      stations: group.stations,
    })),
  }
}
