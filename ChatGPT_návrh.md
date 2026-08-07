Ano.

A tentokrát to neříkám proto, že je ten nápad zajímavý, ale proto, že podle mě projekt splnil důležitou podmínku:

**Přestal být nápadem a stal se specifikací.**

To je velký rozdíl.

Ještě před pár dny jsme řešili otázky typu:

- Calc nebo web?
- Jak budou fungovat souřadnice?
- Co s opakovanými písmeny?
- Jak zabránit chybám?

Teď už máte dokumenty, které definují:

- architekturu,
- rozsah 0.1,
- co do 0.1 patří a co ne,
- Definition of Done,
- rizika,
- pravidla pro další rozvoj.

To je přesně okamžik, kdy má smysl začít psát kód.
1. ## **Co bych ale udělal před prvním commitem**
   Ještě jednu jedinou věc.

   Ne technickou.

   Napište krátký dokument:

**VISION.md**

Ne architekturu.

Ne roadmapu.

Jednu stránku.

Například:

1. ### **Proč Šifromatika vzniká**
   Šifromatika pomáhá učitelům základních škol během jedné minuty vytvořit kvalitní matematickou aktivitu.

   Každé rozhodnutí v projektu se posuzuje podle jediné otázky:

**Pomůže to učiteli rychle vytvořit lepší aktivitu pro děti?**

Pokud ne, funkce do projektu nepatří.

Cílem není vytvořit největší generátor pracovních listů.

Cílem je vytvořit nejlepší nástroj pro tvorbu matematických her.

Možná to zní zbytečně, ale podobný dokument pomáhá po roce vývoje říkat „ne“ funkcím, které projekt odvádějí od jeho hlavního poslání.
1. ## **Ještě jedna rada z předchozích projektů**
   U tvého projektu **Společné stopy** jsme několikrát narazili na to, že dobře vymezené MVP pomáhá udržet směr. Tam jste si nakonec stanovili jednoduché kritérium – nová funkce musí podporovat hlavní cíl projektu, jinak patří až do další fáze. Myslím, že stejná disciplína bude pro Šifromatiku velmi cenná.
1. ## **A můj návrh pro první sprint**
   Neřešil bych hned všech deset bodů z 0.1.

   První sprint bych omezil na jediný cíl:

1. Zadání tajenky.
1. Vygenerování tabulky.
1. Vygenerování příkladů.
1. Automatická verifikace.
1. Náhled v prohlížeči.

Bez tisku.\
Bez ukládání.\
Bez pokročilého UI.

Pokud tenhle "vertikální řez" funguje od vstupu až po hotovou hru, máte jistotu, že jádro projektu je zdravé. Teprve potom bych přidával tisk, .sifra a další funkce.

A nakonec jedna osobní poznámka.

Za dobu, co spolu mluvíme, jsem viděl spoustu tvých nápadů. Některé byly skvělé, ale zůstaly ve fázi úvah. U Šifromatiky mám jiný pocit. Tady už máte promyšlený rozsah, jasnou architekturu a realistický plán první verze. To jsou přesně podmínky, za kterých mají open-source projekty šanci opravdu vzniknout, ne jen zůstat na papíře.

Takže moje odpověď je jednoduchá:

**Ano. Přestaňte dokumentovat a začněte programovat.** Dokumenty už jsou dostatečně dobrým základem pro verzi 0.1.

To mě těší. 😊

A mám jednu radu pro Claudea, která podle mě může projektu hodně pomoct.

Řekl bych mu něco ve smyslu:

**Nepřemýšlej, jaké hry přidat. Přemýšlej, jaké matematické mechanismy se opakují.**

Například:

- **Přiřazování** (pexeso, domino)
- **Vyhledávání** (šifra, bingo)
- **Řazení** (číselná osa, posloupnosti)
- **Orientace v prostoru** (bludiště, stezka)
- **Logická dedukce** (detektiv)
- **Optimalizace** (najdi nejkratší cestu)
- **Konstrukce** (stavění obrazců)

Pak budou nové moduly vznikat přirozeně, protože budou kombinovat stejné stavební kameny.

A ještě jeden nápad, který bych si schoval do budoucna.
1. ## **🏆 Režim "Generátor"**
   Ne aby si učitel vybíral:

- šifra,
- bingo,
- domino.

Ale aby vybral:

- **téma:** piráti
- **4. třída**
- **20 minut**
- **malá násobilka**

A aplikace sama navrhne:

- 🧩 úvodní šifru,
- 🎯 bingo na procvičení,
- 🃏 domino na upevnění,
- 🏁 závěrečnou stezku.

To už nebude generátor pracovních listů, ale **generátor celé vyučovací hodiny**.

To je podle mě vize, která stojí za to. Ale je dobře, že jste si pro 0.1 jasně řekli: **tohle teď ne**. 😄

A mimochodem... až budete mít 0.2 nebo 0.3, klidně mi zase pošli návrh. Baví mě být u projektu jako "oponent", který hledá slabá místa i nové příležitosti. Myslím, že kombinace tvých nápadů, Claudeovy technické preciznosti a mého pohledu na pedagogiku funguje překvapivě dobře.

