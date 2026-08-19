/**
 * Poslední nastavení.
 *
 * Učitel zavře prohlížeč a druhý den najde svůj list tam, kde ho nechal —
 * včetně semínka, tedy přesně tu variantu, ne jinou. Kdo chce jinou, má
 * tlačítko „Jiná varianta"; kdo si list včera vytiskl a dnes ho hledá, druhou
 * šanci nemá.
 *
 * Ukládá se **tentýž JSON jako do souboru `.sifra`** a čte ho týž parser.
 * Třetí konzument jedné serializace: soubor, odkaz, zapamatované nastavení.
 *
 * Na rozdíl od souboru a odkazu se tady **chyby polykají**. Tenhle záznam
 * učitel vědomě nevytvořil, takže mu k němu není co hlásit: poškozený obsah
 * i chybějící úložiště znamenají prázdný formulář, ne hlášku. Zapamatování je
 * pohodlí; když nevyjde, nesmí to shodit nic dalšího.
 *
 * ⚠ V úložišti zůstává tajenka i po zavření okna. Na učitelově notebooku je to
 *   přesně to, co chceme; na společném počítači ve sborovně to znamená, že
 *   další člověk uvidí, co se zadávalo. Rozhodnuto 19. 8. 2026: přijatelné,
 *   je to vlastní list učitele, ne cizí data.
 */

import type { ProjectConfig } from '../core/model/index.js'
import { buildSifraFile, parseSifra, type SifraFile } from './sifra.js'

/**
 * Klíč se jmenuje po aplikaci a nese verzi schématu.
 *
 * Až se schéma změní, dostane nový klíč a starý záznam se nepřečte — místo
 * aby se do formuláře nalilo něco, čemu tahle verze rozumí jinak.
 */
const KEY = 'sifromatika:posledni:1'

/**
 * Úložiště, nebo `null`.
 *
 * Samotný **přístup** k `localStorage` umí vyhodit výjimku — v soukromém okně
 * nebo při zakázaných cookies — takže je i on uvnitř `try`.
 */
function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function saveLastSession(config: ProjectConfig, checksum: string): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(buildSifraFile(config, checksum)))
  } catch {
    // Zaplněná kvóta nebo zakázaný zápis. Viz hlavička: mlčky dál.
  }
}

/** Zapamatovaný list, nebo `null`, když žádný není nebo se nedá přečíst. */
export function readLastSession(): SifraFile | null {
  let text: string | null = null
  try {
    text = storage()?.getItem(KEY) ?? null
  } catch {
    return null
  }
  if (text === null) return null

  const parsed = parseSifra(text)
  return parsed.ok ? parsed.file : null
}
