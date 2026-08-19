/**
 * Aplikační shell.
 *
 * Jediné místo, kde se potkává stav formuláře, generátor a vykreslení.
 * Generování je čistá funkce konfigurace, takže se dá počítat v `useMemo` —
 * žádná synchronizace stavu efektem. Efekty jsou tu jen dva a ani jeden nic
 * neodvozuje: měření šířky okna a zápis nastavení do prohlížeče. Obojí je
 * komunikace s vnějškem, na kterou `useEffect` je.
 *
 * O tom, které aktivity existují a co která umí, ví `activities/registry`.
 * Shell zná jen jeho kontrakt — proto v něm není jediné `if` na aktivitu
 * a přidání další hry se ho nedotkne.
 */

import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { checksumForConfig, checksumOfRun, runActivity } from '../activities/registry.js'
import { randomSeed } from '../core/rng/index.js'
import { SifromatikaMark } from '../render/brand/index.js'
import { DocumentView } from '../render/screen/index.js'
import { DiplomaScreen } from '../features/diploma/DiplomaScreen.js'
import { ActivityNav } from '../features/editor/ActivityNav.js'
import { QuickGuide } from '../features/help/QuickGuide.js'
import { EditorPanel } from '../features/editor/EditorPanel.js'
import { INITIAL_EDITOR_STATE, fromConfig, type EditorState } from '../features/editor/state.js'
import { readLastSession, saveLastSession } from '../storage/last-session.js'
import { buildShareLink, readShareLink } from '../storage/share-link.js'
import { parseSifra, serializeSifra, suggestFileName, type SifraFile } from '../storage/sifra.js'
import '../render/print/print.css'
import './app.css'

interface FileNotice {
  level: 'info' | 'error'
  message: string
}

/**
 * Věta, která se přidává za každé úspěšné sdílení.
 *
 * Kdo má odkaz, má i tajenku — jinak to nejde, celý smysl je, že kolegyně
 * dostane tentýž list. Říct se to ale dá, a to jednou větou v běžném banneru:
 * učitel to potřebuje vědět jednou, podruhé už by ho to jen otravovalo.
 */
const SOLUTION_WARNING = 'Je v něm i řešení — patří kolegům, ne dětem.'

interface InitialApp {
  state: EditorState
  seed: string
  notice: FileNotice | null
  /** Přišel list z odkazu? Pak se do zapamatování nesmí sáhnout — viz `App`. */
  fromLink: boolean
}

/** Odkud se list obnovil. Liší se tím, co se učiteli hlásí. */
type RestoreSource = 'link' | 'last'

const MISMATCH: Record<RestoreSource, (version: string) => string> = {
  link: (version) =>
    `Tenhle odkaz vznikl ve verzi ${version}. Aktuální verze z něj vytvoří jiný list — vytištěné řešení kolegy už nemusí sedět.`,
  last: (version) =>
    `Zapamatované nastavení je z verze ${version}. Aktuální verze z něj vytvoří jiný list — co jsi vytiskl dřív, už nemusí sedět.`,
}

/**
 * Obnovení listu z uložené konfigurace.
 *
 * Hlásí se dvě různé věci podle zdroje. U odkazu i úspěch („Otevřen sdílený
 * list"), protože učitel čeká cizí práci a musí vidět, že dorazila. U posledního
 * nastavení mlčení — svou vlastní práci na svém počítači čeká a hláška při
 * každém spuštění by byla otrava.
 */
function restore(file: SifraFile, source: RestoreSource): InitialApp {
  const restored = fromConfig(file.config)
  const checksum = checksumForConfig(file.config)

  // Týž test determinismu jako u souboru: konfigurace sedí, ale tahle verze
  // z ní počítá jiný list, než jaký viděl ten, kdo ji ukládal.
  const fromLink = source === 'link'
  if (checksum !== null && checksum !== file.checksum) {
    return {
      ...restored,
      fromLink,
      notice: { level: 'error', message: MISMATCH[source](file.config.appVersion) },
    }
  }

  return {
    ...restored,
    fromLink,
    notice: fromLink ? { level: 'info', message: 'Otevřen sdílený list.' } : null,
  }
}

