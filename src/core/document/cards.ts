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
 * Kolik svislého místa si vezme patička s kontrolní úsečkou.
 *
 * Úsečka a popisek stojí VEDLE sebe (viz `.print-scale-check` v sheet.css),
 * takže blok je vysoký jako popisek: 6,8 mm při dvou řádcích osmibodového
 * písma. Devět milimetrů je to se zaokrouhlením a rezervou.
 *
 * ⚠ Kdyby tahle hodnota byla nižší než skutečnost, vešla by se sem řada
 *   kartiček, která na papíře přeteče — a zjistilo by se to až u nůžek.
 */
export const SCALE_CHECK_HEIGHT_MM = 9

/**
 * Mezera mezi mřížkou kartiček a patičkou (`margin-bottom` u `.card-grid`).
 *
 * Patří do rozpočtu stránky, i když je malá. Do zkušebního tisku 20. 8. 2026
 * tady nebyla a stránka vycházela na milimetr přesně — patička pak přetekla
 * na další papír a k listu kartiček přibyl list s jednou čárou.
 */
export const CARD_GRID_GAP_MM = 2

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
  /** Plocha pro kartičky. Výchozí = A4 bez patičky s kontrolní úsečkou. */
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
    spec.areaHeightMm ??
    PRINTABLE_A4.heightMm - CUT_LINE_MM - CARD_GRID_GAP_MM - SCALE_CHECK_HEIGHT_MM

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
