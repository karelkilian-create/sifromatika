/**
 * Sazba matematického textu: odmocnina s vodorovnou čarou nad odmocňovaným
 * číslem a zlomek se zlomkovou čarou.
 *
 * Generátory dávají obojí jako holý text — `√49`, `3/4` — protože v modelu je
 * zadání řetězec a ten se porovnává, hashuje a vypisuje v testech. Vytištěná
 * podoba se dokresluje až tady:
 *
 *   • **Odmocnina.** Samotné `√` nad číslem nic nekreslí, takže `57 − √49` se
 *     dá číst i jako `√(57 − 49)`. Čára (vinculum) ten rozsah ukáže bez závorek.
 *   • **Zlomek.** Na českém pracovním listu se zlomek sází vodorovnou čarou,
 *     ne lomítkem. Lomítko je zápis pro model, `3/4` na papíře je čitatel nad
 *     jmenovatelem.
 *
 * ⚠ Text se JEN rozděluje, nic se nepřepočítává ani nedoplňuje. Co není
 *   odmocnina ani zlomek, projde beze změny.
 *
 * ⚠ Lomítko se sází jako zlomek vždy, i kdyby v ručně upraveném `.sifra`
 *   znamenalo dělení. Hodnota je táž (`3/4` je tři čtvrtiny i tři děleno
 *   čtyřmi) a vygenerované zadání dělení píše dvojtečkou, takže se to
 *   u vlastních listů stát nemůže.
 */

import type { ReactElement } from 'react'

/**
 * `√` s číslem, nebo zlomek — v jednom průchodu.
 *
 * Dvě samostatná dělení textu za sebou by druhé z nich pustila jen na ty
 * kusy, které zbyly po prvním, a `√49 + 1/2` by dopadlo podle pořadí.
 */
const MATH_PATTERN = /√(\d+(?:,\d+)?)|(\d+)\/(\d+)/gu

export function MathText({ text }: { text: string }) {
  return <>{typeset(text)}</>
}

function typeset(text: string) {
  if (!text.includes('√') && !text.includes('/')) return text

  const parts: (string | ReactElement)[] = []
  let cursor = 0

  for (const match of text.matchAll(MATH_PATTERN)) {
    const start = match.index
    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(
      match[1] !== undefined ? (
        <span className="radical" key={start}>
          <span className="radical__sign">√</span>
          <span className="radical__radicand">{match[1]}</span>
        </span>
      ) : (
        <span className="fraction" key={start}>
          <span className="fraction__numerator">{match[2]}</span>
          <span className="fraction__denominator">{match[3]}</span>
        </span>
      ),
    )
    cursor = start + match[0].length
  }

  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}
