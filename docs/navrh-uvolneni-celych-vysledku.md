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
