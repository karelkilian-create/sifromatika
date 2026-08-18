# Domino — návrh

**Stav: hotovo a v kódu** (18. 8. 2026). Sepsáno 16. 8. 2026, `main` tehdy na
commitu d700184. Co se při implementaci odchýlilo, je v §12.

Stav před zásahem: 17 testovacích souborů, 364 testů, `GENERATOR_VERSION` 5,
tři hotové aktivity (šifra, číselné řady, pexeso).

Krok 7 z pořadí v `docs/SIFROMATIKA-EVALUATION.md` §G. Navazuje na
`docs/navrh-karticky-pexeso.md` (kartičková sazba) a
`docs/navrh-vyber-temat-pexeso.md` (volba témat).

---

## 0. Verdikt na jednu obrazovku

**Papír je tentokrát vyřešený, matematika ne.** U pexesa to bylo naopak: sazba
kartiček se stavěla od nuly a matematika přidala jedno pravidlo. Domino tu
sazbu zdědí hotovou — a přinese jediné, zato tvrdší pravidlo:

> Hodnoty musí tvořit **jeden souvislý řetěz**, ne pět útržků.

Rozhodnutí, která z toho plynou, jsou tři:

1. **Řetěz se uzavírá do kruhu.** Dítě skončí tam, kde začalo — a tím si samo
   zkontroluje, že to má dobře. Bez kruhu musí obcházet učitel.
2. **Kámen měří 84 × 42 mm**, dvanáct kamenů na stránku A4. Vejde se tak celé
   domino na jeden list.
3. **Volba témat je stejná jako u pexesa**, včetně „celé domino jen z mocnin"
   nebo „jen z procent" — to je Karlův požadavek z 16. 8. Zároveň je to třetí
   výskyt téhož kódu, takže se konečně vyplatí ho sdílet (§7).

---

## 1. Co domino je

Kámen má dvě půlky: vlevo **výsledek**, vpravo **zadání**. Kameny se skládají
za sebe tak, aby na sebe navazovaly — zadání jednoho a výsledek dalšího.

```
   ┌───────┬───────┐ ┌───────┬───────┐ ┌───────┬───────┐
   │  20   │ 7 · 8 │ │  56   │ 9 + 3 │ │  12   │ 4 · 5 │
   └───────┴───────┘ └───────┴───────┘ └───────┴───────┘
       ▲       └──────────▲   └───────────▲       │
       └──────────────────────────────────────────┘
                    řetěz se uzavírá
```

Kameny se vytisknou **zamíchané**. Správné pořadí zná jen učitelský list.

To, co dítě dělá, je pořád počítání: aby vědělo, co k `7 · 8` přiložit, musí
to spočítat. Rozdíl proti pexesu je v tom, že chyba se projeví až o kus dál —
řetěz nedojde. Proto je dobré, aby si ji dítě umělo najít samo, a proto §2.

---

## 2. Rozhodnutí: řetěz se uzavírá do kruhu

Dvě možnosti:

| | uzavřený kruh | otevřený řetěz |
|---|---|---|
| Kontrola | dítě skončí tam, kde začalo | pozná se jen tím, že zbyly kameny |
| Začátek | libovolný kámen | musí být označený, jinak dítě neví, kde začít |
| Označení | žádné | „START" na kameni — a ten se pak nedá zamíchat mezi ostatní |
| Ověření v kódu | jeden průchod cyklem | průchod plus kontrola konců |

**Doporučuju kruh.** Sebekontrola je celý smysl domina jako pomůcky: učitel
rozdá kameny a nemusí u toho stát. Otevřený řetěz to neumí — dítě, kterému
zbyly tři kameny, ví, že něco je špatně, ale ne kde; kdežto kruh, který se
nezavřel, ukazuje na místo, kde se to zlomilo.

Cena: kruh nemá začátek, takže dítě musí začít libovolným kamenem. To je
v pořádku, u domina se to tak dělá.

**Důsledek pro generátor:** kamenů je *n*, hodnot *n*, a spojení tvoří jednu
kružnici. Kámen *i* nese hodnotu *v(i)* a zadání s výsledkem *v(i+1)*, poslední
navazuje na první.

---

## 3. Jediné nové pravidlo o matematice: jeden cyklus, ne pět

Dvě podmínky, obě nutné:

1. **Hodnoty jsou navzájem různé.** Přesně to, co přidalo pexeso —
   `verifyDistinctValues` v `src/core/verify/index.ts` už existuje a použije se
   beze změny. Kdyby dvě zadání dávala `56`, dítě přiloží to druhé, bude mít
   pravdu a řetěz mu stejně nevyjde.
