/**
 * Aplikační shell.
 *
 * Jediné místo, kde se potkává stav formuláře, generátor a vykreslení.
 * Generování je čistá funkce konfigurace, takže se dá počítat v `useMemo` —
 * žádné efekty, žádná synchronizace stavu.
 */

import { useMemo, useRef, useState } from 'react'
import {
  generateCipherGrid,
  sheetChecksum,
  solutionTitle,
  worksheetTitle,
} from '../activities/cipher-grid/index.js'
import { randomSeed } from '../core/rng/index.js'
import { EditorPanel, type EditorState } from '../features/editor/EditorPanel.js'
import { INITIAL_EDITOR_STATE, fromConfig, toConfig } from '../features/editor/state.js'
import { SolutionView, WorksheetView } from '../render/screen/index.js'
import { parseSifra, serializeSifra, suggestFileName } from '../storage/sifra.js'
import '../render/print/print.css'
import './app.css'

interface FileNotice {
  level: 'info' | 'error'
  message: string
}

export function App() {
  const [state, setState] = useState<EditorState>(INITIAL_EDITOR_STATE)
  const [seed, setSeed] = useState(() => randomSeed())
  const [fileNotice, setFileNotice] = useState<FileNotice | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const outcome = useMemo(() => generateCipherGrid(toConfig(state, seed)), [state, seed])
  const sheet = outcome.ok ? outcome.sheet : null
  // Ústupky se hlásí i při neúspěchu — často právě ony vysvětlují, proč to nešlo.
  const notices = outcome.ok ? outcome.sheet.relaxations : outcome.relaxations

  const handleSave = () => {
    if (sheet === null) return
    const text = serializeSifra(sheet.config, sheetChecksum(sheet))
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = suggestFileName(sheet.title)
    link.click()
    URL.revokeObjectURL(url)
    setFileNotice({ level: 'info', message: `Uloženo jako ${link.download}` })
  }

  const handleOpen = async (file: File) => {
    const parsed = parseSifra(await file.text())
    if (!parsed.ok) {
      setFileNotice({ level: 'error', message: parsed.error })
      return
    }

    const restored = fromConfig(parsed.file.config)
    setState(restored.state)
    setSeed(restored.seed)

    // Soubor nese jen konfiguraci — list se dopočítá. Kontrolní součet je
    // jediné, co odhalí, že ho jiná verze generátoru dopočítala jinak.
    const check = generateCipherGrid(parsed.file.config)
    if (check.ok && sheetChecksum(check.sheet) !== parsed.file.checksum) {
      setFileNotice({
        level: 'error',
        message: `Tato aktivita byla uložena ve verzi ${parsed.file.config.appVersion}. Aktuální verze pro ni vytvoří jiný list — dřív vytištěné řešení už nemusí sedět.`,
      })
      return
    }
    setFileNotice({ level: 'info', message: `Otevřeno: ${file.name}` })
  }

  return (
    <div className="app">
      <header className="app__header no-print">
        <h1 className="app__title">Šifromatika</h1>
        <p className="app__subtitle">Matematická šifrovací hra na pár kliknutí</p>
      </header>

      <EditorPanel
        state={state}
        onChange={(next) => {
          setState(next)
          setFileNotice(null)
        }}
        onReroll={() => {
          setSeed(randomSeed())
          setFileNotice(null)
        }}
        onPrint={() => window.print()}
        onSave={handleSave}
        onOpen={() => fileInput.current?.click()}
        canPrint={sheet !== null && sheet.verification.ok}
      />

      <input
        ref={fileInput}
        className="no-print"
        type="file"
        accept=".sifra,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleOpen(file)
          event.target.value = '' // ať jde tentýž soubor otevřít znovu
        }}
      />

      {!outcome.ok && (
        <p className="banner banner--error no-print" role="alert">
          {outcome.reason}
        </p>
      )}

      {fileNotice !== null && (
        <p
          className={`banner banner--${fileNotice.level === 'error' ? 'error' : 'info'} no-print`}
          role={fileNotice.level === 'error' ? 'alert' : undefined}
        >
          {fileNotice.message}
        </p>
      )}

      {notices
        .filter((entry) => entry.level !== 'silent')
        .map((entry) => (
          <p className="banner banner--notice no-print" key={entry.code}>
            {entry.message}
          </p>
        ))}

      {sheet !== null && !sheet.verification.ok && (
        <p className="banner banner--error no-print" role="alert">
          Vygenerovaný list neprošel kontrolou, proto se netiskne. Zkus jinou variantu.
        </p>
      )}

      {sheet !== null && sheet.verification.ok && (
        <main className="app__preview">
          <WorksheetView
            title={worksheetTitle(sheet)}
            table={sheet.table}
            slots={sheet.slots}
            wordLengths={sheet.message.wordLengths}
            columns={sheet.config.payload.output.columns}
          />
          <div className="print-page-break">
            <SolutionView
              title={sheet.titleDerived ? null : solutionTitle(sheet)}
              message={sheet.message.original}
              table={sheet.table}
              slots={sheet.slots}
              wordLengths={sheet.message.wordLengths}
            />
          </div>
        </main>
      )}
    </div>
  )
}
