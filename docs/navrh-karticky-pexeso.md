# Návrh: kartičková sazba a pexeso

> **Co je tento dokument.** Návrh kroku 6 z pořadí v
> [`SIFROMATIKA-EVALUATION.md`](./SIFROMATIKA-EVALUATION.md) §G — kartičkové sazby (§C.3)
> a pexesa jako jejího prvního uživatele.
>
> **Nic z toho není implementováno.** Stejně jako u registru aktivit a procent je
> první fáze návrh k prohlédnutí; kód se píše až po schválení.

---

## 0. Verdikt na jednu obrazovku

Pexeso samo je levné. **Draho stojí to, na čem stojí: přesnost tisku v milimetrech.**
Kartička, která nesedí na střih, je horší než žádná kartička — učitel u kopírky zjistí,
že nůžkami nic nezachrání, a podruhé už Šifromatiku nespustí.

Proto tenhle návrh věnuje víc místa papíru než matematice. Matematická část je totiž
skoro hotová: pexeso nepřidává jediné nové pravidlo o počítání, jen jednu novou kontrolu.

Tři věci k rozhodnutí, všechny níž rozepsané:

1. **Kartičky se dotýkají a stříhá se skrz** — ne samostatné rámečky se značkami střihu.
2. **Na každé stránce kartiček je kontrolní úsečka 100 mm.** Tisk se zmenšením se tím
   změní z tiché vady na viditelnou.
3. **Rub kartiček zatím ne.** Je to otázka na zkušební tisk, ne na návrh.

---

## 1. Co pexeso je a co v něm musí sedět

Kartičky ve dvojicích: na jedné zadání, na druhé výsledek. Dítě otáčí dvě a hledá,
co k sobě patří.

```
┌────────────┐  ┌────────────┐
│            │  │            │
│   7 · 8    │  │     56     │
│            │  │            │
└────────────┘  └────────────┘
```

**Jediné nové pravidlo o matematice v celém kroku:** hodnoty musí být navzájem různé.
Dnešní generátory hlídají jen to, aby se neopakoval *výraz* (`usedExpressions` v
`GenContext`). U šifry je to správně — dvě různá zadání smí ukazovat na totéž políčko.
U pexesa je to vada: kdyby na listu bylo `7 · 8` i `28 + 28`, dítě spáruje `56` s tím
druhým, bude mít pravdu a hra mu nevyjde.

To je i důvod, proč se pexeso dělá **před** dominem: kontrola „hodnoty jsou různé" je
pár řádků, kdežto u domina přibude kontrola sestavitelnosti řetězce.

### Kartičky vypadají všechny stejně

Zadání a výsledek se **nesmí** dát rozeznat podle vzhledu — žádná jiná barva rámečku,
žádný jiný font. Kdyby šly rozlišit, dítě by nikdy neotočilo dvě zadání a hra by se
scvrkla na půlku. Poznat, že `7 · 8` a `56` patří k sobě, má stát výpočet, ne pohled.

---

## 2. Kartičková sazba — primitivum

### 2.1 Rozhodnutí: kartičky se dotýkají

Dvě možnosti, jak sázet mřížku kartiček:

| | Samostatné kartičky se značkami střihu | **Kartičky se dotýkají, mezi nimi vlasová linka** |
|---|---|---|
| Střih | 24 rámečků = 24× obstřihnout dokola | 5 rovných řezů přes celý list |
| Řezačka | nepoužitelná | ideální |
| Odchylka tisku | značky přestanou sedět, ale je to vidět | linka se posune celá, řez pořád sedí |
| Nůžky ve třídě | pomalé | rychlé |

**Doporučuji druhou variantu.** Rozhoduje o tom učitel u řezačky, ne estetika náhledu:
pět rovných řezů přes list je práce na minutu, obstřihávání dvaceti čtyř rámečků na
čtvrt hodiny. Navíc je odolnější — když tiskárna zmenší o dvě procenta, souvislá mřížka
se zmenší celá a řez podle linky pořád vede mezi kartičkami.

Značky střihu zůstanou jen **v rozích celé mřížky**, aby bylo vidět, kde list začíná
a končí.

### 2.2 Rozvržení na A4

`.sheet` má dnes padding 15 mm nahoře a dole, 14 mm po stranách. Zbývá **182 × 267 mm**.
Na patičku s kontrolní úsečkou padne 8 mm, takže na kartičky zbývá **182 × 259 mm**.

Při kartičce **60 × 60 mm**:

```
sloupce: 182 / 60 → 3   (využito 180 mm, zbývá 2 mm)
řádky:   259 / 60 → 4   (využito 240 mm, zbývá 19 mm)
         ────────────
         12 kartiček na stránku
```

Čtverec schválně: pexeso se hraje lícem dolů a obdélník by šlo otáčet dvěma způsoby,
což dětem přidává práci, která s matematikou nesouvisí. 60 mm je zároveň rozměr, který
se dobře drží v dětské ruce a unese `(24 − 8) · 2` v čitelné velikosti písma.

