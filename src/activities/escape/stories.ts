/**
 * Příběhy únikové hry: texty, tematické slovníky, nabízené tajenky.
 *
 * Text se tu NEGENERUJE. Každá věta prošla autorem projektu dřív, než se
 * dostala do repozitáře — text, který nikdo nečetl, nesmí před třídu
 * (docs/navrh-unikova-hra.md §6). Zdroje: docs/unikova-hra-poklad.md
 * a docs/unikova-hra-hrobka.md.
 *
 * ⚠ Změna slovníku nebo vět mění výstup uložených her. Každá úprava je proto
 *   inkrement `GENERATOR_VERSION` (§3) — golden test na to upozorní.
 *
 * Pravidla pro věty (docs/unikova-hra-poklad.md): věta na listu neobsahuje
 * své slovo, žádná věta neobsahuje slova tajenek, každá stojí sama, truhla
 * se otevře až ve finále. Hlídá to `escape.test.ts`, kde to stroj umí.
 */

import type { EscapeLength, Grade } from '../../core/model/index.js'

export interface StoryWord {
  /** Slovo s diakritikou, jak ho ukáže tabule. */
  word: string
  /** Věta nahoře na listu stanoviště. */
  sheet: string
  /** Věta na tabuli po uznání slova. */
  board: string
}

export interface Story {
  id: string
  /** Název jen pro učitele. Děti ho nevidí — prozradil by krátkou tajenku. */
  label: string
  /** Komu příběh sedí. Je to výchozí nabídka, ne zákaz. */
  audience: 'younger' | 'older'
  /** Tabule na začátku; učitel ho čte nahlas. */
  intro: string
  /** Pod rámečky tajenky po celou hru. */
  motto: string
  /** Tabule po finále. */
  outro: string
  /** Jedna tajenka na každou délku hry; delší rozvíjí kratší. */
  messages: Readonly<Record<EscapeLength, string>>
  words: readonly StoryWord[]
  /**
   * Slova jen pro písmena, která v `words` chybí. Přidají se ke slovníku,
   * až když je tajenka bez nich nepostaví — tajenky, které šly postavit
   * dřív, se tak losují ze stejných slov a uložené hry se nezmění. Nové
   * slovo do `words` by naopak přelosovalo každou hru příběhu, a tedy
   * žádalo inkrement `GENERATOR_VERSION` pro všechny aktivity.
   */
  spareWords: readonly StoryWord[]
}

/** Všechna slova příběhu včetně rezervy — pro kontroly vět a ověření řetězce. */
export function allStoryWords(story: Story): readonly StoryWord[] {
  return [...story.words, ...story.spareWords]
}

