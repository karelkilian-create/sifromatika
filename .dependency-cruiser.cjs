/**
 * Vynucení vrstev z docs/rozsah-0.1.md §1.
 *
 *   app → features → activities → { ciphers, tasks } → core
 *   render → core                    (render nesmí do activities)
 *   core → nic
 *
 * Bez tohohle souboru je architektura jen doporučení v dokumentu. Právě proto,
 * že projekt zůstává jednobalíčkový (žádné pnpm workspace), musí hranice hlídat
 * lint — jinak se do `core` během pár týdnů dostane import Reactu.
 */
module.exports = {
  forbidden: [
    {
      name: 'core-nezavisi-na-nicem',
      severity: 'error',
      comment: 'core je čisté doménové jádro. Nesmí importovat žádnou jinou vrstvu ani knihovnu.',
      from: { path: '^src/core' },
      to: { pathNot: '^src/core' },
    },
    {
      name: 'core-a-tasks-bez-reactu',
      severity: 'error',
      comment:
        'core a tasks musí být spustitelné bez DOM. Jinak je nelze znovupoužít v CLI, ve Web Workeru ani v dalších modulech (bingo, domino).',
      from: { path: '^src/(core|tasks)' },
      to: { path: 'node_modules/(react|react-dom)' },
    },
    {
      name: 'tasks-a-ciphers-neznaji-aktivity',
      severity: 'error',
      comment:
        'Vrstva úloh a vrstva šifer o sobě navzájem ani o aktivitách nesmí vědět. To je celý platformní argument — bingo použije tasks beze změny.',
      from: { path: '^src/(tasks|ciphers)' },
      to: { path: '^src/(activities|features|app|render)' },
    },
    {
      name: 'tasks-a-ciphers-jsou-nezavisle',
      severity: 'error',
      comment: 'Šifra říká jen „potřebuji tyhle hodnoty". Nesmí sahat do generátorů úloh a naopak.',
      from: { path: '^src/tasks' },
      to: { path: '^src/ciphers' },
    },
    {
      name: 'render-nezna-aktivity',
      severity: 'error',
      comment: 'Renderer dostává data, ne aktivitu. Díky tomu půjde v 0.3 vložit DocumentModel bez zásahu do generátoru.',
      from: { path: '^src/render' },
      to: { path: '^src/(activities|features|app)' },
    },
    {
      name: 'zadne-cykly',
      severity: 'error',
      comment: 'Kruhová závislost mezi moduly.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'zadny-osamely-modul',
      severity: 'warn',
      comment: 'Modul, na který nikdo neodkazuje — buď zbytek, nebo zapomenuté napojení.',
      from: { orphan: true, pathNot: '(^src/main\\.tsx$|\\.d\\.ts$|\\.config\\.(ts|js|cjs)$)' },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.test\\.ts$' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.app.json' },
    reporterOptions: { text: { highlightFocused: true } },
  },
}