**Výchozí počet dvojic: 12** → 24 kartiček → 2 stránky kartiček + 1 stránka pro učitele.
Rozsah **6–18** dvojic (`PAIR_COUNT_LIMITS`). Ne `TASK_COUNT_LIMITS` (4–30): 4 dvojice
jsou triviální hra a 30 dvojic je 60 kartiček, které jedna dvojice dětí nesloží
do konce hodiny.

### 2.3 Kontrolní úsečka — tichá vada se změní na viditelnou

⚠ Riziko zapsané v §C.3: **milimetrová přesnost tisku se mezi prohlížeči liší.** Chrome,
Firefox a Safari zacházejí s `@page margin` různě a učitel má navíc v tiskovém dialogu
měřítko, které bývá přednastavené na „Přizpůsobit stránce".

Zabránit tomu z kódu nejde. Jde ale udělat to, co projekt dělá jinde — u relaxačního
logu i u kontrolního součtu: **z tiché vady udělat hlášku.**

V patičce každé stránky s kartičkami bude úsečka dlouhá přesně 100 mm a k ní popisek:

```
├──────────────────────────────────────────────┤
Kontrolní úsečka 100 mm. Pokud po vytištění neměří 100 mm,
tiskne se se zmenšením — v dialogu nastav měřítko 100 %.
```

Učitel přiloží pravítko dřív, než začne stříhat. Stojí to 8 mm na stránce a je to
jediná obrana, kterou proti tomuhle riziku máme.

### 2.4 Rub kartiček — zatím ne

§C.3 zmiňuje „volitelný rub". Nedělal bych ho, a to ze dvou důvodů:

- **Oboustranný tisk se nezarovná.** Odchylka lícu proti rubu bývá 1–2 mm i na dobré
  tiskárně; při kartičce 60 mm to znamená, že vzorek na rubu přeteče na sousední
  kartičku. Vyrobili bychom druhý zdroj přesně toho problému, který řešíme v 2.3.
- **Nevíme, jestli je potřeba.** Skutečná otázka zní, jestli na kancelářském papíře 80 g
  prosvítá tisk natolik, že dítě pozná kartičku odspodu.

**To je otázka na zkušební tisk, ne na návrh.** Vytiskneme list, otočíme ho a podíváme se.
Když prosvítá, řešení je levnější než rub: doporučit v rozhraní tisk na tvrdší papír.
Rub se přidá jen tehdy, když se ukáže, že to nestačí.

---

## 3. Zásah do `DocumentModel`

Model je z minulého kroku hotový a tenhle krok je jeho první zkouška: **kolik bloků
musí přibýt, aby se do něj vešla úplně jiná aktivita?** Odpověď je dva.

```ts
/** Obsah jedné kartičky. Dnes jeden řádek; domino si přidá druhý. */
export interface CardFace {
  text: string
}

| { kind: 'card-grid'
    cards: readonly CardFace[]
    columns: number
    cardWidthMm: number
    cardHeightMm: number }

/** Kontrolní úsečka na ověření měřítka tisku. */
| { kind: 'print-scale-check'; lengthMm: number }
```

`card-grid` je jediné místo v modelu, kde jsou milimetry — a je to v pořádku. U kartičky
je fyzický rozměr *obsah*, ne vzhled: 60 mm není estetická volba, ale to, co dítě dostane
do ruky. Renderer do PDF bude potřebovat přesně totéž číslo.

### Stránkování patří aktivitě, ne rendereru

Kartičky se **nesmí** předat rendereru jako jeden blok, který si je sám rozláme na stránky.
Kdyby to šlo, vznikl by dokument, jehož stránky nesouhlasí s papírem — přesně to, čemu
minulý krok zabránil tím, že zalomení není blok, ale hranice stránky.

Aktivita si proto spočítá, kolik kartiček se vejde, a vydá **jeden `card-grid` na stránku**.
Výpočet dostane společný domov v `core/document/cards.ts`:

```ts
planCardPages(cardCount, spec): { columns: number; perPage: number; pages: number }
```

Použije ho pexeso, domino i bingo. To je ten důvod, proč se primitivum staví
s nejjednodušší hrou — ověří se na ní dřív, než ho začnou používat tři.

### Zamíchání patří do listu, ne do sazby

Kartičky pexesa musí být zamíchané. To zamíchání se udělá **při generování** a uloží
se do `PexesoSheet`, ne až v `toDocument`.

Důvod je ten, na kterém stojí celý projekt: kontrolní součet musí pokrývat to, co je
na papíře. Kdyby míchal `toDocument`, potřeboval by generátor náhody, dvě volání by
dala jiné pořadí a `.sifra` uložená loni by vytiskla jiný list. `toDocument` musí
zůstat čistá funkce listu — a tenhle případ je první, kdy na tom doopravdy záleží.

---

## 4. Nová aktivita `pexeso`

```
src/activities/pexeso/
  index.ts       ← generátor: N různých hodnot, k nim úlohy, zamíchání, ověření
  payload.ts     ← parsePayload, závisí jen na core
  document.ts    ← stránky kartiček + stránka pro učitele
  module.ts      ← adaptér do registru
  pexeso.test.ts
```

