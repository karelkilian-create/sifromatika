# Bingo — návrh

**Stav: sepsáno a rovnou implementováno** (18. 8. 2026, `main` na commitu `a69973b`).
Karel je do čtvrtka mimo a chce tisknout domino i bingo najednou, takže se
nečekalo na schválení. Rozhodnutí jsou proto vypsaná nahoře, ať je co vetovat
dřív, než se to vytiskne. Co se od návrhu odchýlilo, je v §9.

Stav před zásahem: 18 testovacích souborů, 415 testů, `GENERATOR_VERSION` 5,
čtyři hotové aktivity (šifra, číselné řady, pexeso, domino).

Krok 8 z pořadí v `docs/SIFROMATIKA-EVALUATION.md` §G.

---

## 0. Verdikt na jednu obrazovku

**Bingo je první aktivita, kde papír a matematika nejsou to hlavní. Hlavní je,
že hraje celá třída najednou.** Z toho plyne všechno ostatní:

1. **Na kartě jsou jen výsledky, příklady vyvolává učitel.** Kdyby byl na kartě
   příklad, dítě si ho spočítá dopředu a hra se scvrkne na hledání čísla.
2. **Karta je vždy 4 × 4.** Ne volba — šestnáct čísel je jedna rozcvička.
   Devět je hotovo dřív, než se třída ztiší, pětadvacet přeteče přes hodinu.
3. **Nové pravidlo hry: každé číslo na kartě musí jít vyvolat.** Dítě, které má
   na kartě číslo, jež učitel nikdy nepřečte, nemůže vyhrát — a nepozná, že to
   není jeho chyba.

---

## 1. Co bingo je

Učitel čte příklady ze svého seznamu (`7 · 8`). Dítě spočítá, najde výsledek na
své kartě a škrtne ho. Kdo má celý **řádek, sloupec nebo úhlopříčku**, volá
bingo.

```
   ┌────┬────┬────┬────┐
   │ 56 │ 12 │ 90 │  7 │
   ├────┼────┼────┼────┤
   │ 24 │ 45 │ 63 │ 18 │   učitel čte: „sedm krát osm"
   ├────┼────┼────┼────┤   dítě škrtá:   56
   │  8 │ 72 │ 30 │ 51 │
   ├────┼────┼────┼────┤
   │ 36 │ 15 │ 64 │ 21 │
   └────┴────┴────┴────┘
```

Každé dítě má **jinou kartu**. Tím se liší od pracovního listu: karty musí být
navzájem různé, jinak dvě děti vyhrají naráz a jedna z nich má pocit, že ji
někdo opsal.

---

## 2. Rozhodnutí: co je na kartě

| | jen výsledky (doporučeno) | příklady na kartě |
|---|---|---|
| Kdy se počítá | při vyvolání, pod tlakem | dopředu, v klidu |
| Co dítě dělá | počítá a hledá | hledá |
| Vyvolávání | učitel čte příklad | učitel čte výsledek |

**Jen výsledky.** Bingo je jediná aktivita v Šifromatice, kde se počítá
*z hlavy a hned*; s příklady na kartě by z toho bylo pexeso pro jednoho.

