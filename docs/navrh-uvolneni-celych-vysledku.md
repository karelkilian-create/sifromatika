# Uvolnění celých výsledků ve hrách

Krok 2 z pořadí dohodnutého 18. 8. Předchází zlomkům i převodům jednotek,
protože obojí narazí na totéž místo.

## 1. Co se mění

Dnes platí plošně: **výsledek úlohy musí být celé číslo**. Je to požadavek
šifry — výsledek je kód políčka v mřížce — ale vynucuje se u všech aktivit.
Ve hrách žádný takový důvod není. V pexesu proto vyjde `3,5 · 4 = 14`,
ale nikdy `= 2,5`.

Cíl: udělat z toho parametr. Šifra si celé výsledky vyžádá výslovně, hry ne.

## 2. Průzkum: pravidlo drží tři místa, ne jedno

V poznámkách bylo, že podmínku vynucuje jediné místo. To platí jen pro tu
_explicitní_ kontrolu. Ve skutečnosti stojí na třech nezávislých patrech
a povolit se musí všechna, jinak se nic nestane.

**a) Explicitní kontrola.** `verifySlot` v `src/core/verify/index.ts:485`
hlásí `non-integer-result`. Tohle je to místo z poznámek.

**b) Architektura generování.** Rozhraní `TaskGenerator` je celé postavené na
celých číslech:

```ts
reachableValues(profile, mix): Set<number>
generateForValue(target, ctx, rng): Task | null
```

Aktivity si z `reachableValues` vylosují cílové hodnoty a nechají k nim
vyrobit úlohu. Každý generátor přitom staví ten obor cyklem
`for (let target = 1; target <= profile.numberRange.max; target++)` —
viz `src/tasks/decimal/index.ts:196`. **Do zásoby se necelé číslo nedostane,
ani kdyby verifikace mlčela.**

**c) Sazba a porovnávání hodnot.**

- `formatValue` je třikrát zkopírovaný (`pexeso/index.ts:230`,
  `domino/index.ts:263`, `bingo/index.ts:274`) a je to v jádru `String(value)`.
  Na `0,1 + 0,2` by vytiskl `0,30000000000000004`.
- `verifyDistinctValues` klíčuje mapu **číslem**. Dvě hodnoty lišící se v
  posledním bitu projdou jako různé a na papíře budou stejné.
- `verifyChain` hledá následníka kamene přes `byLeft.get(computed)`, což je
  přesné vyhledání `number` v `Map`. U celých čísel spolehlivé, u desetinných
  ne: `0.30000000000000004` klíč `0.3` netrefí a domino ohlásí přetržený
  řetěz, který přetržený není. **V poznámkách bylo, že domino a bingo jsou
  v pořádku — pro bingo to platí (porovnává rovnou řetězce), pro domino ne.**

## 3. Návrh

### 3.1 Nový modul `src/core/number`

Jedno místo, které rozhoduje, jak číslo vypadá na papíře.

```ts
export const MAX_DECIMAL_PLACES = 2
export function formatValue(value: number): string   // 2.5 → „2,5", 3 → „3"
export function isPrintable(value: number): boolean  // vejde se do dvou míst?
```

Zaokrouhluje se **při sazbě i při generování**, ne až na papíře, a `formatValue`
je jediná cesta od čísla k textu. Dvě desetinná místa nejsou libovolná volba:
je to jednotka, ve které už dnes počítá generátor desetinných čísel (`CENTS`),
a pokryje i `45 min = 0,75 h` z debaty o převodech.

### 3.2 Hodnota, která se nedá vytisknout, je vada listu

`isPrintable` má protějšek ve verifikaci: nový kód `unprintable-value`.
Vyjde-li `1 : 3`, list **spadne a vygeneruje se znovu**, místo aby se tiše
vytisklo `0,33`. Je to stejná úvaha jako u zbytku verifikace — poslední
pojistka před tiskem, ne kosmetika. Zaokrouhlené třetiny by dítě sečetlo
a nedopočítalo se.

### 3.3 Pravidla jako parametr

```ts
export interface TaskRules {
  /** Musí být výsledek celé číslo? Šifra ano (kód políčka), hry ne. */
  wholeResults: boolean
}
```

