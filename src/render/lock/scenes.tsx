/**
 * Obrázky na úvodní obrazovku zámku — jeden na příběh.
 *
 * Kreslené tady jako SVG, ne stažené: hra musí jít spustit bez sítě (§5)
 * a obrázek ze stocku by nesl licenci, kterou nikdo nehlídá. Velké ploché
 * tvary schválně — na projektoru se jemné detaily slijí.
 *
 * Renderer o příběhu neví nic; dostane jen `scene` (id příběhu). Neznámá
 * scéna = žádný obrázek, hra jde dál.
 */

import type { ReactElement } from 'react'

export function Scene({ id }: { id: string | undefined }): ReactElement | null {
  const Picture = id === undefined ? undefined : SCENES[id]
  return Picture === undefined ? null : <Picture />
}

const SCENES: Record<string, () => ReactElement> = {
  poklad: PokladScene,
  hrobka: HrobkaScene,
}

/** Vchod do hrobky zavalený kamenem; v nápisu nad ním chybí písmena. */
function HrobkaScene() {
  return (
    <svg className="lock__scene" viewBox="0 0 800 400" role="img" aria-label="Zavalený vchod do hrobky s nápisem">
      <defs>
        <radialGradient id="hrobka-glow">
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Zeď z kvádrů */}
      <rect width="800" height="400" fill="#c9a36b" />
      <g stroke="#a8834f" strokeWidth="3">
        {[60, 120, 180, 240, 300].map((y) => (
          <line key={y} x1="0" y1={y} x2="800" y2={y} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((row) =>
          [0, 1, 2, 3, 4, 5, 6, 7].map((col) => {
            const x = col * 110 + (row % 2) * 55
            return <line key={`${row}-${col}`} x1={x} y1={row * 60} x2={x} y2={row * 60 + 60} />
          }),
        )}
      </g>

      {/* Záře pochodní */}
      <circle cx="170" cy="150" r="120" fill="url(#hrobka-glow)" />
      <circle cx="630" cy="150" r="120" fill="url(#hrobka-glow)" />

      {/* Hieroglyfy na zdi */}
      <g fill="none" stroke="#7a5530" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <Ankh x={70} y={90} />
        <Eye x={70} y={200} />
        <Ankh x={730} y={90} />
        <Eye x={730} y={200} />
        <path d="M45 270 q12 -12 25 0 t25 0 t25 0" />
        <path d="M705 270 q12 -12 25 0 t25 0 t25 0" />
      </g>

      {/* Podlaha s pískem */}
      <rect y="330" width="800" height="70" fill="#e2c486" />
      <path d="M0 350 q100 -14 200 0 t200 0 t200 0 t200 0" fill="none" stroke="#c9a463" strokeWidth="4" />
      <path d="M60 380 q90 -10 180 0 t180 0 t180 0 t180 0" fill="none" stroke="#c9a463" strokeWidth="4" />

      {/* Portál */}
      <polygon points="262,332 292,96 508,96 538,332" fill="#b8905a" stroke="#7a5530" strokeWidth="4" />
      <rect x="276" y="62" width="248" height="42" fill="#e3c792" stroke="#7a5530" strokeWidth="4" />
      <polygon points="266,62 534,62 520,40 280,40" fill="#a07a45" stroke="#7a5530" strokeWidth="4" />

      {/* Nápis: znaky a mezi nimi vysekaná místa */}
      <g fill="#7a5530">
        <circle cx="300" cy="83" r="7" />
        <rect x="318" y="72" width="22" height="22" rx="2" fill="#5a3d20" opacity="0.55" />
        <path d="M352 92 l10 -18 l10 18 z" />
        <rect x="384" y="72" width="22" height="22" rx="2" fill="#5a3d20" opacity="0.55" />
        <rect x="414" y="74" width="6" height="18" />
        <rect x="428" y="72" width="22" height="22" rx="2" fill="#5a3d20" opacity="0.55" />
        <path d="M460 92 q8 -24 16 0" fill="none" stroke="#7a5530" strokeWidth="5" />
        <rect x="484" y="72" width="22" height="22" rx="2" fill="#5a3d20" opacity="0.55" />
      </g>

      {/* Otvor a kámen, který ho zavalil */}
      <rect x="326" y="134" width="148" height="198" fill="#2e2014" />
      <rect x="334" y="146" width="132" height="186" fill="#8c6a40" stroke="#5a3d20" strokeWidth="4" />
      <path d="M352 190 l24 18 l-8 26 l20 22 M430 170 l-14 30 l16 20" fill="none" stroke="#5a3d20" strokeWidth="4" />

      {/* Pochodně */}
      <Torch x={170} />
      <Torch x={630} />

      {/* Váza a skarab */}
      <path d="M210 332 q-22 -40 0 -70 h26 q22 30 0 70 z" fill="#b5532a" stroke="#6b2d14" strokeWidth="4" />
      <rect x="212" y="252" width="22" height="12" fill="#b5532a" stroke="#6b2d14" strokeWidth="4" />
      <path d="M216 296 h14" stroke="#e3c792" strokeWidth="5" />
      <g fill="#1f3b5c">
        <ellipse cx="600" cy="352" rx="22" ry="15" />
        <circle cx="600" cy="332" r="9" />
      </g>
      <path d="M600 338 v28 M580 345 l-12 -6 M620 345 l12 -6 M580 360 l-12 6 M620 360 l12 6" stroke="#1f3b5c" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

function Ankh({ x, y }: { x: number; y: number }) {
  return <path d={`M${x} ${y + 18} q-14 -10 0 -28 q14 18 0 28 v40 M${x - 16} ${y + 26} h32`} />
}

function Eye({ x, y }: { x: number; y: number }) {
  return (
    <>
      <path d={`M${x - 24} ${y} q24 -20 48 0 q-24 20 -48 0`} />
      <circle cx={x} cy={y} r="6" fill="#7a5530" />
      <path d={`M${x - 6} ${y + 10} l-6 22`} />
    </>
  )
}

function Torch({ x }: { x: number }) {
  return (
    <g>
      <rect x={x - 6} y="150" width="12" height="70" fill="#5a3d20" />
      <rect x={x - 14} y="142" width="28" height="12" rx="3" fill="#7a5530" />
      <path d={`M${x} 82 q-22 36 -4 60 h8 q18 -24 -4 -60 z`} fill="#f28c28" />
      <path d={`M${x} 106 q-10 20 -2 36 h4 q8 -16 -2 -36 z`} fill="#ffd23f" />
    </g>
  )
}

/** Ostrov s palmou a zamčenou truhlou; zámek nemá dírku na klíč, jen okénka. */
function PokladScene() {
  return (
    <svg className="lock__scene" viewBox="0 0 800 400" role="img" aria-label="Ostrov s palmou a zamčenou truhlou">
      <defs>
        <linearGradient id="poklad-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7cc6ec" />
          <stop offset="1" stopColor="#d9f1fb" />
        </linearGradient>
      </defs>

      <rect width="800" height="260" fill="url(#poklad-sky)" />
      <circle cx="680" cy="70" r="40" fill="#ffd23f" />

      {/* Moře */}
      <rect y="230" width="800" height="170" fill="#2b8cbe" />
      <g fill="none" stroke="#7cc6ec" strokeWidth="4" strokeLinecap="round">
        <path d="M30 262 q15 -10 30 0 t30 0" />
        <path d="M560 252 q15 -10 30 0 t30 0" />
        <path d="M660 300 q15 -10 30 0 t30 0" />
        <path d="M40 360 q15 -10 30 0 t30 0" />
        <path d="M690 370 q15 -10 30 0 t30 0" />
      </g>

      {/* Loď na obzoru */}
      <path d="M520 222 h120 l-18 22 h-86 z" fill="#5a3418" />
      <rect x="578" y="140" width="5" height="84" fill="#5a3418" />
      <path d="M583 150 q34 22 0 56 z" fill="#fff" stroke="#c9c9c9" strokeWidth="2" />
      <path d="M578 154 q-30 20 0 50 z" fill="#fff" stroke="#c9c9c9" strokeWidth="2" />
      <rect x="583" y="124" width="30" height="18" fill="#10172a" />
      <circle cx="598" cy="132" r="5" fill="#fff" />

      {/* Ostrov */}
      <ellipse cx="330" cy="330" rx="300" ry="70" fill="#f1d28a" />
      <ellipse cx="330" cy="318" rx="270" ry="52" fill="#f6dc9c" />

      {/* Palma */}
      <path d="M200 312 q-10 -90 30 -170" fill="none" stroke="#7a4a22" strokeWidth="16" strokeLinecap="round" />
      <g fill="#2f8f46">
        <path d="M232 140 q-60 -30 -110 10 q60 -10 110 -10 z" />
        <path d="M232 140 q-30 -60 -90 -60 q50 20 90 60 z" />
        <path d="M232 140 q30 -60 100 -50 q-60 10 -100 50 z" />
        <path d="M232 140 q70 -10 110 40 q-60 -30 -110 -40 z" />
        <path d="M232 140 q-10 40 -60 70 q30 -40 60 -70 z" />
      </g>
      <circle cx="226" cy="150" r="9" fill="#6b4220" />
      <circle cx="242" cy="152" r="9" fill="#6b4220" />

      {/* Lopata a křížek v písku */}
      <path d="M470 330 l40 -22 M470 312 l40 22" stroke="#c0392b" strokeWidth="7" strokeLinecap="round" />
      <rect x="146" y="214" width="8" height="80" fill="#8b5a2b" transform="rotate(-14 150 254)" />
      <path d="M158 290 l22 -6 l8 30 q-12 10 -24 6 z" fill="#8a96a3" stroke="#4a5163" strokeWidth="3" />

      {/* Truhla */}
      <g stroke="#4a2a10" strokeWidth="4">
        <rect x="320" y="250" width="130" height="66" fill="#8b5a2b" />
        <path d="M320 250 q0 -46 65 -46 q65 0 65 46 z" fill="#a0692f" />
        <rect x="344" y="206" width="12" height="110" fill="#c9a227" />
        <rect x="414" y="206" width="12" height="110" fill="#c9a227" />
      </g>
      {/* Zámek s okénky místo dírky */}
      <path d="M372 258 v-12 q13 -16 26 0 v12" fill="none" stroke="#7d6510" strokeWidth="5" />
      <rect x="364" y="256" width="42" height="32" rx="4" fill="#e3b82e" stroke="#7d6510" strokeWidth="3" />
      <rect x="369" y="264" width="9" height="14" fill="#fff" stroke="#7d6510" strokeWidth="2" />
      <rect x="381" y="264" width="9" height="14" fill="#fff" stroke="#7d6510" strokeWidth="2" />
      <rect x="393" y="264" width="9" height="14" fill="#fff" stroke="#7d6510" strokeWidth="2" />
    </svg>
  )
}
