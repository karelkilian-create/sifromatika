# Rovnice: chybějící číslo v příkladu

Návrh k rozhodnutí, **23. 8. 2026**. Vzniklo místo převodů jednotek, které
Karel odložil — viz „Proč ne převody" na konci.

## 1. O čem to je

`? + 15 = 40`, `7 · ? = 56`, `90 − ? = 34`. Dítě nepočítá příklad, ale hledá
číslo, které v něm chybí. Výsledek úlohy je to chybějící číslo.

Je to **jiná dovednost než počítání**, ne přebarvené počítání: aby dítě
`? + 15 = 40` vyřešilo, musí operaci obrátit.

⚠ **Zápis s otazníkem platí až do sedmé třídy** (Karel, 23. 8. 2026).
Rovnice s neznámou (`x + 15 = 40`) se učí až v osmičce, takže `?` není
provizorium na dva roky, ale tvar, který drží pět ročníků — od třetí do
sedmé. Tohle téma tedy neobsluhuje jen první stupeň; je to nejširší záběr
ze všeho, co letos přibylo. A dítě, které pak v osmé třídě dostane `x`,
potkává tutéž úlohu jen s jiným písmenem.

⚠ Z toho plyne, co tenhle krok NEDĚLÁ: nezavádí zápis s neznámou. Až bude
osmý ročník na řadě, je `x + 15 = 40` další tvar téhož generátoru
(zaměnit `?` za písmeno), ne nový modul — ale zavést ho dřív než v osmičce
by šlo proti tomu, jak se to učí.

## 2. Proč je to levné

Výsledek zůstává **holé číslo**. Odpadá tím všechno, co bylo drahé na
zlomcích i na převodech:

- žádná vytištěná podoba výsledku (`printedValue`) — na kartičce stojí `25`;
- žádný nový klíč párování — hodnota je číslo jako každá jiná;
- žádný nový modul v `core` — na rozdíl od jednotek se nic nepřevádí;
- `TaskRules` se nemění: celý výsledek dostane šifra, hry desetinný.

Nové je jediné: **zadání obsahuje rovnítko a otazník**, takže se nedá číst
jako výraz. To znamená nový člen `PromptNode` (`core/model:80`) a vlastní
větev ve `verifySlot` — stejná cesta, jakou prošly číselné řady.

### Jak se to ověří

Verifikace nesmí věřit generátoru, takže si úlohu přepočítá z vytištěného
textu. U rovnice to je o dva kroky:

1. rozdělit text na rovnítku (`? + 15` a `40`);
2. do strany s otazníkem dosadit hodnotu, kterou generátor tvrdí, obě strany
   spočítat dosavadním `evaluateExpression` a porovnat.

Tokenizer se přitom nemění vůbec — dosazením otazník zmizí a zbude běžný
výraz. Dnešní `tokenize` navíc koncové `=` a `= ?` zahazuje jako součást
sazby (`core/verify:97`), takže tenhle tvar mu nepřekáží.

⚠ Jedna past, a je to táž, kterou má číselná řada: **úloha musí mít právě
jedno řešení.** `? · 0 = 0` splní každé číslo, `0 : ? = 0` taky. Generátor
takové tvary vyrábět nebude a verifikace je musí zamítnout, ne se na to
spolehnout — u řad se to osvědčilo (`ambiguous-sequence`).

## 3. Jaké tvary

| Tvar | Příklad | Dítě počítá | Od |
|---|---|---|---|
| chybí sčítanec | `? + 15 = 40` | odčítání | 3. |
| chybí druhý sčítanec | `15 + ? = 40` | odčítání | 3. |
| chybí menšenec | `? − 15 = 25` | sčítání | 3. |
| chybí menšitel | `90 − ? = 34` | odčítání | 4. |
| chybí činitel | `7 · ? = 56` | dělení | 4. |
| chybí dělenec | `? : 4 = 9` | násobení | 4. |
| chybí dělitel | `72 : ? = 8` | dělení | 5. |

Obor čísel a povolené operace si tvar bere z profilu ročníku jako všechno
ostatní, takže `? + 2,5 = 7` v šesté nebo `? · 12 = 60` v sedmé vzniknou
samy — a platí to i pro témata, která přibyla letos (`3/4 z ? = 60`). Složené výrazy (`? + 15 · 2 = 70`) do prvního kroku nepatří —
je to jiná obtížnost a patří k pořadí operací v šesté třídě.

## 4. Rozhodnutí, které se musí udělat dřív než kód

**Pod kterou operaci to spadá?** `? + 15 = 40` je napsané se sčítáním, ale
dítě odčítá. Kdyby se úloha hlásila jen ke sčítání, dostal by ji učitel, který
si zaškrtl sčítání — a nechal by děti odčítat. Kdyby jen k odčítání, nedostal
by `? + 15 = 40` nikdo, kdo si odčítání neodškrtl.