`verifyTasks(slots, rules?)` — **výchozí hodnota je přísná**. Zapomenuté
volací místo tak zůstane na dnešním chování; uvolnit se musí vědomě. Šifra
`verifySheet` si přísnost drží napevno, protože pro ni to není volba.

### 3.4 Porovnávat vytištěnou podobu, ne čísla

`verifyDistinctValues` i `verifyChain` přejdou na klíč `formatValue(value)`.
Otázka, kterou obě kontroly ve skutečnosti kladou, zní „vypadají na papíře
stejně?" — a to je řetězec, ne číslo.

## 4. Co tenhle krok neudělá

**Nezmění výstup ani jednoho listu.** Všechny cílové hodnoty jsou dnes celá
čísla, takže nové `formatValue` vrátí tentýž text, klíče podle vytištěné
podoby jsou 1 : 1 s čísly a uvolněné pravidlo nemá co pustit navíc.

Z toho plyne: **golden snapshoty se nepřepisují a `GENERATOR_VERSION` zůstává
na 5.** Kdyby se snapshot hnul, je to chyba v tomhle kroku, ne očekávaný
důsledek.

Desetinné výsledky ve hrách se tím tedy ještě neobjeví — na to musí přibýt
tvary v generátoru `decimal`, které umí mířit na necelý cíl, a `reachableValues`
musí takový obor vůbec umět vrátit. To je samostatný krok, který snapshoty
rozbije a `GENERATOR_VERSION` posune. **A je v něm rozhodnutí pro Karla:**
které necelé výsledky mají ve hrách vůbec smysl (`2,5` ano; `2,25`?
`0,75` u převodů?) a jestli se to má dát ve formuláři vypnout.

## 5. Postup

1. `src/core/number` + testy sazby a `isPrintable`.
2. `TaskRules` ve verifikaci, `unprintable-value` do modelu, přísné výchozí.
3. Tři kopie `formatValue` pryč, aktivity berou sdílenou.
4. `verifyDistinctValues` a `verifyChain` na vytištěnou podobu.
5. `npm run check` — 460 testů zelených, snapshoty **beze změny**.

## 6. Co se odchýlilo

**Přibyl třetí zámek, se kterým návrh nepočítal.** `verifyChain` hledá
následníka kamene přes `byLeft.get(computed)`, což je přesné vyhledání
`number` v `Map`. Návrh v §2c tvrdil, že u domina jde jen o čtení hodnoty
z papíru; ve skutečnosti by `0,1 + 0,2` (tedy 0.30000000000000004) netrefilo
klíč `0.3` a domino by ohlásilo přetržený řetěz, který přetržený není. Klíčem
je teď vytištěná podoba, stejně jako u `verifyDistinctValues`.

**Pojmenování.** Místo jednoho parametru vznikly dvě pojmenované konstanty,
`REQUIRE_WHOLE_RESULTS` a `ALLOW_DECIMAL_RESULTS`. Na volacím místě je pak
vidět rozhodnutí, ne holé `false`. Názvy schválně nemluví o šifře ani o hrách:
`core/verify` o aktivitách neví a vědět nemá.

**Sjednocení `formatValue` nebylo jen odstranění kopií.** Původní tři kopie
byly `String(value)` s výměnou tečky za čárku. Sdílená verze zaokrouhluje na
tisknutelnou přesnost a má protějšek `isPrintable`, díky kterému je
nevytisknutelná hodnota vada listu (`unprintable-value`), ne tiché `0,33`.

**Potvrdilo se, že krok nemění výstup.** Golden snapshoty prošly bez
přepsání a `GENERATOR_VERSION` zůstal na 5, přesně jak §4 předpovídala.

---

# Krok 3: hry desetinný výsledek opravdu dostanou (21. 8. 2026)

Krok 2 pravidlo uvolnil, ale nikde se to neprojevilo: `reachableValues`
stavěla obor cyklem přes celá čísla, takže hry sice směly dostat `2,5`,
ale nikdo jim ho nenabídl. Tohle je ta druhá půlka.

## 1. Rozhodnutí, které bylo potřeba udělat dřív než kód

Karel rozhodl **21. 8. 2026**:

- **Nanejvýš jedno desetinné místo.** `2,5` ano, `2,25` ne — i v ročnících,
  kde zadání smí mít místa dvě. Na kartičce se výsledek páruje očima přes celý
  stůl a `2,5` se přečte na jeden pohled.