2. **Spojení tvoří jednu kružnici, ne několik.** Tohle je nové. Osm kamenů se
   totiž dá spojit i jako dva kroužky po čtyřech — každý kámen má souseda,
   každá hodnota je jednou, a přesto to není řešitelné zadání.

Druhá podmínka je **z konstrukce splněná** (hodnoty se zřetězí cyklicky, viz
§6), ale ověřit se musí stejně. Verifikace je poslední pojistka před tiskem,
ne ozdoba: kdyby se generátor někdy přepsal, musí to spadnout tady, ne
u dítěte na koberci. Přibude tedy kód selhání `broken-chain`.

Past, na kterou v malých ročnících dojde: **málo různých hodnot.** Třetí třída
jen se sčítáním nabízí omezený obor a osmnáct kamenů z něj nesestavíte. Řeší se
stejně jako u pexesa — ústupkem `fewer-tiles`, který učiteli řekne, že místo
osmnácti dostal dvanáct. Mlčky zkrátit řetěz nejde: počet kamenů je to, co
učitel zadal.

---

## 4. Kámen a papír

Tisknutelná plocha A4 je podle `core/document/cards.ts` **182 × 267 mm**, minus
14 mm na patičku s kontrolní úsečkou zbývá **182 × 253 mm**.

| Rozměr kamene | Sloupců | Řad | Na stránku | 12 kamenů |
|---|---|---|---|---|
| **84 × 42 mm** | 2 | 6 | **12** | jedna stránka |
| 90 × 45 mm | 2 | 5 | 10 | dvě stránky |
| 60 × 30 mm | 3 | 8 | 24 | jedna stránka, ale půlka 30 mm |

**Doporučuju 84 × 42 mm.** Dvanáct kamenů je pak přesně jeden list — učitel
zkopíruje jednu stránku na skupinu a je hotov. Půlka kamene je 42 × 42 mm,
což je méně než pexesová kartička (60 × 60 mm); na `(24 − 8) · 2` to stačí,
ale je to první věc, kterou má ukázat zkušební tisk.

Zbytek papírových pravidel se dědí a nemění:

- kameny se **dotýkají** a stříhá se skrz celý list (mřížka kreslí horní
  a levou linku, kámen pravou a spodní),
- na každé stránce je **kontrolní úsečka 100 mm** proti tisku se zmenšením,
- rub se netiskne.

**Nové je jen dělicí čára uprostřed kamene** — a ta nesmí svádět k tomu, aby ji
někdo přestřihl. Návrh: tenčí než střihové linky (0,15 mm proti 0,25 mm)
a nedotažená k okrajům, s mezerou 4 mm nahoře a dole. Střih vede přes celý
list od kraje ke kraji; čára, která se okraje nedotýká, se s ním neplete.

```
   ┌───────────────────┐
   │        ╷          │   ← dělicí čára tenká a useknutá
   │  20    ╷   7 · 8  │
   │        ╷          │
   └───────────────────┘
   ▲                   ▲
   └── střih vede tudy ┘
```

---

## 5. Zásah do `DocumentModel`

`CardFace` je dnes `{ text: string }` (`src/core/document/index.ts`). Kámen
potřebuje dvě půlky. Navrhuju rozšířit na unii:

```ts
export type CardFace =
  | { text: string }                       // pexeso: celá kartička
  | { left: string; right: string }        // domino: dvě půlky
```

Renderer podle tvaru vykreslí buď jeden text, nebo dva s dělicí čarou. Blok
`card-grid` zůstává jeden.

**Proč ne samostatný blok `domino-grid`:** stránkování, mřížka, rozměry,
střihové linky i kontrolní úsečka jsou totožné. Druhý blok by je celé zdvojil
a příště by se opravovaly dvakrát — přesně to, čemu registr aktivit
předcházel.

---

## 6. Nová aktivita `domino`

Podle kontraktu z `activities/contract.ts` je to nový adresář a jeden řádek
v registru. Žádný soubor mimo `activities/` se kvůli ní neotevírá — kromě
`core/model` (nové `ActivityId`) a `EditorPanel` (formulář).

```
src/activities/domino/
  index.ts      generování řetězu, kontrolní součet
  module.ts     záznam do registru, stav formuláře
  document.ts   stránky kamenů + učitelský list
  payload.ts    validace payloadu z `.sifra`
  domino.test.ts
```

Generování krok za krokem — stavěné podle pexesa, protože zásoby hodnot,
losování témat i ústupky jsou tam vyřešené:

1. Pro každé zaškrtnuté téma se připraví zásoba dosažitelných hodnot
   (`reachableValues`) a zamíchá se.
2. Losuje se téma podle vah a z jeho zásoby hodnota. Hodnota už použitá se
   přeskočí — hodnoty musí být různé.
