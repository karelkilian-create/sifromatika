# Druhá třída

Návrh k rozhodnutí, **31. 8. 2026**. Navazuje na požadavek kolegyň z porady
29. 8. Zadání upřesnil Karel: **obsah má odpovídat tomu, co má pro 2. ročník
Školákov** (`skolakov.eu/matematika-2-trida`, otištěno do
`Matematika 2. třída.pdf`).

## 1. Co Školákov pro druhou třídu má

Šest oddílů. Přepsáno do jazyka Šifromatiky, tedy „co dítě počítá":

| Oddíl na Školákově | Co to je v Šifromatice | Stav |
| --- | --- | --- |
| Matematické minutovky — opakování 1. ročníku | sčítání a odčítání do 20 bez přechodu | profil |
| Sčítání a odčítání do 20 s přechodem přes desítku | `crossesTen` | profil |
| Čísla do 100 — číselná řada | číselné řady s krokem 1, 2, 5, 10 | **řady od 2. ročníku** |
| Čísla do 100 — desítky a jednotky | `3 · 10 + 7 = ?` | **nový generátor** |
| Čísla do 100 — porovnávání, řazení a rozklady | rozklady ano, porovnávání ne | viz §7 |
| Sčítání a odčítání do 100 bez přechodu | `crossesTen: false` | **nový přepínač** |
| Sčítání a odčítání do 100 s přechodem | `crossesTen: true` | profil |
| Násobení a dělení 2, 3, 4, 5 (a souhrnně 0–5) | `multiplicationTables: [2, 3, 4, 5]` | profil |
| Vyhledávání a řazení násobků 2, 3, 4, 5 | číselná řada s krokem 2–5 | **řady od 2. ročníku** |

Skoro celý ten seznam už kód umí a jde jen o profil ročníku. Nové jsou tři
věci: **rozklad na desítky a jednotky**, **přepínač přechodu přes desítku**
a **snížení ročníkové brány u řad a u chybějícího čísla**.

## 2. Profil ročníku

```ts
case 2:
  return {
    grade,
    numberRange: { min: 0, max: 100 },
    allowNegatives: false,
    crossesTen: true,          // ⚠ nově přepínatelné, viz §4
    multiplicationTables: [2, 3, 4, 5],
    divisionExactOnly: true,
    maxOperands: 2,
    powers: false,
    decimals: 0,
    percents: false,
    fractions: false,
  }
```

Od trojky se liší **jedinou hodnotou**: násobilkou. Trojka má `[2, 3, 4, 5, 10]`,
dvojka desítku nemá — na Školákově je řada 10 až ve třetím ročníku. To vypadá
jako slabý rozdíl na celý nový ročník, a proto §3 a §4 popisují, čím se ty dva
ročníky opravdu rozejdou.

## 3. Obor: dvojka počítá do sta, „do 20" se nabízet nebude

Školákov má obor do 20 jako samostatnou etapu. V Šifromatice ho jako volbu
mít nemůžeme a je to tvrdé, ne vkusové:

**Výsledek úlohy je kód políčka v mřížce.** Souřadnicová šifra počítá kód jako
`řádek · 10 + sloupec` (`ciphers/grid:36`) a mřížka je vždy 9×9, takže platné
kódy jsou **11 až 99** — a v oboru do dvaceti jich zbude devět (11–19), všechny
v prvním řádku. Tajenka by směla mít nejvýš devět různých písmen a dítě by po
třech výpočtech vidělo, že se odpovědi hledají jen nahoře. U lineární šifry
(buňky 1..81) je to totéž o kousek mírnější a stejně vadné.

Obor do sta přitom **dítěti do dvaceti počítat nezakazuje**. Malé výsledky
vznikají dál a operandy se drží u výsledku: strop menšence (`subtractionCeiling`)
existuje od verze 2 přesně proto, aby pro výsledek 13 nevznikalo `97 − 84`.
Co obor řídí, je horní hranice, ne dolní.

**Rozhodnutí:** `numberRange: { min: 0, max: 100 }`, žádná volba oboru.
Etapu „do 20" nahrazuje přepínač přechodu přes desítku z §4 — a to je i to,
co z těch dvou skutečně dělá rozdíl v obtížnosti.

## 4. Přechod přes desítku jako první přepínatelné pole profilu