/**
 * Výchozí stav aplikace: sdílený odkaz, poslední nastavení, prázdný formulář —
 * v tomhle pořadí.
 *
 * Odkaz je napřed schválně: kdo klikl na odkaz od kolegyně, chce ten list,
 * ne svůj včerejší. Zapamatované nastavení se přitom nepřepíše, dokud učitel
 * do formuláře nesáhne.
 *
 * Čte se v inicializátoru `useState`, ne v efektu — obojí je známé dřív, než
 * se poprvé vykreslí, a probliknutí prázdného formuláře by vypadalo jako chyba.
 *
 * Nečitelný odkaz neshodí start: aplikace naběhne prázdná a řekne proč.
 * Prázdná Šifromatika je horší než sdílený list, ale nesrovnatelně lepší
 * než bílá obrazovka.
 */
function initialApp(): InitialApp {
  const blank = { state: INITIAL_EDITOR_STATE, seed: randomSeed(), fromLink: false }

  const parsed = readShareLink(window.location.hash)
  if (parsed !== null) {
    return parsed.ok
      ? restore(parsed.file, 'link')
      : { ...blank, notice: { level: 'error', message: parsed.error } }
  }

  const last = readLastSession()
  return last === null ? { ...blank, notice: null } : restore(last, 'last')
}

/**
 * Odkaz v adresním řádku platí, dokud se učitel dívá na sdílený list.
 *
 * První úpravou přestane: URL by ukazovala na něco jiného, než co je na
 * obrazovce. Do té chvíle zůstává schválně — na telefonu se prohlížeč běžně
 * sám restartuje a obnovení stránky musí vrátit tentýž list.
 */