3. Pro hodnotu se vyrobí úloha (`generateForValue`). Vznikne *n* dvojic
   „hodnota + zadání".
4. Hodnoty se zřetězí v pořadí, ve kterém vznikly: kámen *i* = `[v(i), zadání
   s výsledkem v(i+1)]`, poslední kámen uzavírá kruh na `v(0)`.
5. Kameny se **zamíchají už tady**, při generování, a uloží se do listu. Ne až
   v sazbě — kdyby míchala sazba, dvě volání by dala jiné pořadí a `.sifra`
   uložená loni by vytiskla jiné kameny.

Ostatní se jen doplní na místa, která na to čekají:

- `TILE_COUNT_LIMITS = { min: 6, max: 18, fallback: 12 }` v `core/constraints`.
  Šest kamenů je kruh, který dítě složí dřív, než se posadí; osmnáct je půldruhé
  stránky a dost hodnot na to, aby v malém ročníku nevyšly.
- `ActivityId` += `'domino'`, `DominoConfig` (tileCount, difficulty, taskMix,
  generatorMix, output), řádek v `activityModules`.
- V katalogu za pexesem: Šifra, Číselné řady, Pexeso, **Domino**, Bingo.
- Kontrolní součet zahrnuje pořadí kamenů, ne jen dvojice — zamíchání je
  součást toho, co učitel dostane na papíře.
- `parsePayload` je **nedůvěryhodný vstup** (soubor může přijít e-mailem):
  žádné `as` bez ověření, stejně jako u ostatních.

Učitelský list: instrukce ke stříhání a hraní plus **správné pořadí řetězu**
jako tabulka `Č. | Výsledek | Zadání`, aby šlo zkontrolovat i bez skládání.

---

## 7. Volba témat a konec kopírování

Domino dostane **stejnou sadu zaškrtávátek jako pexeso** — Počítání, Číselné
řady, Desetinná čísla, Procenta, Mocniny a odmocniny —, včetně toho, že
Počítání jde odškrtnout. Necháte-li zaškrtnuté jediné téma, bude z něj celé
domino. To je Karlův požadavek: *„nech tam třeba i tu možnost jen mocniny nebo
jen procenta."*

Váhy rovnoměrné, aspoň jedno téma musí zůstat — obojí přesně jako u pexesa.
Témata, která ročník neumí, se do konfigurace nedostanou, i kdyby zůstala
zaškrtnutá po přepnutí ročníku.

**Tady se poprvé vyplatí kód sdílet.** Losování tématu (`pickGenerator`) je
dnes dvakrát doslova stejné — v `cipher-grid/index.ts` a `pexeso/index.ts` —
a v pexesu u něj stojí poznámka „až přibude domino, bude důvod". Ten důvod
právě přišel. Vytáhne se to do `src/tasks/mix.ts`: losování tématu a sestavení
`generatorMix` ze zaškrtávátek.

> ⚠ **Extrakce nesmí změnit pořadí volání generátoru náhody.** Kdyby se změnilo,
> rozejdou se golden snapshoty a s nimi každá `.sifra`, kterou má někdo
> uloženou. Test je jednoduchý a nesmlouvavý: `tests/golden/` musí projít
> **bez přepsání** a `GENERATOR_VERSION` zůstat na 5. Když projít nechce, byla
> to špatná extrakce — ne zastaralý snapshot.

Stejná past jako u pexesa platí i tady: složené mocninné tvary (`12² + 7`,
`√81 + 5`) potřebují zaškrtnuté operace, holé (`7²`, `√81`) ne. Domino
„jen z mocnin" se tedy složí i učiteli, který má zapnuté samotné sčítání.

---

## 8. Rizika, která znám dopředu

1. **Rozměr kamene.** Půlka 42 × 42 mm je o třetinu menší než pexesová
   kartička. Jediný soudce je papír; když se to ukáže jako těsné, je záloha
   90 × 45 mm za cenu dvou stránek na dvanáct kamenů.
2. **Dělicí čára se přestřihne.** Ošetřeno tvarem (§4), ověří tisk.
3. **Málo hodnot v malém ročníku nebo u úzkého tématu.** Domino „jen
   z procent" v sedmé třídě má výrazně menší obor než počítání. Ústupek
   `fewer-tiles` to řekne nahlas; mlčky se nezkracuje.
4. **Řetěz se rozpadne na kroužky.** Konstrukcí vyloučeno, verifikací
   ověřeno — obojí, ne jedno z toho.
5. **Regrese ve starých aktivitách při extrakci sdíleného kódu.** Hlídají
   golden snapshoty, viz varování v §7.

---

## 9. Co se nemění

- Šifra, číselné řady ani pexeso se nedotknou. `GENERATOR_VERSION` zůstává **5**
  — nová aktivita nemění výstup těch starých.
