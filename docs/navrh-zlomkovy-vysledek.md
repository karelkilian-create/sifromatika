# Zlomek jako výsledek

Návrh k rozhodnutí, **23. 8. 2026**. Etapa 2 zlomků — dluh, který si etapa 1
pojmenovala sama v `docs/navrh-zlomky.md` §5. Podmínku, kterou si tam kladla
(„nezačínat dřív, než bude část z celku vytištěná a ověřená"), splnil zkušební
tisk 22. 8.: našel dvě vady, obě jsou opravené a nasazené.

## 1. O čem to je

Dnes umí Šifromatika zlomek jen v **zadání**: `3/4 z 80 = 60`. Výsledek je
vždycky celé číslo. Chybí druhá půlka látky sedmé třídy — zlomek na pravé
straně rovnítka:

```
1/2 + 1/4 = 3/4     5/6 − 1/3 = 1/2     2/5 + 1/5 = 3/5
```

Není to další generátor vedle stávajících. Je to **první úloha v projektu,
jejíž výsledek se nedá napsat jako číslo**, a proto se o ni opře model,
verifikace i sazba.

## 2. Kam to smí: jen hry, ne pracovní list

Zásadní omezení, které je lepší říct hned na začátku než v půlce práce:

| Aktivita | Dostane zlomkový výsledek? | Proč |
|---|---|---|
| šifra | **ne** | výsledek je kód políčka v mřížce, tedy celé číslo (`REQUIRE_WHOLE_RESULTS`) |
| list řad | ne | jeho úlohy jsou řady, ne výrazy |
| pexeso | ano | dítě páruje zadání s výsledkem |
| domino | ano | levá půlka kamene je hotová hodnota |
| bingo | ano | na kartě jsou výsledky, učitel je vyvolává |

Šifra o zlomky nepřijde — `3/4 z 80` v ní zůstává a je to ta forma, která do
mřížky patří. Tenhle krok je tedy o **třech aktivitách z pěti** a je dobré to
vědět, než se do něj investuje: nese míň, než by název napovídal.

## 3. Zásah do modelu: vytištěná podoba výsledku

`Task.value` (`src/core/model/index.ts:91`) je `number` a zůstane jím.
Přibude nepovinné pole:

```ts
export interface Task {
  …
  value: number
  /** Vytištěná podoba výsledku, liší-li se od `formatValue(value)`. */
  printedValue?: string
}
```

`value` dál nese číslo — na něm stojí párování, hledání v tabulce
a `usedValues`. `printedValue` je to, co uvidí dítě: `3/4` tam, kde by
`formatValue` napsalo `0,75`, a hlavně tam, kde by napsalo `0,33` a bylo by
to špatně.

**Proč řetězec, a ne dvojice čitatel/jmenovatel.** Sazba už zlomek z textu
umí: `MathText` (`src/render/screen/math.tsx:47`) hledá vzor `(\d+)/(\d+)`
a udělá z něj čitatele nad jmenovatelem — a **všechny tři hry text kartičky
posílají přes `MathText`** (`render/screen/index.tsx:164`, `:173`, `:196`).
Zlomkový výsledek se tedy vysází sám, bez jediné změny v rendereru.
Strukturovaná dvojice by musela projít týmiž místy a nic navíc by nepřinesla —
verifikace čísla od generátoru stejně nesmí použít, musí si je přečíst
z vytištěného textu.

⚠ **Neplést s tím, co jsem sliboval včera.** Převodům jednotek (`5 m = 500 cm`)
pomůže tohle pole taky, ale jen jako trubka od generátoru na papír. Práci
kolem verifikace, kterou popisuje §4, s nimi nesdílí — ta je celá o zlomcích.

## 4. Verifikace: co se změní

Nejcitlivější místo. Dnešní kontrola úlohy (`verifySlot`) porovná číslo
spočítané z vytištěného zadání s číslem, které tvrdí generátor, a mimo jiné
požaduje, aby šlo vytisknout na dvě desetinná místa
(`isPrintable`, `src/core/verify/index.ts:501`). `1/3` tím propadne — a to
pravidlo je správné, jen položené o krok vedle. Ve skutečnosti se totiž ptá:
**dá se výsledek vytisknout tak, aby se dal přečíst zpátky beze ztráty?**
Pro `0,33` je odpověď ne. Pro `1/3` napsané jako zlomek ano.

Nová podoba kontroly, když úloha nese `printedValue`:

1. **Přečíst vytištěnou podobu znovu, od nuly.** `evaluateExpression('3/4')`
   dá 0,75 — lomítko tokenizer zná jako dělení a to je přesně hodnota zlomku.
   Nové čtení se pro tohle psát nemusí.
2. **Musí souhlasit s přepočtem zadání.** `1/2 + 1/4` dá 0,75 taky. Rozejít
   se ty dvě cesty nesmí; to je celá kontrola.
3. **Musí to být zlomek v základním tvaru.** `6/8` je vada, i když má správnou
   hodnotu — na kartičce má stát `3/4`. Nový kód `unreduced-fraction`.
   Krácení si verifikace spočítá sama (gcd), takže generátoru nic nevěří.
4. **Kontroly desetinných míst se přeskočí** — `isPrintable` i `fitsPlaces`
   se ptají na desetinný zápis, který se tady netiskne.
5. **List, který zlomkový výsledek nedovoluje, ho musí odmítnout.**
   `TaskRules` (`model:407`) dostane druhé pole:
   `fractionResults: boolean` — `false` v `REQUIRE_WHOLE_RESULTS`,
   `true` v `ALLOW_DECIMAL_RESULTS`. Výslovně, ne odvozeně z `maxResultPlaces`:
   zlomek není „víc desetinných míst", je to jiný druh zápisu, a modul se
   drží pravidla, že se druh úlohy rozlišuje deklarací, ne tvarem textu
   (viz komentář u `SheetSlot.kind`).

**Jednoznačnost párování zůstane na čísle, ne na zápisu.**
`verifyDistinctValues` (`verify:569`) dnes klíčuje vytištěnou podobou, protože
„mají stejný výsledek" znamenalo „vypadají na papíře stejně". Od téhle změny
to platit přestává: `1/4 + 1/4` a `0,25 + 0,25` vypadají jinak a jsou to
tatáž polovina. Kdyby obojí leželo na stole, dítě by spárovalo správně
a hra by mu stejně nevyšla. Klíčem proto zůstane číslo.

⚠ Prakticky tomu brání už generování (`usedValues`,
`activities/pexeso/index.ts:170`), ale verifikace je síť na chyby generátoru,
ne jeho ozvěna — musí to hlídat sama.

**Domino** (`verifyChain`) potřebuje jedinou změnu: `readPrintedValue` čte
levou půlku přes `Number()`, a `3/4` tím neprojde. Nahradí ho
`evaluateExpression`. Klíčem řetězu zůstává `formatValue(hodnota)`, a to
i pro zlomky — dva různé zlomky se jmenovateli z dnešního seznamu se totiž
liší nejmíň o 1/40 = 0,025, takže je zaokrouhlení na dvě místa nikdy neslije
do jednoho klíče. (Nejtěsnější dvojice jsou `1/10` a `1/8`, případně `3/8`
a `2/5`; obě dělí přesně 1/40.)

**Bingo** nepotřebuje nic: `verifyBingoCards` porovnává řetězce z karty
a z vyvolávacího seznamu, a oba budou nově `printedValue`.

## 5. Co se bude generovat

Zůstává to v `src/tasks/fractions/`, pod týmž zaškrtávátkem „Zlomky". Druhé
zaškrtávátko by učitele nutilo rozlišovat dvě věci, které jsou pro něj jedno
téma.

Dva nové tvary vedle dnešních dvou:

| Tvar | Příklad | Ročník |
|---|---|---|
| `same-denominator` | `2/5 + 1/5`, `5/6 − 1/3`… | 6. látka, u nás od 7. |
| `related-denominator` | `1/2 + 1/4`, `3/4 − 1/8` | 7. |

`related-denominator` znamená, že jeden jmenovatel je násobkem druhého —
společný jmenovatel se najde bez hledání nejmenšího společného násobku.
Násobení zlomků (`1/2 · 1/3`) a smíšená čísla si nechávám na potom; jsou to
další tvary, ne další model, takže se dají přidat kdykoli.

Pravidla pro výsledek:

- **pravý zlomek** — výsledek menší než 1. Bez toho vzniká `5/4`, a to je
  nepravý zlomek nebo smíšené číslo, tedy látka, kterou tenhle krok nedělá;
- **v základním tvaru** — na kartičce je `1/2`, nikdy `4/8`. Že dítě, kterému
  vyšlo `4/8`, musí zkrátit, je záměr: krácení je půlka té látky. Dvě kartičky
  s touž hodnotou v různých tvarech by navíc rozbily párování;
- **nikdy celé číslo** — `1/4 + 3/4 = 1` se do tohohle tvaru nepustí. Nic
  o zlomcích neukáže a hodnota 1 koliduje se vším ostatním na listu. (Je to
  týž důvod, pro který §7.1 předchozího návrhu tenhle tvar odložila.)
- **jmenovatelé z dnešního seznamu** (2, 3, 4, 5, 6, 8, 10) — beze změny.

## 6. Sazba: riziko je šířka, ne výška

Zlomek v kartičce je vyzkoušený — etapa 1 ho vytiskla v zadání a `1d3082c`
doladil mezeru kolem něj. Nové jsou dvě věci:

1. **Zlomek jako celý obsah kartičky.** `3/4` samo na pexesové kartičce nebo
   na levé půlce kamene. Menší než dnešní `9/10 z 340`, tedy bez rizika.
2. **Dva zlomky v jednom zadání.** `3/4 − 1/8` je na půlce dominového kamene
   nejširší útvar, jaký tam kdy stál: dvě dvouřádková čísla a operátor.
   Půlka kamene je flex kontejner — týž, který ořezával krajní mezery
   (viz `math.tsx:33`) — a **náhled přetečení nemusí ukázat**, protože
   v prohlížeči se řádek roztáhne, kdežto kámen má rozměr napevno.

Zkušební tisk domina proto patří do definice hotového. Pojistka, kdyby to
nevyšlo: `related-denominator` nechat jen v pexesu a bingu, kde je kartička
celá pro jedno zadání.

## 7. Cena

Dotčená místa, žádné z nich velké:

- `core/model` — `Task.printedValue`, `TaskRules.fractionResults`, dva kódy
  chyb (`unreduced-fraction`, případně `fraction-result-not-allowed`);
- `core/verify` — větev pro vytištěnou podobu ve `verifySlot`, `SheetSlot`
  o pole bohatší, `readPrintedValue` přes `evaluateExpression`, klíč
  v `verifyDistinctValues`;
- `tasks/fractions` — dva tvary a `reachableValues`, které nově vrací
  i hodnoty jako 0,75 a 0,333…;
- tři aktivity, jeden řádek každá: `pexeso/index.ts:220`,
  `domino/index.ts:232`, `bingo/index.ts:221` — všude `formatValue(task.value)`
  → `task.printedValue ?? formatValue(task.value)`;
- render **nic**;
- editor **nic** (zaškrtávátko je jedno a už existuje).

## 8. `GENERATOR_VERSION` 9

Tentokrát opravdu. `SHAPES` v generátoru zlomků se losuje přes `rng.pick`,
takže delší seznam změní výběr i pro dosavadní seedy. Znamená to přepis
golden snímků a hlášku o neshodě verze u dosud sdílených odkazů.

⚠ **Filtrovat tvary podle `rules` je potřeba udělat dřív než losování.**
Vedlejším efektem je, že šifra dostane k výběru tytéž dva tvary jako dnes,
a její listy by se tedy změnit neměly — včetně golden snímku „šifra se
zlomky, 7. ročník" (`tests/golden/sheet.test.ts:260`). Je to zároveň dobrá
zkouška: kdyby se ten snímek přepsal, znamená to, že se filtruje pozdě.

## 9. Zámek

- testy generátoru: výsledek je pravý zlomek v základním tvaru, nikdy celé
  číslo, jmenovatel ze seznamu, hodnota souhlasí s textem;
- test verifikace: `1/2 + 1/4` s vytištěným `3/4` projde, s `6/8` spadne na
  `unreduced-fraction`, s `0,75` projde taky (je to jiný, legitimní zápis),
  a na listu se šifrou spadne;
- test, že dvě úlohy s touž hodnotou v různých zápisech (`1/2` a `0,5`)
  neprojdou párovací kontrolou;
- golden snímek **pexesa se zlomkovými výsledky, 7. ročník** — a poučení
  z 21. 8. platí dál: snímek, který téma neobsahuje, změnu toho tématu
  neuhlídá;
- `npm run check` po každém kroku;
- **zkušební tisk domina a pexesa** (§6) — bez něj to není hotové.

## 10. Co navrhuju

1. **Udělat to,** i když to nese jen tři aktivity z pěti: bez zlomkového
   výsledku umí Šifromatika ze sedmé třídy jen půlku tématu.
2. **`printedValue` jako řetězec** v `Task`, `value` beze změny. Sazba je
   tím hotová a verifikace si stejně musí číst z papíru.
3. **Pravidlo listu výslovně** (`TaskRules.fractionResults`), ne odvozené
   z počtu desetinných míst.
4. **Párování klíčovat číslem**, ne vytištěnou podobou — `1/2` a `0,5` je
   táž hodnota a na jednom stole být nesmí.
5. **Dva tvary** (stejný jmenovatel, násobný jmenovatel), výsledek pravý
   zlomek v základním tvaru. Násobení zlomků a smíšená čísla později.
6. **Zkušební tisk domina je součást kroku**, ne kontrola na konci.

Otevřená otázka k rozhodnutí: **má `4/8` chodit do koše, nebo se má krátit?**
Návrh říká krátit, tedy vytisknout `1/2` a nechat na dítěti, aby na to přišlo.
Druhá možnost je losovat jen dvojice, u kterých se krátit nemusí — bezpečnější
pro slabšího počtáře, ale zahazuje půlku látky.

## 11. Co se odchýlilo od návrhu

Provedeno **23. 8. 2026**, `GENERATOR_VERSION` 9, 576 testů.

**Dvě id generátoru místo jednoho.** Návrh počítal s tím, že oba tvary
zůstanou pod jedním `fractions`, protože pro učitele jsou jedno téma. Ukázalo
se to jako vada hned na prvním golden snímku: ve dvanácti kartičkách byl
zlomkový výsledek **nula až jednou**. Zásoba cílů části z celku má pro sedmý
ročník přes šest set hodnot, kdežto pravých zlomků se jmenovateli do deseti
existuje devatenáct — a v jednom pytli o poměru rozhoduje tahle šířka, ne
záměr. Je to táž vada, kterou u témat opravila `GENERATOR_VERSION` 5, jen
o patro níž, a řeší se týmž způsobem: `fraction-sums` má vlastní id, vlastní
zásobu a vlastní váhu. Zaškrtávátko zůstalo jedno, překlad na dvě id dělá
`generatorMixFromTopics`. Naměřeno po opravě: **5,4 zlomkových výsledků
z dvanácti** (dvacet seedů).

Šifra tudy nechodí — svůj mix si staví sama v `cipher-grid/module.ts` — takže
se jí to nedotklo ani omylem.

**Vytištěná podoba musí být zlomek, nic jiného.** §9 slibovala, že projde
i `0,75`. Neprochází: `verifyPrintedValue` přijme jen tvar `n/d`. Desetinný
zápis výsledku umí `formatValue` a pole `printedValue` by pro něj bylo druhá
cesta k témuž — a druhá cesta znamená dvě místa, kde se dá lišit.

**Operandy se stejným jmenovatelem NEJSOU v základním tvaru.** Na kartičce
proto stojí i `6/8 − 2/8 = 1/2`. Vyžadovat základní tvar i od operandů by tvar
skoro vyprázdnilo (u šestin by zbyly `1/6` a `5/6`, a ty dají jedničku, která
je vyloučená), a u společného jmenovatele se tak píše i v učebnici. Základní
tvar se vyžaduje od výsledku, kde na něm stojí párování. U násobného
jmenovatele (`1/2 + 1/8`) základní tvar operandů vyžadovaný je.

**Navíc opravená vada, která s tímhle krokem nesouvisí.** Učitelská tabulka
pexesa a binga tiskla výsledek přes `String(task.value)`, takže od uvolnění
desetinných výsledků (21. 8.) stálo v řešení `627.2` s tečkou místo `627,2`.
Kartičky byly správně, tabulka ne — a nikdo si toho nevšiml, protože se
řešení čte málokdy. Opravené týmž `printedResult`, kterým se tiskne zlomek.

**Zkušební tisk proběhl** (headless Chrome přes sdílecí odkaz, viz
`docs/` poznámky o tisku do PDF): domino, pexeso i bingo, sedmý ročník, jen
zlomky. Riziko z §6 se nepotvrdilo — `1/3 − 1/6` se na půlku kamene vejde
s rezervou a v bingo políčku je zlomek čitelný. Papírem to ještě projít má.
