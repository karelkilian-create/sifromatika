/**
 * Záchranná obrazovka, když aplikace spadne při vykreslování.
 *
 * Bez ní React odmontuje celý strom a učitel před třídou vidí bílou stránku
 * bez vysvětlení. Chyby se nikam neposílají (Sentry zvažováno 17. 10. 2026
 * a odloženo kvůli soukromí): co se stalo, se dozvíme jen z e-mailu, proto
 * je tu adresa a text chyby, který jde zkopírovat.
 *
 * Dvě cesty ven. „Načíst znovu" stačí na chybu, která se nezopakuje. Když
 * pád způsobuje zapamatované nastavení nebo sdílený odkaz, spadla by
 * aplikace po načtení znovu — proto druhé tlačítko obojí zahodí.
 *
 * ⚠ Chytá jen chyby při vykreslování a v efektech, ne v obsluze kliknutí.
 *   Ty aplikaci neshodí, jen se akce neprovede.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { clearLastSession } from '../storage/last-session.js'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Šifromatika spadla:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (error === null) return this.props.children

    const startEmpty = () => {
      clearLastSession()
      // Bez `#…` v adrese: sdílený odkaz se při načtení znovu nepřečte.
      window.location.replace(window.location.pathname + window.location.search)
    }

    return (
      <div className="app">
        <div className="crash" role="alert">
          <h1 className="crash__title">Něco se pokazilo</h1>
          <p>
            Šifromatika narazila na chybu, se kterou nepočítala. Zkuste stránku načíst znovu. Když to nepomůže,
            začněte s prázdným formulářem — rozpracovaný list se tím zahodí.
          </p>
          <div className="crash__actions">
            <button type="button" className="button button--primary" onClick={() => window.location.reload()}>
              Načíst znovu
            </button>
            <button type="button" className="button" onClick={startEmpty}>
              Začít s prázdným formulářem
            </button>
          </div>
          <p>
            Pomůže nám, když napíšete, co jste právě dělali, na{' '}
            <a href="mailto:kontakt@sifromatika.cz">kontakt@sifromatika.cz</a>. Přiložte i text chyby:
          </p>
          <pre className="crash__detail">{error.message || String(error)}</pre>
        </div>
      </div>
    )
  }
}
