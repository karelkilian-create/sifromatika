# Násobení a dělení zlomků

Provedeno **24. 8. 2026**, `GENERATOR_VERSION` 11. Etapa 3 zlomků — dluh, který
si etapa 2 pojmenovala v `docs/navrh-zlomkovy-vysledek.md` §10 bodem „Násobení
zlomků a smíšená čísla později".

Karel se 24. 8. zeptal, jestli se násobení a dělení zlomků generuje. Negenerovalo
a rozhodl, že má — **a rovnou do sedmého ročníku**, protože tam se zlomky počítají.

## 1. Co přibylo

```
2/3 · 3/5 = 2/5      3/4 · 1/6 = 1/8       1/6 · 3/5 = 1/10
1/2 : 1/4 = 2        1/4 : 5/6 = 3/10      9/10 : 1/10 = 9
```

Jen ve **hrách**, ze stejného důvodu jako sčítání zlomků: výsledek šifry je kód
políčka v mřížce a zlomek nemá kam ukázat (`TaskRules.fractionResults`). Ročníková
brána je stávající `DifficultyProfile.fractions`, tedy 7. ročník výš — nový příznak
v profilu by neměl co dělit a byl by to další pole v uloženém `.sifra`.

## 2. Co to rozbilo: lomítko nebylo zlomek

Etapa 1 stavěla na tom, že tokenizer zná `/` jako dělení a `3/4` mu dá 0,75.
U sčítání to platí a **u násobení to platí náhodou**: `a/b · c/d` vyhodnocené
zleva doprava je `((a:b)·c):d`, tedy `a·c/(b·d)` — správně.

U dělení to neplatí:

```
1/2 : 1/4   zleva doprava   1:2:1:4 = 0,125       má být 2
```

Verifikace by tedy každou úlohu na dělení zlomků zamítla — a měla by pravdu, protože
by četla něco jiného, než co je na papíře. Oprava je v tokenizeru
(`core/verify`): **číslice, lomítko, číslice bez mezer je jedno číslo.** Je to
tatáž podmínka, jakou má sazba (`MATH_PATTERN` v `render/screen/math.tsx`), a to je
na tom to podstatné — co se vytiskne jako jeden zlomek se zlomkovou čarou, to se
přečte jako jedno číslo.

Osamocené lomítko (`36 / 4`) dělením zůstává; takový zápis vzniká jen v ručně
upraveném souboru, generátor píše dvojtečku.

⚠ Hodnoty dosavadních úloh se tím **nemění**. `3/4 z 80` je pořád 60 a
`1/2 + 1/4` pořád 0,75 — ověřeno tím, že se před inkrementem verze nepřepsal ani
jeden golden snímek, který zlomky neobsahuje.

## 3. Co smí vyjít

Rozhoduje o tom jedno místo, `resultCandidate`, kterým chodí všechny čtyři operace:

| pravidlo | proč |
|---|---|
| nula ne | o zlomcích neukáže nic a sráží se s čímkoli na listu |
| jednička ne | `1/4 + 3/4 = 1` je táž úloha jako `2/5 + 3/5 = 1` |
| nepravý zlomek ne | `3/4 : 1/2 = 3/2` je smíšené číslo, a to tokenizer neumí (`2 1/2`) |
| celé číslo od dvou **ano** | `1/2 : 1/4 = 2`, kanonická úloha na dělení zlomků |
| jmenovatel z `DENOMINATORS` | tentýž seznam, jaký smí stát v zadání |

Poslední řádek je jediný, který bylo potřeba vymyslet. Bez něj vzniká
`7/8 · 9/10 = 63/80`: správně spočítaný nesmysl. První verze návrhu měla vlastní
strop (dvanáct), ale jeden seznam pro obě strany rovnítka je lepší ve dvou
ohledech:

- nevznikne `4/7` ani `5/9`, tedy zlomek, o kterém modul o řádek výš tvrdí, že
  s ním dítě nepočítá;
- **drží invariant párovací kontroly.** `verifyDistinctValues` porovnává výsledky
  jako čísla zaokrouhlená na dvě desetinná místa a spoléhá na to, že se dva různé
  zlomky nikdy nesejdou na téže hodnotě — nejtěsnější dvojice ze seznamu (`1/10`
  a `1/8`) se liší o 0,025. Volnější jmenovatel to boří: `1/8` a `2/15` se obě
  tisknou jako 0,13, takže by kontrola zahodila jinak správný list. Hlídá to test.

Celé číslo jako výsledek je jediné místo, kde rodina „zlomek jako výsledek" tiskne
číslo, a tedy nemá `printedValue` — `2` se od `formatValue(2)` neliší.

## 4. Nejdražší část: poměr úloh na listu

Přidat dva tvary do stávajícího `fraction-sums` byla první, nejlevnější varianta.
Naměřeno na ní:

```
podíl hodnot v jednom pytli:   sčítání 27 %   násobení 20 %   dělení 53 %
```

Dělení vyhrálo, protože sahá na osm celých hodnot (2 až 9), kam se součin dvou
pravých zlomků nikdy nedostane. Na dvanácti kartičkách by pak násobení zlomků
vyšlo **jednou** — a to je přesně vada, kterou u zlomkového výsledku opravila
verze 9 a u témat verze 5: *poměr nesmí záviset na tom, jak široký obor čísel
který tvar náhodou pokrývá.*