Školákov rozděluje čtyři z šesti oddílů podle jediné hranice: **bez přechodu ×
s přechodem**. V profilu ta hranice existuje od začátku (`crossesTen`) a filtry
v `tasks/arithmetic` ji ctí (`crossesTenOnAdd`, `crossesTenOnSub`), jenom ji
dnes nikdo nepřepíná — všech šest ročníků má `true`.

Návrh: **jedno zaškrtávátko pod rozbalovátkem ročníku, viditelné jen u druhé
třídy.**

> ☑ Sčítání a odčítání s přechodem přes desítku

Zaškrtnuté je výchozí stav — pravidlo „všechno zaškrtnuté" platí i tady:
učitel, který nic nenastaví, dostane celý ročník. Odškrtnutím vznikne list
pro září — `42 + 35`, `78 − 6`, tedy přesně „bez přechodu přes základ 10".

Proč jen u dvojky: u ostatních ročníků je přechod přes desítku dávno zvládnutá
látka a zaškrtávátko by tam bylo šum. Až se bude chtít i u trojky, je to jeden
řádek v podmínce.

### Co to stojí

Je to **první ruční úprava profilu, která se ukládá** — dosud se profil
odvozoval výhradně z ročníku a uložený se zahazoval. Kód s tím počítá,
`parseDifficulty` má u sebe větu „až přijdou ruční úpravy profilu, uloží se
jako výslovný override" (`activities/payload-utils:56`). Provedení:

- `SharedEditorState` (`activities/contract.ts`) dostane `crossesTen: boolean`;
  je to sdílené pole jako ročník, takže se přepnutím aktivity nesmí ztratit;
- `applyShared` ho zapíše do `config.payload.difficulty`, `sharedFromConfig`
  přečte zpátky — obojí na jednom místě pro všech pět aktivit;
- `parseDifficulty` vezme `gradeProfile(grade)` a **jen pro `crossesTen === false`
  udělá override**. Starší `.sifra` pole nemá, dostane profilovou hodnotu
  a vytiskne se stejně jako dřív.

⚠ Ukládá se jen `false`, ne obě hodnoty. Kdyby se přebíralo i `true`, změna
defaultu ročníku by se do starších souborů nikdy nepromítla — a to je ta věc,
kterou `parseDifficulty` schválně nedělá.

## 5. Rozklad na desítky a jednotky

Zadání je **obrácené**: `3 · 10 + 7 = ?`, ne `37 = ? · 10 + ?`. Rozhodl Karel
29. 8. a důvod platí dál — učebnicový směr má dva výsledky a šifra potřebuje
jeden kladný celý (viz `docs/navrh-uvolneni-celych-vysledku.md`).

**Vlastní generátor `src/tasks/decomposition/`**, ne tvar aritmetiky. Vzor je
`tasks/powers`: samostatný adresář, samostatné zaškrtávátko, jeden řádek
v `tasks/registry.ts`.

