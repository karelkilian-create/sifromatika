/**
 * Rozvržení kartiček na papír.
 *
 * Odděleno od `DocumentModel` schválně: model popisuje jednu stránku, tohle
 * odpovídá na otázku „kolik stránek to bude a co přijde na kterou". Použije to
 * pexeso, po něm domino a bingo — proto se to staví jednou a pořádně, ne
 * pokaždé znovu v každé aktivitě.
 *
 * ⚠ Aktivita si stránky rozdělí SAMA a vydá jeden `card-grid` na stránku.
 *   Kdyby si je lámal renderer, vznikl by dokument, jehož stránky nesouhlasí
 *   s papírem — přesně to, čemu `DocumentModel` zabránil tím, že zalomení
 *   není blok, ale hranice stránky.
 */

/**
 * Tisknutelná plocha A4 při okrajích, které nastavuje `@page` v `print.css`.
 *
 * Musí souhlasit s tamní deklarací `margin: 15mm 14mm`. Kdyby se rozešly,
 * poslední sloupec kartiček by přetekl mimo papír — a to je vada, kterou
 * odhalí až nůžky.
 */
export const PRINTABLE_A4 = { widthMm: 210 - 2 * 14, heightMm: 297 - 2 * 15 } as const

/**
 * Rezerva na to, oč je skutečná tisknutelná plocha menší než jmenovitá.
 *
 * `PRINTABLE_A4` je počítané z rozměru papíru a okrajů v `@page`. Tiskárna
 * má ale ještě vlastní netisknutelný okraj, který si prohlížeč do rozvržení
 * promítne, a v dialogu se k tomu přidává záhlaví se zápatím. Zkušební tisk
 * 20. 8. 2026 ukázal, že rozdíl je řádově jednotky milimetrů: stránka
 * vypočítaná na osm milimetrů rezervy přetekla, přestože formát byl A4
 * a záhlaví vypnuté.
 *
 * ⚠ Rezerva NESMÍ klesnout pod skutečný okraj tiskárny — vešla by se sem
 *   řada kartiček, která na papíře přeteče, a zjistilo by se to až u nůžek.
 *   Při dnešních rozměrech kartiček žádnou řadu nestojí: pexeso má 4 řady,
 *   domino 6 a bingo 3 s rezervou i bez ní.
 */
export const PRINTER_MARGIN_RESERVE_MM = 8

/**
 * Střihový rám mřížky (`--cut-line` v sheet.css, 3 px ≈ 0,79 mm).
 *
 * Mřížka kreslí horní a levou linku SVÝM okrajem, tedy vně kartiček. Kdyby
 * se do rozpočtu nezapočítal, poslední sloupec by o tuhle šířku přetekl.
 */
export const CUT_LINE_MM = 0.8

export interface CardSpec {
  cardWidthMm: number
  cardHeightMm: number
  /** Plocha pro kartičky. Výchozí = A4 bez rezervy na okraj tiskárny. */
  areaWidthMm?: number
  areaHeightMm?: number
}

export interface CardLayout {
  columns: number
  rows: number
  perPage: number
}

/**
 * Kolik kartiček se vejde na jednu stránku.
 *
 * `null` = ani jedna. Nastane jen u nesmyslného rozměru (kartička širší než
 * papír); volající to má hlásit, ne tiše zmenšovat — velikost kartičky je to,
 * co dítě dostane do ruky.
 */
export function planCardLayout(spec: CardSpec): CardLayout | null {
  const width = spec.areaWidthMm ?? PRINTABLE_A4.widthMm - CUT_LINE_MM
  const height =
    spec.areaHeightMm ?? PRINTABLE_A4.heightMm - CUT_LINE_MM - PRINTER_MARGIN_RESERVE_MM

  if (spec.cardWidthMm <= 0 || spec.cardHeightMm <= 0) return null

  const columns = Math.floor(width / spec.cardWidthMm)
  const rows = Math.floor(height / spec.cardHeightMm)
  if (columns < 1 || rows < 1) return null

  return { columns, rows, perPage: columns * rows }
}

/** Rozdělí kartičky po stránkách. Poslední stránka smí být neúplná. */
export function chunkCards<T>(cards: readonly T[], perPage: number): T[][] {
  if (perPage < 1) return []
  const pages: T[][] = []
  for (let start = 0; start < cards.length; start += perPage) {
    pages.push(cards.slice(start, start + perPage))
  }
  return pages
}
