/**
 * Krátký návod k obsluze.
 *
 * Vzniklo místo chatbota (`docs/SIFROMATIKA-EVALUATION.md` §E.1). Zadání pro
 * bota znělo „jen na ovládání webu, žádná jiná nápověda" — a přesně to umí
 * patnáct řádků textu, které jsou vidět pořád a nikdy ničemu nerozumí špatně.
 *
 * ⚠ Krátký musí zůstat. Návod, který nikdo nedočte, je horší než žádný,
 *   protože vzbudí dojem, že je aplikace složitá. Přijde-li další aktivita,
 *   patří sem nanejvýš jedno slovo v prvním kroku — ne další odstavec.
 *
 * Zavřený schválně: učitel, který to už umí, se k formuláři nesmí prokousávat
 * přes návod. Kdo ho potřebuje, rozklikne ho.
 */

export function QuickGuide() {
  return (
    <details className="guide no-print">
      <summary>Jak na to</summary>

      <ol className="guide__steps">
        <li>Vyber aktivitu — šifru, číselné řady, pexeso, domino nebo bingo.</li>
        <li>Nastav ročník. Všechno ostatní má rozumný default, takže hotový list vidíš hned.</li>
        <li>Doplň, co je pro aktivitu vlastní: tajenku u šifry, počet kartiček, kamenů či karet u her.</li>
        <li>
          V <strong>Pokročilém nastavení</strong> zaškrtni typy příkladů. Nabízí se jen to, co
          ročník opravdu umí — procenta se u čtvrťáka neobjeví.
        </li>
        <li>
          Nesedí ti konkrétní příklady? <strong>Jiná varianta</strong> vyrobí nové, se stejným
          nastavením.
        </li>
        <li>
          <strong>Vytisknout</strong> pošle na tiskárnu obojí — list pro žáky i řešení nebo list
          pro učitele.
        </li>
        <li>
          <strong>Uložit</strong> schová zadání jako soubor <code>.sifra</code>.{' '}
          <strong>Otevřít zadání</strong> ho vrátí i za rok se stejnými příklady.
        </li>
      </ol>

      <ul className="guide__notes">
        <li>
          Kartičky, kameny a karty se dotýkají, takže se stříhají pár rovnými řezy přes celý list.
        </li>
        <li>
          Na každé takové stránce je <strong>kontrolní úsečka 100 mm</strong>. Než začneš stříhat,
          přilož pravítko — pokud neměří 100 mm, nastav v tiskovém dialogu měřítko 100 %.
        </li>
        <li>
          Výsledek každého příkladu je vždy kladné celé číslo. Desetinná čísla a procenta proto
          patří do zadání, ne do výsledku.
        </li>
        <li>
          <strong>Diplom</strong> je druhá záložka nahoře. Stáhne se jako <code>.docx</code>{' '}
          a vyplní ve Wordu.
        </li>
      </ul>
    </details>
  )
}