const POKLAD: Story = {
  id: 'poklad',
  label: 'Poklad',
  audience: 'younger',
  intro:
    'Vaše loď přistála u malého ostrova. Říká se, že je tu zakopaná truhla. ' +
    'Má zvláštní zámek: neotevře ho klíč, ale tajné heslo. Písmena hesla ' +
    'schoval starý pirát po celém ostrově. Spočítejte příklady a najděte je!',
  motto: 'Jedna posádka, jedno heslo. Každé písmeno se počítá.',
  outro:
    'Zámek cvakl a víko se pomalu zvedlo. Uvnitř se třpytí zlaté mince, ' +
    'perly a drahé kameny. Poklad patří vám — každé písmeno jste si ' +
    'vypočítali sami!',
  messages: {
    short: 'POKLAD',
    medium: 'POKLAD JE NÁŠ',
    long: 'POKLAD JE NÁŠ, KAPITÁNE',
  },
  words: [
    {
      word: 'MAPA',
      sheet: 'Za kamenem je schovaný stočený papír. Někdo na něj napsal čísla.',
      board: 'Je to mapa! Křížek na ní ukazuje, kam jít dál.',
    },
    {
      word: 'TRUHLA',
      sheet: 'Pod zemí je něco tvrdého. Na víku jsou vyrytá čísla.',
      board: 'Vykopali jste truhlu. Je těžká a pořád zamčená.',
    },
    {
      word: 'KOTVA',
      sheet: 'Na dně u břehu leží něco těžkého ze železa.',
      board: 'Z vody jste vytáhli starou kotvu. Je celá zarostlá řasou.',
    },
    {
      word: 'LOPATA',
      sheet: 'U palmy trčí z písku kus dřeva. Jsou na něm čísla.',
      board: 'Lopata! Teď máte čím kopat.',
    },
    {
      word: 'KOMPAS',
      sheet: 'V kapse starého kabátu cinká malá krabička.',
      board: 'Kompas! Teď víte, kterým směrem jít.',
    },
    {
      word: 'ZÁMEK',
      sheet: 'Na víku visí něco kovového s okénky. Vedle jsou čísla.',
      board: 'Zámek nemá dírku na klíč. Otevře ho jen heslo.',
    },
    {
      word: 'OSTROV',
      sheet: 'Na vrcholu kopce stojí kámen s čísly.',
      board: 'Z kopce vidíte celý ostrov. Je malý, ale plný skrýší.',
    },
    {
      word: 'PIRÁT',
      sheet: 'Na staré ceduli je podpis. Pod ním jsou čísla.',
      board: 'Ten podpis patří starému pirátovi. Tohle místo znal dobře.',
    },
    {
      word: 'VLAJKA',
      sheet: 'Na vysoké tyči se ve větru třepotá kus látky.',
      board: 'Černá vlajka s bílou lebkou! Kdysi tu přistála pirátská loď.',
    },
    {
      word: 'DUKÁT',
      sheet: 'Racek upustil do písku něco zlatého a kulatého.',
      board: 'Zlatý dukát! Racek ho asi někde ukradl.',
    },
    {
      word: 'PÍSEK',
      sheet: 'Někdo napsal klackem čísla na pláž. Pospěšte si, než je smaže vlna!',
      board: 'V písku jsou stopy bosých nohou. Vedou k palmám.',
    },
    {
      word: 'LOĎKA',
      sheet: 'Na pláži leží dvě vesla. Na jednom jsou čísla.',
      board: 'Za skálou je schovaná loďka. Kdyby bylo potřeba rychle zmizet…',
    },
    {
      word: 'DĚLO',
      sheet: 'Ze křoví kouká stará železná roura.',
      board: 'Staré dělo míří na moře. Už dávno nevystřelilo.',
    },
    {
      word: 'ÚTES',
      sheet: 'Na kraji ostrova padá kámen strmě dolů do moře.',
      board: 'Stojíte na útesu. Dole bijí vlny o kameny.',
    },
    {
      word: 'VLNA',
      sheet: 'Moře hučí a něco vám přinese až k nohám.',
      board: 'Velká vlna vyplavila na břeh prkno s čísly.',
    },
    {
      word: 'KORÁL',
      sheet: 'Pod vodou u břehu roste něco červeného a tvrdého.',
      board: 'Korál je tvrdý jako kámen, a přitom je živý.',
    },
    {
      word: 'PERLA',
      sheet: 'Na dně leží zavřená mušle.',
      board: 'V mušli byla bílá perla. Je hladká a lesklá.',
    },
    {
      word: 'PALMA',
      sheet: 'Na pláži roste vysoký strom s velkými listy. Na kmeni jsou čísla.',
      board: 'Pod palmou je stín. Nahoře visí kokosy.',
    },
    {
      word: 'MINCE',
      sheet: 'V díře ve stromě cinká malý měšec.',
      board: 'Měšec je plný starých mincí.',
    },
    {
      word: 'KLÍČ',
      sheet: 'Ve staré botě něco chrastí.',
      board: 'Klíč! Jenže zámek na truhle nemá dírku. Je asi od něčeho jiného.',
    },
    {
      word: 'KAJUTA',
      sheet: 'Na vraku lodi jsou malé dveře. Na nich jsou čísla.',
      board: 'V kajutě visí houpací síť. Na stole leží svíčka.',
    },
    {
      word: 'SKÁLA',
      sheet: 'Uprostřed ostrova stojí něco velikého a šedého.',
      board: 'Ve skále je škvíra. Proleze jen malá ruka.',
    },
  ],
  spareWords: [
    // B a Y (11. 10. 2026). Y je v každém přídavném jméně na -ý: „ZLATÝ", „MODRÝ".
    {
      word: 'RYBA',
      sheet: 'U břehu skáče z vody něco stříbrného. Na šupinách jsou čísla.',
      board: 'Ryba! Piráti by si ji k večeři upekli na ohni.',
    },
    // F (11. 10. 2026).
    {
      word: 'FLAŠKA',
      sheet: 'Vlna vyplavila na břeh zelené sklo. Uvnitř je papír s čísly.',
      board: 'Flaška se vzkazem! Kdo ji asi poslal přes moře?',
    },
    // G (11. 10. 2026).
    {
      word: 'MANGO',
      sheet: 'Na stromě visí žlutý sladký plod. Na slupce jsou čísla.',
      board: 'Mango! Je zralé a voní. Dobrá svačina pro celou posádku.',
    },
  ],
}

