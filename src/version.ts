/**
 * Verze aplikace a generátoru.
 *
 * Jsou to dvě různá čísla schválně (viz docs/rozsah-0.1.md §3.7):
 *
 *  - `GENERATOR_VERSION` se mění, jen když se změní deterministický výstup.
 *    Každý inkrement znamená, že staré seedy vygenerují jiný list.
 *  - `APP_VERSION` se mění s každým vydáním. Odlišuje chybu v generátoru
 *    od chyby v UI, renderu nebo importu.
 */

export const GENERATOR_VERSION = 1
export const APP_VERSION = '0.1.0-dev'
