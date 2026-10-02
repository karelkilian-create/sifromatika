# Úniková hra — návrh

**Stav: schváleno 2. 10. 2026**, rozhodnutí viz §13 (návrh z 28. 9. 2026, `main` na commitu `df1fa41`,
`GENERATOR_VERSION` 12, pět hotových aktivit).

Vzniklo z rozhovoru o třech promptech od jiných AI (`rozsireni_projektu_2.md`)
a z bodu 3 v `docs/SIFROMATIKA-EVALUATION.md`. Z promptů se převzalo, co
sedí k vizi; co ne, je v §11 i s důvodem.

---

## 0. Verdikt na jednu obrazovku

**Úniková hra v Šifromatice není editor kvízů. Je to vygenerovaná a ověřená
matematická únikovka za minutu.** Učitel vybere příběh, délku hry, ročník,
operace a počet skupin. Tajenku nabídne příběh podle délky hry, učitel ji smí
přepsat. Zbytek vyrobí Šifromatika.

1. **Fáze 1 je papír + zámek na interaktivní tabuli.** Žádné tablety, žádná síť
   během hry, žádný server. Tablety jsou fáze 2, a s nimi soutěžní režim
   *závod* (§10).
2. **Tabule a papír spolu nekomunikují. Spojuje je dítě**, které slovo přečte
   z papíru a zadá ho na tabuli.
3. **Stanoviště je mini-šifra, jejíž tajenka je slovo z příběhu.** Dítě pozná,
   že počítalo dobře, protože mu vyšlo slovo — `MAPA`, `KOTVA`, `TRUHLA`.
4. **Na tabuli se zadává celé slovo, ne písmeno.** Kolik písmen ze slova
   (jedno až tři) a která patří do finální tajenky, prozradí až tabule. Nejde
   tak spočítat jen jeden příklad ze šesti a finále nejde odhadnout dopředu.
   Kdy je tabule prozradí, určuje režim: v „celé třídě" po každém slově, ve
   „skupinách" všechna naráz na konci (§2).
5. **Tajenka se skládá jako šibenice.** Písmeno ze slova se doplní na všechna
   místa, kde v tajence je. Počítají se jen různá písmena, takže tajenka může
   být dlouhá věta nebo zaklínadlo.
6. **Délku hry určuje počet stanovišť, ne délka tajenky.** Učitel volí krátkou,
   střední nebo dlouhou hru a příběh k ní nabídne svou tajenku; delší
   rozvíjí kratší (`POKLAD` → `POKLAD JE NÁŠ` → `POKLAD JE NÁŠ, KAPITÁNE`).
7. **Příběh je uvnitř hry, ne kolem ní.** Každé stanoviště má svou větu příběhu
   a slova stanovišť jsou z tematického slovníku.
8. **Dva režimy, jeden model.** „Celá třída" a „skupiny" se liší jen tím, kdo
   které stanoviště řeší. Generování i ověření je totéž.
9. **Zámek je první výstup Šifromatiky, který není papír.** To je změna vize
   a patří k ní samostatný commit ve `VISION.md` (§9).

---

## 1. Jak to vypadá ve třídě

Učitel vybere příběh *Poklad*, krátkou hru, 4. ročník, sčítání a násobení,
3 skupiny. Příběh nabídne tajenku `POKLAD`. Pro přehlednost má příklad jen tři
stanoviště; skutečná krátká hra jich má čtyři (§4).

**Režim „skupiny":**

```
  Skupina Modrá          Skupina Zelená         Skupina Žlutá
  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
  │ stanoviště 1 │       │ stanoviště 1 │       │ stanoviště 1 │
  │  → KOMPAS    │       │  → TRUHLA    │       │  → DĚLO      │
  └──────┬───────┘       └──────┬───────┘       └──────┬───────┘
         │                      │ „TRUHLA"             │
         ▼                       ▼                      ▼
   ┌──────────────────────────────────────────────────────────┐
   │  TABULE:  Slovo TRUHLA platí!                             │
   │                                                          │
   │           [ ? ] [ ? ] [ ? ] [ ? ] [ ? ] [ ? ]             │
   │           Modrá …   Zelená ✓    Žlutá …                   │
   └──────────────────────────────────────────────────────────┘

                 … až má všechna slova i Modrá a Žlutá:

   ┌──────────────────────────────────────────────────────────┐
   │  KOMPAS → K, O, P          [P] [O] [K] [L] [A] [D]        │
   │  TRUHLA → L, A                                            │
   │  DĚLO   → D                                               │
   └──────────────────────────────────────────────────────────┘
```

Z `KOMPAS` se vezmou tři písmena, z `TRUHLA` dvě, z `DĚLO` jedno. Děti to
dopředu nevědí a ve skupinovém režimu to neuvidí, dokud nemá slova celá třída.

U delší tajenky se projeví šibenice: v `POKLAD JE NÁŠ` doplní jedno `A` ze
slova obě `A` naráz.

