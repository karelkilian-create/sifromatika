# Procenta a desetinná čísla

**Stav: hotovo.** Schváleno a implementováno 14. 8. 2026, včetně zápisu
`25 % z 80`. Co se od návrhu odchýlilo, je v §11.

Krok 3 z pořadí v `docs/SIFROMATIKA-EVALUATION.md` §G, odložený za registr aktivit.
Stav před zásahem: 12 testovacích souborů, 222 testů.
Stav po zásahu: 14 souborů, 272 testů, `npm run check` čistý.

---

## 1. Proč tohle a proč teď

Nový generátor úloh se promítne do **obou hotových aktivit najednou** — do šifry
i do listu řad, bez jediného řádku v nich. Nová hra se promítne jen do sebe.

Druhý důvod je konkrétnější. `core/constraints/index.ts:93` říká, proč se
9. ročník v rozbalovátku nenabízí: chybí mu rovnice, lomené výrazy **a procenta**.
Dnes deváťák dostane osmáckou matematiku, takže se mu nedá nabídnout vůbec.
Procenta jsou první ze tří věcí, které ho odemknou. (Neodemykají ho samy — viz §7.)

Třetí důvod je načasování: rozšíření verifikace se dělá snáz nad dvěma aktivitami
než nad pěti. `docs/SIFROMATIKA-EVALUATION.md` §D to má v REFACTOR LATER
s podmínkou „až přijdou ta témata". Přišla.

---

## 2. Železné pravidlo, které se nemění

**Výsledek úlohy musí zůstat kladné celé číslo.** Není to matematické omezení,
ale důsledek toho, že výsledek slouží jako kód políčka v mřížce.

Desetinná čísla a procenta proto patří do **operandů**, ne do výsledku:

| Zadání | Výsledek | Smí na list? |
|---|---|---|
| `25 % z 80` | 20 | ✅ |
| `3,5 · 4` | 14 | ✅ |
| `12,6 : 0,3` | 42 | ✅ |
| `2,5 + 3,5` | 6 | ✅ |
| `0,3 · 7` | 2,1 | ❌ výsledek není celý |
| `15 % z 80` | 12 | ✅ |
| `7 % z 300` | 21 | ✅ ale viz §4 |

Hezké na tom je, že omezení dělá úlohy **didakticky lepší**, ne horší: čísla
vycházejí, dítě si ověří výsledek zpětně a učitel nemusí řešit zaokrouhlování.

---

## 3. Co dnes v kódu brání

Ověřeno čtením, ne odhadem:

| Místo | Co tam je | Co s tím |
|---|---|---|
| `core/verify/index.ts:84` | tokenizer čte jen `0`–`9`; desetinná čárka je „neznámý znak" a hodí `ExpressionError` | rozšířit o desetinná čísla a `%` |
| `core/verify/index.ts:368` | `computed === slot.declaredValue`, exaktní rovnost | viz §4 — **tohle je ta past** |
| `core/sequence/index.ts:61` | `/^\d+$/` — člen řady smí být jen kladné celé číslo, ani mínus neprojde | nechat být, viz §8a |
| `core/model/index.ts:19` | `SkillTag` nemá jedinou položku pro desetinná čísla ani procenta | doplnit řízený slovník |
| `core/model/index.ts:139` | `DifficultyProfile` nemá pole, kterým by se desetinná čísla zapnula | přidat `decimals` a `percents` |

Naopak **beze změny zůstává** celá vrstva šifry, obě aktivity, registr, render
i formát `.sifra`. Přidávají se dva generátory do `tasks/` — přesně tou cestou,
kterou už prošly číselné řady.

---

## 4. Past, na kterou se přijde až u učitele

Tohle je nejdůležitější věta celého návrhu. Dnešní verifikace porovnává výsledek
**přesně** (`core/verify/index.ts:368`). S desetinnými operandy to přestane platit:

```
0,07 · 300  →  21.000000000000004
1,1 + 2,2   →  3.3000000000000003
```