const HROBKA: Story = {
  id: 'hrobka',
  label: 'Hrobka faraona',
  audience: 'older',
  intro:
    'Vaše výprava sestoupila do starověké hrobky. Sotva jste vešli, kamenný kvádr ' +
    'za vámi zapadl a zavřel vchod. Nad ním je vytesaný nápis, ze kterého někdo ' +
    'vysekal písmena. Kdo ho doplní, toho kámen pustí ven. Písmena jsou ukrytá ' +
    'v číslech po všech komorách. Spočítejte příklady a najděte je!',
  motto: 'Jedna výprava, jeden nápis. Každé písmeno se počítá.',
  outro:
    'Poslední písmeno zapadlo na své místo. Kvádr se se skřípotem odsunul a dovnitř ' +
    'proniklo denní světlo. Jste venku — a nesete si příběh, kterému nikdo neuvěří. ' +
    'Každé písmeno jste si vypočítali sami!',
  messages: {
    short: 'KLETBA',
    medium: 'FARAONOVA KLETBA',
    long: 'FARAONOVA KLETBA ZMIZELA',
  },
  words: [
    {
      word: 'MUMIE',
      sheet: 'V kamenné rakvi leží někdo zabalený do pruhů plátna. Na obvazech jsou čísla.',
      board: 'Mumie! Leží tu přes tři tisíce let a ani se nepohne. Doufejme.',
    },
    {
      word: 'HROBKA',
      sheet: 'Na stěně je vyrytý plánek podzemních síní a komor. U každé je číslo.',
      board: 'Plánek ukazuje, že hrobka má mnohem víc místností, než jste čekali.',
    },
    {
      word: 'SFINGA',
      sheet: 'U zdi leží kamenný lev s lidskou hlavou. Na tlapách má vytesaná čísla.',
      board: 'Sfinga mlčí a dívá se do tmy. Prý kdysi dávala poutníkům hádanky.',
    },
    {
      word: 'PÍSEK',
      sheet: 'Na podlaze je navátá vrstva drobných žlutých zrnek. Někdo do ní prstem napsal čísla.',
      board: 'Písek sem vítr nanášel celá staletí. Kdo psal ta čísla, je záhada.',
    },
    {
      word: 'AMULET',
      sheet: 'Na krku sochy visí na šňůrce malý modrý přívěsek. Na zadní straně jsou čísla.',
      board: 'Amulet měl chránit svého majitele před zlými duchy. Jestli chrání i vás, nevíte.',
    },
    {
      word: 'MAPA',
      sheet: 'Ve výklenku leží srolovaný papyrus. Jsou na něm cesty, šipky a čísla.',
      board: 'Je to mapa! Některé cesty na ní končí naslepo.',
    },
    {
      word: 'ZLATO',
      sheet: 'Ve světle baterky se něco na zemi žlutě zatřpytí.',
      board: 'Zlato! Celá hromada. Jenže ven vás nepustí.',
    },
    {
      word: 'ŽEZLO',
      sheet: 'O zeď je opřená zdobená hůl. Na rukojeti jsou čísla.',
      board: 'Žezlo nosil jen vládce. Stačilo jím mávnout a všichni poslouchali.',
    },
    {
      word: 'POUŠŤ',
      sheet: 'Na stěně je namalovaná krajina: samé duny, slunce a ani kapka vody.',
      board: 'Kolem hrobky jsou stovky kilometrů písku. Bez vody byste odsud daleko nedošli.',
    },
    {
      word: 'OÁZA',
      sheet: 'Na malbě roste uprostřed vyprahlé krajiny pár palem kolem jezírka.',
      board: 'Oáza: jediné místo široko daleko, kde se dalo napít.',
    },
    {
      word: 'KOBRA',
      sheet: 'Z rohu se ozývá tiché syčení. Na koši, odkud vychází, jsou čísla.',
      board: 'V koši je kobra. Naštěstí spí — couvejte pomalu.',
    },
    {
      word: 'TRŮN',
      sheet: 'Na vyvýšeném stupni stojí veliké zlacené křeslo. V opěradle jsou vyřezaná čísla.',
      board: 'Je to trůn a je prázdný. Jeho majitel tu ale pořád někde je.',
    },
    {
      word: 'LOTOS',
      sheet: 'V nádobě u zdi stojí sušený květ s mnoha lístky. Na stonku visí štítek s čísly.',
      board: 'Lotos byl pro Egypťany posvátný. Ráno rozkvétá a večer se zavírá.',
    },
    {
      word: 'SOCHA',
      sheet: 'Ve výklenku stojí kamenná postava v životní velikosti. Na podstavci jsou čísla.',
      board: 'Socha má oči z modrého kamene. Jako by vás sledovaly.',
    },
    {
      word: 'LAMPA',
      sheet: 'Na polici stojí hliněná miska s knotem a zbytkem oleje.',
      board: 'Lampa ještě hoří! Někdo tu musel být před vámi.',
    },
    {
      word: 'KORUNA',
      sheet: 'Na kamenném podstavci leží vysoká čepice, bílá a červená.',
      board: 'Koruna Horního a Dolního Egypta. Kdo ji nosil, vládl celé zemi.',
    },
    {
      word: 'SKARAB',
      sheet: 'Po zemi leze velký černý brouk. Ne — je z kamene a na krovkách má čísla.',
      board: 'Skarab, posvátný brouk. Egypťané věřili, že tlačí slunce po obloze.',
    },
    {
      word: 'CHODBA',
      sheet: 'Světlo baterky osvětlí úzký průlez, který se stáčí do tmy. Na stěně jsou čísla.',
      board: 'Chodba vede dolů, hlouběji pod zem. Ze tmy táhne studený vzduch.',
    },
    {
      word: 'PAST',
      sheet: 'Jeden kámen v podlaze je trochu vyšší než ostatní. Je na něm vyryto číslo.',
      board: 'Past! Kdo na ten kámen šlápne, spustí ze stropu písek. Obejděte ho.',
    },
    {
      word: 'VÁZA',
      sheet: 'V rohu stojí vysoká hliněná nádoba s uchem. Na hrdle jsou čísla.',
      board: 'Ve váze je obilí. Egypťané dávali mrtvým jídlo na cestu do posmrtného života.',
    },
  ],
  spareWords: [
    // Y (11. 10. 2026). Je v každém přídavném jméně na -ý: „ZLATÝ", „MODRÝ".
    {
      word: 'DÝKA',
      sheet: 'V prachu leží něco ostrého se zlatou rukojetí. Na čepeli jsou čísla.',
      board: 'Dýka! U Tutanchamona se našla podobná. Její čepel je ze železa z meteoritu.',
    },
    // J: „… ZMIZELA, JSME VOLNÍ" je přirozené pokračování dlouhé tajenky (11. 10. 2026).
    {
      word: 'VĚJÍŘ',
      sheet: 'Na podlaze leží dlouhá tyč zakončená půlkruhem z pštrosích per. Na držadle jsou čísla.',
      board: 'Vějíř! Sluhové s ním ovívali vládce, aby mu v horku nebylo zle.',
    },
  ],
}

