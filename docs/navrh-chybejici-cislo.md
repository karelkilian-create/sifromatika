# Chybějící číslo v příkladu

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

- `core/model` — `PromptNode` o člen bohatší (`kind: 'equation'`), nová
  `SkillTag`, kód chyby pro víc řešení;
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
4. **Zaškrtávátko „Chybějící číslo v příkladu"**, tedy stejným způsobem
   pojmenované jako „Řady s chybějícím číslem".
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

## 10. Co se odchýlilo od návrhu

_(Doplní se po provedení, jako u předchozích kroků.)_