function forgetShareLink(): void {
  if (window.location.hash === '') return
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
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

export function App() {
  const [initial] = useState(initialApp)
  const [view, setView] = useState<AppView>('worksheets')
  const [state, setState] = useState<EditorState>(initial.state)
  const [seed, setSeed] = useState(initial.seed)
  const [fileNotice, setFileNotice] = useState<FileNotice | null>(initial.notice)
  /** Odkaz k ručnímu zkopírování — třetí plán sdílení, viz `handleShare`. */
  const [shareLink, setShareLink] = useState<string | null>(null)
  /**
   * Smí se zapisovat poslední nastavení?
   *
   * U listu otevřeného z cizího odkazu ne, dokud do něj učitel nesáhne. Jinak
   * by jediné kliknutí na odkaz od kolegyně přepsalo jeho vlastní rozdělanou
   * práci — a tu, na rozdíl od odkazu, nemá nikde jinde.
   */
  const [remembering, setRemembering] = useState(!initial.fromLink)
  const fileInput = useRef<HTMLInputElement>(null)

  const generated = useMemo(
    () => runActivity(state.activity, state.byActivity, state.shared, seed),
    [state, seed],
  )

  // Zápis do prohlížeče, ne odvozování stavu — proto efekt. Ukládá se jen
  // list, který se povedl: rozdělaná konfigurace, ze které nic nevzniklo, by
  // se zítra obnovila jako nefunkční formulář a vypadala by jako ztracená práce.
  //
  // Součet se bere z hotového listu (`checksumOfRun`), ne přepočtem — jinak by
  // se při každém stisku klávesy generovalo dvakrát.
  useEffect(() => {
    if (!remembering) return
    const checksum = checksumOfRun(generated)
    if (checksum !== null) saveLastSession(generated.config, checksum)
  }, [generated, remembering])

  const { outcome } = generated
  // Ústupky se hlásí i při neúspěchu — často právě ony vysvětlují, proč to nešlo.
  const notices = outcome.ok ? outcome.sheet.relaxations : outcome.relaxations
  const verified = outcome.ok && outcome.sheet.verification.ok

  const handleSave = () => {
    if (!outcome.ok) return
    const checksum = checksumForConfig(generated.config)
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

  /** Druhý plán: schránka. Třetí: odkaz se ukáže a učitel si ho vezme sám. */
  const copyShareLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setFileNotice({ level: 'info', message: `Odkaz zkopírován. ${SOLUTION_WARNING}` })
    } catch {
      // Schránka je jen v zabezpečeném kontextu a starší prohlížeče ji nemají
      // vůbec. Selhat tady je v pořádku, mlčet by nebylo.
      //
      // Hláška z minulého sdílení musí pryč: „Odkaz zkopírován" nad polem
      // „Zkopíruj odkaz" si protiřečí a učitel neví, čemu věřit.
      setFileNotice(null)
      setShareLink(link)
    }
  }

  /**
   * Sdílení odkazem.
   *
   * Odkaz se staví **synchronně**, ještě před prvním `await`: `navigator.share`
   * se smí zavolat jen z gesta uživatele a čekání na cokoli předtím by aplikaci
   * o to gesto připravilo.
   *
   * Cesty jsou tři — systémová nabídka, schránka, ruční zkopírování — protože
   * `navigator.share` na desktopovém Chrome pod Linuxem neexistuje a schránka
   * chybí mimo HTTPS. Viz docs/navrh-sdileni-odkazem.md §4.
   */
  const handleShare = () => {
    if (!outcome.ok) return
    const checksum = checksumForConfig(generated.config)
    if (checksum === null) return

    const link = buildShareLink(
      `${window.location.origin}${window.location.pathname}`,
      generated.config,
      checksum,
    )
    setShareLink(null)

    if ('share' in navigator) {
      // Bez `text`: Messenger a WhatsApp by popisek poslaly jako druhou
      // zprávu a vypadalo by to jako překlep.
      navigator
        .share({ title: `Šifromatika — ${outcome.sheet.title}`, url: link })
        .then(() => {
          setFileNotice({ level: 'info', message: `Odkaz odešel. ${SOLUTION_WARNING}` })
        })
        .catch((error: unknown) => {
          // Zavřená systémová nabídka není chyba a nehlásí se k ní nic.
          if (error instanceof DOMException && error.name === 'AbortError') return
          void copyShareLink(link)
        })
      return
    }

    void copyShareLink(link)
  }

  /**
   * Úklid po úpravě formuláře.
   *
   * Odkaz v adresním řádku i nabídnutý odkaz ke zkopírování patří listu, který
   * byl na obrazovce před chvílí. Od první úpravy ukazují jinam než formulář.
   */
  const afterEdit = () => {
    setFileNotice(null)
    setShareLink(null)
    forgetShareLink()
    // Úpravou se z cizího listu stal vlastní, takže se od teď pamatuje.
    setRemembering(true)
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
    setShareLink(null)
    forgetShareLink()
    // Soubor otevřel učitel sám, to je jeho práce — pamatuje se hned.
    setRemembering(true)

    // Soubor nese jen konfiguraci — list se dopočítá. Kontrolní součet je
    // jediné, co odhalí, že ho jiná verze generátoru dopočítala jinak.
    const checksum = checksumForConfig(parsed.file.config)
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
          <QuickGuide />

          <ActivityNav
            value={state.activity}
            onChange={(activity) => {
              setState({ ...state, activity })
              afterEdit()
            }}
          />

          <EditorPanel
            state={state}
            onChange={(next) => {
              setState(next)
              afterEdit()
            }}
            onReroll={() => {
              setSeed(randomSeed())
              afterEdit()
            }}
            onPrint={() => window.print()}
            onSave={handleSave}
            onShare={handleShare}
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

          {shareLink !== null && (
            <div className="banner banner--info no-print share-fallback">
              <label className="share-fallback__label" htmlFor="share-link">
                Zkopíruj odkaz a pošli ho. {SOLUTION_WARNING}
              </label>
              <input
                id="share-link"
                className="share-fallback__input"
                type="text"
                readOnly
                value={shareLink}
                onFocus={(event) => event.currentTarget.select()}
              />
            </div>
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

          {/* Z čeho se list skládá, ví aktivita sama — shell jen dá rám.
              Kolik je stránek, řeší `DocumentView`; sem se to nepromítne
              ani u binga, které jich bude mít víc než dvě. */}
          {generated.document !== null && (
            <Preview>
              <DocumentView document={generated.document} />
            </Preview>
          )}
        </>
      )}
    </div>
  )
}