Spočítal jsem, jak často to nastane: ze 1800 kombinací (činitel 1–200 × desetina
0,1–0,9) vyjde **3× výsledek, který je prakticky celý, ale ne přesně**. Zbytek
je v pořádku — `0,1 · 80` i `3,5 · 4` vycházejí přesně.

A právě ta vzácnost je nebezpečná: projde to testy, projde to zkušebním tiskem
a spadne to učiteli jednou za čas jako „list se nevygeneroval, zkus jinou
variantu". Bez vysvětlení.

**Návrh řešení** — dvě změny ve `verifySlot`, obě výslovné a okomentované:

1. Porovnávat s tolerancí `1e-9` místo `===`. Chyba generátoru je vždy řádová
   (spletená operace, špatný operand), ne v deváté desetině — tolerance
   verifikaci neoslabí.
2. Přidat **novou kontrolu**: výsledek musí být celé číslo. Dnes ji nikdo
   nepotřebuje, protože celé je všechno; s desetinnými operandy se z ní stává
   ta věc, která hlídá pravidlo z §2. Nový kód selhání: `non-integer-result`.

Alternativa — přepsat `evaluateExpression` na celočíselnou aritmetiku v setinách —
je čistší matematicky, ale znamená zásah do jádra modulu, který je jedinou obranou
proti rozdání 25 rozbitých listů. Za tuhle cenu to nestojí.

---

## 5. Dva nové generátory, ne rozšíření aritmetiky

Do `src/tasks/` přibydou dva adresáře vedle `arithmetic/` a `sequence/`:

```
src/tasks/decimal/     desetinná čísla v operandech
src/tasks/percent/     procenta
```

**Proč ne rozšířit `arithmetic`:** ten už dnes nese 14 tvarů složených výrazů
a druhou osu (`generatorMix`) má projekt hotovou — učitel jí zapíná číselné řady.
Procenta jsou pro něj tentýž druh volby: „chci na listu i procenta." Kdyby se
schovala dovnitř aritmetiky, nešla by vypnout zvlášť.

**Tvary, které navrhuji** (každý vyrobí zadaný cíl, jinak vrátí `null`):

*Desetinná čísla* — cíl `t`:
- `t : d · d` → např. `3,5 · 4` (desetina krát činitel, součin celý)
- `a,b + c,d` → sčítání dvou desetinných se součtem celým: `2,5 + 3,5`
- `a,b − c,d` → totéž pro odčítání
- `x : 0,d` → dělení desetinným číslem: `12,6 : 0,3`, sedmá třída a výš

*Procenta* — cíl `t`:
- `p % z c` pro hezká `p` (1, 5, 10, 20, 25, 50, 75) → `25 % z 80`
- `p % z c` pro obecné `p` od sedmého ročníku → `35 % z 60`
- `c − p % z c` → „sleva": `200 − 25 % z 200`, osmá a devátá

Doporučuji začít **jen prvními dvěma tvary každého generátoru** a zbytek přidat
po zkušebním tisku. U aritmetiky se ukázalo, že didaktická vhodnost tvaru se
pozná až na papíře (viz `subtractionCeiling` a to, jak vznikla).

---

## 6. Profil obtížnosti

`DifficultyProfile` dostane dvě pole:

```ts
/** Smí se v operandech objevit desetinné číslo? Kolik míst. */
decimals: 0 | 1 | 2
/** Smí se objevit počítání s procenty? */
percents: boolean
```

Rozdělení podle ročníků odpovídá běžnému postupu na české ZŠ:

| Ročník | `decimals` | `percents` | Proč |
|---|---|---|---|
| 3.–4. | 0 | ne | ještě nejsou v učivu |
| 5. | 1 | ne | desetinná čísla se zavádějí, procenta ne |
| 6. | 2 | ne | desetinná čísla se procvičují naplno |
| 7. | 2 | **ano** | procenta jsou látka sedmého ročníku |
| 8. | 2 | ano | k tomu už hotové mocniny |
| 9. | 2 | ano | ale ročník zůstává zavřený, viz §7 |

