# Převody jednotek

> **ODLOŽENO 23. 8. 2026.** Karel to zastavil s tím, že bez převodů obsahu
> nemá téma valnou cenu — a měl pravdu, výmluva „obsah je spjatý
> s geometrií" v §3 neobstojí: převádět `m² → cm²` je řádek v tabulce
> jednotek. Skutečná překážka je obor čísel: se stropem kartiček 1000 zbude
> na obsah 120 úloh (s 10 000 jich je 1210) a objem je pod ním mrtvý úplně,
> šest úloh. Až se k tématu vrátíme, začíná se rozhodnutím o oboru čísel,
> ne psaním kódu. Místo toho se dělá `docs/navrh-chybejici-cislo.md`.

Návrh k rozhodnutí, **23. 8. 2026**. Krok 5 z pořadí prací — poslední velké
téma před slovními úlohami.

## 1. Proč zrovna teď

Všechno, co letos přibylo, dostal až druhý stupeň: desetinná čísla a mocniny
od šesté, procenta a zlomky od sedmé. **Čtvrťák a páťák mají pořád jen
počítání a číselné řady.** Převody jsou jediné velké téma, které se dá dát
prvnímu stupni — `3 m = ? cm` je látka čtvrté třídy — a zároveň roste
s ročníkem až k `2,5 t = ? kg`.

## 2. Není to jen další generátor

Zlomky se do projektu vešly beze změny verifikace, protože `3/4 z 80` je pro
tokenizer výraz. **Převod výraz není.** `5 m = ? cm` neobsahuje operaci; je to
tvrzení o dvou zápisech téže veličiny. Verifikace si každé zadání přepočítává
z vytištěného textu (`core/verify` to má jako první pravidlo modulu), takže
převod potřebuje vlastní čtení — přesně jako číselná řada.

Řada je předloha, kterou stačí následovat:

| Řada | Převod |
|---|---|
| `PromptNode` s `kind: 'sequence'` (`core/model:80`) | `kind: 'conversion'` |
| `core/sequence` — parsuje `4 10 16 ? 28` a odvodí pravidlo | `core/units` — parsuje `5 m = ? cm` a spočítá 500 |
| `verifySlot` má pro ni vlastní větev (`core/verify:528`) | totéž |
| `computePrinted` v dominu ji zná (`core/verify:751`) | totéž |

Cena je tedy **v jádru, ne v generátoru**. Zato je to práce, kterou projekt
jednou udělal a ví, jak vypadá.

## 3. Které jednotky

| Řada | Jednotky | Od |
|---|---|---|
| délka | mm, cm, dm, m, km | 4. |
| hmotnost | g, kg, t | 4. |
| objem | ml, l, hl | 5. |
| čas | s, min, h | 5. |

Obsah (cm², m², ha) do prvního kroku **nepatří**: je to látka spjatá
s geometrií, kterou projekt nemá, a druhá mocnina v převodním poměru
(1 m² = 10 000 cm²) je jiná obtížnost než 1 m = 100 cm.

⚠ **Čas je past a rozhoduje se o něm dřív než o kódu.** Není desítkový,
takže `90 min = ? h` dá 1,5 — a `1,5 h` se v běžné řeči píše `1 h 30 min`,
což je zápis, který model neumí a dítě zná. Návrh proto bere z času **jen
celé násobky** (`120 min = ? h`, `3 min = ? s`) a nic, co dá desetinné číslo.
Kdyby se to ukázalo jako málo, je to samostatný krok se smíšeným zápisem.

## 4. Kdy se smí zmenšovat

Směr převodu je obtížnost, ne kosmetika:

- **zvětšování počtu** (`3 m = ? cm`, tedy krát 100) dá vždycky celé číslo
  a zvládne ho čtvrťák;
- **zmenšování** (`250 cm = ? m`) dá `2,5`, tedy desetinné číslo — a to má
  projekt od šesté třídy (`desetinna-cisla-od-seste`, commit `873ef7f`).

Do šesté třídy se proto zmenšuje jen tehdy, když výsledek vyjde celý
(`300 cm = ? m`). Od šesté smí i `2,5`.

⚠ Hry dovolují **jedno** desetinné místo (`ALLOW_DECIMAL_RESULTS`), takže
`0,75 h` ani `1,25 kg` na kartičku nesmí. Na pracovním listu šifry je
výsledek kód políčka, tedy celé číslo — tam desetinný převod nesmí vůbec.

## 5. Klíčové rozhodnutí: co je „stejný výsledek"

Tady se to potká s tím, co jsme řešili dneska u zlomků. Párovací kontrola
(`verifyDistinctValues`) dnes klíčuje **hodnotou** — právě proto, že `1/2`
a `0,5` je totéž číslo dvěma zápisy a dítě by spárovalo obojí.

U převodů to přestane stačit v obou směrech:

- `5 m = ? cm` dá 500 a `0,5 kg = ? g` dá taky 500. **Jsou to různé
  kartičky** (`500 cm` a `500 g`) a dítě je nezamění — dnešní pravidlo by
  jednu z nich vyhodilo zbytečně.
- `500 cm` a `5 m` jsou naopak **táž veličina dvěma zápisy**, tedy přesně ten
  případ, kvůli kterému pravidlo existuje. Kdyby obojí leželo na stole,
  spáruje dítě správně a hra nevyjde.

Klíčem proto nesmí být číslo ani vytištěný text, ale **veličina**: rozměr
(délka, hmotnost, …) a velikost převedená na základní jednotku. Pro úlohy bez
jednotky je rozměr „číslo" a nic se pro ně nemění. Je to tentýž postup, jaký
dnes dělá `formatValue` u čísel, jen o patro obecněji.

## 6. Co uvidí dítě

Zadání `5 m = ? cm`, otazník na místě výsledku — stejná konvence jako u řad.
Na kartičce s výsledkem stojí `500 cm`, ne `500`: bez jednotky se páruje
podle holého čísla a polovina látky je pryč.

Znamená to, že převod potřebuje **vytištěnou podobu výsledku**, tedy pole
`Task.printedValue`, které vzniklo dneska kvůli zlomkům. Pravidlo listu
`TaskRules.fractionResults` se tím ale přestane jmenovat správně — nejde
o zlomky, jde o to, jestli list snese výsledek, který není holé číslo.
Navrhuju ho přejmenovat na `printedAnswers` (tři místa v kódu, žádná změna
chování) a kontrolu tvaru rozšířit ze `n/d` i na `číslo jednotka`.

## 7. Kam to smí

| Aktivita | Ano? | Poznámka |
|---|---|---|
| šifra | **ano, ale úzce** | kód políčka je 11–99, takže projdou jen převody s malým výsledkem (`350 cm = ? dm`). Bez jednotky na kartičce — kód je číslo. |
| list řad | ne | jeho úlohy jsou řady |
| pexeso, domino, bingo | ano | tady je to doma: jednotka na kartičce nese půlku úlohy |

Obor kartiček je do tisíce (`CARD_VALUE_MAX`), takže `5 km = ? m` (5000)
vypadne sám. Vybírat se musí obě strany převodu, ne jen výsledek — `4000 mm`
v zadání je stejně nepříjemné jako v odpovědi.

## 8. Cena

- **`core/units`** — tabulka jednotek, parser zadání, přepočet. Nové, ale
  malé a bez závislostí, stejně jako `core/sequence`.
- **`core/model`** — `PromptNode` o člen bohatší, `TaskRules.printedAnswers`
  místo `fractionResults`, nové kódy chyb.
- **`core/verify`** — větev ve `verifySlot`, `computePrinted` pro domino,
  klíč veličiny v `verifyDistinctValues`.
- **`tasks/units`** — generátor: vyber řadu, dvojici jednotek a hodnotu tak,
  aby obě strany zůstaly v oboru ročníku.
- **aktivity** — `GENERATORS` v každé, která pro téma má zaškrtávátko
  (hlídá `payload.test.ts`), zaškrtávátko v `EditorPanel`, ukázka v nápovědě.
- **`GENERATOR_VERSION` 11** — přidání generátoru výstup uložených listů
  nemění, ale zásah do `verifyDistinctValues` a `TaskRules` ano.

## 9. Zámek

- testy generátoru: obě strany převodu v oboru ročníku, celý výsledek do
  páté třídy, žádný desetinný čas;
- test čtení: `5 m = ? cm` projde, `5 m = ? kg` spadne (jiný rozměr),
  `5 m = ? m` spadne (převod na sebe není úloha);
- test párování: `500 cm` a `5 m` na jednom listu neprojdou, `500 cm`
  a `500 g` projdou;
- golden snímek pexesa s převody a šifry s převody;
- **zkušební tisk** — jednotka na kartičce mění šířku zadání.

## 10. Co navrhuju

1. **Udělat to** a udělat to pro první stupeň: čtvrtá a pátá třída dostanou
   první nové téma za celý rok.
2. **Čtyři řady jednotek**, obsah ne. Čas jen v celých násobcích.
3. **Klíč párování na veličinu**, ne na číslo — jinak se buď zahazují dobré
   listy, nebo propouštějí vadné.
4. **`fractionResults` → `printedAnswers`**, dokud je to tříznakový
   refaktoring a ne kus historie.
5. **Rozhodnout dřív, než se sáhne na kód:** má šifra převody dostat vůbec?
   Její kódy jsou 11–99, takže z celé zásoby projde pár desítek úloh a vždycky
   půjde o zmenšování (`350 cm = ? dm`). Levnější a poctivější varianta je
   nechat převody hrám a šifru nechat být.

## 11. Co se odchýlilo od návrhu

_(Doplní se po provedení, jako u předchozích kroků.)_