Návrh: **hlásit obojí** (`operations: ['add', 'sub']`), a tvar použít, když je
povolená aspoň jedna z nich. Je to totéž, co dnes dělají zlomky u části
z celku (`operations: ['mul', 'div']`, protože dítě dělí jmenovatelem a násobí
čitatelem) a je to poctivější než volit jednu stranu.

⚠ Číselné řady to mají jinak — hlásí operaci, kterou dítě při řešení použije
(`Shape.operation` v `tasks/sequence`). U řady je to jednoznačné, protože
zadání žádnou operaci nezobrazuje; tady jsou vidět obě.

## 5. Kam to smí

Do všech pěti aktivit, bez výjimky:

| Aktivita | Jak to vypadá |
|---|---|
| šifra | `? + 15 = 40`, chybějící číslo je kód políčka |
| list řad | ne — jeho úlohy jsou řady |
| pexeso | na jedné kartičce `? + 15 = 40`, na druhé `25` |
| domino | vpravo `7 · ? = 56`, vlevo na dalším kameni `8` |
| bingo | učitel čte nahlas, děti škrtají |

Sazba se nemění: zadání je krátké a rovnítko v něm už je, takže se tiskne
bez toho, které dopisuje sazba (`showEquals: false`, stejně jako u řad).

## 6. Cena

- `core/model` — `PromptNode` o člen bohatší (`kind: 'equation'`),
  `SkillTag` `rov.chybejici-cislo` (nový jmenný prostor `rov.`, aby seděl
  s názvem tématu), kód chyby pro víc řešení;
- `core/verify` — větev ve `verifySlot` (rozdělit, dosadit, porovnat)
  a totéž v `computePrinted` kvůli dominu;
- `tasks/equation` — generátor, sedm tvarů, kostra podle `tasks/fractions`;
- aktivity — `GENERATORS` v každé (hlídá `payload.test.ts`), zaškrtávátko
  v `EditorPanel`, ukázka v nápovědě;
- **`GENERATOR_VERSION` se nemění** — přidání generátoru výstup uložených
  listů nemění, o tom rozhoduje `generatorMix`. Ověří to golden snímky:
  nesmí se přepsat ani jeden.

## 7. Zámek

- testy generátoru: každý tvar má právě jedno řešení, obor a operace sedí
  s profilem, `· 0` a `0 : ?` nevzniknou;
- test verifikace: `? + 15 = 40` s hodnotou 25 projde, s hodnotou 26 spadne,
  `? · 0 = 0` spadne na víc řešení;
- test, že tvar respektuje zaškrtnuté operace v obou směrech;
- golden snímek šifry s chybějícími čísly a pexesa s nimi;
- zkušební tisk **není** kritický — zadání je kratší než dnešní nejdelší,
  takže se na kartičku vejde s rezervou. Stačí náhled.

## 8. Co navrhuju

1. **Udělat to** jako další krok místo převodů — obsluhuje třetí až sedmý
   ročník, tedy víc než kterékoli téma přidané letos.
2. **Sedm tvarů z §3**, složené výrazy až později.
3. **Hlásit obě operace** (§4) — jinak se téma buď schová, nebo splete.
4. **Zaškrtávátko „Rovnice"** (Karel, 23. 8. 2026). „Chybějící číslo
   v příkladu" stálo v jednom sloupci hned pod „Řadami s chybějícím číslem"
   a lišilo se od nich jedním slovem. Formulář čte učitel, ne dítě, takže
   se slova „rovnice" nemá kdo leknout — a `? + 15 = 40` rovnice opravdu
   je. Název navíc zůstane pravdivý, až v osmičce přibude zápis s `x`:
   přejmenovávat se nebude podruhé. Co pod tím tématem je, ukáže ukázka
   v nápovědě, jak to dnes mají všechna témata.
5. **Rozhodnout**: má tvar `? : 4 = 9` (chybí dělenec) chodit i tam, kde má
   učitel zaškrtnuté jen dělení? Dítě u něj násobí. Navrhuju ano — je to
   dělení napsané a učitel ho tak čte.

## 9. Proč ne převody

Odloženo 23. 8. 2026 po rozvaze s Karlem, podklad je v
`docs/navrh-prevody-jednotek.md`. Shrnutí, ať se to nemusí odvozovat znovu:

- Bez **převodů obsahu** (`m² → cm²`) je téma tenké — a právě obsah je to,
  na čem děti chybují, protože posunou čárku o jedno místo místo o dvě.