Přidání polí se dotkne i `.sifra`: profil se ze souboru **neobnovuje**, počítá se
znovu z ročníku (`payload-utils.ts:parseDifficulty`). Uložené soubory se proto
nerozbijí a naopak: loňský list se čtvrťáckou šifrou vytiskne přesně stejně,
protože pro čtvrtou třídu jsou obě nová pole vypnutá.

---

## 7. Devátý ročník zůstává zavřený

Procenta jsou jedna ze tří věcí, které mu chybí. Rovnice a lomené výrazy zůstávají.
**Nenavrhuji ho v tomhle kroku otevřít** — dát deváťákovi osmáckou matematiku plus
procenta pod nadpisem „9. třída" je pořád ta situace, před kterou varuje komentář
v `core/constraints/index.ts:93`: vygenerovaný list bude matematicky správně,
takže to neodhalí ani verifikace. Jen učitel, až ho rozdá.

---

## 8. Čtyři rozhodnutí, u kterých potřebuju tvoje slovo

Ke každému píšu, co bych udělal já a proč. Stačí kývnout nebo opravit.

### a) Smí být chybějící člen řady desetinný?

**Doporučuji ne, zatím.** Dva důvody: `parseSequence` dnes čte jen `^\d+$`
a odpověď dítěte v řadě je „to samé číslo, jaké se počítá" — u desetinných řad
(`1,5  3  4,5  6  ?`) by se navíc plovoucí čárka projevila nejsilněji, protože
se krok aplikuje opakovaně. Kdyby se to později chtělo, správná cesta je počítat
členy v setinách jako celá čísla a dělit až při sazbě.

Desetinná čísla se tím neztratí — procvičí se v operandech příkladů, kterých je
na listu většina.

### b) Jak se na papíře píše procento?

**Doporučuji `25 % z 80`** — mezera před `%` podle ČSN, předložka `z`.
Tokenizer bude přijímat i `ze` (kdyby soubor přišel z ruční úpravy), ale generátor
bude vyrábět vždy `z`. Ty sázíš pracovní listy roky, takže tohle je otázka
na tebe: je „25 % z 80" tvar, který dáváš dětem?

### c) Desetinná čárka, nebo tečka?

**Doporučuji čárku** — český úzus, a hlavně je volná: členy řad odděluje
mezera právě proto, aby čárka mohla dělat desetinnou (je to zapsané v `core/sequence`).
Tokenizer přijme obojí, generátor vyrobí čárku.

### d) Kolik desetinných míst nejvýš?

**Doporučuji dvě** (setiny), a to až od šesté třídy; pátá jen desetiny.
Tisíciny na listu pro ZŠ znamenají počítání na papíře, ne z hlavy — a to není,
co má šifra procvičovat.

---

## 9. Postup a kontrola

Šest kroků, po každém zelené testy:

1. `core/verify` — tokenizer o desetinná čísla a `%`, tolerance a kontrola
   celočíselnosti výsledku (§4). Samostatně a první, protože je to nejrizikovější
   část a všechno ostatní na ní stojí.
2. `core/model` — `SkillTag`, `decimals` a `percents` v profilu.
3. `core/constraints` — profily ročníků podle tabulky v §6.
4. `tasks/decimal` — generátor, první dva tvary.
5. `tasks/percent` — generátor, první dva tvary.
6. UI — dvě zaškrtávátka v pokročilém nastavení, přesně jako dnešní „Číselné řady";
   `GENERATORS` v `activities/cipher-grid/payload.ts` o obě nová id.

**Jak se pozná, že to sedí:**

- 222 stávajících testů zelených, včetně golden snapshotů. Ty jsou tu klíčové:
  chybějící `generatorMix` znamená `{ arithmetic: 1 }`, takže **starý seed musí
  dát bit shodný list i po přidání dvou generátorů**. Přesně na tohle ta pojistka
  je a teď se poprvé doopravdy vyzkouší.
