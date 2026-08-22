# Dvě desetinná místa jen do sta

Návrh k rozhodnutí, **22. 8. 2026**. Navazuje na `navrh-obor-cisel-ve-hrach.md`,
kde tahle otázka zbyla otevřená.

## 1. Vada

Podnět byl `156,92 · 5 = 784,6`: v mezích ročníku i v oboru hry, ale z hlavy
se to nepočítá. Měření ukázalo, že to není ojedinělý kus. V šestém až osmém
ročníku má **zhruba čtvrtina desetinných úloh ve hrách operand se dvěma
desetinnými místy nad sto** (2575 z 9991 dosažitelných cílů v šestém ročníku),
a naprostá většina z nich nejsou součiny, ale součty:

```
54,05 + 105,95     103,25 + 58,55     105,05 + 56,85     60,05 + 102,35
```

Ořez oboru na tisíc (`cardGameProfile`) tohle nechytil, protože `103,25` je
hluboko pod tisícem. Chybí druhé pravidlo, kolmé na to první: **kolik míst smí
mít číslo, které je takhle velké.**

## 2. Pravidlo

> Hodnota se dvěma desetinnými místy smí být nejvýš **100**.
> Nad stem zbývají desetiny.

Sto proto, že se u něj láme způsob počítání. `54,05 + 45,25` se sečte po
složkách z hlavy; u `103,25 + 58,55` už dítě přenáší desítky i setiny zároveň
a sahá po tužce. Zároveň je to mez, kterou učitel pozná od pohledu, takže
vygenerovaný list nevypadá, že si vybírá.

Zapsat jako **konstantu `TWO_PLACE_CEILING` v `tasks/decimal`**, ne jako
parametr v `TaskRules` a ne do `DifficultyProfile`:

- **není to vlastnost ročníku** — osmák počítá `103,25 + 58,55` stejně
  neochotně jako šesťák, jen si to spíš odbude písemně;
- **není to ani vlastnost listu** — na rozdíl od `maxResultPlaces` se pro
  pracovní list a pro kartičku neliší; tužku a papír má sice list, ale tohle
  je pravidlo o tom, co se počítá z hlavy, ne o tom, co se dá spárovat očima;
- parametr slibuje, že se to bude někde lišit. Až přijde π v kruhu (kvůli
  kterému je `maxResultPlaces` parametr), týká se to **výsledku** a `3,14`
  je pod stem, takže se strop nehne.

Je to tedy tentýž druh konstanty jako `MAX_FACTOR = 10` o pár řádků výš nebo
`MAX_TERM` u číselných řad.

## 3. Co měření odhalilo navíc: součin bere libovolné setiny

Se stropem samotným vypadá zásoba takhle:

```
30,02 · 5 = 150,1     30,04 · 5 = 150,2     30,06 · 5 = 150,3
```

`30,02 · 5` je pod stem, tedy podle pravidla v pořádku — a stejně se z hlavy
nepočítá. Příčina je jinde než ve velikosti: **sčítání losuje zlomkovou část
z `NICE_FRACTIONS`** (`,05 ,1 ,2 ,25 ,4 ,5 ,6 ,75 ,8 ,9`), kdežto **součin si
ji dopočítá z cíle a vezme, co vyjde**. `156,92` z podnětu je přesně tenhle
případ; strop by ho odstranil kvůli velikosti, ale příčinu by nechal na místě.

Navrhuju proto **stejné zlomkové části i u součinu**. Pak ze stejných cílů
vychází:

```
75,05 · 2 = 150,1     50,1 · 3 = 150,3     18,8 · 8 = 150,4
```

**Co to stojí:** zásoba dosažitelných cílů klesne z 9991 na 9987, tedy
o čtyři setiny procenta. Úloh se dvěma desetinnými místy je po obou
změnách 378 z 9987 místo dnešních 3039 — desetinná čísla ve hrách zůstávají,
jen setiny přestanou být výchozí stav.

## 4. Čeho se to nedotýká

- **Šifra a list řad.** Cíle šifry jsou kódy políček (≤ 81), takže operand nad
  sto tam nikdy nevznikl; číselné řady desetinné členy nemají vůbec (čárka je
  v jejich zápisu obsazená oddělovačem — viz `core/sequence`).
- **Procenta a mocniny.** Celočíselné, netýká se jich to.
- **Ovládání.** Nic nového ve formuláři, stejně jako u předchozích dvou kroků.

## 5. Zámek

Mění to deterministický výstup → **`GENERATOR_VERSION` 7 → 8** a s ním neshoda
součtu u dosavadních odkazů a `.sifra`.

⚠ **Ani jeden dnešní golden snímek desetinná čísla neobsahuje** — ověřeno tak,
že s hotovým prototypem prošlo všech 525 testů včetně golden. Je to potřetí
tatáž mezera (poprvé u oboru čísel ve hrách). Součástí kroku je proto **nový
snímek pexesa pro 6. ročník se zapnutými desetinnými čísly**, aby příští
změna generování nebyla zase tichá.

K tomu testy v `decimal.test.ts`: žádný operand se dvěma místy nad sto,
zlomková část vždy z `NICE_FRACTIONS`, a že zásoba cílů nezhubla.

## 6. Co se odchýlilo od návrhu

**Seznam rozhoduje jen o setinách, ne o desetinách.** Bod 3 sliboval „stejné
zlomkové části i u součinu", jenže `NICE_FRACTIONS` desetiny `,3` a `,7`
neobsahuje — a `0,3 · 7 = 2,1` je úloha jako každá jiná; stojí dokonce
v hlavičce modulu jako příklad toho, co má vycházet. Doslovné provedení by
z listu vyhodilo pětinu desetinných čísel bez důvodu. `isUsableOperand` proto
pouští každou desetinu a seznam (`NICE_CENTS`, odvozený z `NICE_FRACTIONS`)
rozhoduje jen tam, kde jde o setiny.

**Inkrement verze přeházel všechno, ne jen desetinné listy.** `generatorVersion`
je součástí semínka RNG (`createRng(\`${config.generatorVersion}|${config.seed}\`)`),
takže se přepsaly úplně všechny golden snímky — i šifra pro 4. ročník, kde se
žádné pravidlo nezměnilo. Dva testy na to doplatily a bylo je potřeba srovnat:

- golden test řad a `document.test.ts` stály na seedu `golden-rady`, do kterého
  se po přehození netrefila ani jedna řada; nový seed nese číslo verze
  (`golden-rady-8`), aby bylo příště vidět, s čím se mění;
- pexeso „jsou zamíchané" mělo mez „nejvýš dvě sousedství z 36 kartiček".
  Ze zamíchaného balíčku vyjde průměrně jedno a tři nejsou nic zvláštního —
  mez byla těsná natolik, že ji shodilo přeházení, ne špatné míchání. Nově
  je jich povoleno pět; nemíchaný balíček by jich měl osmnáct, takže zámek
  drží dál.

**Měření sedělo:** zásoba cílů 9991 → 9987, úloh se dvěma místy 3039 → 375
z 9987. Ověřeno navíc, že reachableValues nezačalo slibovat nesplnitelné
cíle — všech 9987 jde vyrobit.
