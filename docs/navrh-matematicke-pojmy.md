# Návrh: Matematické pojmy

Stav: **hotovo** (2. 10. 2026). Co se proti návrhu při implementaci změnilo,
je v §10.

## 1. Proč

Děti umí spočítat `5 · 6`, ale nevědí, co je *součin*, a zaměňují
„o kolik“ s „kolikrát“. Nejčastěji chybují u obráceného směru: na otázku
„Které číslo je pětkrát menší než 40?“ odpoví 200. Tohle pozoroval Karel ve
třídě. Text zadání sepsal model, ale potřeba je skutečná.

Procvičuje se **formulace**, ne počítání. Čísla proto zůstávají malá
v každém ročníku.

## 2. Co se oproti původnímu zadání mění

| Zadání chtělo | Návrh | Proč |
|---|---|---|
| Téma i v **Číselných řadách** | **Ne.** | List řad napevno volá generátor `sequence` (`activities/sequence-sheet/index.ts:112`). Věta „Kolik je součin 5 a 6?“ řada není. |
| 1. stupeň **bez dělení** | **S dělením** podle profilu ročníku | Podíl a „kolikrát menší“ jsou hlavní obsah tématu a trojka už dělí (`72 : ? = 9`). Vlastní pravidlo vedle profilů by se s nimi časem rozešlo. |
| „Zahazuj neplatné a hlídej zacyklení“ | **Výčet dopředu** | Všechny kandidáty pro daný ročník vyrobí jedna funkce. `reachableValues` i `generateForValue` z ní čtou, takže zacyklení nemá kde vzniknout. Je to stejný vzor jako u `tasks/decomposition`. |
| Všechny typy ve všech hrách | **Dvoupojmové úlohy (typ 2) jen tam, kde se vejdou** | Viz §6. |
| Od 1. stupně | **Od 3. ročníku**, bez horní meze | Druhák čte slabikovaně, viz paměť „zadání bez textu“. Ve vyšších ročnících jde o opakování a malá čísla tam nevadí. |

## 3. Šablony

Šablony jsou pevné. Losují se jen pojmy, vztah a čísla. `{p}` je jeden ze
čtyř pojmů: **součet, rozdíl, součin, podíl**. U „jejich {p}“ se nic
neskloňuje, protože všechny čtyři pojmy mají 4. pád stejný jako 1. pád.

### Typ 1: jeden pojem (4 šablony)

| Id | Šablona | Výsledek | Podmínka |
|---|---|---|---|
| T1-soucet | Kolik je součet čísel {a} a {b}? | a + b | |
| T1-rozdil | Kolik je rozdíl čísel {a} a {b}? | a − b | a > b |
| T1-soucin | Kolik je součin čísel {a} a {b}? | a · b | |
| T1-podil | Kolik je podíl čísel {a} a {b}? | a : b | beze zbytku, b ≥ 2 |

### Typ 2: dva pojmy ve vztahu (4 šablony × dvojice pojmů)

Obě hodnoty se počítají ze **stejné dvojice čísel**, proto „jejich“.

| Id | Šablona | Výsledek | Podmínka |
|---|---|---|---|
| T2-o-vetsi | O kolik je {p1} čísel {a} a {b} větší než jejich {p2}? | P1 − P2 | P1 > P2 |
| T2-o-mensi | O kolik je {p1} čísel {a} a {b} menší než jejich {p2}? | P2 − P1 | P1 < P2 |
| T2-krat-vetsi | Kolikrát je {p1} čísel {a} a {b} větší než jejich {p2}? | P1 : P2 | P1 = k · P2, k ≥ 2 |
| T2-krat-mensi | Kolikrát je {p1} čísel {a} a {b} menší než jejich {p2}? | P2 : P1 | P2 = k · P1, k ≥ 2 |

Dvojice pojmů jsou uspořádané a různé (p1 ≠ p2), tedy 12 dvojic. U podmínky
„kolikrát“ jich spousta vypadne. Spolehlivě vychází například součin proti
podílu (`a·b : (a:b) = b²`) nebo součet proti rozdílu u vhodných čísel.

### Typ 3: obrácený směr (4 šablony)

| Id | Šablona | Výsledek | Podmínka |
|---|---|---|---|
| T3-o-vice | Které číslo je o {n} větší než {x}? | x + n | |
| T3-o-mene | Které číslo je o {n} menší než {x}? | x − n | x > n |
| T3-krat-vice | Které číslo je {k}krát větší než {x}? | k · x | |
| T3-krat-mene | Které číslo je {k}krát menší než {x}? | x : k | beze zbytku |

