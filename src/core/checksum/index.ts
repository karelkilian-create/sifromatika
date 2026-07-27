/**
 * Kontrolní součet vygenerovaného výstupu.
 *
 * Slouží jediné věci: odhalit drift determinismu (riziko č. 1 z návrhu).
 * Soubor `.sifra` ukládá jen konfiguraci a seed, všechno ostatní se
 * dopočítá. Kdyby se v budoucí verzi změnilo pořadí volání PRNG, otevřený
 * soubor by tiše vygeneroval jiný list než ten, který má učitel vytištěný.
 * Uložený součet z toho dělá viditelné selhání místo tichého.
 *
 * Není to bezpečnostní funkce a nemá jí být — chrání proti vlastní chybě,
 * ne proti útočníkovi.
 */

/** FNV-1a, 32 bitů. Krátký, stabilní a nezávislý na platformě. */
export function hashString(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