Otevřená otázka z 29. 8. („hlásí se rozklad k násobení?") tím dostává odpověď
a je to odpověď, kterou vynutil Školákov: **dvojka nemá v násobilce desítku.**
Kdyby se rozklad hlásil k násobení, vypnul by ho učitel, který si odškrtne
násobení — přestože `· 10` tu není násobilka, ale zápis desítek. A naopak by
`3 · 10` vypadalo jako příklad z řady, kterou se dvojka neučí. Samostatné téma
tedy není jen pohodlnější, je i správně.

Co generátor vyrobí pro cíl `t`:

| Tvar | Příklad | Kdy `null` |
| --- | --- | --- |
| `a · 10 + b = ?` | `3 · 10 + 7` | `t < 10` nebo `t > 99` |

Dosažitelné hodnoty jsou **10 až 99**, což pokryje celou souřadnicovou mřížku
(kódy 11–99) i všechny hry. Rozklad tedy sám o sobě uživí šifru pro druhou
třídu, i kdyby se všechno ostatní odškrtlo.

Nový `SkillTag`: `arit.desitky-jednotky`.

### Otazník uvnitř rozkladu

`? · 10 + 7 = 47` a `6 · 10 + ? = 63` **nepatří sem**, ale do
`tasks/equation` — jsou to dvě další položky v `SHAPES`, které dostanou
`target` a `other` přesně jako dnešních sedm tvarů. Hledané číslo je v obou
jednociferné, takže tvar vrátí `null` pro `target > 9`, stejně jako to dnes
dělá `missing-minuend` u záporného rozdílu. Generátor si říká o úlohu pro
konkrétní hodnotu, takže na kód 4 dostane otazníkový tvar a na kód 47 přímý.
Dávkuje se to samo, nic se nenastavuje.

⚠ Nové položky **na konec `SHAPES`**, ne doprostřed — `rng.pick` losuje podle
indexu. Totéž platí pro `COMPOUND_SHAPES` a pro pořadí v `taskGenerators`.

## 6. Řady a chybějící číslo se otevřou dolů

Obě témata mají dnes bránu `minGrade: 3` a bez zásahu by druhá třída dostala
zaškrtávátko, ze kterého nic nevypadne. Horší je, že `usableTopics` u rovnic
říká „žádná mez ročníku" (`tasks/mix.ts:158`) — to by ve dvojce začalo lhát.

**Číselné řady** (`tasks/sequence`): `step-up` a `step-down` na `minGrade: 2`.
Krok pro dvojku omezit na **1, 2, 3, 4, 5 a 10** — jednička je „číselná řada",
dvojka až pětka jsou „násobky čísla 2–5", desítka je počítání po desítkách.
Dnes se krok bere z `range(2, maxStep(profile))`, tedy 2–9; pro dvojku je to
vlastní seznam variant. Ostatní ročníky se nesmí dotknout: krok 1 se ve
třetí třídě objevit nemá a hlavně by přepsal uložené seedy.

Ostatní tvary (`alternating`, `growing`, `multiply`, `divide`) zůstávají
od čtvrté a páté třídy. Střídavý a rostoucí krok nejsou látka druhého ročníku.

**Chybějící číslo** (`tasks/equation`): `missing-addend` a
`missing-second-addend` na `minGrade: 2`. `? + 5 = 13` je běžné cvičení druhé
třídy. `missing-minuend` (`? − 5 = 8`) nechat na trojce — obrácení odčítání
je o krok dál, a dvojka má z čeho brát i bez něj.

⚠ Snížení `minGrade` u existujícího tvaru **nemění výstup vyšších ročníků**:
podmínka je `profile.grade < shape.minGrade`, takže pro trojku a výš se
nic nevyhodnotí jinak. Golden testy proto zůstanou zelené.

## 7. Co se z Školákova NEDĚLÁ

**Porovnávání a řazení čísel** (`45 < 54`). Výsledkem není číslo, ale znaménko
nebo pořadí, takže by to nešlo zašifrovat — a mechanismus šifry se kvůli
jednomu tématu neohýbá. Řazení navíc z velké části zastane číselná řada,
kterou dvojka nově dostane.

**Minutovky** jako formát. Na Školákově je to cvičení na čas; Šifromatika
tiskne na papír a časomíru nemá. Obsah minutovek (opakování do 20) pokrývá
odškrtnutý přechod přes desítku.

**Vetřelec** ani zbylých šest témat z loňského seznamu od ChatGPT. Zůstává
platné, co bylo dohodnuto 30. 8.: je to kandidát na dobu **po** druhé třídě.

## 8. Pořadí prací

1. `Grade` na `2 | 3 | … | 9`, `gradeProfile` case 2, `GRADES`
   v `payload-utils`, položka v rozbalovátku, README (dnes tvrdí „3. až 8.").
2. Řady a chybějící číslo dolů (§6) — tím má dvojka hned tři témata
   a dá se vytisknout skutečný list.
3. Přepínač přechodu přes desítku (§4) — sdílené pole, override v parseru,
   test na starý `.sifra` bez toho pole.
4. Generátor rozkladu (§5) — nový adresář, registr, `TopicSelection`,
   `generatorMixFromTopics`, `topicsFromGeneratorMix`, `usableTopics`,
   `GENERATORS` v **každém** ze čtyř payload parserů, zaškrtávátko a nápověda.
5. Otazník v rozkladu (§5) — dva tvary na konec `SHAPES`.

Kroky 2–5 jsou nezávislé; každý je samostatně tisknutelný a samostatně
schvalitelný.

⚠ Krok 4 je ten, na kterém se dají ztratit zlomky podruhé: generátor se
vygeneruje, projde testy i náhledem a zmizí teprve po otevření ze sdíleného
odkazu, protože chybí v `GENERATORS`. Hlídá to `payload.test.ts`.

## 9. GENERATOR_VERSION se nemění

Nic z toho nemění výstup žádného **dosud existujícího** ročníku:

- nový case v `gradeProfile` se pro trojku až devítku nevyhodnotí;
- `minGrade` směrem dolů nemění chování ročníků nad tou hranicí;
- varianta kroku 1 je gatovaná ročníkem;
- nový generátor v registru se do listu dostane jen přes váhu v `generatorMix`,
  a tu žádný uložený soubor nemá (`pickGenerator` navíc jediný generátor
  vrací bez dotazu na `rng`);
- `crossesTen` se z uloženého souboru přebírá jen tehdy, když tam je.

Golden snímky by tedy měly zůstat beze změny do posledního bajtu. Kdyby se
kterýkoli přepsal, je to signál, že se něco z výše uvedeného porušilo — ne
důvod ke `-u`.

## 10. Odpovědi (Karel, 31. 8. 2026)

1. **Násobilka bez desítky** — sedí. `[2, 3, 4, 5]`, `6 · 10` dvojka nedostane.
2. **Dělení nechat** mezi zaškrtávátky operací jako všude jinde.
3. **Zaškrtávátko přechodu jen u dvojky**, trojka zatím ne.

## 11. Co se při stavbě ukázalo navíc

Postaveno 31. 8. 2026 podle §1–§8. Dvě věci se objevily až na vytištěném
listu a nejsou v návrhu výš:

### `86 : 2 = 43` se do druhé třídy nesmí dostat

První list pro dvojku vyšel s `82 : 2 = 41` a `86 : 2 = 43`. Matematicky
správně, beze zbytku, v oboru do sta — a přesto je to **dělení dvojciferného
čísla mimo obor násobilky, tedy látka čtvrté třídy.** Školákov má „Násobení
a dělení 2, 3, 4, 5", což znamená podíl do desíti.

Strop na podíl (`maxQuotient` v `tasks/arithmetic`) proto platí **jen pro
dvojku**; vyšší ročníky mají výstup zmrazený v golden snímcích a strop by jim
ho přepsal. Jestli `86 : 2` patří do třetí třídy, je samostatná otázka.

**Důsledek, který stál víc práce než ten strop:** podíl do desíti se do
souřadnicové šifry nevejde vůbec, protože kód políčka je 11–99. Dělení tedy
na takovém listu ve druhé třídě nikdy nebude — a hláška o chudém poměru
operací hlásila schodek při každém pokusu, s radou „zkus Jinou variantu",
která pomoct nemohla. `mixShortfall` proto nově počítá jen s operacemi, které
se na list **mají jak dostat** (`achievableOperations`
v `activities/cipher-grid`): ptá se na celý obor kódů tabulky, ne na kódy,
které padly na tenhle list, takže „tady to nevyšlo" zůstává důvodem zkusit
další semínko a jen „nejde to nikde" důvodem není. Naměřeno na 200 semínkách
a tajence o 15 písmenech: 3/200 místo 200/200, tedy míň než dnešní trojka.

### Rozklad se nesmí hlásit k dělení

`reachableValues` se ptá i po jedné operaci zvlášť — z toho si šifra staví
`reachablePools` (kam rozprostřít písmena) a `mixShortfall` zjišťuje, na co
si smí stěžovat. Generátor rozkladu na dotaz „co umíš dělením?" nejdřív
odpovídal „všechno od 10 do 99", protože mix ignoroval celý.

Správné pravidlo je **násobení NEBO sčítání** (`matchesMix`), ne „na
operacích vůbec nezáleží":

- učitel, který v září odškrtne násobení, rozklad dostane dál — `· 10` je
  zápis desítek, ne násobilka, a to je celý důvod samostatného zaškrtávátka;
- dotaz na dělení nebo na samotné odčítání vrátí prázdno, takže šifra na
  dělení nečeká tam, kde nemá jak vzniknout.

### Co se ověřilo

- `npm run check` zelené: 675 testů, z toho tři nové golden snímky pro dvojku
  (výchozí, bez přechodu, rozklad).
- **1200 listů ve všech pěti aktivitách napříč 3.–8. ročníkem má bit shodný
  kontrolní součet i shodné ústupky** proti stavu před změnou. Proto
  `GENERATOR_VERSION` zůstává na 11 — přesně jak §9 předpokládal.
- Vytištěno headless Chromem přes sdílecí odkaz: zaškrtávátko sedí vedle
  ročníku, list pro září je bez přechodu i bez dělení a rozklad se sází
  správně.
