# Šifromatika — posouzení návrhu na rozšíření

> **Co je tento dokument.** Technický audit současné Šifromatiky a kritické posouzení
> návrhů ze složky `rozsireni_projektu/` — katalogu 12 typů aktivit (Perplexity),
> chatbota, diplomu a návrhu grafiky.
>
> **Nic z toho není implementováno.** Podle zadání (*Úprava od Claude*, *Prompt od ChatGPT*)
> je první fáze pouze analýza. Výstupem je tento text a rozhodnutí, co se skutečně přidá.
>
> **Vstupy:** `Prompt od Perplexity`, `Prompt od ChatGPT jak zacházet s promptem od Perplexity`,
> `Úprava od Claude`, `Prompt chatbot`, `navrhy_her.odt`, šablona diplomu, tři návrhy grafiky.
> **Kontext:** [`rozsah-0.1.md`](./rozsah-0.1.md), [`sifromatika-navrh-architektury.md`](./sifromatika-navrh-architektury.md).

**Měřítko náročnosti** používané v celém dokumentu:

| Značka | Rozsah |
|---|---|
| **malá** | do jedné pracovní seance, žádný zásah do sdílených vrstev |
| **střední** | 2–5 seancí, dotkne se jedné sdílené vrstvy |
| **velká** | týden a víc, nebo zásah do víc než jedné vrstvy najednou |

---

## 0. Verdikt na jednu obrazovku

**Z 12 navržených typů aktivit doporučuji 5. Zbytek ne — ne proto, že by nešly, ale proto,
že by z Šifromatiky udělaly něco jiného, než čím dnes je.**

Nejdůležitější zjištění auditu: **společná infrastruktura, kterou prompt od ChatGPT hledá,
už z velké části existuje** a je vynucená lintem. Vrstva úloh, seedované generování,
nezávislá verifikace, relaxační log, `.sifra` i tiskový systém jsou navržené přesně na to,
aby druhá a třetí hra byly levné. To je dobrá zpráva.

Špatná zpráva je jedna a je konkrétní: **rozhodování „která aktivita" je dnes rozsypané
do čtyř `if/else` na čtyřech místech** (`App.tsx`, `state.ts`, `storage/sifra.ts`,
`checksumFor`). Se dvěma aktivitami je to neviditelné. S osmi je to čtyři osmicestné větvení,
které se musí měnit synchronně. **Tohle je jediná věc, kterou je nutné opravit dřív než
přidat třetí aktivitu**, ne později.

Největší poměr *malá práce → velký přínos* nemá žádná z 12 her. Mají ho tři věci:

1. **Diplom** — nedotýká se matematické vrstvy vůbec, a učitel ho použije víc než pátou hru.
2. **Procenta a desetinná čísla jako nové generátory úloh** do stávající šifry — žádný nový
   tiskový systém, žádná nová aktivita, a druhý stupeň tím dostane skutečný obsah.
3. **Grafika a favicon** — v `public/` je dodnes výchozí ikona z Vite šablony a soubor
   s ikonou Bluesky. To je viditelná chyba, ne kosmetika.

---

## A. Co Šifromatika dnes skutečně je

### Stav kódu

React 19 + TypeScript + Vite, **bez backendu, bez routeru, bez stavové knihovny**.
28 modulů, 7 400 řádků, 207 testů. `npm run check` (typecheck → lint → kontrola hranic
vrstev → testy) prochází čistě. Ověřeno spuštěním, nikoli z dokumentace.

Vrstvy, vynucené `dependency-cruiser`em jako **error**, ne jako doporučení:

```
app → features → activities → { ciphers, tasks } → core
render → core                     (render nesmí do activities)
core → nic                        (ani React, ani dom lib)
```

### Co aplikace umí

| | |
|---|---|
| **Aktivity** | šifra `grid-coord` / `grid-linear`, list číselných řad |
| **Ročníky** | 3.–8. (9. schválně chybí — nemá vlastní profil) |
| **Matematika** | 4 operace, závorky, celá čísla, mocniny a odmocniny, číselné řady |
| **Výstup** | A4, náhled = tisk, řešení na samostatný list, tisk z prohlížeče |
| **Soubor** | `.sifra` = konfigurace + seed + kontrolní součet, ~500 B |
| **V katalogu, ale nehotové** | bingo, pexeso (poctivě označené `available: false`) |

### Stavební bloky a jejich znovupoužitelnost

Tohle je jádro odpovědi na otázku *„co lze znovu použít"*:

| Blok | Kde | Znovupoužitelnost |
|---|---|---|
| Seedovaný RNG (`rng.weighted`, `randomSeed`) | `core/rng` | **výborná** — reprodukovatelnost je vyřešená věc, ne úkol |
| Kontrakt `TaskGenerator` | `core/model` | **výborná** — `supports` / `reachableValues` / `generateForValue` |
| Registr generátorů úloh | `tasks/registry` | **výborná** — přidání typu úloh = adresář + jeden řádek |
| Nezávislá verifikace | `core/verify` | **výborná** pro cokoli tvaru „zadání → číslo"; vlastní parser, nevolá generátor |
| Relaxační log (tichá / poznámka / blokující) | `core/model` + `constraints` | **výborná**, univerzální |
| Profily obtížnosti podle ročníku | `core/constraints` | **výborná** |
| `.sifra` serializace + přísný parser | `storage/sifra` | **dobrá**, ale parser je psaný per-aktivita ručně |
| `chooseGrid` s callbackem `codeFor` | `core/constraints` | **dobrá** — obecnější, než na co se dnes používá |
| Tiskové CSS (`@page A4`, `no-print`, `print-page-break`) | `render/print` | **dobrá** pro listy, **nestačí** pro kartičky |
| Náhled se zoomem (`Preview`) | `app/App.tsx` | **dobrá** |
| `TaskList`, `TaskSheetView`, `TaskSolutionView` | `render/screen` | **dobrá** |
| `CipherTableView` | `render/screen` | **po menší úpravě** — je typovaná na `CipherTable`, ne na obecnou mřížku |
| Volba aktivity v `App.tsx`, `state.ts`, `sifra.ts` | 4 místa | **špatná** — viz oddíl D |
| `EditorState` jako jeden plochý objekt | `features/editor` | **záměrné rozhodnutí, ale nešká­luje** — viz oddíl D |

