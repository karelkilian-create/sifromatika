# Výběr témat pro pexeso — mocniny, procenta a spol.

**Stav: hotovo v kódu, čeká na zkušební tisk.** Schváleno a implementováno
16. 8. 2026. Co se od návrhu odchýlilo, je v §8.

Stav před zásahem: 16 testovacích souborů, 327 testů, `GENERATOR_VERSION` 4.
Stav po zásahu: 17 souborů, 364 testů, **`GENERATOR_VERSION` 5**,
`npm run check` i `npm run build` čisté.

Navazuje na krok 6 (`docs/navrh-karticky-pexeso.md`) a předbíhá domino.
Stav před zásahem: `main` na commitu 2387034, pracovní strom čistý.

---

## 1. Co Karel chce

Doslova: *„stěžejní látkou v osmičce jsou mocniny, chtěl bych, aby byla možnost
je třeba zaškrtávátkem přidat… Neříkám, že to co tam je špatně, ale pořád jsou
to numerické počty jen s většími čísly. A podobně bych uvítal kartičky třeba
s procenty a možnost zvolit třeba celé pexeso jen procenta nebo jen mocniny."*

Rozpadá se to na tři požadavky, které je užitečné držet oddělené:

1. **Vybrat téma zaškrtávátkem** — dnes to u pexesa nejde vůbec.
2. **Mocniny jako téma** — dnes to není téma, ale vedlejší tvar aritmetiky.
3. **Celé pexeso z jednoho tématu** — dnes to nejde ani u šifry, kde
   zaškrtávátka jsou; aritmetika je tam natvrdo v poměru 3 : 1.

---

## 2. Překvapení z průzkumu: mocniny už existují, ale nejsou vidět

Osmý ročník mocniny **umí od 9. srpna** (commit 791c1ac). Je jich pět tvarů
v `src/tasks/arithmetic/index.ts:411-482`:

| Tvar | Příklad | Řízeno |
|---|---|---|
| `square-then-add` | `12² + 7` | `profile.powers` + zaškrtnuté `·` a `+` |
| `square-then-sub` | `15² − 25` | `profile.powers` + `·` a `−` |
| `cube-then-add` | `4³ + 9` | `profile.powers` + `·` a `+` |
| `root-then-add` | `√81 + 5` | `profile.powers` + `+` |
| `root-then-sub` | `50 − √64` | `profile.powers` + `−` |

Takže Karlův dojem „pořád jsou to numerické počty jen s většími čísly" **není
tím, že by mocniny chyběly.** Jsou tam, ale:

- **jsou menšina.** Losují se z jednoho pytle se všemi ostatními složenými
  tvary (`COMPOUND_SHAPES`, dnes 15 položek), a složené tvary tvoří jen 55 %
  listu (`COMPOUND_SHARE`). Na dvanáctidvojicovém pexesu tak vyjde mocnina
  v průměru dvakrát.
- **do pexesa se nedostanou vůbec**, pokud není zvolený 8. ročník — a i pak
  jen náhodou, viz výše.
- **nejdou zaškrtnout**, protože to z pohledu kódu není typ úlohy, ale
  vnitřní varianta aritmetiky.

To poslední je jádro věci. Zaškrtávátko nejde přidat k něčemu, co není
samostatný generátor.

## 2b. Druhé překvapení: pexeso nemá zaškrtávátka **typů úloh**

Rozlišit se musí dvě různé sady, jinak si nerozumíme:

| Sada | Kde je | Platí v pexesu? |
|---|---|---|
| **Operace** — Sčítání, Odčítání, Násobení, Dělení | společné všem aktivitám, `shared.operations` | **ano**, fungují |
| **Typy úloh** — Číselné řady, Desetinná čísla, Procenta | jen ve větvi šifry, `EditorPanel.tsx:213-242` | **ne** |
| **Mocniny** | nikde, nejsou samostatný typ | ne (viz §2) |

Operace tedy v pexesu jdou zaškrtnout a projeví se: `applyShared` je zapíše do
`taskMix` a generátor je respektuje. Zaškrtnutí jen `+` a `−` opravdu dá
kartičky jen se sčítáním a odčítáním.

