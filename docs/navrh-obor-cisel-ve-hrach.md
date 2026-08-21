# Obor čísel ve hrách

Rozhodnuto a hotovo **21. 8. 2026**, `GENERATOR_VERSION` 7.

## 1. Vada

Šesťák dostal na pexesu `9678 − 4658 = 5020` a měl to spárovat mezi dvanácti
kartičkami. Osmák `7198 + 1650 = 8848`. Není to chyba generátoru — obojí je
správně spočítané a v oboru ročníku.

Chyba je v tom, že se ten obor na kartičky vůbec dostal. `numberRange`
v profilu je psaný pro **pracovní list**: dítě u něj sedí, má tužku a papír
a počítá jeden příklad pod druhým. U kartiček stojí u stolu, drží jich dvanáct
v ruce a páruje je očima. Rozdíl mezi „spočítat" a „spočítat a poznat" nikdo
nikdy nezapsal, takže hry braly obor naplno.

Šifra se do toho nikdy neopřela, a proto si toho nikdo nevšiml: její cíle jsou
kódy políček, tedy nanejvýš dvojciferná čísla. Nezáleží na tom, že profil
osmého ročníku dovoluje deset tisíc — šifra si o ně neřekne. Hry ano.

Vyplavalo to teprve s desetinnými čísly (viz
`navrh-uvolneni-celych-vysledku.md`). `1545 + 1342` na kartičce vypadá jako
těžký příklad; `1545,1 + 1342,4` vypadá jako omyl.

## 2. Řešení

`cardGameProfile` v `core/constraints`: profil oříznutý na `CARD_VALUE_MAX`
= 1000. Mění jen obor čísel — ročník, povolené operace ani počet členů
zůstávají — a hry si ho berou na začátku generování.

**Proč tisíc.** Je to hranice, kde se ještě dá odečíst z hlavy, a přitom se
ročníky neslijí: šestka se od páté třídy neliší velikostí čísel, ale stavbou
úlohy. Po ořezu vychází `(152 − 7) · 2 = 290` a `70 : 7 + 700 = 710` — pořád
tři členy, závorky a pořadí operací, jen v číslech, která jdou udržet v hlavě.
Ročníky s oborem do tisíce (3., 4., 5. a 7.) se nemění vůbec.

**Proč ne v konfiguraci.** `payload.difficulty` má dál poctivě říkat, jaký
ročník si učitel zvolil; jak s ním hra naloží, je věc hry. Kdyby se ořez dělal
už v `toConfig`, uložený `.sifra` by o ročníku lhal.

**Proč ne jen cíl.** Ořezat zásobu cílů nestačí: `9678 − 8678 = 1000` má cíl
v mezích a na kartičce je stejně mimo. Proto se ořezává profil, ze kterého
generátor staví i operandy.

## 3. Čeho se to nedotýká

- **Šifra a list řad.** Pracovní list tužku a papír má; obor zůstává.
- **Mocniny a procenta.** Ty si obor krotí samy (`15² = 225`, `25 % z 880`),
  takže se pro ně nic nemění.

## 4. Zámek

Golden snímek pexesa pro šestý ročník. Do verze 6 hlídaly snímky jen ročníky
s oborem do tisíce, takže tahle změna výstupu by neshodila ani jeden — což je
přesně ten druh mezery, kvůli které golden testy existují.

K tomu pravidlo v `registry.test.ts`: v 6., 8. i 9. ročníku nesmí být na
kartičce, kameni ani v bingu číslo nad tisíc — ani ve výsledku, ani v zadání.
Snímek chytí změnu jednoho seedu, tenhle test to pravidlo.

## 5. Co zůstává otevřené

Desetinná čísla na kartičce jsou pořád na hraně: `156,92 · 5 = 784,6` je
v mezích, ale z hlavy se to nepočítá. Nabízí se pravidlo „čím přesnější
operand, tím menší smí být" — dvě desetinná místa jen do sta, takže
`12,25 · 4 = 49` ano a `156,92 · 5` ne. Je to samostatné rozhodnutí o látce,
ne o oboru čísel, a mění výstup jen tam, kde jsou zaškrtnutá desetinná čísla.
