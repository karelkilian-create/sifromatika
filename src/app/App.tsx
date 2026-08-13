/**
 * Aplikační shell.
 *
 * Jediné místo, kde se potkává stav formuláře, generátor a vykreslení.
 * Generování je čistá funkce konfigurace, takže se dá počítat v `useMemo` —
 * žádné efekty, žádná synchronizace stavu.
 *
 * Aktivit je víc, a shell je jediné místo, které o nich ví všech najednou.
 * Samotné aktivity o sobě navzájem nevědí.
 */

import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  generateCipherGrid,
  sheetChecksum as cipherChecksum,
  solutionTitle as cipherSolutionTitle,
  worksheetTitle as cipherWorksheetTitle,
} from '../activities/cipher-grid/index.js'
import {
  generateSequenceSheet,
  sheetChecksum as sequenceChecksum,
  worksheetTitle as sequenceWorksheetTitle,
} from '../activities/sequence-sheet/index.js'
import type { ProjectConfig } from '../core/model/index.js'
import { randomSeed } from '../core/rng/index.js'
import { SifromatikaMark } from '../render/brand/index.js'
import { DiplomaScreen } from '../features/diploma/DiplomaScreen.js'
import { ActivityNav } from '../features/editor/ActivityNav.js'
import { EditorPanel, type EditorState } from '../features/editor/EditorPanel.js'
import { INITIAL_EDITOR_STATE, fromConfig, toConfig } from '../features/editor/state.js'
import {
  SolutionView,
  TaskSheetView,
  TaskSolutionView,
  WorksheetView,
} from '../render/screen/index.js'
import { parseSifra, serializeSifra, suggestFileName } from '../storage/sifra.js'
import '../render/print/print.css'
import './app.css'

const SEQUENCE_INSTRUCTIONS =
  'U každé řady nejdřív zjisti, podle jakého pravidla čísla postupují. Potom doplň číslo, které patří místo otazníku.'

interface FileNotice {
  level: 'info' | 'error'
  message: string
}

/**
 * Části aplikace.
 *
 * Diplom není aktivita — nemá seed, obtížnost ani řešení — a proto nepatří
 * do `ActivityNav` vedle šifry a řad. Je to druhá obrazovka téhož nástroje.
 */
type AppView = 'worksheets' | 'diploma'

const VIEW_LABELS: Record<AppView, string> = {
  worksheets: 'Pracovní listy',
  diploma: 'Diplom',
}

const VIEW_SUBTITLES: Record<AppView, string> = {
  worksheets:
    'Pracovní listy z matematiky na pár kliknutí — vyber aktivitu a ročník, zadej téma a vytiskni pracovní list a list s řešením.',
  diploma: 'Diplom pro žáky, kteří se prokousali až na konec. Ke stažení a vyplnění ve Wordu.',
}

/** Šířka listu (210 mm) v CSS pixelech — CSS počítá 96 px na palec. */
const SHEET_WIDTH_PX = (210 * 96) / 25.4

/**
 * Obal náhledu, který si hlídá měřítko listu.
 *
 * Jediný stav v aplikaci, který nejde spočítat z konfigurace: šířku okna
 * neví nikdo než prohlížeč. Odsud `useEffect` — a jen odsud.
 *
 * Měří se obal, ne list. Obal je blokový a bez `overflow`, takže jeho šířku
 * určuje výhradně rodič; zmenšený list ji zpětně neovlivní a pozorování se
 * nemůže rozkmitat.
 */
function Preview({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLElement>(null)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const element = frame.current
    if (element === null) return

    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0
      // Zvětšovat nemá smysl: na širokém monitoru chceme list ve skutečné
      // velikosti, ne roztažený přes celou obrazovku.
      setZoom(width > 0 ? Math.min(1, width / SHEET_WIDTH_PX) : 1)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <main className="app__preview" ref={frame} style={{ '--sheet-zoom': zoom } as CSSProperties}>
      {children}
    </main>
  )
}

/**
 * Kontrolní součet listu pro danou konfiguraci.
 *
 * Počítá se z nově vygenerovaného listu, ne z toho na obrazovce — právě to
 * z něj dělá test determinismu při otevírání souboru.
 */
function checksumFor(config: ProjectConfig): string | null {
  if (config.activity === 'cipher-grid') {
    const outcome = generateCipherGrid(config)
    return outcome.ok ? cipherChecksum(outcome.sheet) : null
  }
  const outcome = generateSequenceSheet(config)
  return outcome.ok ? sequenceChecksum(outcome.sheet) : null
}