- Nové testy k verifikaci: `0,07 · 300` musí projít jako 21, `0,3 · 7` musí být
  odmítnuto jako necelý výsledek.
- Property test: pro každý ročník a každý povolený generátor platí, že vyrobená
  úloha má kladný celý výsledek a `evaluateExpression` na jejím textu dá totéž.
- **Zkušební tisk na papír**, ne do PDF. Desetinná čárka a `%` v tiskovém CSS
  se chovají jinak než na obrazovce.

**Riziko: střední**, soustředěné v kroku 1. Zásah do `core/verify` je zásah do
jediné obrany proti rozdání rozbitých listů, takže jde samostatně a s vlastními
testy dřív, než na něm začne cokoli stavět.

---

## 10. Co v tomhle kroku vědomě není

- Zlomky. Jsou to samostatné téma se samostatnou sazbou a `SkillTag`;
  desetinná čísla a procenta spolu souvisí, zlomky patří k rovnicím.
- Zaokrouhlování jako typ úlohy.
- Devátý ročník (§7).
- Desetinné členy řad (§8a).
- Slovní úlohy s procenty („Kabát stál 800 Kč a zlevnili ho o 25 %"). Ty potřebují
  `generatePool` z kontraktu `TaskGenerator`, který zatím nikdo neimplementuje —
  a je to samostatná práce, ne přívažek.

---

## 11. Co se od návrhu odchýlilo

1. **Předložka `z` je vlastní druh tokenu, ne alias pro násobení.** Kdyby byla
   `op`, hlásila by kontrola zápisu u `25 % z 80` dva operátory vedle sebe —
   a hláška o závorkách kolem záporného čísla by u procent nedávala smysl.
   Váže na úrovni násobení, takže `200 − 25 % z 200` je 150.
2. **Nevyvážené sčítance.** První verze vyrobila `0,2 + 45,8` — matematicky
   správně, na listu to vypadá jako chyba. Ukázalo se to až v prohlížeči, ne
   v testech. Celá část se teď losuje ze středních dvou třetin, takže vzniká
   `15,2 + 30,8`. Je to totéž pravidlo, jaké u odčítání hlídá `subtractionCeiling`,
   a má vlastní test.
3. **Test velikosti `.sifra` se posunul z 1200 na 1500 znaků.** Profil obtížnosti
   se do souboru serializuje a přibyla mu dvě pole. Mez je řádová pojistka proti
   tomu, aby do souboru začal padat vygenerovaný list — ne přesná hodnota.
4. **Zaškrtávátka se u nižších ročníků vůbec nezobrazují**, místo aby byla
   zašedlá. Odpovídá to pravidlu, které panel už dodržoval u voleb bez tajenky:
   nepoužitelná volba je šum, ne informace.
5. **Sama aritmetika se pořád zapisuje jako `{ arithmetic: 1 }`.** Kdyby se
   zapsala váhou 3 (jak to dělá mix se zapnutým zpestřením), změnil by se
   uloženým souborům obsah listu. Golden snapshoty to potvrdily.

**Ověřeno:** 222 původních testů beze změny výsledku — včetně golden snapshotů,
takže **přidání dvou generátorů do registru nezměnilo výstup starých seedů
na bajt**. To byla ta pojistka s chybějícím `generatorMix`, o které mluví §9,
a teď se poprvé doopravdy vyzkoušela. K tomu 49 nových testů.

V prohlížeči ověřeno na sedmé třídě: `65 % z 40 = 26`, `15,2 + 30,8 = 46`,
`8,6 · 5 = 43`, list řešení sedí, konzole bez chyb.

**Zkušební tisk na papír proběhl 14. 8. 2026 a sedí** — desetinná čárka i značka
`%` se vytiskly tak, jak vypadají na obrazovce, včetně listu s řešením. Tím je
splněná i podmínka z §9; krok je hotový celý, ne jen v kódu.
