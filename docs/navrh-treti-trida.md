# Třetí třída: dokončit násobilku

Návrh k rozhodnutí, **31. 8. 2026**. Vzniklo z Karlovy otázky, jestli
`86 : 2 = 43` patří do třetí třídy — a odpověď na ni je jen první odstavec.
Zbytek je to, co se přitom našlo.

## 1. Otázka, se kterou to začalo

Po dostavbě druhé třídy zůstalo otevřené, jestli strop na podíl (dělení jen
v oboru malé násobilky) má platit i pro trojku. Karel proti tomu postavil
`72 : ? = 9`, které našel na Školákově, s tím, že je to mnohem těžší úloha.

**Odpověď: `86 : 2` ve třetí třídě zůstane.** Rozhoduje o tom Školákov sám —
třetí ročník tam má samostatný oddíl **„Násobení a dělení mimo obor
násobilek"**. Strop tedy dál platí jen pro dvojku, kde násobilka končí pětkou.

Ty dvě úlohy navíc nejsou těžké stejným způsobem:

| | `86 : 2 = 43` | `72 : ? = 9` |
|---|---|---|
| Čísla | mimo násobilku | uvnitř násobilky (8 · 9) |
| Co dítě dělá | rozloží 86 na 80 + 6 a dělí po částech | vybaví si spoj, který zná |
| Co je nové | **technika** | **obrácení otázky** |

Karlova intuice, že `72 : ? = 9` je těžší, míří na to obrácení. Jenže z toho
neplyne, že se má trojka omezit — plyne z toho, že se má **rozšířit**. Tenhle
návrh je o tom.

## 2. Co Školákov ve třetí třídě má

| Oddíl | Stav v Šifromatice |
| --- | --- |
| Minutovky — opakování 2. ročníku | profil dvojky, hotovo |
| Sčítání a odčítání 0–100, dvojciferná | umí |
| **Násobení a dělení 6, 7, 8, 9** (čtyři samostatné oddíly) | **nevznikne nikdy, viz §3** |
| Násobení a dělení 0–10, souhrnné | totéž |
| Čísla do 1 000 — řazení, porovnávání | porovnávání nedá jedno číslo, řady umí |
| Pamětné sčítání a odčítání do 1000 | obor trojky je dnes 100, viz §7 |
| Písemné sčítání a odčítání do 1000 | sazba do sloupečku, nemáme a neplánuje se |
| Zaokrouhlování na stovky | viz §8 |
| Dělení se zbytkem | dva výsledky, nejde zašifrovat — §8 |
| Násobení a dělení mimo obor násobilek | **umí a zůstává**, viz §1 |

## 3. Vada: trojce chybí těžká polovina malé násobilky

`gradeProfile(3).multiplicationTables` je dnes `[2, 3, 4, 5, 10]` — tedy
násobilka druhé třídy plus desítka.

Druhý činitel se přitom losuje z 1 až 10 (`mulCandidates`), takže `3 · 7`
vzniknout může. **Součin dvou činitelů od šesti výš ale nevznikne nikdy**,
protože ani jeden z nich není v žádné povolené řadě. Totéž u dělení:
`56 : 7` ani `72 : 8` trojka nedostane.

Naměřeno na 200 semínkách, tajenka o 15 písmenech, souřadnicová šifra:

| | dnes | s plnou násobilkou |
|---|---|---|
| součinů na listech | 479 | 547 |
| z toho **oba činitele ≥ 6** | **0** | 233 |
| hláška o chudém poměru operací | 18/200 | 8/200 |

Nula ze čtyř set sedmdesáti devíti. Přitom `7 · 8`, `6 · 7` a `9 · 8` jsou
**hlavní obsah toho ročníku** — Školákov jim věnuje čtyři samostatné oddíly.
Učitel, který si vybere třetí třídu, aby procvičil násobilku sedmi, ji
nedostane ani jednou.

Je to táž vada, kvůli které vznikl profil pro dvojku: ročník pod svým jménem
nabízí obsah jiného ročníku. Jen tady byla schovaná o rok výš.