**Odpověď na otázku z promptu ChatGPT („hledej společnou infrastrukturu, ne pět samostatných
systémů"): ta infrastruktura tu je a byla postavená přesně s tímhle záměrem.** Doklad je
v `docs/rozsah-0.1.md §3.4b`: výměna celé šifrovací strategie si nevyžádala ani řádek
v `core/` a `tasks/`. Nemusíme ji vymýšlet, jen dodělat dvě chybějící části (oddíl C).

---

## B. Klasifikace 12 typů aktivit

Klasifikace podle promptu ChatGPT:
**A** = snadné rozšíření · **B** = rozumné, chce zásah do sdílené infrastruktury ·
**C** = větší zásah do architektury · **D** = zatím nedoporučuji.

| # | Aktivita | Kat. | Náročnost | Verdikt |
|---|---|---|---|---|
| 1 | Číselné řady | — | — | **hotovo** |
| 2 | Šifry a tajenky | — | — | **hotovo**; rozšíření je věc *témat*, ne aktivity |
| 4 | Pexeso | **B** | střední | **doporučuji** — první uživatel kartičkové sazby |
| 3 | Domino | **B** | střední | **doporučuji** — po pexesu levné |
| 5 | Bingo | **B** | střední | **doporučuji** — je v katalogu, učitelé ho čekají |
| 6 | Magické čtverce | **B** | střední | **doporučuji** (3×3, 4×4 už ne) |
| 7 | Bludiště | **B/C** | střední → velká | **doporučuji jen buňkovou variantu** |
| 10 | Detektivní úlohy | **A** | malá | **doporučuji** — je to obal nad hotovou šifrou |
| 12 | Pravda/nepravda, hledání chyby | **A** | malá | **doporučuji** — pozor na verifikaci |
| 12 | Čtyři čtyřky, 24 | **A** | malá | vlažně — nejde parametrizovat ročníkem |
| 8 | Křížovky (číselné, kakuro) | **C** | velká | **nedoporučuji** — viz níže |
| 11 | Trojúhelníkové puzzle | **C** | velká | **odložit** za domino |
| 9 | Logické mřížky | **D** | velká | **nedoporučuji** — je to jiný produkt |

### Komentář k jednotlivým položkám

**2 — Šifry: rozšíření nepatří do aktivity, ale do vrstvy úloh.**
Perplexity chce u šifer zlomky, desetinná čísla, procenta a rovnice. To nejsou nové aktivity,
ale nové `TaskGenerator`y. A tady je nález, který stojí za víc než polovina zbytku dokumentu:
**šifra vyžaduje celočíselný výsledek v rozsahu souřadnic (11–99), a právě to dělá
z procent a desetinných čísel dobře tvarované úlohy.**

```
20 % ze 170 = 34        0,5 · 68 = 34        2/3 · 51 = 34        3/4 z 68 = 51
```

Žádná nová mřížka, žádný nový tisk, žádná nová aktivita. Cena: jeden generátor úloh
plus rozšíření tokenizeru v `core/verify` o `%`, desetinnou čárku a zlomkovou čáru.
**Náročnost: střední. Přínos pro 2. stupeň: největší ze všeho v tomto dokumentu.**

⚠ Desetinná čárka koliduje s oddělovačem členů v číselných řadách — proto je tam už dnes
mezera, ne čárka (`GENERATOR_VERSION 2`). Rozhodnutí bylo správné a teď se vyplatí.

**Rovnice** (`3x + 5 = 26`, výsledek 7) jsou také levné a pro 8.–9. ročník nutné.
Verifikace ale musí umět „ověř, že dosazení kořene sedí" — to je jiný tvar než dnešní
„spočítej výraz". Náročnost: střední.

**3, 4, 11 — Domino, pexeso, trojúhelníkové puzzle jsou jedna věc, ne tři.**
Všechny tři jsou *párování* („zadání ↔ hodnota") vytištěné na kartičkách k vystřižení.
Datový model je u všech tří totožný a je to model, který už máme: seznam `Task`ů s hodnotami.
Liší se výhradně tím, **co se vytiskne** a **jak se ověří sestavitelnost**:

| | Sazba | Kontrola |
|---|---|---|
| Pexeso | 2N obdélníkových kartiček, zamíchaných | hodnoty musí být navzájem různé, jinak je párování nejednoznačné |
| Domino | N kartiček `[výsledek předchozí \| zadání další]` | řetězec musí jít sestavit (otevřený / uzavřený) |
| Trojúhelníky | N trojúhelníků, hrany se dotýkají | sestavitelnost mozaiky + geometrická sazba |

Proto: **pexeso jako první** (nejjednodušší kontrola), domino druhé (přidá kontrolu řetězce,
což je pár desítek řádků), trojúhelníky **odložit** — nejsou dražší matematikou, ale sazbou
a `SvgSpec`, který byl v 0.1 vědomě zrušen jako spekulace.

⚠ Kritická poznámka k pexesu: **generátor dnes duplicitní hodnoty nezakazuje**, jen se
snaží nevyrábět tentýž *výraz* (`usedExpressions`). U pexesa jsou dvě různá zadání se
stejným výsledkem vada, ne detail — dítě spáruje špatně a bude mít pravdu. Nová kontrola,
malá.

**5 — Bingo.** Je v katalogu jako „připravujeme", takže na něj někdo čeká. Potřebuje:
N unikátních hodnot z dosažitelného oboru, na kartu náhodný podvýběr, kontrolu unikátnosti
karet, seznam úloh pro učitele, tisk více karet za sebou. Všechno kromě posledního
je nad hotovými bloky. Poslední bod (více stránek v jednom výstupu) je společná
infrastruktura — viz oddíl C.

Zajímavější varianta z `navrhy_her.odt`: **bingo s podmínkami** („číslo dělitelné třemi",
„obvod čtverce se stranou 5 cm") místo hotových výsledků. Didakticky lepší a technicky
skoro totéž.

**6 — Magické čtverce.** Nepoužijí vrstvu úloh vůbec — jsou to čísla, ne příklady.
Konstrukce je učebnicová (siamská metoda pro liché n). **Cena se skrývá jinde, než kde ji
člověk čeká: v požadavku na jednoznačné řešení.** Vyškrtat políčka tak, aby doplnění bylo
jediné možné, znamená mít solver. Pro 3×3 je to soustava lineárních rovnic a brute force
přes malý obor — v pohodě. Pro 4×4 je prostor řešení řádově větší a „jednoznačné" přestává
být levné. **Doporučuji 3×3 a 4×4 pouze plně určené (bez volby, kolik políček zmizí).**

**7 — Bludiště. Rozdíl mezi dvěma variantami je rozdíl mezi střední a velkou prací.**

- *Číselné bludiště* — mřížka buněk, cesta vede přes buňky splňující podmínku
  (správný výsledek, násobek, prvočíslo). Kreslí se jako tabulka. **Použije stávající
  mřížkovou sazbu, hledání cesty je BFS. Střední.**
- *Bludiště se zdmi* — potřebuje SVG, generování stěn, kontrolu jediné cesty. **Velká,
  a otevírá `SvgSpec`, který byl vědomě odložen.**

Doporučuji první variantu a druhou nedělat. Rozdíl pro dítě je malý, rozdíl v ceně velký.

**8 — Číselné křížovky / kakuro. Nedoporučuji, a je to jediná položka, kde nesouhlasím
s návrhem výslovně.** Křížovka, kde se výsledky protínají číslicemi, má generování obtížné
způsobem, který není vidět dopředu: rozložení mřížky + protínající se omezení na jednotlivé
číslice + požadavek na jednoznačnost. To je vlastní malý research projekt.
A hlavně — **to, co má křížovka učiteli přinést (výsledky se zapisují do mřížky a vznikne
tajenka), Šifromatika už umí.** Levnější a lepší náhrada je **matematická osmisměrka**
(hledají se výsledky v písmenné/číselné mřížce), která je kategorie A/B.

**9 — Logické mřížky. Nedoporučuji.** Tři důvody, každý sám o sobě stačí:

1. Neobsahuje matematiku. Nepoužije `tasks/` ani `core/verify` — je to úplně jiný produkt,
   který by v Šifromatice sdílel jen tlačítko Vytisknout.
2. Vyžaduje generátor indicií **plus** constraint solver na důkaz jednoznačnosti.
3. Vyžaduje generovat české věty se správným skloňováním („Petr, který koupil **tři
   rohlíky**, neseděl vedle…"). Šablony s podstatnými jmény v češtině jsou past, do které
   spadl kdekdo. Buď se tvoří ručně (kurátorská práce, ne kód), nebo to zní jako
   překlad z angličtiny.

**10 — Detektivní úlohy. Nejlevnější položka celého katalogu a nejvíc podceněná.**
Detektivka není nový generátor. Je to **stávající šifra plus příběh**: úvodní odstavec,
tematická sada tajenek, název aktivity. Technicky = jedno textové pole navíc na listu
a sada přednastavení. **Malá.** Obsah (příběhy) je kurátorská práce, kterou nikdo nemusí
programovat.

**12 — Hledání chyby v řešení. Pedagogicky nejcennější položka celého návrhu**
(viz oddíl F) **a zároveň jediná, která si žádá výslovnou architektonickou poznámku:
vytištěný výsledek je schválně špatně.** Dnešní `verifySheet` takový list označí za vadný
a `App.tsx` ho odmítne vytisknout. Není to problém — je to důkaz, že verifikace funguje —
ale znamená to, že kontrakt verifikace musí umět „očekávám nesoulad na položkách 3 a 7".
Doplněk je malý, **ale nesmí se udělat tak, že se verifikace pro tuhle aktivitu vypne.**
To by zrušilo jedinou obranu proti rozdání 25 rozbitých listů.

**12 — Čtyři čtyřky, 24.** Jsou to hezké hry, ale nejdou parametrizovat ročníkem ani
tématem — mají jednu podobu pro všechny. Vytisknout je znamená vytisknout zadání, které
by se dalo napsat na tabuli. Přínos malý, cena taky malá. Kdykoli, prioritu nemají.

---

## C. Společná infrastruktura, kterou je potřeba postavit jednou

Tohle je nejdůležitější oddíl. Bez těchto tří věcí je každá další hra o polovinu dražší,
s nimi je většina her nad hotovým.

### C.1 Registr aktivit se skutečným kontraktem — **nutné před třetí aktivitou**

Dnes je odpověď na otázku „která aktivita" napsaná ručně na čtyřech místech:

| Soubor | Co tam je |
|---|---|
| `app/App.tsx` | `generated` — větev na generátor; dvakrát celý blok náhledu |
| `app/App.tsx` | `checksumFor` — větev na kontrolní součet |
| `features/editor/state.ts` | `toConfig` / `fromConfig` — větev na překlad stavu |
| `storage/sifra.ts` | parser — větev na validaci payloadu |

Se dvěma aktivitami to nikoho netrápí. S osmi je to **čtyři osmicestná větvení, která se
musí měnit současně**, a zapomenutá větev v `sifra.ts` znamená soubor, který jde uložit
a nejde otevřít. Řešení je stejné, jaké už v projektu funguje pro `tasks/registry.ts`
a `ciphers/registry.ts` — jeden záznam na aktivitu:

```ts
interface ActivityModule<Cfg, Sheet> {
  id: ActivityId
  info: ActivityInfo              // už existuje v activities/registry
  defaultConfig(...): Project<Cfg>
  generate(project): Outcome<Sheet>
  checksum(sheet): string
  parsePayload(raw: unknown): Cfg | null   // pro .sifra
  toDocument(sheet): DocumentModel         // viz C.2
}
```

**Náročnost: střední. Riziko: nízké** — je to čistý refaktoring nad kódem, který má 207 testů
a golden snapshoty. **Musí se udělat dřív než třetí aktivita, ne až bude bolet.**

### C.2 Vícestránkový dokument — `DocumentModel`

`App.tsx` má dnes zadrátováno „list, zalomení, řešení". Bingo potřebuje N karet + seznam
pro učitele, pexeso 2N kartiček na M archů, domino řetězec na několik stran. To je přesně
`DocumentModel`, který roadmapa plánuje na 0.3 spolu s PDF.

**Doporučuji ho předsunout — ale bez PDF.** Model stránek je levný (`Page[]`, každá s typem
obsahu), PDF knihovna je drahá a zatím zbytečná. Rozdělit to je možné a dělá se to přesně
takhle: model teď, renderer do PDF až bude potřeba.

**Náročnost: střední.** Bez něj jsou bingo, pexeso i domino každé o třetinu dražší.

### C.3 Kartičková sazba — `render/print/cards`

Nová věc, kterou dnešní tiskový systém neumí: mřížka kartiček v milimetrech, značky pro
střih, kartička se nesmí rozdělit mezi stránky, volitelný rub.

Použijí ji **domino, pexeso, trojúhelníky, bingo karty, číselné kartičky po třídě** —
tedy pět z dvanácti navržených aktivit. Proto se má postavit jednou a pořádně.

⚠ Riziko, které je potřeba vidět dopředu: **milimetrová přesnost tisku se mezi prohlížeči
liší.** Chrome, Firefox a Safari zacházejí s `@page margin` různě a uživatel má navíc
v dialogu měřítko. Kartičky, které nesedí na střih, jsou horší než žádné kartičky.
Mitigace: pevné rozměry v mm, značky střihu, a **zkušební tisk na papír** jako součást
definice hotového — ne tisk do PDF.

**Náročnost: střední.**

### C.4 Obecná mřížková sazba

`CipherTableView` je typovaná na `CipherTable` (kód + písmeno + klamné). Bingo, magický
čtverec, bludiště i osmisměrka potřebují mřížku hodnot, prázdných políček a zvýraznění.
Zobecnění je malá práce a odemkne čtyři aktivity. **Malá.**

---

## D. KEEP / CHANGE / REFACTOR LATER

### KEEP — nesahat, pokud k tomu nebude velmi dobrý důvod

| Co | Proč |
|---|---|
| `core/verify` a jeho **nezávislost na generátoru** | jediná obrana proti 25 rozdaným rozbitým listům; volat odsud generátor = ověřovat sám sebe |
| `core/rng` a semantika seedu | reprodukovatelnost je hotová; každý zásah znehodnotí uložené `.sifra` |
| Disciplína `GENERATOR_VERSION` vs. `APP_VERSION` | dokumentovaná historie změn výstupu, viz `version.ts` |
| Formát `.sifra`: **jen konfigurace, nikdy odvozený výstup** | dva zdroje pravdy se rozejdou |
| Default `generatorMix = { arithmetic: 1 }` při chybějící hodnotě | brání tomu, aby každý nový generátor přepsal výstup starých souborů — už dnes to funguje a je to nenápadně chytré |
| Kontrakt `TaskGenerator` | přesně to, co prompt Perplexity navrhuje vytvořit; existuje |
| Pravidla v `.dependency-cruiser.cjs` | bez nich je architektura jen doporučení v dokumentu |
| Pravidlo „generátor vrací data, ne JSX" | právě díky němu jde vložit `DocumentModel` |
| Ochrana proti prozrazení tajenky v nadpisu | netriviální pravidlo, které se snadno omylem zruší |
| Tři úrovně relaxace | univerzální, použije každá další hra |
| Tisk z prohlížeče bez PDF knihovny | nulový bundle, bezchybná diakritika |
| `available: false` v katalogu | poctivé; klikatelná nefunkční aktivita je horší než žádná |

### CHANGE — udělat **před** dalším rozšiřováním

1. **Registr aktivit** místo čtyř `if/else` (C.1). *Střední.*
2. **`DocumentModel`** místo zadrátovaného „list + řešení" (C.2). *Střední.*
3. **`EditorState`** — dnes jeden plochý objekt se všemi poli všech aktivit. Rozhodnutí bylo
   správné a má dobrý důvod (učitel po přepnutí najde tajenku tam, kde ji nechal), ale
   s osmi aktivitami to je 40 polí v jednom objektu. Potřebuje **jmenné prostory podle
   aktivity při zachování téhle vlastnosti**. *Střední.*
4. **Zobecnit `CipherTableView`** na mřížku (C.4). *Malá.*

### REFACTOR LATER — vědět o tom, neřešit teď

- Tokenizer v `core/verify` — rozšířit o desetinná čísla, zlomky a `%`, až přijdou ta témata.
- `chooseGrid` — heuristiky `maxSide` a poměru stran jsou vyladěné na šifru; bingo a bludiště
  budou chtít jiné.
- Parser `.sifra` — ruční validace per aktivita; se šesti aktivitami to bude chtít schéma.
- Známý technický dluh z `rozsah-0.1.md §6`: `grid-linear` v 5. ročníku vyrábí příklady
  typu `649 − 648`. Zdokumentované, vědomé, netýká se výchozí strategie.

---

## E. Tři věci mimo katalog Perplexity

### E.1 Chatbot — **ano, ale ne chatbot**

Zadání zní: *„jen na ovládání webu, žádná jiná nápověda"*. To je podstatné zúžení proti
`Prompt chatbot`, který chce i vysvětlování pojmů a doporučování šablon. **Zúžení je správné**
a dělá z celé věci něco jiného a mnohem levnějšího: **ne chatbota, ale příkazový řádek
s tlačítky.**

Doporučená podoba:

- **Vrstva akcí** (`features/commands`) — typované akce `set_grade`, `set_message`,
  `toggle_operation`, `open_activity`, `reroll`, `print`, `save`. Každá akce jde výhradně
  přes stávající `EditorState` → `toConfig`. **Tím je zadarmo zaručeno, že příkaz neumí
  vyrobit nastavení, které by neuměl formulář** — a nemůže tedy vzniknout neplatná konfigurace.
- **Tlačítka rychlých akcí jako první, psaní jako druhé.** Devět z deseti scénářů („4. třída",
  „jen násobení", „jiná varianta") je rychlejší kliknout.
- **Rozpoznávání textu čistě lokální, bez LLM a bez sítě.** Malý slovník + normalizace
  diakritiky. Žádné volání ven, žádná data odsud neodejdou.

⚠ Poctivé varování: **rozpoznávání volného českého textu pravidly je křehké.** „dej mi čtvrtou
třídu", „pro čtvrťáky", „4.tř" — pokrýt se to nedá a učitel, kterému bot třikrát nerozumí,
už počtvrté nenapíše. Proto tlačítka jako hlavní cesta a text jako zkratka pro toho, kdo ji
chce.

⚠ A druhé: **ovládat chatem dvě aktivity nemá smysl.** Příkazová vrstva se vyplatí,
až bude co ovládat. **Zařadit až za třetí a čtvrtou hru.**

**Náročnost: střední.** Vrstva akcí je malá a testovatelná; UI a rozpoznávání textu je zbytek.
**Odhad hodnoty: střední — vysoká na mobilu, nízká na desktopu**, kde je formulář rychlejší.

### E.2 Diplom — **ano, hned, a je to nejlepší poměr v celém dokumentu**

Nedotýká se vrstvy úloh, generátorů, verifikace ani seedu. Je to formulář (jméno žáka,
datum, učitel, volitelná pochvala) a jedna A4 stránka. Tiskový systém na to je hotový.

Poznámky k provedení:

- **Nepatří do `ProjectConfig`.** Diplom nemá seed, obtížnost, úlohy ani řešení. Vecpat
  ho do `ProjectConfig` znamená přidat všem aktivitám volitelná pole, která pro ně nedávají
  smysl. **Vlastní obrazovka vedle katalogu aktivit, ne aktivita.**
- **Formát: Word, ne tisk z prohlížeče.** ⚠ **Opraveno proti prvnímu znění tohoto oddílu.**
  Původně jsem doporučoval vyplnit diplom v aplikaci a vytisknout ho přes „Uložit jako PDF"
  v dialogu prohlížeče. To je špatná rada: publikum jsou učitelky, které pracují ve Wordu
  a tuhle cestu nepoužijí. Rozhodnutí je tedy **soubor `.docx` ke stažení**, který se vyplní
  ve Wordu a vytiskne z něj.

  **Důsledek:** HTML verze diplomu v aplikaci vědomě **není**. Dvě podoby téhož dokumentu
  by se rozešly a udržovat by se musely obě. Obrazovka diplomu je proto tlačítko ke stažení,
  postup ve třech krocích a náhled toho, co se stahuje.
- **Obava ze sbírání dat** je oprávněná, ale technicky bezpředmětná: aplikace nemá backend
  a jméno žáka se nikam neodesílá — vyplňuje se až ve Wordu na učitelčině počítači.
  Napsáno přímo na stránku; to obavu odstraní líp než jakákoli změna funkce.
- **Logo uvnitř šablony bylo rastr s tmavým čtvercem na pozadí.** Vyměněno za plochou značku
  z brand listu, tedy tutéž, co je v hlavičce webu. Zkoušená alternativa — zachovat kresleného
  maskota a odečíst černou jako záři — dopadla špatně: liška přišla o tmavé obrysy.
  Nový obrázek má **stejný poměr stran** jako původní, takže Word nepřepočítává rozvržení.
- **Černobílá varianta je samostatný soubor**, ne přepínač — ve Wordu je barevnost vlastnost
  dokumentu. Není to jen „vypnutá barva": co bylo oranžové, je v ní **nejtmavší**, protože
  oranžová vyjde na laserovce jako bledě šedá a akcenty by se ztratily.
- **Citát v patičce** je hláška z filmu *A League of Their Own* (1992). Doplněn zdroj —
  na veřejném webu patří k cizímu textu autor.

**Náročnost: malá. Stav: hotovo.**

### E.3 Grafika — **ano, ale opravdu jen jemně**

Návrh (liška s žárovkou, oranžová + tmavě modrá, claim *PŘEMÝŠLEJ • LUŠTI • OBJEVUJ*)
je vydařený a k didaktickému nástroji pro první stupeň sedí. Současný vzhled je čistý
a to je jeho největší přednost — po sedmi letech používání zůstane čistý pořád, zatímco
maskot na každé obrazovce zestárne.

Doporučené provedení:

| Kde | Co |
|---|---|
| **Favicon** | **oprava chyby, ne kosmetika** — v `public/favicon.svg` je dodnes výchozí fialová ikona z Vite šablony a v `public/icons.svg` zůstal symbol Bluesky ze startovací šablony |
| **Hlavička aplikace** | liška ~28 px + slovní značka; claim jen na desktopu |
| **Paleta** | tmavě modrá jako `--ui-accent` (dnes `#1f5f8b`), oranžová **jen** jako zvýraznění: hlavní tlačítko, vybraná aktivita |
| **Pracovní list** | **nic. Žádná barva, žádné logo.** Černá na bílé. Školní tiskárna je černobílá a toner stojí peníze — barevná hlavička na 25 kopiích je náklad, který učitel platí a nechtěl |
| **Řešení** | totéž |
| **Diplom** | **tady barva a liška patří** — je to jeden výtisk a má vypadat slavnostně |
| **Ikony pro mobil** | 180×180 a 512×512 pro budoucí PWA (roadmapa 0.4), rovnou při té příležitosti |

⚠ Jediná skutečná práce: **liška existuje jen jako rastrový obrázek z generátoru.** Do hlavičky
a favikony patří SVG. Buď ji nechat překreslit, nebo ji zpočátku použít malou jako PNG @2×
(pro 28 px to vizuálně obstojí) a SVG dodat později. Automatické trasování rastru dá zpravidla
špinavé křivky — nedoporučuji.

**Náročnost: malá** (bez překreslení loga do SVG).

---

## F. Nejzajímavější nápady — bez ohledu na cenu

Tohle nejsou doporučení k okamžité realizaci, ale položky s **výrazným pedagogickým
potenciálem**, které si zaslouží zmínku, i když jsou dražší:

1. **Hledání chyby v řešení.** Žák nepočítá, ale posuzuje cizí postup. To je metakognice
   a je to řádově vzácnější dovednost než počítání. Aby to fungovalo, nesmí být chyba
   náhodná — musí to být **typická chyba** (zapomenutý přenos, špatné pořadí operací,
   znaménko u záporného čísla). Vyžaduje malý **model žákovských miskoncepcí**, což je
   kurátorská práce podobná té u `SkillTag`. **Nejcennější položka celého návrhu.**
2. **Bingo s podmínkami.** Učitel neříká „34", ale „číslo dělitelné třemi". Žák pak
   nehledá výsledek, ale rozhoduje o vlastnosti. Technicky skoro totéž co obyčejné bingo.
3. **Úniková hra / stanoviště jako sada listů.** Není to nový generátor — je to **balíček
   několika existujících aktivit plus učitelský návod**, kde výsledek jedné dá kód
   k další. Nad hotovým `DocumentModel` je to překvapivě blízko. Tohle je věc, kterou
   učitel neumí sestavit za pět minut sám, a právě proto má hodnotu.
4. **Detektivní příběh** (viz B/10) — nejlevnější způsob, jak zvednout motivaci, protože
   matematika zůstává tatáž a mění se jen rámec.

---

## G. Doporučené pořadí

**Nejdřív proč, potom co.** Pořadí je řízené čtyřmi pravidly:

1. **Co nezávisí na ničem, jde první.** Grafika a diplom se nedotknou matematické vrstvy —
   nemá smysl je řadit za refaktoring.
2. **Refaktoring jde před třetí aktivitou, ne za pátou.** Čtyři `if/else` se opravují snadno
   při dvou aktivitách a draho při šesti.
3. **Šířka matematiky je levnější než šířka her.** Nový generátor úloh se okamžitě promítne
   do *všech* aktivit. Nová hra se promítne jen do sebe.
4. **Kartičková sazba se platí jednou a odemkne tři hry** — proto se dělá s tou nejjednodušší
   z nich, ne s tou nejsložitější.

| # | Krok | Náročnost | Proč právě tady |
|---|---|---|---|
| 1 | **Grafika + favicon** ✅ | malá | nezávisí na ničem, opravuje viditelnou chybu, okamžitě vidět |
| 2 | **Diplom** ✅ | malá | nezávisí na matematické vrstvě; nejlepší poměr přínos/cena |
| 3 | **Procenta a desetinná čísla** jako generátory úloh ✅ | střední | šířka matematiky před šířkou her; naplní 2. stupeň obsahem; **žádný nový tisk** |
| 4 | **Registr aktivit** (C.1) ✅ | střední | poslední chvíle, kdy je to levné |
| 5 | **`DocumentModel`** bez PDF (C.2) | střední | předpoklad pro bingo, pexeso i domino |
| 6 | **Kartičková sazba** (C.3) + **pexeso** | střední | primitivum se ověří na nejjednodušším uživateli |
| 7 | **Domino** | malá–střední | po pexesu zbývá jen kontrola řetězce |
| 8 | **Bingo** | střední | je v katalogu, učitelé ho čekají; potřebuje kroky 5 a C.4 |
| 9 | **Příkazová vrstva + widget** (E.1) | střední | až teď je co ovládat |
| 10 | **Magické čtverce, buňkové bludiště, osmisměrka** | střední | nad mřížkovou sazbou z C.4 |
| 11 | **Detektivní obal + hledání chyby** | malá | obsahová práce nad hotovým |

Po kroku 8 je Šifromatika **pět hotových aktivit se společnou infrastrukturou**. To je
podle mě správný cíl. Ne dvanáct.

**Co v tomhle seznamu vědomě není:** logické mřížky, kakuro, trojúhelníkové puzzle, sudoku,
futoshiki, nonogramy, KenKen, hidato, export do DOCX, interaktivní kvíz, časový rozpočet,
účty uživatelů.

---

## H. Hranice: kde končí Šifromatika a začíná Matematická dílna

Zadání *Úprava od Claude* žádá tuhle čáru vyznačit jasně. Navrhuji ji vést takhle:

> **Šifromatika je nástroj na aktivity, kde matematika něco odhalí.**
> Tajenku, kód, cestu, dvojici, pachatele. Výsledek počítání není cíl — je to klíč.

Podle toho:

| Patří dovnitř | Je za hranicí |
|---|---|
| šifry, tajenky, detektivky | běžné pracovní listy na drilování |
| domino, pexeso, puzzle (párování je odhalení) | interaktivní kvízy a samoopravování |
| bludiště, bingo, magické čtverce (objevování vzoru) | logické mřížky bez matematiky |
| číselné řady (hledání pravidla — na hraně, ale uvnitř) | sudoku, futoshiki, nonogramy — hlavolamy, ne procvičování |

**Logické mřížky, sudoku a spol. jsou dobrý produkt. Jen jiný.** Kdyby vznikla „Matematická
dílna" jako obecný generátor pracovních listů, sdílela by s Šifromatikou `core/`, `tasks/`
a tisk — a přesně proto se ta vrstva navrhovala tak, jak se navrhovala. Ale je to **druhý
konzument `core/`**, tedy přesně ten okamžik, kdy podle `rozsah-0.1.md` má smysl monorepo.
To je rozhodnutí na jindy, ne teď.

Číselné řady tu čáru už mírně překročily — jsou to samostatné listy bez tajenky. Není to
chyba, ale je dobré o tom vědět, aby se druhý krok neudělal nevědomky.

---

## I. Rizika

| Riziko | Závažnost | Mitigace |
|---|---|---|
| **Rozsah.** 12 aktivit = 12× údržba golden testů, verifikace a tiskových šablon. Tohle je hlavní riziko, ne technika | **vysoká** | 5 aktivit, ne 12; oddíl G |
| Milimetrová přesnost kartiček se liší mezi prohlížeči | vysoká | pevné mm, značky střihu, **zkušební tisk na papír** v definici hotového |
| Rozpoznávání volného českého textu v příkazech je křehké | střední | tlačítka jako hlavní cesta, malý slovník, text jako zkratka |
| Jednoznačnost řešení (magický čtverec, bludiště, křížovka) je vždycky dražší, než vypadá | střední | jen tam, kde solver zvládne malý prostor: 3×3, buňkové bludiště |
| Nové generátory úloh mění výstup starých `.sifra` | nízká | **už vyřešeno** — `generatorMix` s defaultem, viz KEEP |
| Rozšíření tokenizeru ve `verify` o zlomky a desetinná čísla se dotkne jediné obrany projektu | střední | property testy na parser dřív než na generátory; nikdy nevypínat verifikaci pro aktivitu |
| Aktivita „hledání chyby" svádí k vypnutí verifikace | střední | kontrakt „očekávám nesoulad na položce N", nikdy `skipVerification` |
| Grafika sklouzne do maskota na každé obrazovce | nízká | pravidlo: na papíře nikdy, v UI jen hlavička; oddíl E.3 |

---

## J. Otázky, které musíš rozhodnout ty

1. **Pět aktivit, nebo dvanáct?** Doporučuji pět. Potřebuji vědět, jestli s tím souhlasíš,
   protože z toho plyne, jestli se do infrastruktury investuje víc, nebo míň.
2. **Šířka her, nebo hloubka matematiky napřed?** Doporučuji hloubku (krok 3 před krokem 6):
   procenta a desetinná čísla naplní 2. stupeň, který je podle tvého záměru směr projektu.
   Pátá hra pro 4. třídu ho nenaplní.
3. **Zůstane 9. ročník mimo, dokud nedostane vlastní profil?** Doporučuji ano — a procenta,
   zlomky a rovnice z kroku 3 jsou přesně to, co mu profil umožní vytvořit.
4. **Diplom: jen tisk (přes „Uložit jako PDF" v prohlížeči), nebo čekat na PDF knihovnu?**
   Doporučuji jen tisk. PDF knihovna je samostatné rozhodnutí a nemá se dělat kvůli diplomu.
5. **Logo do SVG:** nechat překreslit, nebo zatím rastr v malé velikosti?
6. **Chatbot až za čtvrtou hrou** — souhlasíš s tím odsunutím? Je to jediná položka
   ze tvého seznamu, kterou navrhuji odložit, a chci to mít potvrzené.

---

## Stav

Z tohoto seznamu jsou hotové kroky 1–4: **grafika + favikona**, **diplom**,
**registr aktivit** (C.1 a CHANGE 1 + 3 z oddílu D) a **procenta s desetinnými
čísly**. Registr se udělal mimo pořadí, před procenty: je to jediná položka,
kterou je nutné stihnout dřív než třetí aktivitu.

Podrobnosti jsou v `docs/navrh-registru-aktivit.md`
a `docs/navrh-procenta-desetinna.md`.

Na řadě je **`DocumentModel` bez PDF** (C.2), předpoklad pro bingo i pexeso.

Ověřeno spuštěním, ne z dokumentace: `npm run check` — typecheck, oxlint,
41 modulů bez porušení hranic vrstev, 272 testů ve 14 souborech, vše prochází.