- Starší `.sifra` soubory se čtou dál. Soubor s dominem otevřený ve starší
  verzi aplikace skončí hláškou „neznámá aktivita", ne pádem.
- Bingo, magické čtverce ani zbytek pořadí se sem netahají.

---

## 10. Postup práce

Po malých krocích, `npm run check` po každém, náhled v prohlížeči **dřív** než
hlášení hotovo — u pexesa byly testy zelené a teprve obrazovka ukázala, že se
mocniny na kartičky vůbec nedostávají.

| # | Krok | Hotovo, když |
|---|---|---|
| 1 | `CardFace` unie + renderer + dělicí čára | pexeso vypadá stejně jako dřív, kámen se dělí |
| 2 | Sdílený `tasks/mix.ts` (§7) | golden snapshoty projdou **bez přepsání** |
| 3 | Generátor řetězu `domino/index.ts` + testy | řetěz je jeden cyklus, hodnoty různé, ústupek hlásí |
| 4 | `broken-chain` ve verifikaci | podvržený rozpadlý řetěz spadne |
| 5 | `document.ts` — stránky kamenů, učitelský list | náhled sedí, kontrolní úsečka na každé stránce |
| 6 | `module.ts`, registr, `payload.ts`, `.sifra` | uložit a otevřít vrátí totéž |
| 7 | Formulář: počet kamenů + témata | „jen mocniny" opravdu dá jen mocniny |
| 8 | Golden test domina + **zkušební tisk** | kameny sedí na střih, řetěz jde složit |

---

## 11. Co potřebuju od Karla

Rozhodnuté doporučení je v §0; stačí říct, jestli s ním jdu dál. Kde bych
uvítal potvrzení nebo veto:

1. **Kruh místo otevřeného řetězu** (§2) — mění to, jak se domino hraje.
2. **Kámen 84 × 42 mm, dvanáct na stránku** (§4).
3. **Výchozí počet kamenů 12**, rozsah 6–18.

Neřekneš-li jinak, jdu podle §0 a §10.

---

## 12. Co se odchýlilo

Implementováno 18. 8. 2026. Návrh držel — všechna tři rozhodnutí z §11 zůstala
(kruh, kámen 84 × 42 mm, dvanáct kamenů výchozí). Odchylky jsou čtyři, žádná
zásadní:

1. **Směr zřetězení je závazný, ne libovolný.** §6 říkal „kámen *i* nese
   hodnotu *v(i)* a zadání s výsledkem *v(i+1)*". První verze to udělala
   obráceně (zadání *předchozí* úlohy) a dostala stejně platný kruh — jenže
   učitelská tabulka se pak četla naruby: výsledek v řádku byl zadáním v řádku
   *nad* ním. Poznalo se to až na obrazovce, ne v testech. Směr teď hlídá test
   „učitelská tabulka se čte shora dolů".

2. **Verifikace řetězu čte z papíru, ne z generátoru.** §3 mluvil jen o kódu
   selhání `broken-chain`. `verifyChain` dostává **vytištěné texty obou půlek**
   a hodnotu si spočítá znovu — jinak by ověřovala generátor místo toho, co
   dostane dítě do ruky. Potřebovalo to jeden údaj navíc: u zadání, které je
   číselná řada, se musí říct, že je to řada (`kind`), protože jako výraz se
   „864 875 886 897 ?" vyhodnotit nedá.

3. **Sdílení kódu vyšlo o kus širší, než §7 sliboval.** Kromě `pickGenerator`
   se do `tasks/mix.ts` přesunul i překlad zaškrtávátek na váhy
   (`generatorMixFromTopics`, `topicsFromGeneratorMix`, `usableTopics`) —
   pexeso i domino ho měly znak po znaku stejný, a to i v `EditorPanel`, kde
   z toho zmizela druhá sada zaškrtávátek. Golden snapshoty prošly **bez
   přepsání** a `GENERATOR_VERSION` zůstal na 5, což bylo u téhle extrakce
   jediné měřítko správnosti.

4. **Půlka kamene sází menším stupněm písma než pexesová kartička** (16 pt
   proti 20 pt). Nebylo to v návrhu, ale plyne z něj: půlka je 42 mm proti
   60 mm, takže při 20 pt se „(24 − 8) · 2" zalomí doprostřed výrazu. Nejdelší
   naměřená půlka má 17 znaků (řady a počítání v 8. třídě); mez v testu je 24.

**Co ještě není ověřené:** zkušební tisk. Rozměr kamene, dělicí čára i stupeň
písma jsou z obrazovky, a u kartiček je jediný soudce papír. Záloha při
těsném výsledku zůstává 90 × 45 mm za cenu dvou stránek na dvanáct kamenů.