**Vedlejší zisk:** hláška o chudém poměru operací klesne na polovinu.
Násobení dnes v trojce trefí málo kódů políček, protože z pěti řad jich
dosáhne na málo hodnot; s plnou násobilkou má z čeho brát.

**Návrh:** `multiplicationTables: [2, 3, 4, 5, 6, 7, 8, 9, 10]` pro třetí
ročník, tedy totéž co čtvrtý. Čím se pak ty dva ročníky liší, řeší §6.

## 4. Vada: rovnicové tvary jsou o dva ročníky výš

`72 : ? = 9` je u nás tvar `missing-divisor` (`a : ? = c`) s `minGrade: 5`.
Změřeno na 120 semínkách: **ve 3. i 4. ročníku nula výskytů**, v páté 135.

Celý žebříček tvarů v `tasks/equation`:

| Tvar | Příklad | Dnes | Návrh |
| --- | --- | --- | --- |
| `? + b = c` | `? + 15 = 40` | 2 | 2 |
| `a + ? = c` | `15 + ? = 40` | 2 | 2 |
| `? − b = c` | `? − 15 = 25` | 3 | 3 |
| `a − ? = b` | `84 − ? = 30` | 4 | 4 |
| `a · ? = c` | `8 · ? = 56` | 4 | **3** |
| `? : b = c` | `? : 8 = 9` | 4 | **3** |
| `a : ? = c` | `72 : ? = 9` | 5 | **4** |

⚠ Dokud se neudělá §3, je posun `a · ? = c` na trojku k ničemu: operandy
tenhle tvar bere z `multiplicationTables` (`operandPool`), takže by v trojce
uměl jen `2 · ? =` až `5 · ? =`. **Obě změny drží pohromadě.**

### Proč `72 : ? = 9` až do čtvrté, když Školákov ho má ve třetí

Vědomý posun o rok, přesně jako u desetinných čísel: RVP je zavádí v páté,
Šifromatika je nabízí od šesté (rozhodnuto 21. 8. 2026), protože **učitel,
kterému se na listu objeví látka, co se ještě nebrala, si spíš řekne, že
nástroj neumí ročníky, než že si něco zaškrtl.** Kdo ten tvar chce dřív,
přepne ročník — to je jednodušší než ho vysvětlovat.

Druhý důvod je §6: musí zbýt něco, čím se čtvrtá třída od třetí liší.

Podstatné je, že se ten tvar posune **o dva ročníky dolů proti dnešku**, ne
kde přesně se zastaví. Kdyby ho Karel chtěl rovnou do trojky, je to jedna
číslice.

## 5. Co se přibalí: poměr hledaného čísla a operandu

Bod, který čeká od 23. 8. 2026 (`docs/navrh-chybejici-cislo.md` §10): na
domino z rovnic vyšlo `78 + ? = 80`, kde dítě nepočítá, jen přečte rozdíl
dvou skoro stejných čísel. Naměřeno na 2160 úlohách zhruba jedna kartička na
čtyři až osm domin.

U toho bodu stojí výslovně: **„přidat k nejbližšímu kroku, který
`GENERATOR_VERSION` zvedne stejně"**. Tenhle krok je ten nejbližší.

⚠ Oprava se musí vyhnout tvarům z rozkladu (`? · 10 + 7 = 47`), kde je
hledané číslo jednociferné vedle dvojciferného **schválně** — poznat v 47
čtyři desítky je ta procvičovaná dovednost. Je to zapsané
v `docs/navrh-druha-trida.md` §5.

## 6. Čím se pak liší třetí třída od čtvrté

Po §3 mají oba ročníky **stejný profil obtížnosti** — obor do sta, plnou
násobilku, dva členy. Rozdíl nese vrstva úloh, a je to podstatný rozdíl:

| Co čtvrtá umí a třetí ne | Kde |
| --- | --- |
| střídavý krok v řadě (`3 8 11 16 ?`) | `alternating`, minGrade 4 |
| rostoucí krok (`2 3 5 8 ?`) | `growing`, minGrade 4 |
| řada násobením (`3 6 12 24 ?`) | `multiply`, minGrade 4 |
| `84 − ? = 30` | `missing-subtrahend`, minGrade 4 |
| `72 : ? = 9` | `missing-divisor`, po §4 minGrade 4 |

