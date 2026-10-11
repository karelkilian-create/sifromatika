/**
 * Tisk únikovky do PDF tak, jak ho udělá Chrome z dialogu tisku.
 *
 * Hlídá se zalomení: každé stanoviště má být na jednom listu A4 (dítě
 * dostane jeden papír, ne dva sešité), přehled pro učitele se tiskne zvlášť.
 * PDF se ukládají do přílohy, ať se dá zkontrolovat i oko.
 */

import { expect, test, type Page } from '@playwright/test'
import { choose, field, openEscape } from './helpers.js'

/**
 * Počet stránek PDF z Chromia. Skia píše každou stránku jako objekt
 * `/Type /Page` (strom stránek je `/Type /Pages`).
 */
function pageCount(pdf: Buffer): number {
  return pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0
}

/**
 * Tlačítko tisku volá `window.print()`, který by v testu otevřel dialog.
 * Místo něj se jen zaznamená volání a PDF vyrobí `page.pdf()` — se stejným
 * `@media print` a `@page` jako skutečný tisk.
 */
async function stubPrint(page: Page) {
  await page.addInitScript(() => {
    window.print = () => {
      document.body.dataset.printed = String(Number(document.body.dataset.printed ?? 0) + 1)
    }
  })
}

async function printPdf(page: Page, button: string): Promise<Buffer> {
  const before = Number((await page.locator('body').getAttribute('data-printed')) ?? 0)
  await page.getByRole('button', { name: button, exact: true }).click()
  await expect(page.locator('body')).toHaveAttribute('data-printed', String(before + 1))
  return page.pdf({ format: 'A4', preferCSSPageSize: true })
}

const GRADES = ['2. třída', '4. třída', '6. třída', '8. třída'] as const
const KINDS = ['Šifrovací tabulka', 'Výběr ze tří odpovědí'] as const

for (const grade of GRADES) {
  for (const kind of KINDS) {
    test(`celá třída, ${grade}, ${kind}: stanoviště po jednom listu`, async ({ page }, testInfo) => {
      await stubPrint(page)
      await openEscape(page)
      await choose(page, 'Ročník', grade)
      await choose(page, 'Délka hry', 'Dlouhá')
      await choose(page, 'Stanoviště', kind)
      await expect(page.getByRole('button', { name: 'Spustit zámek' })).toBeEnabled()
      const stations = await page.locator('.table-section').count()

      const pupils = await printPdf(page, 'Vytisknout stanoviště')
      await testInfo.attach('stanoviste.pdf', { body: pupils, contentType: 'application/pdf' })
      expect(pageCount(pupils), 'stanoviště přeteklo na druhý list').toBe(stations)

      const teacher = await printPdf(page, 'Vytisknout přehled')
      await testInfo.attach('prehled.pdf', { body: teacher, contentType: 'application/pdf' })
      expect(pageCount(teacher)).toBeGreaterThanOrEqual(1)
      expect.soft(pageCount(teacher), 'přehled pro učitele má víc než dva listy').toBeLessThanOrEqual(2)
    })
  }
}

test('skupiny: jeden tisk, každá skupina má svá stanoviště po jednom listu', async ({ page }, testInfo) => {
  await stubPrint(page)
  await openEscape(page)
  await choose(page, 'Kdo hraje', 'Skupiny — každá má svá stanoviště')
  await field(page, 'Počet skupin').locator('input').fill('6')
  await choose(page, 'Délka hry', 'Dlouhá')
  await expect(page.getByRole('button', { name: 'Spustit zámek' })).toBeEnabled()
  const stations = await page.locator('.table-section').count()

  const pdf = await printPdf(page, 'Vytisknout')
  await testInfo.attach('skupiny.pdf', { body: pdf, contentType: 'application/pdf' })
  // Stanoviště + přehled pro učitele (jeden až dva listy).
  expect(pageCount(pdf)).toBeGreaterThanOrEqual(stations + 1)
  expect.soft(pageCount(pdf), 'některé stanoviště přeteklo nebo přehled má přes dva listy').toBeLessThanOrEqual(
    stations + 2,
  )
})
