/**
 * Odkaz na konkrétní list.
 *
 * Učitel klikne na „Sdílet" a pošle kolegyni odkaz, ze kterého se otevře
 * **tentýž list** — ne holá aplikace a ne soubor. Konfigurace se do odkazu
 * vejde celá, protože soubor `.sifra` obsahuje jen zadání a semínko; tabulka
 * i příklady se dopočítají.
 *
 * Konfigurace sedí ve **fragmentu** (`#s=…`), ne v dotazu (`?s=…`), a to je
 * to nejdůležitější rozhodnutí v tomhle modulu: fragment prohlížeč na server
 * neposílá. Tajenka se tak nemá jak dostat do přístupového logu hostingu —
 * viz docs/navrh-sdileni-odkazem.md §2.
 *
 * Klíč `s` je zároveň místem pro verzi kódování. Kdyby někdy přibyla komprese,
 * ponese jiný klíč a starší Šifromatika takový odkaz poctivě odmítne, místo
 * aby z něj vyrobila nesmysl.
 *
 * ⚠ Vstup je NEDŮVĚRYHODNÝ, dokonce víc než soubor — odkaz jde přepsat rovnou
 *   v adresním řádku. Kontroluje ho proto týž parser jako `.sifra`; tenhle
 *   modul řeší jen obal, žádné vlastní ověřování konfigurace.
 *
 * Modul se nedotýká DOM: `TextEncoder`, `btoa` i `atob` jsou k dispozici
 * i mimo prohlížeč, takže jde celý otestovat bez okna.
 */

import type { ProjectConfig } from '../core/model/index.js'
import { buildSifraFile, parseSifra, type SifraParseResult } from './sifra.js'

/** Klíč ve fragmentu. Změna klíče = změna kódování, viz hlavička. */
const LINK_KEY = 's'

/**
 * Konfigurace → celý odkaz včetně domény.
 *
 * `base` je adresa aplikace, obvykle `location.origin + location.pathname`.
 * Případný starý fragment se zahodí — jinak by se odkaz na sdílený list
 * sdílel dál i poté, co si ho učitel přepsal.
 */
export function buildShareLink(base: string, config: ProjectConfig, checksum: string): string {
  const json = JSON.stringify(buildSifraFile(config, checksum))
  return `${base.split('#')[0] ?? ''}#${LINK_KEY}=${encodeBase64Url(json)}`
}

/**
 * `location.hash` → výsledek parseru.
 *
 * `null` znamená „v odkazu žádný list není" — tedy běžné spuštění aplikace,
 * ne chyba. Rozlišuje se to schválně: prázdná Šifromatika s hláškou o
 * poškozeném odkazu by strašila každého, kdo si ji jen otevřel.
 */
export function readShareLink(hash: string): SifraParseResult | null {
  const raw = new URLSearchParams(hash.replace(/^#/u, '')).get(LINK_KEY)
  if (raw === null) return null

  const json = decodeBase64Url(raw)
  // Prázdný klíč i nečitelný obsah jsou totéž: odkaz se cestou useknul.
  // Mailoví klienti umí dlouhý odkaz zalomit a člověk zkopíruje jen půlku.
  if (json === null) return parseSifra('', 'link')

  return parseSifra(json, 'link')
}

/**
 * Text → base64url.
 *
 * Přes `TextEncoder`, ne přímo `btoa`: to umí jen bajty do 255 a na prvním
 * „Ú" v tajence by spadlo. Odpadá i výplň `=`, která v URL nemá co dělat.
 */
function encodeBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '')
}

/** base64url → text, nebo `null`, když to base64url ani platné UTF-8 není. */
function decodeBase64Url(value: string): string | null {
  if (value === '') return null
  try {
    const base64 = value.replace(/-/gu, '+').replace(/_/gu, '/')
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    // `fatal` schválně: půlka odkazu často dá platné bajty, ale neplatné UTF-8,
    // a tiše useknutá tajenka je horší než hláška „nech si ho poslat znovu".
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}
