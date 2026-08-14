# Vize

> Tenhle dokument není architektura ani roadmapa. Je to měřítko, kterým se posuzují oba.
> Když se rozhodnutí o funkci nedá rozhodnout technicky, rozhoduje se tady.

## Proč Šifromatika vzniká

Učitel na prvním stupni má na přípravu hodiny večer po vlastních dětech. Chce dát třídě
něco lepšího než sloupec příkladů z učebnice, ale vyrobit dobrou matematickou hru ručně
znamená hodinu práce — a když se v ní splete, zjistí to až u pětadvaceti dětí ve třídě.

**Šifromatika mu dá kvalitní matematickou aktivitu za jednu minutu.**

Ne šablonu k doplnění. Hotový list, ověřené řešení, připravený tisk.

## Jediná otázka

Každé rozhodnutí v projektu — funkce, závislost, položka v UI, řádek konfigurace — se
posuzuje jednou otázkou:

> **Pomůže to učiteli rychle vytvořit lepší aktivitu pro děti?**

Pokud ne, do projektu to nepatří. Ani když je to zajímavé. Ani když to je skoro hotové.

Ta otázka má dvě poloviny a obě platí zároveň:

- **rychle** — každý krok navíc mezi nápadem a tiskem je krok, po kterém učitel sáhne
  raději po učebnici;
- **lepší** — rychle vyrobený špatný list je horší než žádný. Proto verifikace není
  funkce, ale podmínka. Aktivita, kterou nelze ověřit, se nevytiskne.

## Co Šifromatika není

- **Není generátor pracovních listů.** Cílem není pokrýt co nejvíc typů cvičení.
  Cílem je, aby to, co umí, bylo opravdu dobré.
- **Není výukový systém.** Nesleduje žáky, nesbírá výsledky, nevede evidenci.
  Nikdo se nikam nepřihlašuje a nic se nikam neodesílá.
- **Není platforma pro obsah.** Nemá tržiště, komunitní knihovnu ani účty.
- **Není náhrada učitele.** Rozhodnutí, co dnes třída potřebuje, zůstává na něm.
  Šifromatika jen zkracuje cestu od toho rozhodnutí k hotovému papíru.

## Pro koho

Učitel matematiky na základní škole, prvního i druhého stupně. Připravuje se na notebooku
nebo tabletu, tiskne na školní tiskárně, internet ve třídě mu občas nejede.

Původně se mířilo jen na 3.–5. ročník. Rozsah se rozšířil na **3.–8.** a platí u toho
pravidlo, které z omezení dělá závazek: **ročník se nesmí objevit v nabídce dřív, než pro
něj existuje skutečný profil obtížnosti.** Osmák pod nadpisem „8. třída" musí dostat
osmáckou matematiku, ne pátou třídu s přelepeným číslem. Proto se devátý ročník zatím
nenabízí — chybí mu rovnice a lomené výrazy.

Z toho plyne trojice trvalých závazků, které nejsou technická volba, ale součást vize:
**běží celé v prohlížeči, bez účtu, a výstup je papír.**

## Jak vznikají nové moduly

Pravidlo, které rozhoduje o tom, co se staví dál:

> **Nepřemýšlej, jakou hru přidat. Přemýšlej, jaký matematický mechanismus se opakuje.**

Šifra je vyhledávání. Domino je přiřazování. Číselná osa je řazení. Bludiště je orientace
v prostoru. Jakmile je mechanismus postavený jednou a pořádně, další hra nad ním je
kompozice, ne nový projekt.

Proto je oddělení `core / tasks / ciphers / activities`
([architektura](docs/sifromatika-navrh-architektury.md)) věcí vize, ne vkusu: drží
mechanismy oddělené od her, které z nich vznikají. Modul, který si vyžádá zásah do
`core/` nebo `tasks/`, je signál, že se buď špatně navrhl on, nebo dosud chybí mechanismus,
který ve skutečnosti potřebuje.

Katalog mechanismů, ze kterých se dá skládat:
přiřazování · vyhledávání · řazení · orientace v prostoru · logická dedukce ·
optimalizace · konstrukce.

## Jak se pozná, že se to daří

Ne počtem modulů, hvězdiček ani stažení. Těmito třemi věcmi:

1. Učitel vyrobí hotovou aktivitu **do minuty** a bez nápovědy.
2. Za rok používání **nerozdá jediný rozbitý list**.
3. Aktivitu uloženou loni otevře a vytiskne **beze změny** ([`.sifra`](README.md#uložení-a-sdílení)).

Třetí bod je nejdražší a nejméně viditelný. Je v seznamu proto, že nástroj, kterému
nejde věřit, že zítra vydá totéž co dnes, se na přípravu hodiny používat nedá.

## Kdy tenhle dokument změnit

Když se ukáže, že je špatně — třeba že učitelé chtějí něco jiného, než tady stojí.
To je legitimní důvod a stojí za samostatný commit s odůvodněním.

Není legitimní ho měnit proto, aby se do rozsahu vešla funkce, která se právě chce
udělat. Na to je roadmapa.
