/**
 * Vstupní bod aplikace.
 *
 * `Analytics` nic nevykresluje — jen přidá skript, který Vercelu hlásí
 * zobrazení stránky. Počítá návštěvy, ne lidi: neukládá cookie ani IP adresu,
 * takže list ani učitel o sobě nic neprozradí. Čísla jsou vidět jen
 * v nástěnce projektu na Vercelu, nikde v aplikaci.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { App } from './app/App.js'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)