`{k}` se píše slovem: dvakrát, třikrát, čtyřikrát, pětkrát, šestkrát,
sedmkrát, osmkrát, devětkrát, desetkrát. Číslice („5krát“) jsou
v učebnicích méně obvyklé a dítě by si je mohlo přečíst jako „5 · …“.

**Celkem 12 šablon.** Opakování nehrozí jako u slovních úloh, protože
každá šablona má desítky různých čísel.

## 4. Čísla

Obor je stejný pro všechny ročníky, protože předmětem je formulace:

- součet, rozdíl, „o n“: výsledek i operandy do 100;
- součin, „krát větší“: činitelé z `multiplicationTables` profilu, nejvýš 10;
- podíl, „krát menší“: obrácená malá násobilka, dělitel ≥ 2;
- vždy kladné celé číslo, nula se nevyrábí.

Výsledky typu 2 „kolikrát“ jsou malé (2–10). Souřadnicová šifra má kódy
11–99, takže je tam neumístí a dostane je jen lineární šifra a hry. Tohle
`reachableValues` vyřeší samo, není to chyba.

## 5. Architektura

Jde o nový generátor se stejným vzorem jako `tasks/decomposition`:

- **`src/tasks/terms/index.ts`**, id `terms`. Funkce `candidates(profile)`
  vyrobí všechny platné úlohy jako mapu výsledek → seznam textů.
  `reachableValues` z ní vrátí klíče a `generateForValue` z ní vylosuje
  dosud nepoužitý text. Žádná smyčka „zkus znovu“.
- **Registr:** přidat na **konec** `taskGenerators`. Uložené seedy se tím
  nezmění a `GENERATOR_VERSION` zůstává 12.
- **Zadání:** nový druh `PromptNode` `{ kind: 'phrase'; text }`. Žádná
  strukturovaná data navíc, verifikace čte jen text.
- **Verifikace:** `core/verify` dostane vlastní čtečku vět. Rozpozná šablonu
  podle pevného textu, vytáhne čísla a spočítá výsledek **vlastní tabulkou**
  „pojem → operace“ a „vztah → operace“. Nesmí sdílet logiku s generátorem.
  Kdyby obojí mělo „pětkrát menší“ jako násobení, chybu by nic nechytilo.
  Text, který neodpovídá žádné šabloně, je chyba listu (`malformed-notation`).
- **Operace (`taskMix`):** každá úloha nese operace, které dítě opravdu
  použije: T1 svou operaci, T3 svou (o více = sčítání, krát menší =
  dělení), T2 operace obou pojmů plus odčítání nebo dělení za vztah.
  Úloha projde, jen když má učitel zaškrtnuté **všechny** její operace.
  Kdo odškrtne dělení, nedostane podíl ani „kolikrát“, ale téma mu zůstane.
  Na dotaz po jedné operaci odpovídá generátor jen úlohami, které nic
  jiného nepotřebují. Viz paměť „generátor nesmí lhát o operacích“.
  Jak šifra rozmisťuje písmena na hodnoty, které umí jen víceoperační
  úlohy typu 2, ověřím při implementaci na `cipher-grid`.
- **Formulář:** `TopicSelection.terms`, zaškrtávátko **„Pojmy: součet,
  součin, o kolik, kolikrát“**. Popisek vyjmenovává obsah, protože samotné
  „Matematické pojmy“ učiteli neřekne, co dostane. Dostupnost od 3. ročníku
  hlídá funkce `termsAvailable(profile)`, stejně jako
  `decompositionAvailable`.
- **Šifra:** přidat `'terms'` do `GENERATORS` v `cipher-grid/payload.ts`.

## 6. Hry a kartičky

| Aktivita | Typ 1 | Typ 2 | Typ 3 | Poznámka |
|---|---|---|---|---|
| Šifra | ano | ano | ano | pracovní list, délka nevadí |
| Bingo | ano | ano | ano | učitel zadání **čte nahlas** ze seznamu, nic se netiskne na kartu. Tady se procvičuje přesně porozumění formulaci. |
| Pexeso (60 × 60 mm, 20 pt) | ano | **ověřit tiskem** | ano | typ 2 má kolem 60 znaků, to je asi 5 řádků |
| Domino (půlka 42 × 42 mm) | ano | **ne** | ano | „Které číslo je pětkrát menší než 40?“ je na hraně, ověřit tiskem |
| Číselné řady | — | — | — | viz §2 |