Pět tvarů úloh je víc než dnešní rozdíl, kterým je jediná položka v poli
násobilky. **Ročníky se tím nesplynou, jen se přestanou lišit velikostí čísel
a začnou se lišit stavbou úlohy** — a to je přesně princip, na kterém stojí
rozdíl mezi pátou a šestou třídou (viz komentář u `CARD_VALUE_MAX`).

## 7. Obor do tisíce: proč se odkládá

Školákov má ve třetí třídě „Pamětné sčítání a odčítání do 1000" (`253 + 4`,
`645 + 32`, `184 − 56`) a naše trojka počítá do sta. Nabízí se to opravit
hned. **Nedoporučuju to** a důvod není lenost, ale kaskáda:

```
dnes      3: 100    4: 100     5: 1000    6: 10 000 (+ tři členy, desetinná)
```

Trojka na 1000 ji položí nad čtyřku. Posunout čtyřku znamená posunout pětku,
a ta narazí na šestku, která má obor 10 000 a od pětky se odlišuje **stavbou
úlohy, ne velikostí čísel**. Skončí to buď u pátého ročníku se stotisícovým
oborem — kde se z hlavy nepočítá nic, což je proti smyslu profilu — nebo
u dvou ročníků se shodným oborem, tedy tam, kde jsme začali.

Na šifru to navíc skoro nemá vliv: **výsledek je kód políčka, tedy 11 až 99**,
takže obor mění jen velikost operandů (přes `subtractionCeiling`) a zásobu
hodnot ve hrách. Zisk je nejmenší ze všeho v tomhle návrhu a cena největší.

**Návrh: samostatné rozhodnutí, vlastní návrh, až se pro něj Karel rozhodne.**
Že to bude stát druhý inkrement verze, je vědomá cena — ne přehlédnutí.

## 8. Co se ze Školákova nedělá

**Dělení se zbytkem** (`23 : 4 = 5 zbytek 3`). Dva výsledky, a šifra potřebuje
jedno kladné celé číslo jako kód políčka. Táž překážka jako u porovnávání
z druhé třídy. ⚠ Profil má pole `divisionExactOnly` a `SkillTag`
`arit.deleni-se-zbytkem` — obojí je dnes mrtvé a tenhle odstavec je důvod,
proč se neoživí.

**Zaokrouhlování na stovky.** Výsledek by jedno číslo byl, ale je to vždy
násobek stovky — a kód políčka v souřadnicové tabulce nikdy nekončí nulou,
takže by se do šifry nedostalo ani jedno. K tomu potřebuje slovní pokyn
(„Zaokrouhli"), což u prvního stupně vadí zvlášť (`docs/navrh-druha-trida.md`
a pravidlo o bezeslovném zadání).

**Písemné sčítání a odčítání do sloupečku.** Sazba, ne generátor. Vlastní
tvar dokumentu, samostatné rozhodnutí.

**Porovnávání a řazení, převody jednotek.** Zamítnuté už dřív a ze stejných
důvodů (`docs/navrh-prevody-jednotek.md`).

## 9. Cena: GENERATOR_VERSION 12

Tohle je první krok od dvojky, který **mění výstup ročníků, které už někdo
používá.** Následky, ať se na ně nezapomene:

- každý uložený `.sifra` a každý sdílený odkaz vygeneruje **jiný list** —
  učiteli se ohlásí nesouhlasící kontrolní součet;
- **přepíšou se všechny golden snímky**, ne jen ty pro trojku a čtyřku:
  `createRng` dostává `${generatorVersion}|${seed}` ve všech pěti aktivitách;
- druhá třída se nezmění obsahem (na její profil se nesahá), ale její listy
  se přelosují taky, protože sdílí tentýž seed.

Právě proto jdou §3, §4 a §5 v jednom kroku. Tři inkrementy za sebou by
znehodnotily sdílené odkazy třikrát.

## 10. Pořadí prací

1. **Násobilka 6–9 do trojky** (§3) — jedna položka v profilu. Samostatně
   tisknutelné a samostatně schvalitelné.