Varianta z `navrhy_her.odt` — **bingo s podmínkami** („číslo dělitelné třemi")
— je didakticky ještě lepší a technicky skoro totéž, ale potřebuje slovník
vlastností čísel, který v projektu není. **Do téhle verze nejde**, poznamenáno
pro později.

---

## 3. Rozhodnutí: karta 4 × 4 a zásoba čísel

Karta je **4 × 4, tedy šestnáct čísel**, pevně. Důvod je stejný jako u pevné
mřížky 9 × 9 u šifry: jeden rozměr znamená jednu sazbu a jedno chování.

Vyvolávaných čísel je **víc než šestnáct** — jinak by musel učitel přečíst
úplně všechno a vyhráli by všichni naráz. Poměr je **3 : 2**, tedy 24 čísel na
šestnáctipolíčkovou kartu. Zásoba se sází i tiskne celá; kdo chce delší hru,
přečte víc.

⚠ **Úzký výběr = žádné bingo.** Šestnáct různých hodnot je tvrdé minimum karty
a snížit se nedá — mřížka má šestnáct políček. Když jich vrstva úloh v daném
ročníku a výběru operací tolik nenabídne, aktivita **skončí hláškou**, ne
zmenšenou kartou. Zásoba nad šestnáct se naopak zkrátit smí: to je ústupek
`fewer-values` a znamená jen kratší hru.

---

## 4. Karta a papír

| Rozměr karty | Sloupců | Řad | Na stránku |
|---|---|---|---|
| **88 × 88 mm** (políčko 22 mm) | 2 | 2 | **4** |
| 80 × 80 mm (políčko 20 mm) | 2 | 3 | 6 |

**88 × 88 mm.** Do políčka 22 mm se vejde i čtyřciferné číslo z osmé třídy
a hlavně se do něj dá **škrtnout tužkou** tak, aby to bylo vidět. Šest karet na
stránku by ušetřilo papír, ale bingo se hraje jednou a karta zůstává dítěti
v lavici.

Zbytek papírových pravidel se dědí po pexesu a dominu beze změny: karty se
dotýkají, stříhá se skrz celý list, na každé stránce je kontrolní úsečka
100 mm.

---

## 5. Zásah do `DocumentModel`

`CardFace` je od domina unie. Bingo přidá **třetího člena**:

```ts
export type CardFace =
  | { text: string }                     // pexeso
  | { left: string; right: string }      // domino
  | { grid: readonly (readonly string[])[] }   // bingo
```

**Proč ne vlastní blok `bingo-grid`:** stránkování, mřížka, střihové linky
i kontrolní úsečka jsou totožné s pexesem a dominem. Tentýž argument, kvůli
kterému domino nedostalo `domino-grid` — druhý blok by je celé zdvojil.

**Co se tím vědomě NEDĚLÁ:** obecná mřížková sazba z §C.4 hodnocení
(zobecnění `CipherTableView`). Mřížka na bingo kartě nemá záhlaví, souřadnice
ani zvýrazněné buňky, takže by se zobecňovalo podle jediného uživatele.
Magické čtverce a osmisměrka si o to řeknou samy, až budou.

---

## 6. Nová aktivita `bingo`

```
src/activities/bingo/
  index.ts      zásoba hodnot, karty, seznam pro učitele
  module.ts     záznam do registru, stav formuláře
  document.ts   stránky karet + list pro učitele
  payload.ts    validace payloadu z `.sifra`
  bingo.test.ts
```

Generování:

1. Pro každé zaškrtnuté téma zásoba dosažitelných hodnot, zamíchaná.
   Losování tématu podle vah — sdílené `tasks/mix.ts`, stejně jako u domina.
2. Vyrobí se *v* úloh s navzájem různými výsledky (*v* = 24, méně jen
   s ústupkem). To je **vyvolávací seznam**.
3. Seznam se zamíchá — pořadí čtení je hra sama. Kdyby se vyvolávalo od
   nejmenšího, děti by škrtala odshora dolů bez počítání.
4. Každá karta je náhodný šestnáctiprvkový podvýběr zásoby, zamíchaný do
   mřížky 4 × 4.
5. Karty se porovnají; dvě stejné se přegenerují.

Verifikace (nad rámec obvyklého přepočtu úloh):

- **`uncallable-value`** — číslo na kartě, které není ve vyvolávacím seznamu.
- **`duplicate-card`** — dvě stejné karty, nebo totéž číslo dvakrát na jedné
  kartě (jedno škrtnutí by pak zabralo dvě políčka).

Ostatní se doplní na místa, která na to čekají: `CARD_COUNT_LIMITS`
(2–30, výchozí 12), `ActivityId += 'bingo'`, řádek v registru, zaškrtávátka
témat tatáž jako u pexesa a domina.

---

## 7. Co se nemění

- Šifra, řady, pexeso ani domino se nedotknou. `GENERATOR_VERSION` zůstává
  **5** — nová aktivita nemění výstup těch starých.
- Katalog přestane mít položku „Připravujeme". Mechanismus
  `plannedActivities` zůstává v kódu i s komentářem; sliby se do něj vrátí,
  až bude co slibovat.

---

## 8. Rizika, která znám dopředu

1. **Papír.** Dvanáct karet jsou tři stránky, čtyřiadvacet šest. Bingo je
   z celé Šifromatiky nejdražší na toner a nedá se s tím nic dělat — každé
   dítě musí mít jinou kartu.
2. **Úzký ročník.** Třetí třída jen s dělením nedá šestnáct různých hodnot
   a aktivita skončí hláškou. Je to správně, ale učitel to musí pochopit
   z textu hlášky, ne z prázdné obrazovky.
3. **Čtyřciferná čísla v osmé třídě** v políčku 22 mm. Ověří tisk.
4. **Délka hry.** Poměr 3 : 2 je odhad od stolu. Ukáže se až ve třídě —
   a mění se jedním číslem.

---

## 9. Co se odchýlilo

Tři věci, z toho jedna podstatná:

1. **Karta je 82 mm, ne 88.** ⚠ Rozhodnutí z §4 bylo špatně a ukázal to až
   náhled: při 88 mm se na stránku vejdou jen čtyři karty (2 × 2 = 176 mm
   z 253 mm) a **třetina každé stránky zůstane prázdná**. 82 mm dá tři řady,
   tedy šest karet na stránku, a dvanáct karet se vejde na dva listy místo
   tří. Políčko tím kleslo z 22 na 19,5 mm — pořád dost na čtyřciferné číslo
   i na škrtnutí tužkou, a u aktivity, která je z celé Šifromatiky nejdražší
   na papír, váží ušetřená třetina víc než dva a půl milimetru.

2. **Duplicitní karty se řeší dvakrát, ne jednou.** §6 počítal s tím, že se
   shodná karta přegeneruje. Generátor to dělá, ale po dvaceti marných
   pokusech kartu pustí dál — a **verifikace ji zachytí** kódem
   `duplicate-card`. Tichá duplicita by byla horší než hláška, a nekonečná
   smyčka nad krátkou zásobou zase horší než obojí.

3. **`BINGO_POOL_RATIO` je konstanta, ne nastavení.** Poměr 3 : 2 se ukázal
   být jediné číslo, kterým se dá délka hry ladit, takže stojí samostatně
   v `core/constraints` s vysvětlením. Až se ve třídě ukáže, že je hra dlouhá
   nebo krátká, mění se jedno místo.

Co naopak drželo: karta 4 × 4 pevně, jen výsledky na kartě, zásoba větší než
karta, úzký výběr končí hláškou a ne zmenšenou kartou, a třetí tvar `CardFace`
místo vlastního bloku.

**Co ještě není ověřené:** zkušební tisk (čtvrtek 20. 8.). Rozměr karty,
tloušťka vnitřních linek a písmo 14 pt v políčku jsou zatím jen z obrazovky.
Druhá věc, kterou papír neukáže vůbec, je **délka hry** — poměr 3 : 2 je odhad
od stolu a rozhodne až třída.
