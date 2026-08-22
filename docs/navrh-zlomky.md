# Zlomky

Návrh k rozhodnutí, **22. 8. 2026**. Krok 4 z pořadí prací; poslední velké
téma před převody jednotek a slovními úlohami.

## 1. Co se učí a kdy

Zlomky se v RVP objevují už na prvním stupni (poloviny, čtvrtiny, desetiny),
ale těžiště je na druhém:

| Ročník | Látka |
|---|---|
| 6. | zlomek jako část celku, krácení a rozšiřování, sčítání a odčítání se stejným jmenovatelem |
| 7. | společný jmenovatel, násobení a dělení zlomků, smíšená čísla, racionální čísla |

Výchozí stav navrhuju stejný jako u desetinných čísel: **od šestého ročníku**.
Pátá třída je dostane jen tehdy, když si učitel přepne ročník — z týchž
důvodů, které jsou zapsané v `gradeProfile` u `decimals` (viz commit `873ef7f`).

## 2. Klíčové zjištění: půlka práce je hotová

`3/4 z 80` **projde dnešní verifikací beze změny**. Ověřeno spuštěním, ne
čtením kódu:

```
3/4 z 80 = 60     1/3 z 66 = 22     2/5 z 45 = 18
1/4 + 3/4 = 1     5/2 · 4 = 10      80 − 1/4 z 80 = 60
```

Vychází to ze tří vlastností, které tam už jsou:

- **lomítko je volné.** Generátor píše dělení dvojtečkou (`36 : 4`), takže
  `/` v žádném vygenerovaném zadání nestojí. Tokenizer ho zná jako dělení —
  a `3/4` jako dělení dá 0,75, tedy přesně tu hodnotu, kterou zlomek má.
- **předložka `z` už existuje** kvůli procentům a váže stejně těsně jako
  tečka. `80 − 1/4 z 80` je proto `80 − 20`, ne `(80 − 1/4) · 80`.
- **`part z celku` je tvar, který projekt umí.** `25 % z 80 = 20` a
  `1/4 z 80 = 20` jsou tatáž úloha dvěma zápisy; generátor procent je hotová
  předloha včetně toho, jak se hledá základ (`baseFor`).

Zlomky tedy nepotřebují nový tokenizer ani nový druh `PromptNode`. Potřebují
generátor, sazbu a zaškrtávátko.

⚠ Co tokenizer NEumí a v první etapě umět nebude: **smíšená čísla**.
`2 1/2 · 4` skončí chybou, protože mezi `2` a `1` není operátor. Přidat je
znamená nový druh tokenu a rozhodnutí, jak se pozná `2 1/2` od dvou čísel
za sebou — a číselné řady píšou členy právě mezerou.

## 3. Etapa 1: zlomek jako část celku

Tvar `n/d z b`, kde `b` je dělitelné `d` a výsledek je **celé číslo**.

- **jmenovatelé** 2, 3, 4, 5, 6, 8, 10 — ty, co se počítají z hlavy;
- **čitatel** menší než jmenovatel (pravé zlomky), a zlomek v základním tvaru:
  `2/4 z 80` je pro dítě `1/2 z 80` napsané zbytečně složitě;
- **základ** v oboru ročníku, s přednostní volbou násobků deseti — stejné
  pravidlo, jaké u procent brání vzniku `1 % z 4200`.

Vejde se to do všech pěti aktivit: výsledek je celé číslo, takže šifra dostane
kód políčka a hry hodnotu na kartičku.

**Cena:** nový `src/tasks/fractions/` (kostra podle `tasks/percent/`), nová
`SkillTag` `zlom.cast-z-celku`, `fractions: boolean` v `DifficultyProfile`,
zaškrtávátko v `TopicSelection` a `EditorPanel`, `GENERATOR_VERSION` 9.

## 4. Sazba: zlomková čára

Na českém pracovním listu se zlomek sází vodorovnou čarou, ne lomítkem.
V modelu ale zůstane text `3/4` — stejně jako u odmocniny zůstává `√49`
a čáru nad číslem dokresluje až `MathText`. Text je to, co se hashuje,
porovnává a vypisuje v testech; sazba do něj nesahá.

Proti odmocnině je to práce menší: `vinculum.ts` musí měřit font, protože
čára se musí trefit na hrot znaku `√`. Zlomková čára žádný takový hrot nemá,
je to prostě `border-bottom` mezi dvěma řádky v `inline-flex`.

⚠ **Zato má riziko, které odmocnina neměla: výšku.** Zlomek je dvouřádkový
a kartičky pexesa, domina i binga mají pevné rozměry naměřené tiskem.
`3/4 z 80` na kartičce může přetéct stejně, jako přetékalo `9678 − 4658`
(commit `5ae1d2d`) — a **náhled to nemusí ukázat**, protože v prohlížeči se
řádek roztáhne, kdežto na kartičce je místa napevno. Zkušební tisk proto
patří do definice hotového, ne na konec.

Nabízí se pojistka pro případ, že se zlomek na kartičku nevejde: hry by
zlomky nedostaly a zůstaly by u pracovního listu. Rozhodnout se to dá až
podle papíru.

## 5. Co etapa 1 neumí: zlomek jako VÝSLEDEK

`1/2 + 1/4 = 3/4` je látka 6. a 7. ročníku a do etapy 1 se nevejde. Není to
opomenutí, je to zásah do modelu:

- `Task.value` je `number`. `3/4` se jako 0,75 uloží přesně, ale **`1/3` ne** —
  a `isPrintable` (nejvýš dvě desetinná místa) takovou hodnotu zamítne kódem
  `unprintable-value`. To pravidlo je správné: vytištěné `0,33` by dítě
  sečetlo a nedopočítalo se.