2. **Rovnicové tvary o ročník níž** (§4) — tři čísla v `SHAPES`.
3. **Poměr hledaného čísla a operandu** (§5) — jediná věcná práce navíc.
4. Inkrement `GENERATOR_VERSION` na 12 s poznámkou do historie ve
   `version.ts` a přepsání golden snímků **jedním commitem**, aby se dalo
   přesně říct, co snímky přepsalo.

⚠ Kroky 1–3 se dělají **se starou verzí generátoru**, aby bylo v každé chvíli
vidět, co se změnilo obsahem a co jen přelosováním. Inkrement je poslední.

## 11. Odpovědi (Karel, 31. 8. 2026)

1. **`72 : ? = 9` rovnou do třetí**, ne do čtvrté. Návrh doporučoval čtvrtou;
   Karel rozhodl podle Školákova.
2. **Obor zvlášť** — §7 platí, samostatný návrh.
3. **Inkrement jde na produkci.** „Uložené listy nemá zatím skoro nikdo."

## 12. Co se postavilo

Hotovo 31. 8. 2026, `npm run check` zelené (683 testů). Přesně §3, §4 a §5,
s jedinou odchylkou: **`missing-divisor` šel na `minGrade: 3`**, ne na 4.
Že je to nejtěžší ze sedmi tvarů, nese dál `effort: 4`, ne ročníková brána.

### Čím se teď liší třetí třída od čtvrté

§6 počítal s pěti tvary; `72 : ? = 9` z nich odešel do trojky, takže zbývají
čtyři: střídavý krok, rostoucí krok, řada násobením a `84 − ? = 30`.

⚠ **Nesrovnalost, kterou to nechalo:** `a − ? = b` (`84 − ? = 30`) drží
`minGrade: 4`, ačkoli dítě u něj počítá obyčejné odčítání — je to snazší než
`72 : ? = 9`, které je nově ve trojce. Nechal jsem to být, protože to nikdo
neuvidí (chybějící tvar na listu nechybí) a je to jediné, co čtvrtou třídu
v rovnicích ještě odlišuje. Až se bude řešit obor (§7), stojí za rozhodnutí:
buď dolů, nebo se řekne nahlas, že čtvrtou třídu odlišuje obor a tvar může
dolů taky.

### Poměr hledaného čísla a operandu

Pravidlo je `hledané číslo · 10 ≥ druhý operand` (`MAX_OPERAND_RATIO`
v `tasks/equation`). `78 + ? = 80` vypadne, `99 + ? = 1000` zůstává.
Ověřeno na všech ročnících: nula porušení.

**Výjimka pro rozklad, kterou §5 požadoval, nakonec nevznikla** — a je to
správně. V `? · 10 + 7 = 47` je hledané číslo i druhý operand jednociferný,
takže poměr nikdy nepřekročí desítku a rozkladové tvary projdou samy.
Napsal jsem ji, test ukázal, že se nikdy neuplatní, a zůstalo z ní varování
u `balanced()`: kdyby se pravidlo někdy zpřísnilo na „hledané číslo pod
deset", výjimku bude potřeba udělat. Hlídá to test, který spadne první.

### Co ještě zůstalo stát

`4 · ? = 4` a `10 : ? = 10` (hledané číslo 1) generátor vyrobit umí, a poměr
na ně nesahá — 1 · 10 ≥ 4. Je to **starší vada než tenhle krok** a šifra si
o ni neřekne (kódy políček začínají jedenáctkou), ale hry ano. Na jeden
inkrement to nestojí; k příštímu se to přidá stejně jako teď poměr.

### Cena, která se zaplatila

`GENERATOR_VERSION` **11 → 12**. Přepsalo to **všechny golden snímky**, ne
jen ty pro trojku a čtyřku — `createRng` dostává `${generatorVersion}|${seed}`.
Dva testy si k tomu vyžádaly nové semínko (`golden-rady-12`), protože se do
nich po přehození netrefila ani jedna číselná řada a bez ní netvrdily nic;
je to týž postup jako u verze 8 a je zapsaný u nich v komentáři.