const OBRAZ: Story = {
  id: 'obraz',
  label: 'Zmizelý obraz',
  audience: 'older',
  intro:
    'Ráno našla ředitelka muzea v hlavním sále prázdný rám. Nejcennější obraz sbírky ' +
    'v noci zmizel a poplach se ani neozval. Kdo to udělal, prozradí stopy po celé ' +
    'budově — v každé jsou schovaná čísla. Spočítejte příklady a vyřešte případ!',
  motto: 'Jeden tým, jeden případ. Každé písmeno se počítá.',
  outro:
    'Případ je vyřešený. Pachatelem byl noční uklízeč: znal každý kout muzea i místa, ' +
    'kam kamery nevidí. Obraz se našel srolovaný v jeho úklidovém vozíku, celý ' +
    'a nepoškozený. Každé písmeno jste si vypočítali sami!',
  messages: {
    short: 'PACHATEL',
    medium: 'PACHATEL JE UKLÍZEČ',
    long: 'PACHATEL JE NOČNÍ UKLÍZEČ',
  },
  words: [
    {
      word: 'STOPA',
      sheet: 'Přes vyleštěnou podlahu vede řada šlápot. U poslední jsou čísla.',
      board: 'Stopa boty velikosti 44. Podlaha byla v noci čerstvě vytřená — kdo po ní chodil?',
    },
    {
      word: 'OTISK',
      sheet: 'Na skle vitríny je mastná šmouha od prstu. Pod ní jsou drobná čísla.',
      board: 'Otisk prstu! Policie ho porovná se všemi, kdo mají od muzea klíče.',
    },
    {
      word: 'ALIBI',
      sheet: 'Na stole ředitelky leží jízdenka z Vídně se včerejším datem. Na zadní straně jsou čísla.',
      board: 'Ředitelka má alibi: celou noc seděla ve vlaku z Vídně.',
    },
    {
      word: 'SVĚDEK',
      sheet: 'Pán z domu naproti v noci nemohl spát a díval se z okna. Do bloku si zapisoval čísla aut, která projela kolem.',
      board: 'Svědek viděl ve dvě ráno v muzeu světlo. Jen chvíli, jen v jednom patře.',
    },
    {
      word: 'KAMERA',
      sheet: 'V rohu stropu bliká červené světýlko. Na jeho krytu jsou čísla.',
      board: 'Kamera v sále se ve dvě ráno na deset minut vypnula. Náhoda?',
    },
    {
      word: 'LUPA',
      sheet: 'V šuplíku leží kulaté sklo s rukojetí. Na rukojeti jsou čísla.',
      board: 'Lupa ukáže, že rám někdo pečlivě otřel hadrem.',
    },
    {
      word: 'POUTA',
      sheet: 'Na opasku policisty cinkají dva kovové kroužky spojené řetízkem.',
      board: 'Pouta jsou připravená. Zbývá zjistit, komu je nasadit.',
    },
    {
      word: 'ZÁMEK',
      sheet: 'Dveře do skladu obrazů mají kovovou krabičku s klíčovou dírkou. Kolem ní jsou vyrytá čísla.',
      board: 'Zámek není vylomený. Kdo šel dovnitř, měl klíč.',
    },
    {
      word: 'MOTIV',
      sheet: 'V kanceláři leží výpis z aukce. U jedné položky jsou podtržená čísla.',
      board: 'Motiv je jasný: obraz má cenu několika milionů korun.',
    },
    {
      word: 'PLÁTNO',
      sheet: 'V prázdném rámu zůstal u okraje odříznutý proužek s kouskem malby. Jsou na něm čísla.',
      board: 'Plátno bylo z rámu vyříznuté. Srolované se dá schovat skoro kamkoli.',
    },
    {
      word: 'BARVA',
      sheet: 'Na prahu dveří leží drobné modré šupinky. Vedle nich jsou čísla.',
      board: 'Barva se z obrazu odloupla, když ho někdo spěšně roloval.',
    },
    {
      word: 'HLÍDAČ',
      sheet: 'Ve vrátnici visí na věšáku čepice s odznakem. Na odznaku jsou čísla.',
      board: 'Hlídač celou noc seděl u monitorů. Prý neviděl nic zvláštního.',
    },
    {
      word: 'ALARM',
      sheet: 'Na zdi u vchodu je panel s tlačítky a malým displejem.',
      board: 'Alarm se v noci nespustil. Kdo ho vypnul, znal kód.',
    },
    {
      word: 'KLÍČ',
      sheet: 'Ve vrátnici visí na háčcích svazky. U jednoho je štítek s čísly.',
      board: 'Klíč od sálu ráno visel na svém místě. Kdo si ho v noci půjčil a zase vrátil?',
    },
    {
      word: 'OKNO',
      sheet: 'Na parapetu v prvním patře je pár škrábanců a čísla.',
      board: 'Okno je zevnitř zavřené na kliku. Zloděj tudy neutekl — byl celou dobu uvnitř.',
    },
    {
      word: 'PODPIS',
      sheet: 'V knize návštěv je na posledním řádku klikyhák. Pod ním jsou čísla.',
      board: 'Podpis je od včerejšího odpoledne. Večer už do muzea nikdo cizí nepřišel.',
    },
    {
      word: 'STÍN',
      sheet: 'Na záběru z kamery je na zdi tmavá silueta. V rohu obrazovky jsou čísla.',
      board: 'Stín na zdi tlačí před sebou něco na kolečkách.',
    },
    {
      word: 'CHODBA',
      sheet: 'Dlouhý průchod mezi sály osvětluje jen nouzové světlo. Na zdi jsou čísla.',
      board: 'Chodbou se dá dojít do skladu, aniž vás zachytí jediná kamera. Kdo to ví?',
    },
    {
      word: 'MALÍŘ',
      sheet: 'Na mosazné cedulce pod prázdným rámem je jméno a dva letopočty. A pár čísel navíc.',
      board: 'Malíř obraz namaloval před sto lety. Dnes je to nejcennější dílo muzea.',
    },
    {
      word: 'ŠTĚTEC',
      sheet: 'V dílně restaurátora stojí ve sklenici tenké násadky s chloupky na konci. Na jedné jsou čísla.',
      board: 'Štětec je suchý a čistý. Restaurátor byl celý týden na dovolené.',
    },
    {
      word: 'BATOH',
      sheet: 'Pod lavičkou v šatně někdo zapomněl tašku na záda. Na přezce jsou čísla.',
      board: 'V batohu je svačina a sešit. Patří školákovi z včerejší exkurze.',
    },
    {
      word: 'JIZVA',
      sheet: 'Na fotce z kamery u vchodu má muž na tváři světlou čáru. Pod fotkou jsou čísla.',
      board: 'Muž s jizvou je kurýr, který včera přivezl balík. Odešel v pět odpoledne.',
    },
  ],
  spareWords: [
    // Y (11. 10. 2026).
    {
      word: 'BRÝLE',
      sheet: 'Pod topením v sále leží tmavé obroučky se skly. Na nožičce jsou čísla.',
      board: 'Brýle! Někdo je v noci ztratil, když se skláněl k rámu.',
    },
    // F (11. 10. 2026).
    {
      word: 'FOTKA',
      sheet: 'Na nástěnce pro zaměstnance visí snímek celého týmu muzea. Na zadní straně jsou čísla.',
      board: 'Fotka zaměstnanců: ředitelka, hlídač, pokladní a v rohu muž s mopem.',
    },
    // G (11. 10. 2026).
    {
      word: 'GARÁŽ',
      sheet: 'Ve dvoře muzea jsou plechová vrata. Někdo na ně sprejem napsal čísla.',
      board: 'V garáži stojí dodávka muzea. Motor je ještě teplý.',
    },
  ],
}

/** Příběhy v pořadí nabídky: jeden pro mladší a jeden pro starší (4. 10. 2026). */
export const STORIES: readonly Story[] = [POKLAD, HROBKA, OBRAZ]

/**
 * Příběh, který hra nabídne, dokud učitel nevybere sám: podle ročníku
 * (§6 návrhu). Mladší jsou první stupeň, starší druhý.
 */
export function defaultStoryId(grade: Grade): string {
  const audience = grade <= 5 ? 'younger' : 'older'
  return (STORIES.find((story) => story.audience === audience) ?? POKLAD).id
}

export function findStory(id: string): Story | undefined {
  return STORIES.find((story) => story.id === id)
}