Řeší se tedy týmž způsobem: **vlastní id, vlastní zásoba, vlastní váha.** Jedno
zaškrtávátko „Zlomky" se překládá na čtyři generátory:

| id | tvar | hodnot |
|---|---|---|
| `fractions` | `3/4 z 80` | 644 |
| `fraction-sums` | `1/2 + 1/4` | 19 |
| `fraction-products` | `2/3 · 3/5` | 15 |
| `fraction-quotients` | `1/2 : 1/4` | 25 |

Naměřeno po opravě (dvacet seedů, pexeso o dvanácti dvojicích, jen zlomky):
**32 / 20 / 22 / 27 %**.

### 4.1 Váha tématu se musí dělit, ne násobit

Čtyři id na jedno zaškrtávátko odhalila starší vadu. Váhy byly „jedna za
generátor", takže zlomky se dvěma id zabraly vedle samotného počítání **dvě
třetiny** listu — ačkoli nápověda v editoru slibuje, že se zaškrtnutá témata
míchají rovnoměrně. Se čtyřmi id by to byly čtyři pětiny.

Váha jednoho tématu je proto `TOPIC_WEIGHT` = 12 a zlomky berou 4 × 3. Dvanáctka
je nejmenší číslo dělitelné dvěma, třemi i čtyřmi, takže se váha rozdělí celočíselně
a do souboru ani do odkazu se nedostane desetinné číslo.

⚠ Přenásobení všech vah touž konstantou samo o sobě výstup **nemění**:
`rng.weighted` losuje z `next() · součet vah`. Změní se jen podíl zlomků —
naměřeno 51 % počítání a 49 % zlomků tam, kde bylo 33 : 67.

## 5. Co se ještě opravilo

**Tvar se vybírá před losováním.** Do verze 10 se losoval jeden ze dvou tvarů
a osmkrát se zkoušelo. Se dvěma tvary to nebylo vidět; u dělení, kde většina cílů
patří jedinému tvaru, by to znamenalo mizející úlohy. Nově se tvary pro daný cíl
prosejí předem a losuje se jen z těch, které pro něj něco mají.

## 6. Cena

- `core/verify` — zlomková čára v tokenizeru, tři řádky v `evaluateExpression`;
- `core/model` — jedna dovednost (`zlom.nasobeni-deleni`);
- `tasks/fractions` — dva tvary, sdílené `resultCandidate`, generátor jako
  fabrika nad seznamem tvarů;
- `tasks/mix` — `TOPIC_WEIGHT` a překlad na čtyři id;
- `tasks/registry` a tři seznamy povolených id ve hrách (past z verze 9: nový
  generátor, který se nedoplní do `GENERATORS`, se cestou přes odkaz tiše
  zahodí — hlídá `activities/payload.test.ts`);
- editor — jen ukázka v nápovědě, zaškrtávátko už existuje;
- render **nic**, sazba zlomku je hotová od etapy 2.

## 7. Zámek

- testy generátoru: operandy pravé a v základním tvaru, součin pravý zlomek se
  jmenovatelem ze seznamu, podíl pravý zlomek **nebo** celé číslo od dvou, nikdy
  nepravý zlomek; celé číslo bez `printedValue`; `1/2 : 1/4` v zásobě je;
- test, že se dva různé výsledky celé rodiny nesejdou na dvou desetinných místech;
- test, že každá slíbená hodnota se opravdu vyrobí (zámek na výběr tvaru před
  losováním);
- testy tokenizeru v `core/verify`: zlomková čára váže těsněji než tečka
  i dvojtečka, lomítko s mezerami zůstává dělením, nulový jmenovatel je vada;
- nový `tasks/mix.test.ts`: zlomky váží jako jedno téma, uvnitř se váha dělí
  rovným dílem, váhy jsou celá čísla;
- golden snímky pexesa a domina se zlomky obsahují `·` i `:` včetně
  `1/2 : 1/4 = 2`;
- `npm run check` — 628 testů.

## 8. Zkušební tisk

Proběhl (headless Chrome přes sdílecí odkaz, viz poznámky o tisku do PDF):
domino a pexeso, 7. ročník, jen zlomky. Sazba se nemění, a přesto to nebyla
formalita — hlídané riziko bylo, že **flex ořeže mezery kolem dvojtečky mezi
dvěma zlomky**, tedy táž vada, jaká v dominu vyrobila `9/10z 340`. Nezopakovala
se: `MathText` vrací jeden `<span>`, takže se mezery uvnitř chovají jako
v běžném textu. Na papíře stojí `1/6 : 1/2` i `3/10 · 2/3` se zlomkovou čarou
a s mezerami, domino dvě stránky a pexeso tři — přesně tolik, kolik má listů.

Učitelská tabulka pexesa tiskne `1/2 : 1/4 = 2` a `9/10 : 1/10 = 9` jako čísla,
ne jako `2/1` ani jako desetinné číslo — `printedResult` je jediná cesta k obojímu.

Papírem to ještě projít má.

## 9. Co zbývá

**Smíšená čísla.** Pořád stojí na tom, že tokenizer neumí `2 1/2` — mezi `2`
a `1` není operátor a členy číselné řady se oddělují právě mezerou. Dokud to
neplatí, `3/4 : 1/2` do zásoby nepatří.
