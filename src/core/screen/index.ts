/**
 * `ScreenModel` — popis obrazovky ve třídě, protějšek `DocumentModel`.
 *
 * Papír popisuje `core/document`; tohle popisuje to, co běží na tabuli. Je to
 * zase obsah, ne JSX: aktivita řekne, co se na tabuli děje, a renderer v
 * `render/lock` to nakreslí a obslouží. Kdyby si aktivita kreslila tabuli
 * sama, druhá obrazovka (vyvolávač binga) by přinesla druhou sazbu i druhé
 * ovládání. Viz docs/navrh-unikova-hra.md §8.
 *
 * Vize: obrazovka smí papír doplnit, nikdy nahradit. Model proto nenese
 * žádné příklady — ty jsou jen na papíře.
 *
 * ⚠ Model obsahuje řešení (slova stanovišť). Ve fázi 1 to nevadí: zámek běží
 *   na počítači učitele a děti vidí obrazovku, ne paměť prohlížeče (§5).
 */

/** Stanoviště tak, jak ho zná zámek. */
export interface LockStation {
  /** Slovo v A–Z bez diakritiky — tak ho dítě zadá a tak se porovnává. */
  word: string
  /** Slovo, jak se ukáže na tabuli, i s diakritikou (`ZÁMEK`). */
  display: string
  /** Písmena, která tabule ze slova vezme do tajenky. A–Z. */
  picks: readonly string[]
  /** Věta příběhu po uznání slova. */
  boardSentence: string
}

/** Skupina a její stanoviště v pořadí balíčku. Zadávat je smí v libovolném. */
export interface LockGroup {
  name: string
  /** Barva skupiny jako slovo; odstín vybere renderer. */
  color: LockColor
  /** Indexy do `LockScreenModel.stations`. */
  stations: readonly number[]
}

export type LockColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange'

export interface LockScreenModel {
  kind: 'lock'
  /**
   * `class`: stanoviště jdou za sebou a písmena přibývají po každém slově.
   * `groups`: skupiny zadávají svá slova a písmena se ukážou naráz na konci.
   */
  mode: 'class' | 'groups'
  /**
   * Obrázek k úvodu — id příběhu. Kreslí ho renderer; neznámý = bez obrázku.
   * Jen úvod: při zadávání slov by obrázek bral místo rámečkům a větám.
   */
  scene: string
  intro: string
  /** Heslo pod rámečky tajenky po celou hru. */
  motto: string
  outro: string
  /** Tajenka, jak ji napsal učitel — ukáže se po otevření. */
  messageText: string
  /** Písmena tajenky A–Z v pořadí a délky slov pro rámečky. */
  messageLetters: readonly string[]
  wordLengths: readonly number[]
  stations: readonly LockStation[]
  /** V režimu „celá třída" jediná skupina se všemi stanovišti. */
  groups: readonly LockGroup[]
}

/** Zatím jediný druh obrazovky. Unie proto, aby další přibyl bez přepisu. */
export type ScreenModel = LockScreenModel
