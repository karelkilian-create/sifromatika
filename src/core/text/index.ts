/**
 * Práce s textem tajenky: normalizace, rozklad na písmena, četnosti.
 *
 * Šifrovací tabulka pracuje výhradně s A–Z bez diakritiky — je to zavedená
 * praxe školních šifrovaček a dítě nemá luštit háčky. `BAZÉNU` je tedy
 * `B A Z E N U`.
 */

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

/** Kombinující diakritická znaménka, která zbydou po NFD rozkladu. */
const COMBINING_MARKS = /[̀-ͯ]/g

export interface NormalizedMessage {
  /** Přesně to, co zadal uživatel. */
  original: string
  /** Písmena A–Z bez diakritiky a bez mezer, v pořadí. */
  letters: string[]
  /**
   * Délky jednotlivých slov v písmenech; součet = `letters.length`.
   * Slouží k vysázení mezer mezi slovy na pracovním listu.
   *
   * (V návrhovém dokumentu bylo `gaps: number[]`. `wordLengths` je totéž,
   * jen bez nejednoznačnosti „index před, nebo za mezerou".)
   */
  wordLengths: number[]
  /** Kolikrát se každé písmeno v tajence vyskytuje. Určuje POVINNÝ počet buněk. */
  histogram: Map<string, number>
  /**
   * Znaky, které se do tajenky nevešly (číslice, interpunkce, emoji).
   *
   * Vrací se ven záměrně: zahodit část vstupu bez upozornění by porušilo
   * pravidlo „ohlas to, co uživatel nastavil". UI na to musí umět upozornit.
   */
  dropped: string[]
}

/** Jeden znak → základní písmeno A–Z, nebo `null`, pokud jím není. */
function toBaseLetter(char: string): string | null {
  const stripped = char.normalize('NFD').replace(COMBINING_MARKS, '').toUpperCase()
  return stripped.length === 1 && stripped >= 'A' && stripped <= 'Z' ? stripped : null
}

export function normalizeMessage(input: string): NormalizedMessage {
  const letters: string[] = []
  const wordLengths: number[] = []
  const dropped: string[] = []
  const histogram = new Map<string, number>()

  let currentWord = 0
  const closeWord = (): void => {
    if (currentWord > 0) {
      wordLengths.push(currentWord)
      currentWord = 0
    }
  }

  // Iterace přes code pointy, ne přes UTF-16 jednotky — jinak by se emoji
  // rozpadlo na dva „znaky" a hlášení pro uživatele by bylo nesmyslné.
  for (const char of input) {
    if (/\s/.test(char)) {
      closeWord()
      continue
    }
    const letter = toBaseLetter(char)
    if (letter === null) {
      dropped.push(char)
      continue
    }
    letters.push(letter)
    histogram.set(letter, (histogram.get(letter) ?? 0) + 1)
    currentWord++
  }
  closeWord()

  return { original: input, letters, wordLengths, histogram, dropped }
}

/** Písmena tajenky jako souvislý řetězec — tvar, se kterým porovnává dekodér. */
export function plainLetters(message: NormalizedMessage): string {
  return message.letters.join('')
}

/**
 * Zkrátí tajenku tak, aby z ní vzniklo nejvýš `max` písmen — tedy nejvýš
 * `max` příkladů.
 *
 * Počítá se podle `normalizeMessage`, ne podle délky řetězce: mezery a
 * interpunkce se do příkladů nepromítnou, takže by ořez podle znaků usekl
 * dřív, než je potřeba. „POKLAD JE U BAZÉNU" má osmnáct písmen, ale
 * dvacet znaků.
 *
 * Vrací zkrácený vstup, ne normalizovaný tvar: v poli má učiteli zůstat
 * to, co napsal, i s diakritikou.
 */
export function truncateToLetters(input: string, max: number): string {
  if (normalizeMessage(input).letters.length <= max) return input

  let cut = 0
  for (let i = 1; i <= input.length; i++) {
    if (normalizeMessage(input.slice(0, i)).letters.length > max) break
    cut = i
  }
  return input.slice(0, cut)
}

/**
 * Relativní četnost písmen v češtině bez diakritiky.
 *
 * Používá se VÝHRADNĚ pro výběr klamných písmen. Četnost v konkrétní tajence
 * (`NormalizedMessage.histogram`) řeší něco jiného — kolik buněk daného písmene
 * v tabulce musí být. Záměna těch dvou byla chyba v původním zadání.
 *
 * Hodnoty jsou přibližné a záměrně nejsou přesné na desetinu: jde o to, aby
 * tabulka vypadala jako český text, ne o lingvistickou studii.
 */
export const CZECH_LETTER_WEIGHTS: Readonly<Record<string, number>> = {
  A: 7.6, B: 1.6, C: 2.5, D: 3.6, E: 8.4, F: 0.2, G: 0.2, H: 1.4, I: 5.5,
  J: 2.1, K: 3.8, L: 4.4, M: 3.2, N: 6.6, O: 8.6, P: 3.5, Q: 0.05, R: 3.7,
  S: 5.6, T: 5.8, U: 3.1, V: 4.6, W: 0.05, X: 0.1, Y: 2.0, Z: 2.7,
}
