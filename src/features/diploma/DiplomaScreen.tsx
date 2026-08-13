/**
 * Diplom od Šifromatiky.
 *
 * Není to aktivita: nemá seed, obtížnost, úlohy ani řešení, takže do
 * `ProjectConfig` nepatří. Je to samostatná obrazovka a celý její obsah je
 * jeden soubor ke stažení.
 *
 * ⚠ Proč Word a ne vyplnění a tisk přímo tady: rozhodl uživatel a je to
 *   rozhodnutí o publiku, ne o technice. Učitelky, které diplom rozdávají,
 *   pracují ve Wordu; tisk z prohlížeče ani „Uložit jako PDF" nepoužijí.
 *   Web, který jim nabídne jen svůj vlastní způsob, jim nedá nic.
 *
 *   Z toho plyne, že HTML verze diplomu tu vědomě NENÍ. Dvě podoby téhož
 *   dokumentu by se rozešly a udržovat by se musely obě.
 */

/**
 * Soubory leží v `public/`, takže se servírují z kořene beze změny jména.
 *
 * Dvě varianty, ne přepínač: ve Wordu je barevnost vlastnost dokumentu, ne
 * volba při tisku. Černobílá není jen „vypnutá barva" — co bylo oranžové, je
 * v ní nejtmavší, protože oranžová vyjde na laserovce jako světle šedá
 * a akcenty by se ztratily.
 */
const DIPLOMA_COLOR = '/Diplom-Sifromatika.docx'
const DIPLOMA_MONO = '/Diplom-Sifromatika-cernobily.docx'

export function DiplomaScreen() {
  return (
    <section className="diploma-screen no-print">
      <div className="diploma-screen__text">
        <h2 className="diploma-screen__title">Diplom pro žáky</h2>
        <p className="diploma-screen__lead">
          Diplom je připravený jako dokument pro Word. Stáhneš ho, přepíšeš texty v hranatých
          závorkách a vytiskneš — kolikrát chceš.
        </p>

        <div className="diploma-screen__downloads">
          <a className="button button--primary" href={DIPLOMA_COLOR} download>
            Stáhnout diplom pro Word
          </a>
          <a className="button" href={DIPLOMA_MONO} download>
            Černobílá verze
          </a>
        </div>
        <p className="hint">
          Barevný diplom vypadá líp, ale na běžné školní tiskárně se oranžová vytiskne jako
          bledě šedá. Černobílá verze s tím počítá a nadpisy v ní zůstanou výrazné.
        </p>

        <ol className="diploma-screen__steps">
          <li>Stáhni soubor a otevři ho ve Wordu.</li>
          <li>
            Přepiš <code>[JMÉNO A PŘÍJMENÍ ŽÁKA]</code>, případně{' '}
            <code>[VOLITELNÁ OSOBNÍ POCHVALA / KONKRÉTNÍ ÚKOL]</code>.
          </li>
          <li>Vytiskni. Datum a podpis se dopisují rukou na připravené linky.</li>
        </ol>

        <p className="hint">
          Nic se nikam neodesílá. Soubor se stáhne rovnou do tvého počítače a jména žáků
          zůstanou jen u tebe — Šifromatika žádná data nesbírá a nemá kam by je ukládala.
        </p>
      </div>

      <img
        className="diploma-screen__preview"
        src="/diplom-nahled.jpg"
        width={560}
        height={791}
        alt="Náhled diplomu: hlavička Šifromatika, nadpis Diplom, místo pro jméno žáka, rámeček na pochvalu a linky na datum a podpis učitele."
      />
    </section>
  )
}
