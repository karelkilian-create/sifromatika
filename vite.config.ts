import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // `.tsx` kvůli sazbě: `MathText` se dá ověřit `renderToStaticMarkup`,
    // a to i v `node` prostředí — nepotřebuje DOM, jen React.
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    environment: 'node',
  },
})
