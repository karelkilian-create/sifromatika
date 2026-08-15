/**
 * `DocumentModel` — render-agnostický popis vytištěné stránky.
 *
 * Aktivita popíše, **co** je na listu; renderer rozhodne, **jak** to nakreslí.
 * Bez téhle mezivrstvy se sazba píše zvlášť pro obrazovku, zvlášť pro tisk
 * a potřetí pro PDF — a pokaždé trochu jinak.
 *
 * Model vznikl kvůli tomu, co přijde: bingo potřebuje N karet plus seznam pro
 * učitele, pexeso 2N kartiček na M archů, domino řetězec na několik stran.
 * Dnešní zadrátované „list, zalomení, řešení" nic z toho neumí popsat.
 *
 * ⚠ Bloky popisují OBSAH, ne vzhled. Žádné rozměry, barvy ani třídy — jakmile
 *   se sem dostane první `width`, přestane být model přenositelný do PDF
 *   a stane se z něj druhý zápis téhož HTML.
 *
 * Model se NEUKLÁDÁ. `.sifra` nese konfiguraci a seed; dokument z nich vzniká
 * pokaždé znovu. Změna tvaru bloku proto nevyžaduje migraci souborů.
 */

import type { CipherTable } from '../model/index.js'

/**
 * Kus textu v odstavci. Zvýraznění je sémantické, ne typografické — renderer
 * si vybere, jestli z něj bude tučné písmo, nebo něco jiného.
 */
export interface InlineRun {
  text: string
  strong?: boolean
}

/**
 * Obsah jedné kartičky.
 *
 * Dnes jeden řádek — u pexesa buď zadání (`7 · 8`), nebo výsledek (`56`).
 * Domino si přidá druhý; proto je to objekt, a ne holý řetězec.
 */
export interface CardFace {
  text: string
}

/** Jedna položka očíslovaného seznamu úloh. */
export interface TaskListItem {
  /** Přesně to, co se vytiskne. */
  text: string
  /**
   * Připojit za zadání rovnítko?
   *
   * `false` u číselné řady — ta už otazník obsahuje a rovnítko za ním by bylo
   * navíc. Rozhoduje o tom aktivita, protože je to vlastnost zadání, ne sazby.
   */
  showEquals: boolean
}

/**
 * Blok obsahu.
 *
 * Rozlišená unie schválně: přidání bloku je nový člen a překladač pak ukáže
 * každý renderer, který ho neumí. Kdyby to byl volný objekt s nepovinnými
 * poli, chybějící větev by se projevila až prázdným místem na papíře.
 */
export type DocumentBlock =
  | { kind: 'heading'; level: 1 | 2; text: string }
  | { kind: 'paragraph'; runs: readonly InlineRun[] }
  /**
   * Odpověď vysazená výrazně — na listu řešení rozluštěná tajenka.
   *
   * Vlastní blok, a ne odstavec s příznakem: učitel ho hledá očima přes celou
   * stránku, takže je to role obsahu, ne odstín odstavce. PDF renderer ji smí
   * vysadit jinak než HTML, ale výrazná musí zůstat v obojím.
   */
  | { kind: 'callout'; text: string }
  | { kind: 'task-list'; columns: 1 | 2; items: readonly TaskListItem[] }
  /**
   * Šifrovací tabulka.
   *
   * `coordinates` říká, že se čísla čtou ze záhlaví řádků a sloupců, a proto
   * se do buněk netisknou — právě hledání souřadnice je ta procvičovaná
   * dovednost. Rozhodnutí patří aktivitě; renderer ho jen provede.
   */
  | { kind: 'cipher-table'; caption: string; table: CipherTable; coordinates: boolean }
  /**
   * Rámečky na tajenku, rozdělené po slovech.
   *
   * `letters` chybí na žákovském listu a je vyplněné na řešení. Je to tentýž
   * blok schválně: kdyby to byly dva, mohly by se rozejít a dítě by porovnávalo
   * dva různě široké řádky.
   */
  | { kind: 'answer-row'; wordLengths: readonly number[]; letters?: readonly string[] }
  /** Tabulka s pevným záhlavím. Buňky jsou hotový text, ne čísla k formátování. */
  | { kind: 'table'; columns: readonly string[]; rows: readonly (readonly string[])[] }
  /**
   * Mřížka kartiček k vystřižení.
   *
   * ⚠ Jediné místo v modelu, kde jsou milimetry — a je to v pořádku. U kartičky
   *   je fyzický rozměr OBSAH, ne vzhled: 60 mm není estetická volba, ale to,
   *   co dítě dostane do ruky. Renderer do PDF bude potřebovat totéž číslo.
   *
   * Kartičky se dotýkají a stříhá se skrz. Rozhoduje o tom učitel u řezačky,
   * ne estetika náhledu: pět rovných řezů přes list je práce na minutu,
   * obstřihávání dvaceti čtyř rámečků na čtvrt hodiny.
   *
   * Blok nese kartičky JEDNÉ stránky. Stránkování patří aktivitě — kdyby si
   * je renderer lámal sám, vznikl by dokument, jehož stránky nesouhlasí
   * s papírem.
   */
  | {
      kind: 'card-grid'
      cards: readonly CardFace[]
      columns: number
      cardWidthMm: number
      cardHeightMm: number
    }
  /**
   * Kontrolní úsečka na ověření měřítka tisku.
   *
   * Chrome, Firefox a Safari sázejí `@page` různě a učitel má v dialogu
   * přednastavené „Přizpůsobit stránce". Zabránit tomu z kódu nejde; jde
   * udělat to, co projekt dělá u relaxačního logu i kontrolního součtu —
   * udělat z tiché vady viditelnou. Učitel přiloží pravítko dřív, než stříhá.
   */
  | { kind: 'print-scale-check'; lengthMm: number }

/**
 * Jedna stránka.
 *
 * Zalomení je vlastnost dokumentu, ne obsahu: každá další stránka začíná na
 * novém papíře. Proto v modelu není žádný blok „zalomit" — kdyby byl, šlo by
 * vyrobit dokument, jehož stránky nesouhlasí s papírem.
 */
export interface DocumentPage {
  /**
   * Popis stránky pro učitele a pro čtečky obrazovky („Pracovní list",
   * „Řešení"). Na papír se netiskne — od toho je `heading`.
   */
  label: string
  blocks: readonly DocumentBlock[]
}

export interface DocumentModel {
  pages: readonly DocumentPage[]
}