- **Žádné nové ovládání ve formuláři.** Kdo desetinné výsledky nechce,
  odškrtne stávající „Desetinná čísla". Druhý přepínač na totéž téma je přesně
  ta volba, u které učitel nepozná, čím se liší od první.

Padla přitom správná námitka: **π = 3,14 se učí vždy na dvě desetinná místa.**
Obvod se do jednoho místa vejde (`2 · 3,14 · 5 = 31,4`), obsah často ne
(`3,14 · 7² = 153,86`). Proto limit není konstanta, ale položka `TaskRules`:
až přijde kruh v 8. ročníku, zvedne se na 2 buď plošně, nebo jen pro to téma.
A protože generátory staví úlohu **pozpátku od výsledku**, limit téma nezabíjí,
jen v něm vybírá — místo poloměru 7 nabídne 5 nebo 10.

## 2. Co se změnilo

1. **`TaskRules` se stěhuje z `core/verify` do `core/model`** a `wholeResults:
   boolean` je nově `maxResultPlaces: 0 | 1 | 2`. Důvod stěhování je tvrdý:
   na pravidlo se ptá i vrstva úloh, a `tasks` do `verify` sahat nesmí (byl by
   to cyklus). `REQUIRE_WHOLE_RESULTS` = 0, `ALLOW_DECIMAL_RESULTS` = 1.
2. **`GenContext.rules` a třetí parametr `reachableValues`.** Povinné, ne
   volitelné s výchozí hodnotou: hned při překladu se tím našlo druhé,
   zapomenuté místo v šifře (`relaxed` kontext pro poslední pokus).
3. **Desetinný generátor nabízí desetinné cíle.** Krok zásoby je
   `100 / 10^maxResultPlaces` setin, takže šifra dostane tutéž zásobu jako
   dřív a hry desetkrát větší. Cíl se všude převádí přes `toCents` —
   `2,3 * 100` dá v plovoucí čárce 229.99999999999997 a `Number.isInteger`
   na tom selže. Dokud byly cíle celé, nemohlo se to stát.
4. **Nový kód selhání `result-too-precise`.** Verifikace je síť na chyby
   generátoru, ne jeho ozvěna, takže limit hlídá i ona. Pořadí kontrol je
   `unprintable-value` → `result-too-precise`: na `1 : 3` sedí obojí, ale
   první pojmenuje horší vadu.
5. **Řešení se píše `formatValue`, ne `String`.** `solutionSteps` skládaly
   text jako `${target}`; u celého výsledku to bylo totéž, u desetinného by
   na list napsalo `2.5` s tečkou.
6. **Nápověda u her to říká** — jedna věta, že tady smí desetinné číslo i
   vyjít, na rozdíl od šifry.

## 3. Co se odchýlilo

**Zásoba je záměrně nevyvážená.** Na každé celé číslo připadá devět desetin,
takže z pexesa na desetinná čísla vyjdou převážně desetinné výsledky. Je to
v pořádku — téma si učitel zaškrtl a hra na jedno téma je legitimní zadání —
ale je to rozhodnutí, ne náhoda, a patří do generátoru. Kdyby se poměr měl
řídit, patří to tam taky: aktivity už jednou dostaly lekci, že poměr témat
nesmí určovat velikost zásoby (`GENERATOR_VERSION` 5).

**`GENERATOR_VERSION` je 6 a golden snapshoty se přepsaly.** Krok 2 výstup
neměnil, tenhle ano — a protože se ze semínka odvozuje seed, posunuly se
i listy, kterých se desetinná čísla netýkají. Každý dosavadní odkaz a soubor
`.sifra` proto ohlásí neshodu kontrolního součtu. Přesně na to ta hláška je.

**Zůstává otevřené: obor čísel her.** Páté třídě vyjde `489,9 + 344,2 = 834,1`.
Není to vada tohohle kroku — hry berou cíle z celého `numberRange`, takže
`489 + 344` tam bylo i předtím — ale s desetinnou čárkou je na kartičce vidět,
že to není počítání z hlavy. Je to samostatné rozhodnutí o oboru čísel ve
hrách a mění výstup všech aktivit, takže do tohohle kroku nepatří.
