# Šifromatika 0.1 — uzavřený rozsah

> **Status:** rozhodnuto po oponentuře (Claude → ChatGPT → Claude).
> Tento dokument je závazný. Cokoli, co tu není, do 0.1 nepatří — ani „když už to skoro jde".
> Architektonický kontext viz [`sifromatika-navrh-architektury.md`](./sifromatika-navrh-architektury.md).

**Zvolená strategie: varianta A+** — architektura jako B, implementace jako A.
Správné hranice vrstev od prvního commitu, minimum funkcí.

---

## 1. Co v 0.1 JE

### Funkce
- ✅ Souřadnicová šifra `grid-coord` (**výchozí**) — tabulka se záhlavím řádků a sloupců,
  výsledek příkladu je dvouciferná souřadnice: `34` = 3. řádek, 4. sloupec
- ✅ Jednodušší `grid-linear` (výsledek = pořadové číslo buňky) jako alternativa
- ✅ Čtyři operace: `+`, `−`, `×`, `÷`
- ✅ Zadání tajenky + volba ročníku (3.–5.)
- ✅ Tlačítko „Jiná varianta" (= seed + 1)
- ✅ Tabulka s klamnými písmeny
- ✅ Různá souřadnice pro každý výskyt písmene (měkké omezení, s ústupky)
- ✅ Pracovní list + řešení
- ✅ Tisk přes prohlížeč (print CSS) — **žádná PDF knihovna**
- ✅ Uložení / načtení `.sifra` (= konfigurace + seed, JSON)
- ✅ Pojmenování aktivity (`title`), s ochranou proti prozrazení tajenky v nadpisu
- ✅ Povinná verifikace při každém generování
- ✅ Tichá auto-oprava neřešitelných konfigurací

### Vrstvy (existují, byť minimální)
```
core/     rng · text · model · constraints · assignment · verify
tasks/    registry · arithmetic
ciphers/  registry · grid-linear
activities/ cipher-grid
render/   screen · print
```
Pravidlo závislostí vynucené lintem od prvního dne:
```
app → features → activities → { ciphers, tasks } → core
core → nic
```
`core` a `tasks` neimportují React ani `dom` lib.

---

## 2. Co v 0.1 NENÍ

| Vypuštěno | Vrací se ve |
|---|---|
| Slovní úlohy | 0.5 |
| Geometrie, `SvgSpec` | 0.6 |
| Převody jednotek, rovnice | 0.5 / 0.6 |
| `DocumentModel` jako formální vrstva | ~~0.3~~ — model hotový, PDF zůstává v 0.3 |
| PDF knihovna, embedované fonty | 0.3 |
| PWA, offline | 0.4 |
| Sdílení odkazem (URL hash) | 0.4 |
| Presety v IndexedDB | 0.4 |
| Kalibrace času, RVP mapování, „aktivita na 15 minut" | 0.5+ |
| Tlačítko „Kopírovat diagnostiku" (pole `appVersion` je ale už v 0.1) | 0.2 |
| Ročníky 6.–9. | 0.6+ |
| i18n infrastruktura | 0.9 |
| Monorepo / pnpm workspace | až vznikne druhý konzument `core` |

---

## 3. Rozhodnutí z oponentury

### 3.1 Feasibility checker zůstává — mění se jeho výstup, ne existence
Auto-oprava, kterou ChatGPT požaduje, **vyžaduje** detekci neřešitelnosti a model toho, který
parametr co ovlivňuje. Mechanismus tedy zůstává; místo chybové hlášky spouští opravnou smyčku.
UI se zjednodušuje, jádro nikoli.

**Tři úrovně relaxace:**

| Úroveň | Co | Chování |
|---|---|---|
| Tichá | velikost mřížky, hustota klamných písmen, schéma kódování | oprav bez hlášky |
| Poznámka | recyklace souřadnic u častého písmene | ikonka „upraveno", detail na klik |
| **Nikdy tiše** | **překročení obtížnosti zvoleného ročníku**; přepsání hodnoty explicitně nastavené uživatelem | zeptej se, nebo odmítni |

Pravidlo: *tiše opravuj to, co uživatel nenastavil; ohlas to, co nastavil.*
Teprve po vyčerpání všech ústupků: „Tuhle tajenku nelze vytvořit."