Každá skupina dostane balíček stanovišť. Stanoviště je mini-šifra: nahoře věta
příběhu („Na víku truhly je vyryto pět čísel…"), pod ní čtyři až šest příkladů,
tabulka, a vyjde slovo. Na listu **není nic vyznačené** — dítě neví, které
písmeno se bude počítat.

Když má skupina všechna slova, jde mluvčí k tabuli, vybere barvu skupiny
a zadá slova. Tabule každé ověří a u skupiny rozsvítí fajfku — písmena zatím
neukáže. Když má slova i poslední skupina, tabule odhalí všechna písmena
naráz, slovo po slovu, a pak konec příběhu.

**Režim „celá třída":** stanoviště jdou za sebou. Všechny děti (nebo dvojice)
řeší stanoviště 1, třída zadá slovo na tabuli, tabule prozradí písmena,
pokračuje v příběhu a řekne „otočte na stanoviště 2". Po posledním stanovišti
je celá tajenka.

---

## 2. Rozhodnutí: co se zadává na tabuli

Dvě rizika, která řeší jedno rozhodnutí:

- **Fronta u tabule.** Šest skupin po třech stanovištích = osmnáct návštěv
  jedné tabule, a pětadvacet dětí čeká.
- **Zkratka přes jeden příklad.** Jedno písmeno tajenky = jeden příklad. Kdyby
  bylo na listu vyznačené políčko („tohle písmeno jde do zámku"), děti spočítají
  jen ten jeden příklad a zbytek přeskočí.

| | písmeno po každém stanovišti | vyznačené písmeno, jedna návštěva | celá slova, jedna návštěva (doporučeno) |
|---|---|---|---|
| Návštěv tabule | skupiny × stanoviště | jedna na skupinu | jedna na skupinu |
| Musí spočítat všechno | ne | **ne** — stačí jeden příklad | ano |
| Kdo pozná chybu | tabule | dítě — nevyšlo slovo | dítě i tabule |
| Jde odhadnout finále | ano, postupně | ano, z písmen na papíře | ne |

**Celá slova, jedna návštěva.** Šifra umí samokontrolu zadarmo: když dítě
spočítá příklad špatně, vyjde `KXTVA` a to není slovo. Proto je tajenka
každého stanoviště **skutečné slovo**. Na tabuli se pak zadává celé — a teprve
tabule řekne, která písmena z něj patří do finále.

**Ze slova se bere jedno až tři různá písmena.** Která a kolik, určí
generátor podle toho, co tajenka potřebuje, a mezi stanovišti se to střídá.
Na papíře se to neobjeví — jen v přehledu pro učitele.

Víc písmen je **možnost, ne požadavek**. Když slovník nemá slovo, které by
neslo dvě potřebná písmena, generátor vezme slovo s jedním.

### Šibenice

Písmeno ze slova se v tajence **doplní na všechna místa, kde je** — jako ve
hře šibenice. Každé různé písmeno tajenky dodá právě jedno slovo.

- **Tajenka smí být dlouhá.** `ABRAKADABRA` má jedenáct písmen, ale jen pět
  různých. Délka textu hru neprodlužuje; prodlužují ji jen různá písmena.
- **Děti hru znají**, a v režimu „celá třída" je chvíle, kdy jedno slovo
  rozsvítí `A` na pěti místech, sama o sobě odměna.
- **Příspěvky jsou nevyrovnané** — slovo, které dodá `A`, rozsvítí víc políček
  než slovo, které dodá `Ž`. Ve „skupinách" se to ukáže až na konci naráz
  a v „celé třídě" nejde o soutěž, takže to nevadí.

Ve skupinovém režimu to taky znamená, že **každé různé písmeno patří jedné
skupině**. Dvě skupiny nikdy nedodají totéž písmeno.

Cena: mluvčí u tabule napíše dvě tři slova místo dvou tří písmen. Pár vteřin
navíc, fronta nevznikne.

### Finále se otevírá jen slovy

Zámek **nemá políčko na celou tajenku.** Otevře se ve chvíli, kdy jsou uznaná
všechna slova — nijak jinak. V režimu „celá třída" třída s delší tajenkou brzy
tipne zbytek, jako v Kole štěstí, a to je v pořádku; kdyby ale šlo tajenku
rovnou napsat, přestalo by se počítat.

### Kdy tabule písmena ukáže

| | celá třída | skupiny |
|---|---|---|
| Během hry | písmena přibývají po každém slově | jen postup: které skupiny jsou hotové |
| Na konci | poslední písmena a závěr | **všechna písmena naráz**, pak závěr |

Rozhoduje režim, ne nové nastavení.

- **V „celé třídě" postupně**, protože jinak by se celou hodinu nedělo nic
  kromě vět příběhu. Plnící se tajenka je rytmus hry a odměna za každé
  stanoviště.
- **Ve „skupinách" naráz**, protože hotové skupiny stejně čekají na ostatní
  a společné odhalení je moment pro celou třídu. Tajenku navíc nejde tipnout
  z písmen, která dodala skupina před vámi.

Program písmena nevybírá až na konci — zná je od vygenerování, jinak by nešlo
ověřit, že hra dá správnou tajenku. Tabule je jen do konce neukazuje.

---

## 3. Rozhodnutí: tajenka a slova stanovišť

### Tajenka

**Každý příběh nabízí tři tajenky, jednu na každou délku hry**, a delší
rozvíjí kratší:

| Délka hry | *Poklad* | Různých písmen |
|---|---|---|
| krátká | `POKLAD` | 6 |
| střední | `POKLAD JE NÁŠ` | 10 |
| dlouhá | `POKLAD JE NÁŠ, KAPITÁNE` | 12 |

Jedna tajenka na všechny délky nejde. Krátká hra (4 stanoviště) unese nejvýš
dvanáct různých písmen, a to jen tehdy, když každé slovo dá přesně tři —
v praxi skoro nikdy. Dlouhá hra (8 stanovišť) naopak potřebuje aspoň osm
různých písmen. Ukázal to test nad slovníky v
[`unikova-hra-pribehy.md`](unikova-hra-pribehy.md).

Učitel nic nevybírá: tajenka se změní s délkou hry a hra je hotová na dvě
kliknutí. Smí ji přepsat — jméno třídy, `VYLET`, zaklínadlo, cokoli.
Když se vlastní tajenka do zvolené délky nevejde, dostane hlášku s radou
(§4).

### Slova stanovišť

Učitel slova stanovišť nezadává. Vybere je Šifromatika:

1. **Tematický slovník příběhu** má přednost. *Poklad*: `MAPA`, `TRUHLA`,
   `KOTVA`, `LOPATA`, `KOMPAS`, `ZAMEK`… Dítě neluští náhodné slovo, ale stopu.
2. **Obecný slovník** je záloha pro písmena, na která téma nestačí. Stává se to
   jen u tajenky, kterou učitel přepsal.
3. **Když nestačí ani ten**, aplikace to řekne hláškou — stejně jako dnes
   šifra, když se tajenka nevejde. Nikdy potichu nevynechá písmeno.

Každá nabízená tajenka příběhu **musí jít postavit jen z tematického
slovníku, a to pro svou délku hry**. Hlídá to test, který projde všechna
rozdělení, ne náhodný vzorek; kdo upraví slovník nebo tajenku, dozví se to
hned. Pokrytí celé abecedy potřeba není: písmena nabízených tajenek známe
dopředu, a `Q`, `W` nebo `X` se v české vlastní tajence skoro neobjeví.

Žádné slovo tématu **nesmí být v tajenkách příběhu**, ani v jiném tvaru —
slovo stanoviště by prozradilo kus finále. Přesnou shodu hlídá test, jiný
tvar (`MUZEUM` a `MUZEU`) člověk při čtení slovníku.

- **Proč ne učitel:** šest skupin × tři stanoviště = osmnáct slov navíc. To je
  přesně ta práce, kterou Šifromatika učiteli šetří.
- **Proč ne AI:** slova by se generovala na serveru a nešla by ověřit.
  Slovník je konečný seznam, který se jednou projde okem a pak platí.

Slova mají **4–6 písmen** — jedno písmeno je jeden příklad, takže délka slova
je zároveň délka stanoviště. Podstatná jména, která zná druhák i osmák, a žádná,
která se do třídy nehodí.

⚠ Změna slovníku mění výstup. Každá úprava seznamu je proto **inkrement
`GENERATOR_VERSION`**, stejně jako změna generátoru úloh. Golden test to
zachytí.

Diakritika nevadí: šifra pracuje s A–Z (`core/text`), takže `ZÁMEK` je na listu
`ZAMEK` a stejně se píše do zámku.

---

## 4. Rozhodnutí: délka hry

**Délku hry volí učitel, a to počtem stanovišť.** Tajenka o ní nerozhoduje.
Kdyby rozhodovala (jedno písmeno = jedno stanoviště), byla by
`POKLAD JE POD LAVICI` hra na dvě hodiny.

Stanoviště = jedno slovo = čtyři až šest příkladů.

| Délka hry | Stanovišť | Příkladů celkem | Různých písmen: meze | … nabízené tajenky | Odhad pro celou třídu |
|---|---|---|---|---|---|
| krátká | 4 | 16–24 | 4–12 | 5–9 | 20–30 min |
| střední | 6 | 24–36 | 6–18 | 10–12 | 30–45 min |
| dlouhá | 8 | 32–48 | 8–24 | 12–16 | kolem hodiny |

Meze jsou to, co pravidla dovolí; nabízené tajenky se drží uvnitř s rezervou,
protože na krajích mezí jde hru postavit jen z málokterých slov.

Ve skupinovém režimu se stanoviště dělí mezi skupiny, takže skupina řeší
jen svůj podíl — pro skupinu je hra kratší.

Meze, obě hlídané hláškou, ne potichu upravenou hrou:

- **Tajenka má aspoň tolik různých písmen, kolik je stanovišť** — každé slovo
  musí dát aspoň jedno písmeno, jinak by se počítalo zbytečně.
- **Tajenka má nejvýš třikrát tolik různých písmen, kolik je stanovišť** — víc
  než tři písmena z pětipísmenného slova už je skoro celé slovo a hra se mění
  v přepisování.

Délka textu tajenky se neomezuje, jen to, aby se vešla na tabuli.
- **Stanovišť je aspoň tolik, kolik je skupin** — každá skupina aspoň jedno.

Hláška má říct, co s tím („Na krátkou hru má tajenka moc různých písmen —
zvolte delší hru, nebo tajenku zkraťte."). A i uvnitř mezí se může stát, že
slovník vlastní tajenku nepostaví; pak totéž, s radou zkusit jinou délku.

Počty stanovišť, délka slov a strop tří písmen jsou konstanty
v `core/constraints`, jako `BINGO_POOL_RATIO`. Odhady v tabulce jsou od stolu;
rozhodne třída.

---

## 5. Rozhodnutí: zámek na tabuli

Zámek je **celoobrazovkový režim v aplikaci učitele**, ne samostatná stránka.
Učitel si hru vygeneruje, vytiskne, a na počítači u tabule klikne
„Spustit zámek".

- **Výběr skupiny** — ve skupinovém režimu nejdřív velká barevná tlačítka
  skupin, pak slova té skupiny jedno po druhém. V režimu „celá třída" rovnou
  slovo aktuálního stanoviště.
- **Klávesnice na obrazovce** — velká písmena A–Z, Smazat, Odeslat. Žádný hover,
  tlačítka pro prst. Fyzická klávesnice funguje taky. Porovnání ignoruje
  velikost písmen a diakritiku.
- **Chybné slovo** — zámek se zatřese a nic dalšího. **Žádné zamčení po N
  pokusech a žádné počítání chyb.** Ve škole by zamčení znamenalo, že učitel
  před třídou hledá, jak hru odemknout.
- **Rámečky finální tajenky** jsou na tabuli od začátku prázdné, mezery mezi
  slovy vidět. Děti znají délku celku, ne to, kolik dá které slovo.
- **Správné slovo** — věta příběhu. V režimu „celá třída" navíc „Ze slova
  TRUHLA bereme L a A" a písmena odletí na všechna svá místa. Ve „skupinách"
  jen fajfka u skupiny; rámečky zůstávají s otazníky (§2).
- **Finále** — po uznání posledního slova (nikdy po zadání tajenky, viz §2).
  Ve „skupinách" nejdřív odhalení všech písmen, slovo po slovu, aby bylo
  vidět, které písmeno dodala která skupina. Pak animace otevření, závěr
  příběhu, celkový čas.
- **Učitelské ovládání** — malé tlačítko v rohu: vrátit krok, uznat slovo bez
  zadání (když se hra zasekne), ukončit. Bez PINu: tabule je v rukou učitele
  a PIN by se zapomněl přesně ve chvíli, kdy je potřeba.
- **Časomíra** — běží, na konci se ukáže celkový čas. Neodpočítává dolů:
  odpočet mladší děti stresuje a učitel ho stejně ve třídě přizpůsobuje.
- **Písmo** čitelné z poslední lavice, vysoký kontrast, i na projektoru se
  slabou lampou.

**Bezpečnost řešení není v téhle fázi problém.** Zámek běží na počítači učitele
a všechno si dopočítá ze seedu, stejně jako náhled. Děti vidí obrazovku, ne
paměť prohlížeče. Žákovský odkaz bez řešení je potřeba až pro tablety (§10).

Hra ve třídě nepotřebuje síť. Aplikace se načte jako dnes; pak už zámek
nic nestahuje.

### Upozornění před výběrem (Karel, 2. 10. 2026)

Učitel se musí dozvědět, že hra potřebuje tabuli, **dřív, než si ji vybere**,
ne až u tlačítka „Spustit zámek“ po vytištění. Jinak si hru připraví,
vytiskne, a ve třídě zjistí, že ji nedohraje. Upozornění proto patří:

- do popisku aktivity v katalogu (`ActivityInfo.tagline` nebo věta pod ním),
- na začátek editoru únikové hry,
- do „Jak na to“.

Znění má říkat, co hra opravdu potřebuje: **obrazovku, kterou vidí celá
třída, a počítač, na kterém se zadávají slova.** Interaktivní tabule je
nejpohodlnější, ale stačí i projektor s počítačem, protože zámek ovládá
i fyzická klávesnice. Napsat „jen pro interaktivní tabuli“ by odradilo
i učitele, kteří hru odehrát můžou. Kdo nemá ani projektor, tomu zbývá
hra napůl podle přehledu pro učitele (§12, bod 8), a upozornění to má
říct jednou větou.

---

## 6. Příběh

Příběh je to, čím se únikovka liší od šifrovacího listu se zámkem. Proto není
rámeček kolem hry, ale prochází celou hrou.

**Šablona příběhu** nese to, co je v tabulce níž. Příběhy jsou ve dvou
skupinách, **mladší (2.–5. ročník)** a **starší (6.–8.)**, protože pirátská
truhla, která baví druháka, osmáka spíš urazí. Ročník vybere výchozí skupinu,
učitel smí zvolit kterýkoli příběh. Pracovní seznam témat je
v [`unikova-hra-pribehy.md`](unikova-hra-pribehy.md).

**Kdo co dodá:** návrhy textů a slovníků napíše Claude při vývoji; autor
projektu je projde, ideálně s někým, kdo učí, a teprve pak jdou do repozitáře.
To není v rozporu s „žádná AI" v §10 — ta vylučuje AI **za běhu**, kde by text
vznikal u učitele a nikdo by ho před třídou nečetl.

| Část | Kde se objeví |
|---|---|
| úvod | tabule na začátku, karta skupiny |
| tři nabízené tajenky, jedna na každou délku hry | formulář, učitel smí přepsat |
| tematický slovník | slova stanovišť |
| věta ke každému slovu („Na víku truhly je vyryto…") | nahoře na listu stanoviště |
| věta po uznání slova („Truhla povolila. Uvnitř…") | tabule |
| závěr | tabule po finále |

Věty jsou vázané na **slovo**, ne na pořadí stanoviště. Slovo `TRUHLA` má
svou větu na listu i na tabuli, ať padne komukoli. Tím drží příběh i ve
skupinovém režimu, kde každá skupina dostane jiná slova. Slovo z obecného
slovníku dostane obecnou větu šablony („Našli jste další stopu.").

Příběh se negeneruje. Důvod je stejný jako u slovníku: text, který nikdo
nečetl, nesmí před třídu.

⚠ **Ve skupinovém režimu se příběh trhá.** Každá skupina zažije jen svůj kus;
celek se složí až na tabuli. V režimu „celá třída" plyne přirozeně. Návrh
s tím nic dalšího nedělá — jak moc to vadí, ukáže až třída.

---

## 7. Co se tiskne

1. **Stanoviště** — každé na samostatné stránce: věta příběhu, čtyři až šest
   příkladů, šifrovací tabulka, rámečky na slovo. **Žádné vyznačené políčko.**
   Sazba je dnešní šifra, jen s kratší tajenkou.
2. **Karta skupiny** — barva, úvod příběhu, seznam stanovišť a „až budete mít
   všechna slova, jděte k tabuli". V režimu „celá třída" se nevytiskne.
3. **Přehled pro učitele** — tabulka: skupina, stanoviště, slovo a která
   písmena se z něj berou (`TRUHLA` → `L`, `A`). Plus řešení všech stanovišť
   a pět řádků návodu, jak hru spustit.

Stanoviště se v režimu „celá třída" tisknou jednou na dítě nebo dvojici,
ve skupinovém režimu jednou na skupinu. Kolik kopií, rozhodne učitel
v tiskovém dialogu — aplikace ho nemá odhadovat.

---

## 8. Architektura

Nová aktivita `escape` v registru, jako každá jiná:

```
src/activities/escape/
  index.ts      rozdělení tajenky, výběr slov, stanoviště, verifikace řetězu
  module.ts     záznam do registru, stav formuláře
  document.ts   stanoviště, karty skupin, přehled pro učitele
  payload.ts    validace payloadu z `.sifra`
  stories.ts    příběhové šablony: texty, tematické slovníky, nabízené tajenky
  escape.test.ts
```

**Stanoviště nevzniká voláním celé aktivity `cipher-grid`**, ale přímo z vrstev
`ciphers/` a `tasks/`. Celá aktivita by přinesla vlastní nadpis, řešení
a ústupky pro list o patnácti příkladech, a to by se u stanoviště muselo
vypínat. Tím se drží pravidlo z vize: nová aktivita je kompozice mechanismů,
ne zásah do nich.

Otevřené místo: **kam patří obecný slovník.** Je to text, ne matematika,
a nesmí záviset na Reactu. Kandidát je `core/text`, vedle
`CZECH_LETTER_WEIGHTS`, nebo vlastní `src/words/`. Tematické slovníky patří
k příběhům. Rozhodne se při implementaci podle toho, co řekne `npm run arch`.

### Kde je v aplikaci (Karel, 2. 10. 2026)

**Navenek samostatná záložka „Úniková hra“ vedle „Pracovní listy“
a „Diplom“, uvnitř aktivita v registru jako ostatní.**

Do „Pracovních listů“ nepatří. Ta záložka slibuje pracovní list a list
s řešením, kdežto únikovka vyrobí stanoviště, karty skupin, přehled pro
učitele a zámek. Učitel ji navíc ve třídě spouští a řídí, nejen tiskne.
Vlastní záložka je i přirozené místo pro upozornění na tabuli (§5), které
učitel musí vidět dřív, než začne vyplňovat.

Samostatná záložka ale **neznamená samostatnou aplikaci** jako u diplomu.
Diplom má vlastní obrazovku, protože není aktivita (nemá seed, obtížnost
ani řešení). Únikovka aktivita je a z registru dostane editor ročníku
a operací, sdílení odkazem, `.sifra` i verifikaci. Mimo registr by se
tohle všechno psalo podruhé.

V kódu to znamená:

- `AppView` v `App.tsx` dostane třetí hodnotu, `escape`, s vlastním
  popiskem a podtitulem;
- katalog v „Pracovních listech“ únikovku neukazuje a záložka „Úniková
  hra“ neukazuje nic jiného. Rozlišení patří do záznamu aktivity
  v registru, ne do `if (activity === 'escape')` v shellu;
- sdílený odkaz a zapamatované nastavení s aktivitou `escape` otevřou
  rovnou tuhle záložku.

### Zámek a kontrakt aktivity

⚠ Tohle je jediné místo, kde se návrh odchyluje od pravidla „přidání aktivity
je nový adresář a jeden řádek v registru".

Zámek není stránka papíru, takže se nevejde do `toDocument`. Dvě možnosti:

| | zvláštní případ v shellu | nepovinná metoda kontraktu (doporučeno) |
|---|---|---|
| Kód | `if (activity === 'escape')` v `App.tsx` | `toScreen?(sheet): ScreenModel` v `contract.ts` |
| Další aktivita s obrazovkou | další `if` | vyplní metodu |
| Pravidlo z `registry.ts` | porušené | zachované |

**Nepovinná metoda kontraktu.** Druhý uživatel se nabízí sám: **vyvolávač
binga na tabuli**, kde tabule ukazuje příklady jeden po druhém místo učitele,
který je čte ze seznamu. `ScreenModel` bude, stejně jako `DocumentModel`, popis
obsahu, ne JSX — renderer zámku bude jeden.

### Uložení

`.sifra` nese id příběhu, tajenku (i když je nabídnutá — příběh se může
v budoucí verzi změnit), délku hry, ročník, operace, počet skupin, režim
a seed. Stejně jako u ostatních aktivit se všechno ostatní dopočítá. Sdílení odkazem
funguje beze změny — a platí pro něj totéž varování: **kdo má odkaz, má
řešení.**

Nová aktivita nemění výstup starých, `GENERATOR_VERSION` se zvýší až první
změnou slovníku, příběhu nebo generátoru únikovky.

---

## 9. Ověření řetězu

Každé stanoviště projde dnešní verifikací šifry — přepočet příkladů
a zpětné rozluštění. Nad tím nové kontroly celé hry:

- **`station-word-unknown`** — slovo stanoviště není v tematickém ani obecném
  slovníku.
- **`picked-letter-not-in-word`** — písmeno, které má tabule ze slova vzít,
  ve slově není.
- **`station-picks-out-of-range`** — stanoviště, ze kterého se nebere žádné
  písmeno, nebo víc než tři.
- **`letter-uncovered`** / **`letter-duplicate`** — různé písmeno tajenky,
  které nedodá žádné slovo, nebo které dodají dvě. Při šibenici musí každé
  různé písmeno dodat právě jedno slovo.
- **`station-word-in-tajenka`** — slovo stanoviště je zároveň slovem tajenky
  a prozradilo by kus finále.
- **`group-empty`** — skupina bez stanoviště.
- **`duplicate-station-word`** — stejné slovo na dvou stanovištích. Skupiny sedí
  vedle sebe a slyší se; a tabule by nevěděla, ke kterému stanovišti slovo
  patří.
- **`lock-mismatch`** — slova ze všech stanovišť, zadaná do zámku a doplněná
  jako šibenice, nedají přesně finální tajenku. Tohle je kontrola, která dělá celou hru:
  nestačí, že je v pořádku každé stanoviště zvlášť.

Hra, která kteroukoli kontrolou neprojde, se nevytiskne ani nespustí.

Mimo běh, v testech: **každá nabízená tajenka jde postavit jen z tematického
slovníku svého příběhu, pro svou délku hry, a s rezervou** — ne jedním jediným
rozdělením, ale mnoha, aby různé seedy dávaly různé hry. Dál: každé tematické
slovo má větu na list i na tabuli, a žádné není v tajenkách příběhu.

### Změna vize

`VISION.md` říká: „běží celé v prohlížeči, bez účtu, a **výstup je papír**."
Zámek na tabuli je první výstup, který papír není. Vize sama říká, že se nemá
měnit kvůli funkci, která se právě chce udělat — a tohle přesně taková funkce
je. Proto to tady stojí otevřeně:

**Navrhovaná formulace:** „výstup je papír; obrazovka ve třídě smí papír
doplnit, nikdy nahradit." Zámek papír doplňuje — bez papíru nejde hrát.
Tablety v §10 by tuhle hranici poprvé skutečně překročily, a proto jsou
samostatné rozhodnutí.

Změna vize je samostatný commit s odůvodněním, **před** první řádkou kódu.

---

## 10. Co se vědomě NEDĚLÁ a proč

| Co | Proč ne teď | Kdy |
|---|---|---|
| **Tablety** | Potřebují žákovský odkaz bez řešení (jen otisky slov) a offline režim (PWA), protože levné tablety na školní síti hru nemusí načíst. | Fáze 2, až se papír osvědčí. |
| **Nápovědy** | Na papíře je nápověda učitel. Automatická nápověda dává smysl až na tabletu. | Fáze 2. |
| **Rotace stanovišť po třídě** | Ve fázi 1 má každá skupina vlastní balíček, rotace nemá co řešit. | S fyzickými stanovišti, jestli o ně bude zájem. |
| **Závod** (vyhrává nejrychlejší skupina) | Patří k tabletům: hraje se naplno, když tablet měří čas skupiny a zamyká další stanoviště. Na papíře by šel taky, ale bez řetězu je to jen „kdo dřív přiběhne k tabuli". | Fáze 2, viz níž. |
| **Řetěz** (výsledek jednoho stanoviště je potřeba k dalšímu) | Na papíře se další stanoviště nedá zamknout: přes tabuli se vrací fronta, listy nadepsané slovy prozradí odpovědi, číselný řetěz potřebuje nový mechanismus ve vrstvě úloh. | S tablety, kde je řetěz přirozený. Na papíře až s mechanismem „řetězové příklady". |
| **Číselná stanoviště** (řady, chybějící číslo) | Nemají přirozenou samokontrolu jako slovo z šifry. Dají se přidat, až bude jasné jak. | Po fázi 1. |
| **Větvení příběhu** | Lineární hra se dá ověřit a vysvětlit za minutu. | Až bude lineární hra ověřená ve třídě. |
| **Živý přehled skupin pro učitele** | Potřebuje server a síť. Proti vizi. | Nikdy bez změny vize. |
| **Editor vlastních úloh** | Rozbil by „do minuty" a z úloh by udělal neověřitelné. | Nikdy v Šifromatice. |
| **Jiné předměty** | Neověřitelné: program nerozhodne, jestli je správně „bít", nebo „být". | Samostatné rozhodnutí, až matematika ukáže, jestli hra funguje. Mechanika hry (stanoviště, zámek, skládání tajenky) nesmí vědět nic o matematice, aby šla převzít. |
| **Generování příběhu nebo slov přes AI** | Server, odesílání dat, neověřitelný text před třídou. | Nikdy bez změny vize. |

### Poznamenáno pro fázi 2: závod a řetěz

Nápad z diskuse 28. 9., zapsaný teď, aby se na něj při návrhu tabletů
nezapomnělo. Není to rozhodnutí o fázi 2 — jen co už je promyšlené.

**Závod** je třetí režim vedle „celé třídy" a „skupin":

- **Každá skupina hraje celou hru**, ne jen svůj díl tajenky. Stejná délka
  hry i typ úloh, ale jiná čísla a jiná slova, aby skupiny nemohly opisovat
  ani odposlouchávat.
- **Vyhrává, kdo první dodá všechna slova.** Pořadí zaznamená tabule (skupina
  zadá slova, až je má všechna, takže fronta nevznikne — skupiny končí
  v různou dobu), nebo tablet skupiny.
- **Model se nemění.** Generování i ověření jsou tytéž, jen stanoviště se
  nerozdělují mezi skupiny, ale každá dostane svou sadu. Ověření navíc
  hlídá, že sady skupin mají srovnatelnou délku.

**Řetěz** je na tabletu přirozený: tablet ukáže stanoviště 2, až když
skupina zadá správné slovo ze stanoviště 1. Tím odpadnou všechny tři problémy
papíru z tabulky výš. Pro závod je to hlavní důvod, proč patří k tabletům.

⚠ **Proti závodu** mluví, že odměňuje nejrychlejší, ne nejlepší. Slabší
skupiny prohrávají opakovaně, a proto se mu část učitelů vyhýbá. Spěch
zvedá chybovost a řetěz ji zesiluje: chyba na začátku zablokuje všechno za
ní. Samokontrola slovem na každém kroku je tu důležitější než v ostatních
režimech — a tablet může navíc říct „slovo nesedí", dřív než skupina ztratí
pět minut. Závod proto zůstane volbou učitele, ne výchozím režimem.

---

## 11. Co se převzalo z promptů a co ne

**Převzato:** velká klávesnice na obrazovce, animace otevření, celkový čas
(Gemini); lineární průchod teď a větvení až někdy (ChatGPT); tajenka skládaná
z dílků skupin, učitelský zásah do hry, tisknutelný přehled pro učitele,
porovnání tolerantní k velikosti písmen a diakritice (Claude).

**Nepřevzato:** Next.js, backend a databáze, živý přehled skupin, všechny
předměty, knihovna her a AI generování (ChatGPT) — proti vizi. Pevné místnosti
a obrázky z Unsplash (Gemini) — nejde o generátor. Učitel píše úlohy sám
(ChatGPT i Claude) — proti tomu, v čem je Šifromatika jiná. Dílek i s pozicí
na papíře (Claude) — prozradí, který příklad stačí spočítat, viz §2. Odpověď
přímo v odkazu pro žáky (Claude) — prozradí řešení. Učitelský PIN (Claude) —
viz §5. Nápověda po třech chybách nebo třech minutách (Claude) — až
s tablety.

---

## 12. Rizika, která znám dopředu

1. **Slovníky.** Kurátorská práce, ne kód, a je jí víc, než vypadá: obecný
   slovník stovky slov, každý příběh desítky slov i s větami na list a na
   tabuli. Bez toho únikovka nestojí.
2. **Délka hry.** Čtyři až šest příkladů na stanoviště je odhad. Ukáže až třída.
3. **Krátké tajenky stanovišť v tabulce 9 × 9.** Šifra je na to stavěná
   (tabulka je 9 × 9 pro čtyři písmena i pro čtyřicet), ale se čtyřmi
   příklady na list to vypadá prázdně. Ověří náhled.
4. **Uhodnutí slova.** Dítě, kterému vyjde `KO_VA`, dopíše `T` bez počítání.
   Zkratku přes jediný příklad celá slova zavřela, tuhle ne — u tematického
   slovníku je to dokonce snazší, protože dítě ví, že hledá něco z pirátské
   lodi. Je to totéž riziko jako u dnešní šifry, a má i dobrou stránku: dítě
   s chybou ví, kde ji hledat.
5. **Příběh ve skupinovém režimu se trhá** (§6).
6. **Delší tajenka se uhodne dřív** — jen v režimu „celá třída", ve
   „skupinách" jsou písmena do konce schovaná (§2). Třída ji tipne v polovině
   hry a finále méně překvapí. Počítat se tím nepřestane (§2, finále jen
   slovy), ale napětí klesne. Šibenice to ještě posílí: jedno `A` rozsvítí
   pět míst a tajenka je čitelná dřív. Ovlivní to učitel volbou tajenky;
   návrh s tím nic nedělá.
7. **Vlastní tajenka učitele se nemusí vejít.** Tematické slovníky mají kolem
   dvaceti slov; na vlastní tajenku často nestačí a zbytek dodá obecný
   slovník, čímž se příběh ředí. Kolik slov na téma stačí, se ukáže, až bude
   obecný slovník hotový.
8. **Tabule, kterou má jen část škol.** Bez ní se dá hrát jen napůl: slova
   a písmena z nich zkontroluje učitel podle přehledu. Návod pro učitele to
   má říct.

---

## 13. Otevřené otázky ke schválení

1. Souhlasí **změna vize** v §9 v navrhované formulaci?
2. **Délky hry 4 / 6 / 8 stanovišť**, **tajenka až trojnásobek počtu
   stanovišť v různých písmenech** a **2–6 skupin** — sedí to k tomu, jak dlouhé jsou hodiny a jak
   velké skupiny ve třídách?
3. **Příběhy** — které z [pracovního seznamu](unikova-hra-pribehy.md) půjdou
   do první verze? Doporučení: začít jedním (*Poklad*), na něm ověřit formát
   a teprve pak psát další.
4. **Slovníky a věty** — dohodnuto: návrh napíše Claude, projde je autor.
   Otevřené zůstává jen, jestli se k tomu podaří získat i učitele.
5. **Roztržený příběh ve skupinách** (§6) — stačí, že se složí na tabuli, nebo
   má každá skupina dostat i kus společného děje navíc?

**Rozhodnuto 2. 10. 2026 (Karel: „ano ke všemu“):**

1. Změna vize platí, jde samostatným commitem do `VISION.md`.
2. Délky 4 / 6 / 8 stanovišť a 2–6 skupin zůstávají. Kolik příkladů
   na stanoviště unese hodina, ukáže první hra.
3. První verze má jediný příběh, *Poklad*. Další až po ověření formátu.
4. Slovníky a věty napíše Claude, projde je Karel.
5. Roztržený příběh ve skupinách se skládá jen na tabuli, děj navíc pro
   skupiny se odkládá.

Interaktivní tabuli třída, kde se bude hrát poprvé, má, takže pořadí
práce zůstává: zámek na tabuli patří do fáze 1.