Mimo `activities/` se otevře jen to, co otevřít musí:

| Soubor | Změna |
|---|---|
| `core/model` | `ActivityId` o `'pexeso'`, `PexesoConfig`, nový kód selhání |
| `core/document` | dva bloky z §3 a `cards.ts` |
| `core/verify` | kontrola různých hodnot |
| `core/constraints` | `PAIR_COUNT_LIMITS` |
| `render/screen` | vykreslení dvou nových bloků |
| `activities/registry` | pexeso z `plannedActivities` do `activityModules` |

Nic jiného. Kdyby se ukázalo, že je potřeba sáhnout do `tasks/` nebo `ciphers/`, je to
podle VISION signál, že je návrh špatně — pexeso nemá být nový typ úlohy, jen nová
kompozice nad hotovými.

### Ověření: nový kód selhání

```ts
/** Dvě zadání se stejným výsledkem. U pexesa vada — dítě spáruje špatně a má pravdu. */
| 'ambiguous-pairing'
```

Kontrola je v `core/verify` vedle `ambiguous-code` a `ambiguous-sequence`, se kterými
je téhož druhu. **Volá ji ale jen pexeso**, ne šifra: u mřížky jsou dvě zadání s toutéž
hodnotou legitimní a po ústupku `coordinate-reuse` dokonce běžná.

Generování postupuje jako u listu řad — a když se dost různých hodnot nesejde
(malá násobilka pro třeťáka jich tolik nenabídne), aktivita se **nevytiskne** a učitel
dostane hlášku. Ne tichou náhradu, ne opakovanou kartičku.

### Stránka pro učitele

Poslední stránka dokumentu, ne kartičky: tabulka dvojic v původním, nezamíchaném pořadí.
Použije **existující blok `table`** — kvůli tomu byl v minulém kroku napsaný obecně,
a tady se to poprvé vyplatí.

| Č. | Zadání | Výsledek |
|---|---|---|
| 1. | 7 · 8 | 56 |
| 2. | (24 − 8) · 2 | 32 |

---

## 5. Pořadí práce

Každý krok končí zeleným `npm run check`, poslední navíc papírem.

| # | Krok | Ověří se |
|---|---|---|
| 1 | Bloky v `core/document` + `cards.ts` | testy výpočtu rozvržení |
| 2 | Vykreslení v `render/screen` | vizuálně v prohlížeči |
| 3 | `ambiguous-pairing` v `core/verify` | test, že list s duplicitou neprojde |
| 4 | Aktivita `pexeso` | golden snapshot, kolečko `.sifra` |
| 5 | Zapojení do registru a formuláře | ručně v prohlížeči |
| 6 | **Zkušební tisk a střih** | pravítko, řezačka, prosvítání |

Krok 6 není kontrola na konci, ale součást zadání. U kartiček je papír jediný soudce —
na obrazovce vypadá správně i sazba, která z tiskárny vyleze o dva milimetry vedle.

---

## 6. Co se odchýlilo

**Značky střihu v rozích odpadly.** Návrh je chtěl jako doplněk k dotýkajícím se
kartičkám. Jenže když mřížka sama nese linku po celém obvodu, značky by
zdvojovaly to, co je už vidět. Obrys mřížky je značka střihu.

**Patička měří 14 mm, ne 8.** Odhad v §2.2 byl střelený od boku; změření
vykresleného listu dalo 12,7 mm (úsečka 3 mm a pod ní dvouřádkový popisek).
Konstanta `SCALE_CHECK_HEIGHT_MM` je zaokrouhlená nahoru a testem se hlídá,
že se mřížka i s patičkou vejde do tisknutelné plochy. Na dnešní rozvržení
to nemá vliv — čtyři řady po 60 mm se vejdou tak i tak — ale kdyby konstanta
lhala dál, první změna velikosti kartičky by vyrobila přetečení, které
odhalí až nůžky.

**Kontrolní úsečka je na KAŽDÉ stránce kartiček**, ne jen na první. Stránky
se můžou tisknout na dvakrát a měřítko se mezi tím dá přenastavit.

**`verifyTasks` nestačilo, přibylo `combine`.** Pexeso spouští dvě nezávislé
kontroly — přepočet hodnot a jednoznačnost párování — a obě musí projít.
Kontrakt vrací jeden `VerificationReport`, takže se slučují.

**Test kontraktu se musel zobecnit.** Znělo „každá aktivita dá pracovní list
i řešení" a kontroloval doslova dvojici popisků `['Pracovní list', 'Řešení']`.
Pexeso má tři stránky s jinými názvy — a přitom závazek vůči učiteli neporušuje.
Test teď hlídá ten závazek (poslední stránka nese tabulku s výsledky), ne
konkrétní počet stránek. Byl to zapsaný předpoklad, ne pravidlo.

**Rub kartiček zůstal neudělaný**, jak návrh doporučoval. Otázka „prosvítá tisk
na papíře 80 g?" čeká na zkušební tisk.