### 3.2 Abstrakce — rozděleno, nikoli plošně odloženo
- `SvgSpec` — **zrušeno** v 0.1. Spekulace.
- `DocumentModel` — v 0.1 **odloženo** do 0.3 s odůvodněním, že abstrakce s jedním
  rendererem je práce navíc. **Předsunuto**, jakmile se ukázalo, že je předpokladem
  pro bingo, pexeso i domino — každé z nich by bez něj bylo o třetinu dražší.
  Samotný model je levný (`core/document/`); drahá je PDF knihovna a ta v 0.3 zůstává.
  Levná hranice **generátor vrací data, ne JSX** tím přestala být slib a stala se
  vlastností typu: `DocumentModel` žádný uzel Reactu pojmout neumí.
- `PromptNode` — **zůstává**, degenerovaný na jeden člen:
  ```ts
  type PromptNode = { kind: 'expr'; text: string }
  ```
  Tři řádky, nulová režie. Rozdíl proti `string` se projeví až v 0.5, ale zpětná úprava
  by tehdy zasáhla každé místo pracující s `prompt`.

### 3.3 Didaktická metadata — pole ano, obsah ne
Doplněna vrstva, která v původním návrhu chyběla. V 0.1 se **rezervují pole**, nenaplňuje se
obsah:

```ts
interface DidacticMeta {
  grade: number
  difficulty: 1 | 2 | 3 | 4 | 5
  /** Relativní náklad, bezrozměrný, kalibrovaný v rámci ročníku. NIKOLI sekundy. */
  effort: number
  /** Mechanická operace. Řídí poměr typů úloh v UI („zaškrtni násobení"). */
  operations: OperationTag[]
  /** Didaktická dovednost. Řízený slovník, NIKOLI volný string[]. */
  skills: SkillTag[]
  /** Rezervováno. Naplní se v 0.5+, jde o kurátorskou práci, ne o kód. */
  rvpOutcomes?: string[]
}

/** V 0.1 stačí pokrýt aritmetiku. Rozšiřuje se přidáním členu — TS vynutí doplnění všude. */
type SkillTag =
  | 'arit.scitani-do-20'  | 'arit.scitani-do-100'
  | 'arit.odcitani-do-20' | 'arit.odcitani-do-100'
  | 'arit.prechod-pres-desitku'
  | 'arit.mala-nasobilka' | 'arit.deleni-beze-zbytku' | 'arit.deleni-se-zbytkem'
```

*(Původní návrh měl šest tagů a odčítání nemělo kam patřit — označovat `45 − 37`
jako „sčítání do 100" by rozbilo právě to filtrování, kvůli kterému `skills`
vznikly. Doplněno při implementaci, přesně tím způsobem, na který je union type
stavěný: přidáním členu.)*

**Jmenný prostor v tagu je záměr.** Za dva roky jich nebude šest, ale sedmdesát, a budou potřeba
skupiny (`arit.` / `geom.` / `zlomky.` / `jednotky.`). Prefix zavedený teď stojí nula a seskupení
je pak `split('.')`. Zavedený zpětně by znamenal přejmenovat každý tag napříč kódem **i napříč
uloženými `.sifra` soubory uživatelů** — tedy migraci dat, ne jen refaktoring.

