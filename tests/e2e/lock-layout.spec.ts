/**
 * Zámek na rozlišeních, která ve třídách běží na projektorech a tabulích.
 *
 * Ověřuje se jen to, co jde změřit: nic nepřetéká do strany a to, na co děti
 * klikají (rámečky, klávesnice, Odeslat), je celé na obrazovce bez rolování.
 * Jestli je to čitelné z poslední lavice, neřekne žádný test — snímky se
 * ukládají do přílohy (`npx playwright show-report`), ať se na ně dá podívat.
 */

import { expect, test, type Locator, type Page } from '@playwright/test'
import { choose, field, openEscape } from './helpers.js'

const SCREENS = [
  { name: 'starý projektor 4:3', width: 1024, height: 768 },
  { name: 'projektor 16:10', width: 1280, height: 800 },
  { name: 'notebook HD', width: 1366, height: 768 },
  { name: 'tabule Full HD', width: 1920, height: 1080 },
] as const

/** Celý prvek leží v okně — nic se neořízne ani neschová pod okraj. */
async function expectInViewport(page: Page, locator: Locator, what: string) {
  const box = await locator.boundingBox()
  const viewport = page.viewportSize()!
  expect(box, `${what}: není vidět`).not.toBeNull()
  expect.soft(box!.x, `${what}: přetéká vlevo`).toBeGreaterThanOrEqual(0)
  expect.soft(box!.y, `${what}: přetéká nahoru`).toBeGreaterThanOrEqual(0)
  expect.soft(box!.x + box!.width, `${what}: přetéká vpravo`).toBeLessThanOrEqual(viewport.width)
  expect.soft(box!.y + box!.height, `${what}: je pod spodním okrajem`).toBeLessThanOrEqual(viewport.height)
}

/**
 * Zámek se nesmí posouvat do strany. Dolů se může posunout o kousek spodního
 * odsazení (přesah ~20 px u dlouhé hry je jen `padding-bottom`), proto se
 * svisle hlídají jednotlivé prvky v `expectInViewport`, ne `scrollHeight`.
 */
async function expectNoHorizontalScroll(page: Page, phase: string) {
  const overflow = await page.evaluate(() => {
    const lock = document.querySelector('.lock')!
    return {
      page: document.documentElement.scrollWidth - window.innerWidth,
      lock: lock.scrollWidth - lock.clientWidth,
    }
  })
  expect.soft(overflow.page, `${phase}: stránka se posouvá do strany`).toBeLessThanOrEqual(0)
  expect.soft(overflow.lock, `${phase}: zámek přetéká do strany`).toBeLessThanOrEqual(0)
}

const GAMES = [
  { name: 'krátká hra', story: 'Poklad', length: 'Krátká', message: null },
  { name: 'dlouhá hra', story: 'Poklad', length: 'Dlouhá', message: null },
  // Nejdelší tajenka, kterou formulář pustí (40 znaků) — nejhorší případ pro rámečky.
  { name: 'tajenka na 40 znaků', story: 'Poklad', length: 'Dlouhá', message: 'NA OSTROVĚ JE POKLAD, KAPITÁNE, VZHŮRU!!' },
  // Hrobka má delší úvod než Poklad: „Začít hru" bylo pod okrajem i s výchozí tajenkou.
  { name: 'Hrobka', story: 'Hrobka', length: 'Dlouhá', message: null },
  { name: 'Hrobka, tajenka na 39 znaků', story: 'Hrobka', length: 'Dlouhá', message: 'FARAON SPÍ V ZLATÉ HROBCE, POZOR, MUMIE' },
] as const

for (const screen of SCREENS) {
  for (const game of GAMES) {
    test(`${screen.name} ${screen.width}×${screen.height}, ${game.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: screen.width, height: screen.height })
      await openEscape(page)
      await choose(page, 'Příběh', game.story)
      await choose(page, 'Délka hry', game.length)
      if (game.message !== null) {
        await field(page, 'Tajenka').locator('input').fill(game.message)
        await expect(page.locator('.banner--error')).toHaveCount(0)
      }

      await page.getByRole('button', { name: 'Spustit zámek' }).click()
      const lock = page.getByRole('dialog', { name: 'Zámek únikové hry' })
      await expect(lock).toBeVisible()

      // Úvod: tlačítko pro začátek nesmí být pod okrajem.
      await expectNoHorizontalScroll(page, 'úvod')
      await expectInViewport(page, lock.getByRole('button', { name: 'Začít hru' }), 'Začít hru')
      await testInfo.attach('uvod.png', { body: await page.screenshot(), contentType: 'image/png' })

      await startLockFromIntro(page)
      // Kliknutí Playwrightu si „Začít hru" dorolovalo; zpátky nahoru, jak
      // zámek uvidí třída hned po startu.
      await page.locator('.lock').evaluate((lock) => lock.scrollTo(0, 0))
      await expectNoHorizontalScroll(page, 'zadávání')
      await expectInViewport(page, lock.locator('.lock__boxes'), 'rámečky tajenky')
      await expectInViewport(page, lock.locator('.lock__input'), 'políčko se slovem')
      await expectInViewport(page, lock.locator('.lock__keyboard'), 'klávesnice')
      await expectInViewport(page, lock.getByRole('button', { name: 'Učitel' }), 'tlačítko Učitel')
      await testInfo.attach('zadavani.png', { body: await page.screenshot(), contentType: 'image/png' })
    })
  }
}

/** Úvod už je otevřený (kvůli snímku), stačí kliknout na „Začít hru". */
async function startLockFromIntro(page: Page) {
  await page.getByRole('button', { name: 'Začít hru' }).click()
  await expect(page.locator('.lock__keyboard')).toBeVisible()
}
