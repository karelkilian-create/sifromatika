import { expect, type Page } from '@playwright/test'

/** Stanoviště tak, jak je vypisuje přehled pro učitele. */
export interface StationAnswer {
  /** „Stanoviště 2" nebo „Modrá 1". */
  label: string
  /** Slovo s diakritikou, jak je v příběhu: `KLÍČ`. */
  word: string
}

/** Slovo, jak ho dítě naťuká na klávesnici zámku: `KLÍČ` → `KLIC`. */
export function plain(word: string): string {
  return word.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase()
}

/** Otevře záložku Úniková hra s čistým prohlížečem (nový kontext = prázdné úložiště). */
export async function openEscape(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: /Úniková hra/ }).click()
  await expect(page.getByRole('button', { name: 'Spustit zámek' })).toBeEnabled()
}

/**
 * Vybere hodnotu v rozbalovacím poli podle popisku nad ním. Stačí začátek
 * textu volby — „Krátká" najde „Krátká — 4 stanoviště".
 */
export async function choose(page: Page, label: string, option: string): Promise<void> {
  const select = field(page, label).locator('select')
  const options = await select.locator('option').evaluateAll((all) =>
    all.map((element) => ({ value: (element as HTMLOptionElement).value, text: element.textContent ?? '' })),
  )
  const match = options.find((candidate) => candidate.text.startsWith(option))
  if (match === undefined) throw new Error(`${label}: volba „${option}" chybí (${options.map((o) => o.text).join(' | ')})`)
  await select.selectOption(match.value)
}

/** Pole formuláře podle popisku. `<label>` obaluje popisek i vstup. */
export function field(page: Page, label: string) {
  return page.locator('label.field').filter({
    has: page.locator('.field__label', { hasText: new RegExp(`^${label}$`) }),
  })
}

/**
 * Slova stanovišť z přehledu pro učitele v náhledu.
 *
 * Nadpis oddílu má tvar „Stanoviště 1 — DUKÁT · tabule bere D, A". Test si
 * slova bere odtud, stejně jako by je učitel přečetl z papíru — nesahá do
 * vnitřností generátoru, takže ověřuje i to, že přehled sedí se zámkem.
 */
export async function readAnswers(page: Page): Promise<StationAnswer[]> {
  const titles = await page.locator('.table-section').evaluateAll((sections) =>
    sections.map((section) => (section.textContent ?? '').trim()),
  )
  const answers = titles.map((text) => {
    const match = /^(.+?) — (\S+) · tabule bere/.exec(text)
    if (match === null) throw new Error(`Nečitelný oddíl řešení: ${text.slice(0, 80)}`)
    return { label: match[1]!, word: match[2]! }
  })
  expect(answers.length).toBeGreaterThan(0)
  return answers
}

/** Spustí zámek a přečte úvod. Hodiny se rozběhnou až „Začít hru". */
export async function startLock(page: Page) {
  await page.getByRole('button', { name: 'Spustit zámek' }).click()
  const lock = page.getByRole('dialog', { name: 'Zámek únikové hry' })
  await expect(lock).toBeVisible()
  await lock.getByRole('button', { name: 'Začít hru' }).click()
  return lock
}

/** Hlavní velké tlačítko zámku (pokračovat po větě příběhu, otevřít zámek…). */
export function bigButton(page: Page) {
  return page.locator('.lock__big-button')
}