**`operations` vs. `skills` nejsou duplicita.** `operations` je mechanická (`+`, `×`) a slouží
ovládacím prvkům v UI. `skills` je didaktická a slouží filtrování („aktivita jen na malou
násobilku"). Dvě úlohy mohou sdílet operaci a lišit se dovedností — proto obě pole.

**Proč ne `string[]`:** volné tagy se během několika měsíců rozejdou
(`"malá násobilka"` / `"násobilka do 100"` / `"malá násobilka (1–10)"`) a filtrování přestane
fungovat právě ve chvíli, kdy má začít být užitečné. Union type tomu brání za nulovou cenu.

**Proč ne „čas 5 s":** doba řešení není vlastnost úlohy, ale úlohy × konkrétního dítěte.
Absolutní číslo ukázané učiteli jako fakt bude špatně a spálí důvěru. Cílový tvar (0.5+):
relativní náklad → kalibrace na ročník → učiteli se ukáže **rozpětí** („zhruba 12–18 min pro
průměrnou 4. třídu") → **posuvník pro doladění** podle vlastní třídy.

**Známá vazba:** funkce „chci aktivitu na 15 minut" obrací vstupní model — čas rozpočtuje počet
úloh, počet úloh je dán délkou tajenky. Časový rozpočet tedy **omezuje délku tajenky**. Tento
konflikt musí odchytávat táž relaxační vrstva (3.1).

### 3.4 `.sifra` — jen konfigurace, nikdy odvozený výstup
Soubor obsahuje **výhradně** `ProjectConfig` + seed (~500 B JSON). Tabulka a příklady se
deterministicky dopočítají. Ukládat vedle sebe zdroj i odvozeninu = dva zdroje pravdy, které se
rozejdou.

`.sifra` a pozdější sdílení odkazem (0.4) jsou **jedna serializace použitá dvěma způsoby** —
proto je v 0.1 zdarma.

**Pojistka proti driftu determinismu:** v souboru se uloží i kontrolní součet vygenerovaného
výstupu. Při otevření se list přegeneruje a součet porovná; při neshodě varování
*„tento list vznikl ve verzi X, výstup se může lišit"*. Tiché selhání se tím mění na viditelné.

### 3.4b Souřadnicová šifra je výchozí — doplněno po náhledu první verze
Původní zadání zmiňovalo „souřadnice tajenky", ale první verze je odsunula do 0.2 a použila
lineární číslování buněk. Chyba v pochopení zadání; opraveno hned.

**Zvolený tvar:** jeden příklad na písmeno, výsledek se čte jako dvojice číslic —
`34` = 3. řádek, 4. sloupec. Zvažovaná alternativa (dva příklady na písmeno, zvlášť řádek
a zvlášť sloupec) by zdvojnásobila délku listu; tenhle tvar ji zachovává.

**Dva důsledky, které z toho plynou a musí být vidět v kódu:**

1. **Mřížka nesmí přesáhnout 9×9.** Desátý řádek by dal kód `104` a dvouciferné čtení by
   přestalo platit. Je to vlastnost zápisu, ne libovolný limit — proto sedí v `GridScheme`
   jako `maxSide`, ne v konfiguraci.
2. **Obor výsledků se zúží** na čísla, jejichž obě číslice padnou do rozměrů mřížky
   (pro 5×5 jen 25 hodnot z rozsahu 11–55). O tohle se stará stávající vrstva omezení:
   `chooseGrid` dostává funkci `codeFor(row, col)` a sama zjistí, kolik buněk je vůbec
   dosažitelných.

**Co si vyžádala výměna šifry:** nový `ciphers/grid` se sdíleným rozmísťováním, dva
`GridScheme`, úprava vykreslení tabulky. **Ani řádek v `core/` ani v `tasks/`.** To byla
celá pointa oddělení vrstev — tady se poprvé vyplatilo.

### 3.5 Klamná písmena — potvrzeno jako povinné
Bez nich jde tajenka uhodnout bez počítání, což ruší smysl aktivity. Rozložení podle obecné
frekvence češtiny; frekvence *v tajence* zvlášť určuje povinný počet buněk daného písmene.
Bezdiakritická varianta doplňuje Q, X, Y, W, G, F.

### 3.6 `title` — pojmenování aktivity, a past v něm
Učitel bude mít za rok uloženo dvacet souborů. Rozdíl mezi `sifra1.sifra`, `sifra2.sifra`
a `Lov pirátského pokladu`, `Vánoční stezka`, `Dinosauři` je zásadní a stojí pár minut práce.

```ts
title?: string   // v ProjectConfig; při prázdném se odvodí z prvních 30 znaků tajenky
```

**Past:** když se tajenka jmenuje `POKLAD JE U BAZÉNU` a učitel aktivitu pojmenuje
„Poklad u bazénu", vytištěný nadpis **prozradí tajenku dřív, než dítě spočítá první příklad.**

**Pravidlo:**
- na **řešení** se `title` tiskne vždy,
- na **pracovní list** jen na výslovné přání, defaultně **ne**,
- pokud byl `title` **odvozen automaticky** z tajenky, na pracovní list se nedostane nikdy,
  bez ohledu na nastavení.

`title` slouží zároveň jako výchozí název souboru při ukládání `.sifra` (po očištění o znaky
nepovolené ve jménech souborů).

### 3.7 Reprodukovatelnost při ladění — v 0.1 stačí jedno pole
Cíl (0.2): tlačítko **„Kopírovat diagnostiku"**, aby stačilo, když učitel pošle pár řádků, a chyba
se dá přesně zopakovat.

**Oprava proti původnímu návrhu:** diagnostika nesmí obsahovat *hash* konfigurace — z hashe se
konfigurace zpětně nesestaví, takže na reprodukci je k ničemu. Musí nést **samotnou konfiguraci**;
hash je až druhý údaj, kterým se ověří, že se reprodukce trefila do téhož výstupu.

```text
Šifromatika 0.1.3   (app)
Generator: 1
Seed: 847391
Tajenka: CESTA DO LESA
Ročník: 4   Šifra: grid-linear   Mřížka: 6×6
Kontrolní součet výstupu: 3f9a1c
```

Text musí zůstat **čitelný, ne zabalený v base64** — diagnostika obsahuje tajenku, která může být
školní interní věc („HESLO DO KABINETU"), a učitel má vidět, co posílá.

**Co je z toho v 0.1:** architektura na to už je připravená, protože jde o tutéž serializaci jako
`.sifra` (3.4). Přidává se jediné pole do `ProjectConfig`:

```ts
appVersion: string   // vedle stávajícího generatorVersion
```

Bez něj by pozdější diagnostika neuměla odlišit „jiný generátor" od „jiná verze aplikace"
a chyba nahlášená za rok by byla neopakovatelná. Tlačítko samotné patří do 0.2.

---

## 4. Definition of Done pro 0.1

0.1 je hotová, když **všech osm** bodů platí:

1. Zadám tajenku, zvolím ročník, kliknu na Vytvořit → do 2 s vidím list.
2. List ručně dekóduju z tabulky a vyjde přesně zadaná tajenka.
3. Všechny příklady spočítám ručně a sedí.
4. Tisk z Chrome, Firefoxu a Safari dá čitelnou A4 včetně háčků a čárek.
5. Řešení se tiskne samostatně.
6. Property test: 10 000 náhodných konfigurací → 0 neverifikovatelných listů, 0 výjimek.
7. Golden test: daný seed dá bit-shodný výstup napříč spuštěními a platformami.
8. `.sifra` uložím, zavřu prohlížeč, otevřu → identický list.

Bod 6 a 7 nejsou volitelné. Jsou to jediná obrana proti tomu, aby učitel rozdal 25 rozbitých listů.

---

## 5. Co hlídat

Hlavní riziko 0.1 **není technické, ale rozsahové.** Oponentura sama přidala tři návrhy
(auto-oprava, didaktická metadata, `.sifra`) — všechny dobré, proto roztříděné takto:

| Návrh | Cena v 0.1 | Verdikt |
|---|---|---|
| Auto-oprava místo hlášek | ≈ stejná (nahrazuje chybové UI) | **v 0.1** |
| Didaktická metadata — pole v modelu | ≈ nula | **v 0.1** |
| Didaktická metadata — kalibrace, RVP, „na 15 minut" | týdny kurátorské práce | 0.5+ |
| `.sifra` — ukládání konfigurace | ≈ nula (už plyne z determinismu) | **v 0.1** |
| `.sifra` — verzování, drag&drop, UX otevírání | pár hodin | 0.2 |

Pravidlo pro každý další nápad do 0.1: *stojí to méně než hodinu a plyne to z něčeho, co už
v návrhu je?* Pokud ne, jde do roadmapy, ne do 0.1.

---

## 6. Stav

Všech osm bodů Definition of Done splněno. 107 testů, `npm run check` (typecheck + lint +
hranice vrstev + testy) prochází.

| Bod | Stav | Čím doloženo |
|---|---|---|
| 1. Tajenka → list do 2 s | ✅ | generování běží v `useMemo`, bez efektů |
| 2. Ruční dekódování dá tajenku | ✅ | `verifySheet` + property test + ověřeno na papíře |
| 3. Příklady sedí | ✅ | nezávislý parser v `core/verify` |
| 4. Tisk A4 s diakritikou | ✅ | ověřeno uživatelem (tisk do PDF) |
| 5. Řešení samostatně | ✅ | `print-page-break` |
| 6. 10 000 konfigurací | ✅ | 0 odmítnutých, 0 neverifikovaných, 0 výjimek |
| 7. Golden test | ✅ | `tests/golden/sheet.test.ts`, tři zmrazené listy |
| 8. `.sifra` kolečko | ✅ | `src/storage/sifra.test.ts` |

### Co ukázaly golden snapshoty

U šifry `grid-linear` v 5. ročníku vznikají příklady jako `649 − 648 = 1`. Je to důsledek
kombinace malých kódů buněk (1..N) s velkým oborem čísel (do 1000) — filtr triviálních
variant je nezachytí, protože oba operandy jsou velké.

**Výchozí `grid-coord` tímhle netrpí**, protože kódy začínají na 11 a příklady vycházejí
přirozeně (`98 − 65 = 33`, `68 : 2 = 34`). Necháváno vědomě: `grid-linear` je vedlejší
varianta a snapshot to drží viditelné. Kdyby se stal důležitým, patří do 0.2 omezení
velikosti operandů podle velikosti výsledku, ne jen podle oboru ročníku.

### Co zbývá mimo 0.1

Nejbližší položky roadmapy: skutečné PDF (0.3), PWA a sdílení odkazem (0.4), tlačítko
„Kopírovat diagnostiku" (0.2). Druhý modul (0.8) zůstává tím, co teprve ověří slovo
„platforma".