U kartiček se typ 2 vypíná podle aktivity, ne podle ročníku. Kdyby nešel
na čtení ani typ 3, zkusí se menší písmo **jen** u kartiček s větou, ne
u všech.

## 7. Výchozí stav

- Nový učitel má zaškrtnuté všechno, tedy i tohle téma (od 3. ročníku).
- Uložené `.sifra`, odkazy a zapamatované nastavení **bez klíče `terms`**
  ho mají vypnuté. Odkaz musí dál vygenerovat týž list a učitel, který si
  nastavení vybral, nesmí dostat téma, které nezaškrtl.

## 8. Testy

- generátor: každá šablona vyrobí aspoň jednu úlohu; všechny výsledky jsou
  kladná celá čísla; rozdíl a „o kolik“ nikdy nejdou do minusu; podíl
  a „kolikrát“ dělí beze zbytku;
- `reachableValues` souhlasí s `generateForValue` pro každou hodnotu
  a každou jednotlivou operaci;
- verifikace: přečte každou šablonu; **odmítne** podvržený text se špatným
  výsledkem (`Které číslo je pětkrát menší než 40?` = 200); odmítne větu
  mimo šablony;
- mix: odškrtnuté dělení → žádný podíl ani „kolikrát“;
- golden snímek: šifra a pexeso pro 3. ročník s tématem; dosavadní snímky
  se nezmění;
- zkušební tisk pexesa a domina (headless Chrome, viz paměť).

## 9. Ke schválení

1. Seznam 12 šablon v §3, hlavně formulace a „dvakrát / pětkrát“ slovem.
2. Od 3. ročníku, nebo už od 2.?
3. Popisek zaškrtávátka.

## 10. Co se změnilo při implementaci (2. 10. 2026)

**Body z §9** zůstaly, jak je návrh navrhl: dvanáct šablon beze změny
znění, násobné číslovky slovem, od 3. ročníku, popisek „Pojmy: součet,
součin, o kolik, kolikrát“.

**Tři id generátoru místo jednoho.** S jedním `terms` vyšlo zkušební
pexeso z dvanácti dvojic bez jediného podílu, „kolikrát“ i „krát menší“.
Hra losuje výsledek rovnoměrně ze zásoby generátoru a dělení dává jen
čísla 2–10, kdežto součet a rozdíl celou stovku. Řešení je totéž jako
u zlomků: jedno zaškrtávátko, tři rodiny s vlastní zásobou a dělenou vahou.

| Id | Rodina | Šablony |
|---|---|---|
| `terms` | „o kolik“ | T1 součet a rozdíl, T2 „o kolik“, T3 o n větší/menší |
| `terms-products` | násobení | T1 součin, T3 krát větší |
| `terms-quotients` | dělení | T1 podíl, T2 „kolikrát“, T3 krát menší |

U T2 rozhoduje o rodině vztah, ne pojmy. Šifra dostává jen první dvě
rodiny po polovině váhy. Z dělení vychází číslo do deseti a souřadnicový
kód začíná jedenáctkou, takže by se losovalo naprázdno.

**Domino nevylučuje typ 2 podle typu, ale podle délky.** `TaskRules` má
nové pole `maxPromptLength` a domino ho nastavuje na 40 znaků. Nejdelší
věta typu 1 a 3 má 39 znaků („Které číslo je desetkrát menší než 100?“),
nejkratší věta typu 2 přes padesát, takže
strop typ 2 vyřadí celý a nic jiného nezasáhne. Hlídá to i verifikace
(`prompt-too-long`).

**Zkušební tisk** (headless Chrome, 3. ročník): pexeso unese i typ 2
(pět řádků při 20 pt), domino typ 1 a 3. Na šifře se věta zalomí na dva
řádky a list zůstal na jedné stránce. Menší písmo nebylo potřeba.

**Jednopísmenná slova.** Na pexesu se věta zalomila za „o“ („je o / 11“).
Sazba (`MathText`) teď za jednopísmennými předložkami a spojkami sází
nezlomitelnou mezeru. Text úlohy se nemění. Týká se to i `z` ve „3/4 z 80“.

**Rozložení na kartičkách** (golden pexeso, 3. ročník): ve dvanácti
dvojicích jsou všechny čtyři pojmy, „o kolik“, „kolikrát“ i „krát menší“.