Chybí až ta druhá sada. `PexesoEditorState`
(`src/activities/pexeso/module.ts:18-21`) má **jediné vlastní pole:
`pairCount`.** `defaultPexesoConfig` zapisuje natvrdo `generatorMix:
{ arithmetic: 1 }` a nikdo to nepřepíše.

Přitom datový model i parser `.sifra` `generatorMix` u pexesa **plně
podporují** (`payload.ts:26-38`, `index.ts:119-122`). Je hotová celá cesta
kromě formuláře. Procenta, desetinná čísla ani řady se tedy do pexesa dnes
nedostanou — ne proto, že by to nešlo, ale proto, že to nemá kde zaškrtnout.

Dobrá zpráva: **polovina práce je hotová a čeká.**

---

## 3. Návrh ovládání

Ve „Pokročilém nastavení" pexesa přibude sada zaškrtávátek:

> **Z čeho složit kartičky**
> - ☑ Počítání — `7 · 8`
> - ☐ Číselné řady — `4 10 16 22 ?`
> - ☐ Desetinná čísla — `3,5 · 4`  *(od 5. ročníku)*
> - ☐ Procenta — `25 % z 80`  *(od 7. ročníku)*
> - ☐ Mocniny a odmocniny — `7²`, `√81`  *(8. ročník)*
>
> *Zaškrtnuté typy se v pexesu míchají rovnoměrně. Necháte-li zaškrtnuté jen
> jedno, bude celé pexeso z něj.*

**Rozdíl proti šifře je záměrný.** U šifry je aritmetika vždy zapnutá s vahou 3
a zpestření se k ní přimíchávají 1 : 3 — dává to smysl, protože šifra je list na
hodinu a řada nebo procento zaberou dítěti víc času. Pexeso je hra na jedno téma
a Karel výslovně chce „celé pexeso jen procenta". Proto:

- **aritmetika jde odškrtnout** (u šifry ne),
- **váhy jsou rovnoměrné**, každý zaškrtnutý typ 1 (u šifry 3 : 1),
- **aspoň jedno musí zůstat** — odškrtnutí posledního se neprovede, stejně jako
  se dnes nedá odškrtnout poslední operace.

Jakmile se to osvědčí, nabízí se totéž ovládání i pro šifru. **Do téhle změny
to ale netahám** — šifra funguje, tiskne se a měnit jí poměry znamená měnit
obsah listů, které už někdo má uložené.

**Obě sady platí zároveň**, stejně jako dnes u šifry: typ říká, *o čem* úloha
je, operace *čím se počítá*. Odtud plyne past, na kterou je potřeba myslet —
dnešní mocninné tvary operace vyžadují (`12² + 7` potřebuje zaškrtnuté
násobení i sčítání), takže učiteli se zaškrtnutým jen sčítáním a odčítáním by
se „jen mocniny" skoro nevygenerovaly. Řeší to §4.2.

---

## 4. Nový generátor `powers`

Aby šly mocniny zaškrtnout, musí být samostatný generátor —
`src/tasks/powers/index.ts`, pátý řádek v `src/tasks/registry.ts`. Vzorem je
`percent`: `supports`, `reachableValues`, `generateForValue`, nic víc.

### 4.1 Tvary se z aritmetiky NEVYJÍMAJÍ

Nejdůležitější rozhodnutí celého návrhu. Kdybych těch pět tvarů z
`COMPOUND_SHAPES` odebral, změnil by se výstup 8. ročníku v šifře, rozešly by
se golden snapshoty a `GENERATOR_VERSION` by musel na 5 — a všechny uložené
osmácké `.sifra` by vytiskly jiný list.

Místo toho se definice tvarů **přesunou do `src/tasks/powers/shapes.ts` a
aritmetika si je naimportuje zpátky na totéž místo v poli, ve stejném pořadí.**
Pořadí je podstatné: `rng.pick` losuje podle indexu, takže přeházení pole by
snapshoty rozešlo i bez jediné změny matematiky.

Výsledek: **8. ročník v šifře zůstane bitově stejný, `GENERATOR_VERSION`
zůstává 4.** Ověří to golden snapshoty, které se nesmí ani dotknout.

### 4.2 Přibudou holé tvary