export function App() {
  const [view, setView] = useState<AppView>('worksheets')
  const [state, setState] = useState<EditorState>(INITIAL_EDITOR_STATE)
  const [seed, setSeed] = useState(() => randomSeed())
  const [fileNotice, setFileNotice] = useState<FileNotice | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const generated = useMemo(() => {
    const config = toConfig(state, seed)
    return config.activity === 'cipher-grid'
      ? { kind: 'cipher-grid' as const, config, outcome: generateCipherGrid(config) }
      : { kind: 'sequence-sheet' as const, config, outcome: generateSequenceSheet(config) }
  }, [state, seed])

  const { outcome } = generated
  // Ústupky se hlásí i při neúspěchu — často právě ony vysvětlují, proč to nešlo.
  const notices = outcome.ok ? outcome.sheet.relaxations : outcome.relaxations
  const verified = outcome.ok && outcome.sheet.verification.ok

  const handleSave = () => {
    if (!outcome.ok) return
    const checksum = checksumFor(generated.config)
    if (checksum === null) return

    const text = serializeSifra(generated.config, checksum)
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = suggestFileName(outcome.sheet.title)
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
    const checksum = checksumFor(parsed.file.config)
    if (checksum !== null && checksum !== parsed.file.checksum) {
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
        <div className="app__header-row">
          <div className="app__brand">
            <SifromatikaMark size={44} />
            <div>
              <h1 className="app__title">
                <span className="app__title-accent">Š</span>ifromatika
              </h1>
              <p className="app__claim">Přemýšlej • Lušti • Objevuj</p>
            </div>
          </div>

          <nav className="view-nav" aria-label="Části aplikace">
            {(Object.keys(VIEW_LABELS) as AppView[]).map((id) => (
              <button
                key={id}
                type="button"
                className={`view-nav__item${view === id ? ' view-nav__item--selected' : ''}`}
                aria-current={view === id ? 'page' : undefined}
                onClick={() => setView(id)}
              >
                {VIEW_LABELS[id]}
              </button>
            ))}
          </nav>
        </div>
        <p className="app__subtitle">{VIEW_SUBTITLES[view]}</p>
      </header>

      {view === 'diploma' && <DiplomaScreen />}

      {view === 'worksheets' && (
        <>
          <ActivityNav
            value={state.activity}
            onChange={(activity) => {
              setState({ ...state, activity })
              setFileNotice(null)
            }}
          />

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
            canPrint={verified}
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

          {outcome.ok && !outcome.sheet.verification.ok && (
            <p className="banner banner--error no-print" role="alert">
              Vygenerovaný list neprošel kontrolou, proto se netiskne. Zkus jinou variantu.
            </p>
          )}

          {generated.kind === 'cipher-grid' && generated.outcome.ok && verified && (
            <Preview>
              <WorksheetView
                title={cipherWorksheetTitle(generated.outcome.sheet)}
                table={generated.outcome.sheet.table}
                slots={generated.outcome.sheet.slots}
                wordLengths={generated.outcome.sheet.message.wordLengths}
                columns={generated.config.payload.output.columns}
              />
              <div className="print-page-break">
                <SolutionView
                  title={
                    generated.outcome.sheet.titleDerived
                      ? null
                      : cipherSolutionTitle(generated.outcome.sheet)
                  }
                  message={generated.outcome.sheet.message.original}
                  table={generated.outcome.sheet.table}
                  slots={generated.outcome.sheet.slots}
                  wordLengths={generated.outcome.sheet.message.wordLengths}
                />
              </div>
            </Preview>
          )}

          {generated.kind === 'sequence-sheet' && generated.outcome.ok && verified && (
            <Preview>
              <TaskSheetView
                title={sequenceWorksheetTitle(generated.outcome.sheet)}
                instructions={SEQUENCE_INSTRUCTIONS}
                tasks={generated.outcome.sheet.tasks}
                columns={generated.config.payload.output.columns}
              />
              <div className="print-page-break">
                <TaskSolutionView
                  title={sequenceWorksheetTitle(generated.outcome.sheet)}
                  tasks={generated.outcome.sheet.tasks}
                />
              </div>
            </Preview>
          )}
        </>
      )}
    </div>
  )
}