- Obsah není drahý (je to řádek v tabulce jednotek, geometrie k němu není
  potřeba), ale **naráží na obor čísel**: se stropem kartiček 1000 zbude
  120 úloh, s 10 000 jich je 1210. Objem (`mm³`–`m³`) je pod stropem mrtvý
  úplně — šest úloh.
- Znamenalo by to tedy nejdřív rozhodnout, jestli převody dostanou vlastní
  obor čísel (`CARD_VALUE_MAX` je psaný pro počítání z hlavy, ne pro posun
  desetinné čárky) — a teprve pak psát kód.

Až se k tomu vrátíme, tohle je první otázka, ne poslední.

## 10. Otevřené: poměr hledaného čísla a operandu

Zapsáno **23. 8. 2026 po zkušebním tisku** — Karel vytiskl domino z rovnic
a na kartičce stálo `78 + ? = 80`. Úloha je správně, ale dítě u ní nepočítá,
jen přečte rozdíl dvou skoro stejných čísel.

Je to táž vada, jakou u odčítání opravila `GENERATOR_VERSION` 2 (`711 − 708
= 3`): menšenec se tehdy losoval z celého oboru nezávisle na výsledku.
U rovnic hlídá generátor jen druhý operand (`MIN_OPERAND`, aby nebyl 0 ani 1),
ale ne jeho poměr k hledanému číslu.

Naměřeno na 2160 úlohách (4., 5. a 7. ročník, domino ze samých rovnic):

| Co | Kolik |
|---|---|
| hledané číslo desetkrát menší než operand | 1,1 % |
| hledané číslo pod deset | 3,8 % |
| hledané číslo pod deset vedle operandu ≥ 20 | 1,9 % |

Tedy zhruba **jedna kartička na čtyři až osm dvanáctikamenových domin** —
ne tolik, aby to samo o sobě stálo za inkrement verze, ale dost na to, aby
to učitel v ruce potkal.

**Návrh opravy:** nepustit dvojici, kde je hledané číslo řádově menší než
druhý operand. `78 + ? = 80` tím vypadne, `99 + ? = 1000` (dobrá úloha
z téhož listu) zůstane.

⚠ **Přidat k nejbližšímu kroku, který `GENERATOR_VERSION` zvedne stejně.**
Samotná tahle změna by přehodila losování všude a znehodnotila sdílené
odkazy kvůli jedné kartičce z padesáti.

## 11. Co se odchýlilo od návrhu

Provedeno **23. 8. 2026**. `GENERATOR_VERSION` se nezměnil — ověřily to golden
snímky, nepřepsal se ani jeden.

**Domino rovnici neověřuje, ale řeší.** Návrh počítal s tím, že verifikace
dosadí tvrzenou hodnotu a porovná strany. To stačí na list, ale ne na domino:
kámen vpravo musí ukázat na hodnotu na dalším kameni, takže verifikace musí
chybějící číslo **najít sama**. Přibyl `solveEquation`: stranu s otazníkem
vyhodnotí pro dvě dosazení, z nich odhadne, jestli je v neznámé lineární
(`? + 15`) nebo ji má ve jmenovateli (`72 : ?`), dopočítá kandidáta a ten
**ověří dosazením**. Poslední krok drží celou konstrukci — špatný odhad
neprojde, takže modely nemusí být úplné; co ani jeden nepokryje, spadne na
`broken-chain`, nikdy ne na tiše špatný řetěz.

**Generátor desetinná čísla nevyrábí.** §3 slibovala, že `? + 2,5 = 7`
v šesté třídě vznikne samo. Nevzniká — operandy jsou celá čísla. Desetinný
cíl projde, když si ho vyžádá aktivita, ale sám od sebe se neobjeví. Je to
další tvar, ne oprava.

**Přibyl strop na malý operand** (`MAX_TERM` = 100). Bez něj vyrábí osmá
třída `? + 4783 = 9021`: v oboru, ale neprocvičí se na tom obrácení operace,
jen odečtení na papíře. Velká čísla dodá druhá strana rovnice.

**Dvě vady našel až náhled, ne testy** — obě v sazbě a obě proto, že se
rozhodovala podle `showEquals` místo podle druhu zadání:

1. na listu stálo `3 · ? = 84 =` — sazba dopisuje rovnítko a rovnice ho má
   v sobě;
2. rovnice zdědila **rozestupy členů číselné řady** (`word-spacing`), takže
   se `3 · ? = 84` rozpadlo na čtyři kusy.

`TaskListItem` proto nese `kind`. Rovnítko i rozestupy se teď řídí druhem
zadání a příští druh se zeptá sám, místo aby vadu tiše zdědil.

**Číselná pravidla výsledku se vyjmula do `checkResultRules`** — ptá se na ně
přepočtený výraz i dosazená rovnice a hlášky musí zůstat tytéž.