Dnešní pětice má vždycky druhý člen (`12² + 7`). Pro kartičku je ideální
opak — krátký výraz, který se přečte na pohled:

| Tvar | Příklad | Hodnota |
|---|---|---|
| `square` | `7²` | 49 |
| `cube` | `3³` | 27 |
| `root` | `√81` | 9 |

Tyhle tři **nezávisí na žádné zaškrtnuté operaci** (není v nich `+` ani `−`),
takže „jen mocniny" funguje i tehdy, když má učitel zaškrtnuté třeba jen
dělení. Přidávají se jen do nového generátoru, do `COMPOUND_SHAPES` ne —
aritmetika zůstane nedotčená.

Základy zůstávají v mezích, které si commit 791c1ac vydiskutoval:
druhá mocnina do 20, třetí do 5, odmocňuje se jen z úplných čtverců.

### 4.3 Nula a jednička jako výsledek

Karlův příklad `2³ − 8` má hodnotu **0**. V šifře je nula nepoužitelná (výsledek
je kód políčka v mřížce, musí být kladný — `inRange` vyžaduje ≥ 2). **Na
kartičce je ale v pořádku** a je to hezká úloha.

Pexeso na rozdíl od šifry nemá žádný důvod nulu zakazovat, protože hodnotu
nikam neindexuje — jen páruje. Navrhuju proto mocninnému generátoru povolit
výsledky 0 a 1, ale **jen pro pexeso**; do šifry se nedostanou, protože ta si
cíle diktuje z mřížky a nulu si nikdy nevyžádá. Vyjde to samo, bez příznaku:
generátor dostane cíl zvenčí a šifra ho o nulu nepožádá.

---

## 5. Rizika, která znám dopředu

**Málo dvojic.** Pexeso potřebuje N hodnot, které jsou navzájem různé. „Jen
procenta" v 7. třídě má užší zásobu než aritmetika a u vysokého počtu dvojic
se může vyčerpat. Mechanismus na to už existuje — ústupek `fewer-pairs`
(`pexeso/index.ts:170-177`) učiteli oznámí, že místo 12 dvojic vyšlo 9. Ověřím
testem pro každý typ zvlášť, kolik dvojic ještě spolehlivě vyjde, a když to
u nějakého typu bude málo, řeknu to rovnou tady místo aby to Karel našel při tisku.

**Řada na kartičce je dlouhá.** `4 10 16 22 ?` je podstatně širší než `7 · 8`.
Kartičková sazba má pevnou velikost buňky, takže dlouhý text buď zdrobní, nebo
přeteče. Zkontroluju to na náhledu dřív, než to půjde na papír; pokud to bude
škaredé, nabídnu řady u pexesa vypnout a nechat je šifře.

**Editor je psaný na dvě aktivity — a už dnes kvůli tomu lže.** `EditorPanel.tsx`
větví v Pokročilém nastavení přes `isCipher ? … : …` (řádky 200, 213, 250, 270),
takže pexeso spadá do stejné větve jako list řad a přebírá jeho texty:

- pod operacemi hlásku *„Určují, jak řada postupuje. Bez násobení se neobjeví
  řady jako 3, 6, 12, 24, ?"* — v pexesu žádné řady nejsou,
- v názvu placeholder *„např. Rozcvička na řady"* a hlásku *„Na list řad se
  název tiskne vždycky."*

`isPexeso` je přitom definované už na řádku 59 a o kus výš se používá; v
Pokročilém nastavení se na něj zapomnělo. Rozpletu větvení na volbu podle
`activity` a texty opravím. Je to úklid, ne nová funkce, ale bez něj by
zaškrtávátka témat přibyla do třetího vnořeného ternárního operátoru.

---

## 6. Co se nemění

- **`GENERATOR_VERSION` zůstává 4** a golden snapshoty se nepřepisují. Kdyby se
  ukázalo, že to nejde, zastavím se a přijdu za Karlem — je to zámek
  determinismu, ne formalita.