- I kdyby hodnota prošla, **kartička by ukázala `0,75`**, kdežto dítě má
  párovat `1/2 + 1/4` se `3/4`. Zlomek se musí vytisknout jako zlomek.

Náčrt řešení na později: `Task` by dostal nepovinné pole s **vytištěnou
podobou výsledku** (`3/4`), zatímco `value` by dál nesl číslo pro párování
a verifikaci. Verifikace by musela u takové úlohy porovnávat zlomek, ne
desetinné číslo — tedy umět přečíst `3/4` i na pravé straně rovnítka.
Je to samostatný krok velikosti etapy 1 a nemá smysl ho začínat dřív, než
bude část z celku vytištěná a ověřená.

## 6. Zámek

- testy generátoru v `fractions.test.ts`: základ vždy dělitelný jmenovatelem,
  zlomek v základním tvaru, výsledek celé číslo, obor ročníku;
- test verifikace, že `3/4 z 80` projde a `3/4 z 79` neprojde;
- **golden snímek šifry se zlomky** — a poučení z 22. 8. platí dál: snímek,
  který téma neobsahuje, změnu toho tématu neuhlídá;
- `GENERATOR_VERSION` 9, tedy přepis všech snímků a hláška o neshodě
  u dosud sdílených odkazů;
- **zkušební tisk** pracovního listu i kartiček, viz riziko výšky v §4.

## 7. Co navrhuju

1. **Jen část z celku.** Sčítání zlomků se stejným jmenovatelem by bylo levné
   přidat, ale s celým výsledkem vyjde skoro vždycky `1` — a `1/4 + 3/4 = 1`
   vedle `2/5 + 3/5 = 1` je na kartičkách stejná úloha dvakrát. Patří to až
   ke zlomkovému výsledku, tedy do §5.
2. **Rovnou do všech pěti aktivit**, s tím, že hry jsou první, co po tisku
   couvne, kdyby se dvouřádkový zlomek na kartičku nevešel. Držet zlomky
   předem jen v šifře by znamenalo psát omezení, které možná nebude potřeba.
3. **Od šesté třídy**, stejně jako desetinná čísla. Pátá třída poloviny
   a čtvrtiny podle RVP zná, ale platí tu totéž co u `decimals`: učitelka,
   které se na listu pro pátou třídu objeví `3/4 z 80`, si spíš řekne, že
   Šifromatika neumí ročníky, než že si něco zaškrtla.

**Karel potvrdil 22. 8. 2026: pátý ročník zlomky nedostane.** Bod 3 tím
platí a v profilu je zapsaný stejně jako u desetinných čísel.

## 8. Co se odchýlilo od návrhu

**Ročník.** Karel v průběhu práce posunul zlomky z šesté třídy na sedmou:
šestka je zavádí, ale počítá s nimi až sedmá. Sedí tím na stejném ročníku
jako procenta, což odpovídá i tomu, že `1/4 z 80` a `25 % z 80` je táž úloha
dvěma zápisy.

**`GENERATOR_VERSION` zůstal 8**, ačkoli §6 sliboval 9. Přidání generátoru
výstup dosud uložených listů nemění — rozhoduje o něm `generatorMix`
v konfiguraci a ten zlomky neobsahuje. Ověřeno tím, že se nepřepsal ani jeden
existující golden snímek; přibyl jen nový. Je to totéž, co platilo u domina.

**Zlomky se cestou přes odkaz a soubor ztrácely.** Každá ze čtyř aktivit má
vlastní seznam známých id generátorů a nový generátor se do nich nedoplnil,
takže `parsePayload` váhu zlomků tiše zahodil. Vygenerovaný list byl v pořádku
a náhled taky — vada se objevila **jen při otevření z odkazu nebo `.sifra`**,
tedy přesně tam, kde ji učitel potká jako první. Ukázal to teprve zkušební
tisk přes sdílecí odkaz: na vytištěné šifře nebyl ani jeden zlomek. Opraveno
ve všech čtyřech aktivitách, prosívání sjednoceno do `parseGeneratorMix`
(seznamy zůstávají per aktivita — šifra mocniny schválně nezná) a hlídá to
nový `activities/payload.test.ts`.

**Přibyl strop na mezivýsledek dělení** (`MAX_QUOTIENT` = 100), který návrh
nepředvídal. První tisk pexesa ukázal na kartičkách `2/3 z 897` a `5/6 z 966`:
základ v mezích, ale po vydělení jmenovatelem vyjde 299, respektive 161. Sám
základ je tedy špatná míra náročnosti — `9/10 z 710` je z hlavy a je skoro
stejně velké. Do her se to dostalo proto, že jejich cíle jdou do tisíce,
kdežto cíle šifry jsou kódy políček. Zásoba klesla ze 737 cílů na 644
a **cílů šifry se to nedotklo vůbec**.

**Preference kulatého základu se nepřevzala z procent.** `25 % z 80` ji má,
zlomky ji mít nesmí: základ desetiny je `cíl · 10`, tedy kulatý vždycky,
takže by desetina vyhrála skoro každé losování. Naměřeno na cílech šifry:
s preferencí 51 desetin a 22 pětin z 88 úloh, ale jen tři poloviny a jedna
čtvrtina. Bez ní je rozdělení rovnoměrné.

**Sazba prošla napoprvé.** Riziko výšky z §4 se nepotvrdilo: dvouřádkový
zlomek se vejde do řádku pracovního listu i na kartičku pexesa, aniž by
cokoli přeteklo. Drží to menší stupeň písma (0,8 em) a těsný `line-height`.
Ověřeno tiskem do PDF přes sdílecí odkaz — šifra dvě stránky, pexeso tři,
tedy přesně tolik, kolik má listů.
