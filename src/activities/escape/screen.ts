/**
 * Úniková hra jako `ScreenModel` — zámek na tabuli (docs/navrh-unikova-hra.md §5).
 *
 * Jen překlad hotové hry do popisu obrazovky. Co se kdy ukáže a jak se
 * zadává, rozhoduje renderer v `render/lock`; tady se rozhoduje jen obsah.
 */

import type { LockScreenModel } from '../../core/screen/index.js'
import { normalizeMessage } from '../../core/text/index.js'
import type { EscapeSheet } from './index.js'

export function escapeScreen(sheet: EscapeSheet): LockScreenModel {
  return {
    kind: 'lock',
    mode: sheet.config.payload.mode,
    scene: sheet.story.id,
    intro: sheet.story.intro,
    motto: sheet.story.motto,
    outro: outroFor(sheet),
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

/**
 * Závěr příběhu. S vlastní tajenkou učitele neutrální, pokud ho příběh má:
 * závěr psaný k nabízeným tajenkám by jinak mohl tvrdit něco jiného než ona.
 * Shoda se bere podle písmen a slov, ne podle zápisu („Pachatel je uklízeč"
 * je pořád nabízená tajenka).
 */
function outroFor(sheet: EscapeSheet): string {
  const { story, message } = sheet
  if (story.ownMessageOutro === undefined) return story.outro
  const key = (letters: readonly string[], wordLengths: readonly number[]) => `${letters.join('')}|${wordLengths.join(' ')}`
  const own = key(message.letters, message.wordLengths)
  const offered = Object.values(story.messages).some((text) => {
    const normalized = normalizeMessage(text)
    return key(normalized.letters, normalized.wordLengths) === own
  })
  return offered ? story.outro : story.ownMessageOutro
}