- **Šifra se nedotkne**, ani jejích poměrů, ani ovládání.
- **Model párování zůstává „zadání ↔ výsledek".** Kartička `2³ − 8` se páruje
  s kartičkou `0`. (Kdybys tou „nulou na druhé" myslel kartičku `0²`, tedy
  párování výraz ↔ výraz, řekni — je to jiná hra a jiná práce. Četl jsem to
  jako „na druhé kartičce".)
- **Uložené `.sifra` se čtou dál beze změny.** Pexeso bez `generatorMix` =
  aritmetika, přesně jak parser dělá dnes.

---

## 7. Postup

Po malých krocích, `npm run check` po každém:

1. **Tvary mocnin do `tasks/powers/shapes.ts`**, aritmetika je importuje.
   Čistý přesun. Kontrola: golden snapshoty beze změny.
2. **Generátor `powers`** včetně holých tvarů a testů, řádek v registru.
   Kontrola: golden snapshoty pořád beze změny (nikdo si ho zatím nevyžádal).
3. **`PexesoEditorState` o pět příznaků**, `toConfig`/`fromConfig`, payload.
4. **Zaškrtávátka v editoru** + rozpletení `isCipher`.
5. **Kolik dvojic vyjde** — test pro každý typ zvlášť, meze do dokumentace.
6. **Náhled v prohlížeči**, hlavně délka textu na kartičce.
7. **Zkušební tisk u Karla.** Teprve tím je krok hotový.

---

## 8. Co se odchýlilo

1. **`GENERATOR_VERSION` šel nakonec na 5** — ale ne kvůli mocninám. Přesun
   tvarů do `tasks/shapes.ts` i přidání pátého generátoru proběhly bez jediné
   změny výstupu, přesně jak §4.1 sliboval, a ověřeno to bylo po každém kroku
   zvlášť. Verzi zvedl až bod 9 níž: **výběr témat v pexesu.**

   Golden snapshoty se tím přepsaly, jak inkrement vyžaduje. Šifra ani list řad
   se přitom obsahově nezměnily — jen se jim posunul odvozený seed, takže mají
   jiné příklady téhož druhu. Totéž se stalo u verze 4.

2. **Generátor `powers` nakonec sdílené `POWER_SHAPES` nepoužívá.** Návrh počítal
   s tím, že si je půjčí; ukázalo se, že to nejde spojit s tím, co pexeso
   potřebuje. Aritmetické tvary si losují základ a na nesedící cíl narazí až po
   losu, takže z nich nejde spolehlivě odvodit `reachableValues` — a pexeso
   z těch hodnot vybírá, takže slíbit hodnotu, kterou generátor nevyrobí, znamená
   o dvojici na kartičkách míň. `powers` je proto postavený jako `percent`:
   `textsFor` vrátí všechny výrazy pro danou hodnotu deterministicky, takže slib
   i výroba čtou z jednoho zdroje. Sdílené zůstaly meze základů a `inRange`.
   Hlídá to test „co slíbí v reachableValues, to i vyrobí".

3. **Přibyl tvar `cube-minus` (`2³ − 8`), který aritmetika nemá.** Je to Karlův
   vlastní příklad a v aritmetice chyběl — ta má třetí mocninu jen se sčítáním.
   Přidat ho do `POWER_SHAPES` nešlo (změnilo by to osmé ročníky v šifře), takže
   žije jen v `powers`.

4. **Strop na druhý člen platí u všech mocninných tvarů, ne jen u odčítání.**
   Aritmetika ho uplatňuje jen na `square-then-sub`; na kartičce dává smysl
   všude, protože `12² + 847` je hlavně sčítání s ozdobou. Kartička má být krátká.

5. **Přibyl strop na cílovou hodnotu (`MAX_TARGET`, dnes 500).** Odhalil ho
   vlastní test: `root-minus` uměl vyrobit `503 − √4`, tedy hodnotu, kterou
   `reachableValues` neslíbil. Kromě konzistence to drží zásobu u čísel, kde
   mocnina ještě nese úlohu.

6. **Volby se přepnutím ročníku nemažou.** Návrh to neřešil. Učitel, který se
   vrátí z šesté třídy do osmé, najde své mocniny zaškrtnuté; doplnila se jen
   záchrana, která zapne počítání, kdyby v novém ročníku nezbylo použitelné nic.
   Bez ní by osmák s mocninami přepnutý na šestku dostal místo pexesa hlášku,
   že pro tuhle obtížnost není žádný generátor.

7. **Riziko „málo dvojic" se nepotvrdilo.** Každé téma samo o sobě dá plných
   dvanáct dvojic bez jediného ústupku `fewer-pairs` — mocniny, procenta,
   desetinná čísla i řady. Má to vlastní test, aby to tak zůstalo.

8. **Riziko „dlouhá řada na kartičce" se nepotvrdilo taky**, a mocniny dopadly
   ze všech témat nejlíp. Nejdelší kartička podle měření: mocniny 10 znaků
   (`428 − √361`), procenta 11, desetinná 15, počítání v 8. třídě 16
   (`(726 + 3499) · 2`), řady 18 (`1000 ? 986 979 972`). Šestnáct znaků tedy
   pexeso tisklo už předtím a papír to unesl. Přibyla pojistka na 30 znaků.

9. **Pexeso losuje TÉMA podle vah, teprve pak z jeho zásoby cíl.** Tohle je
   největší odchylka a odhalil ji až náhled v prohlížeči. Do téhle změny se
   všechny dosažitelné hodnoty slily do jednoho pytle a losoval se z něj cíl —
   jenže aritmetika osmého ročníku jich nabízí přes deset tisíc a mocniny sto,
   takže **zaškrtnutí mocnin vedle počítání se na kartičkách neprojevilo
   prakticky nikdy.** Poměr témat nesmí záviset na tom, jak široký obor čísel
   který generátor náhodou pokrývá.

   Mění to kartičky ve všech ročnících, a proto `GENERATOR_VERSION` na 5.

10. **Strop na výsledek je 100, ne 420** — Karlova volba z 16. 8. po prvním
    zkušebním listu. Ten vyšel jako `19² − 8 = 353`, `17² + 17 = 306`,
    `18² + 89 = 413`: mocnina na kartičce byla, ale hlavní prací bylo počítání
    s velkými čísly, tedy přesně to, kvůli čemu volba témat vznikla. Se stropem
    zbývá zásoba 101 hodnot (dost na plný počet dvojic), do sta jsou přesné
    mocniny hustě, a tak holá mocnina vyjde zhruba na každou čtvrtou kartičku.

    Druhý člen je zároveň omezený na 20 (aritmetika povoluje 100) a u
    `root-minus` je strop 100 na to, od čeho se odečítá — bez něj vzniklo
    `463 − √16`, kde odmocnina je hotová hned a zbytek je odčítání
    čtyřciferných čísel.

11. **Členy číselných řad mají nejvýš tři cifry** (`MAX_TERM` v
    `tasks/sequence`). Nesouvisí to s mocninami; Karel na to narazil v pexesu
    z řad pro 8. ročník, kde obor sahá do deseti tisíc a vznikalo
    `5184 5196 ? 5220 5232`. Pravidlo je v takové řadě totéž jako v
    `12 24 ? 48`, jen se hůř čte a na kartičce se láme na dva řádky — čtvrtá
    cifra nepřidává učivo, jen práci s očima. Platí ve všech aktivitách
    a ročnících, protože to není vlastnost ročníku, ale řady jako úlohy.

**Zbývá:** **zkušební tisk u Karla**. Teprve tím je krok hotový — u kartiček je
papír jediný soudce. V prohlížeči ověřeno: pexeso ze samých mocnin dává
`√64 = 8`, `5² + 10 = 35`, `4³ + 20 = 84`, `10² − 3 = 97`; řady v 8. ročníku
`494 502 514 ? 550`, `129 132 138 141 ?`. Konzole bez chyb.

---

## 9. Co zůstalo otevřené

**Zaškrtávátko „Mocniny a odmocniny" mocniny přidává, ale nevypíná.** Aritmetika
osmého ročníku je má v sobě od commitu 791c1ac, takže i pexeso zaškrtnuté jen
na „Počítání" jich v osmičce pár nasype. Vyjmout je odtamtud by změnilo obsah
šifer, které už někdo má uložené (`GENERATOR_VERSION` na 5).

Dnešní stav popisuje test „počítání v osmé třídě samo o sobě mocniny občas
nabídne", aby to nikdo neobjevil jako překvapení. **Je to k rozhodnutí, ne
k opravě** — Karel k dnešnímu chování řekl „neříkám, že to co tam je špatně".
