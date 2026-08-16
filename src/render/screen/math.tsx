/**
 * Sazba matematického textu — zatím jediná starost: odmocnina s vodorovnou
 * čarou nad odmocňovaným číslem.
 *
 * Generátory dávají odmocninu jako holý znak `√49`, protože v modelu je to
 * text a ten se porovnává, hashuje a vypisuje v testech. Samotné `√` ale nad
 * číslem nic nekreslí, takže `57 − √49` se dá číst i jako `√(57 − 49)`.
 * Čára (vinculum) ten rozsah ukáže bez závorek — a v modelu zůstává text
 * nezměněný.
 *
 * ⚠ Rozděluje se JEN text, nic se nepřepočítává ani nedoplňuje. Co není
 *   odmocnina, projde beze změny.
 */

import type { ReactElement } from 'react'

/** `√` a číslo za ním — včetně desetinné čárky, ať se čára nepřetrhne. */
const ROOT_PATTERN = /√(\d+(?:,\d+)?)/gu

export function MathText({ text }: { text: string }) {
  return <>{splitRoots(text)}</>
}

function splitRoots(text: string) {
  if (!text.includes('√')) return text

  const parts: (string | ReactElement)[] = []
  let cursor = 0

  for (const match of text.matchAll(ROOT_PATTERN)) {
    const start = match.index
    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(
      <span className="radical" key={start}>
        √<span className="radical__radicand">{match[1]}</span>
      </span>,
    )
    cursor = start + match[0].length
  }

  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}
