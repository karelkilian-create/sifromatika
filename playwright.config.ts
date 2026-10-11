import { defineConfig, devices } from '@playwright/test'

/**
 * Testy v prohlížeči — docs/navrh-unikova-hra.md, „na tabuli nevyzkoušeno".
 *
 * Vitest ověřuje generátor bez DOMu; tady se kliká na skutečnou stránku:
 * zámek na tabuli, rozložení na rozlišeních projektorů a tisk do PDF.
 * Soubory jsou `.spec.ts`, aby je nesebral `vitest run` (ten bere `.test.ts`).
 *
 * Jen Chromium: `page.pdf()` jinde nejde a tabule ve školách běží
 * na Chromu nebo Edgi.
 */
const PORT = 5174

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
})
