/**
 * Celá hra na zámku od úvodu po otevření, v obou režimech.
 *
 * Slova se berou z přehledu pro učitele a zadávají se jako ve třídě:
 * v „celé třídě" z fyzické klávesnice i s diakritikou, ve „skupinách"
 * klikáním na klávesnici na obrazovce (interaktivní tabule nemá jinou).
 */

import { expect, test, type Page } from '@playwright/test'
import { bigButton, choose, field, openEscape, plain, readAnswers, startLock } from './helpers.js'

/**
 * Stisk klávesy, jak ho pošle česká klávesnice: `keydown` s `key: "ď"`.
 *
 * `keyboard.type` by písmeno s diakritikou vložil jako text bez `keydown`
 * a `keyboard.press` zná jen klávesy americké klávesnice. Zámek poslouchá
 * `keydown` na `window`, takže stačí tu událost poslat.
 */
async function pressKey(page: Page, key: string) {
  if (/^[a-z]$/i.test(key)) return page.keyboard.press(key)
  await page.evaluate((key) => window.dispatchEvent(new KeyboardEvent('keydown', { key })), key)
}

test('celá třída: špatné slovo zatřese, správná slova otevřou zámek', async ({ page }) => {
  await openEscape(page)
  const answers = await readAnswers(page)
  const message = (await page.locator('.solution-message').innerText()).trim()
  const lock = await startLock(page)
  const progress = lock.locator('.lock__progress')

  // Špatné slovo: zatřesení, nic se neuzná.
  await page.keyboard.type('XYZ')
  await page.keyboard.press('Enter')
  await expect(lock.locator('.lock__input')).toHaveAttribute('data-shake', 'yes')
  await expect(progress).toHaveText(new RegExp(`^0 / ${answers.length}`))
  for (let i = 0; i < 3; i++) await page.keyboard.press('Backspace')

  for (const [index, answer] of answers.entries()) {
    await expect(lock.locator('.lock__prompt')).toHaveText(`Slovo ze stanoviště ${index + 1}`)
    // Malými písmeny a s diakritikou — tabule musí vzít „klíč" jako KLIC.
    for (const letter of answer.word.toLowerCase()) await pressKey(page, letter)
    await page.keyboard.press('Enter')
    await expect(lock.locator('.lock__ok')).toHaveText(`✓ Slovo ${answer.word} platí!`)
    await expect(progress).toHaveText(new RegExp(`^${index + 1} / `))
    await bigButton(page).click()
  }

  await expect(lock.locator('.lock__message')).toHaveText(message)
  const boxes = lock.locator('.lock__box')
  await expect(lock.locator('.lock__box--filled')).toHaveCount(await boxes.count())
})

test('skupiny: každá skupina zadá svá slova, tajenka se odhalí na konci', async ({ page }) => {
  await openEscape(page)
  await choose(page, 'Kdo hraje', 'Skupiny — každá má svá stanoviště')
  await field(page, 'Počet skupin').locator('input').fill('2')
  await expect(page.getByRole('button', { name: 'Spustit zámek' })).toBeEnabled()

  const answers = await readAnswers(page)
  const message = (await page.locator('.solution-message').innerText()).trim()
  const byGroup = Map.groupBy(answers, (answer) => answer.label.split(' ')[0]!)
  expect(byGroup.size).toBe(2)

  const lock = await startLock(page)
  for (const [group, words] of byGroup) {
    await lock.locator('.lock__group', { hasText: group }).click()
    // Ve skupinách se slova smí zadat v libovolném pořadí — schválně odzadu.
    for (const answer of words.toReversed()) {
      for (const letter of plain(answer.word)) {
        await lock.locator('.lock__key', { hasText: new RegExp(`^${letter}$`) }).click()
      }
      await lock.getByRole('button', { name: 'Odeslat' }).click()
      await expect(lock.locator('.lock__ok')).toHaveText(`✓ Slovo ${answer.word} platí!`)
      // Písmena tajenky zůstávají ve skupinách až do konce schovaná.
      await expect(lock.locator('.lock__box--filled')).toHaveCount(0)
      await bigButton(page).click()
    }
  }

  // Závěrečné odhalení jde slovo po slově (1,8 s na slovo).
  await expect(lock.locator('.lock__reveal li')).toHaveCount(answers.length, { timeout: 30_000 })
  await lock.getByRole('button', { name: 'Otevřít zámek' }).click()
  await expect(lock.locator('.lock__message')).toHaveText(message)
})

test('učitel umí vrátit slovo a uznat slovo bez zadání', async ({ page }) => {
  await openEscape(page)
  const answers = await readAnswers(page)
  const lock = await startLock(page)
  const progress = lock.locator('.lock__progress')
  const teacher = lock.getByRole('button', { name: 'Učitel' })

  await teacher.click()
  await lock.getByRole('button', { name: 'Uznat slovo bez zadání' }).click()
  await expect(lock.locator('.lock__ok')).toHaveText(`✓ Slovo ${answers[0]!.word} platí!`)
  await expect(progress).toHaveText(/^1 \//)

  await teacher.click()
  await lock.getByRole('button', { name: 'Vrátit poslední slovo' }).click()
  await expect(progress).toHaveText(/^0 \//)
  await expect(lock.locator('.lock__prompt')).toHaveText('Slovo ze stanoviště 1')

  await teacher.click()
  await lock.getByRole('button', { name: 'Ukončit hru' }).click()
  await expect(lock).toBeHidden()
})

test('Zmizelý obraz: dlouhá hra projde až k závěru', async ({ page }) => {
  await openEscape(page)
  await choose(page, 'Příběh', 'Zmizelý obraz')
  await choose(page, 'Délka hry', 'Dlouhá')
  await expect(page.getByRole('button', { name: 'Spustit zámek' })).toBeEnabled()
  const answers = await readAnswers(page)
  const message = (await page.locator('.solution-message').innerText()).trim()
  expect(message).toBe('PACHATEL JE NOČNÍ UKLÍZEČ')
  const lock = await startLock(page)

  for (const answer of answers) {
    await page.keyboard.type(plain(answer.word))
    await page.keyboard.press('Enter')
    await expect(lock.locator('.lock__ok')).toHaveText(`✓ Slovo ${answer.word} platí!`)
    await bigButton(page).click()
  }

  await expect(lock.locator('.lock__message')).toHaveText(message)
  await expect(lock.getByText(/Pachatelem byl noční uklízeč/)).toBeVisible()
})
