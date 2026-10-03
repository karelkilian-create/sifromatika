/**
 * Příběhy únikové hry: texty, tematické slovníky, nabízené tajenky.
 *
 * Text se tu NEGENERUJE. Každá věta prošla autorem projektu dřív, než se
 * dostala do repozitáře — text, který nikdo nečetl, nesmí před třídu
 * (docs/navrh-unikova-hra.md §6). Zdroj: docs/unikova-hra-poklad.md.
 *
 * ⚠ Změna slovníku nebo vět mění výstup uložených her. Každá úprava je proto
 *   inkrement `GENERATOR_VERSION` (§3) — golden test na to upozorní.
 *
 * Pravidla pro věty (docs/unikova-hra-poklad.md): věta na listu neobsahuje
 * své slovo, žádná věta neobsahuje slova tajenek, každá stojí sama, truhla
 * se otevře až ve finále. Hlídá to `escape.test.ts`, kde to stroj umí.
 */

import type { EscapeLength } from '../../core/model/index.js'

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
  /** Tabule na začátku a karta skupiny. */
  intro: string
  /** Pod rámečky tajenky po celou hru. */
  motto: string
  /** Tabule po finále. */
  outro: string
  /** Jedna tajenka na každou délku hry; delší rozvíjí kratší. */
  messages: Readonly<Record<EscapeLength, string>>
  words: readonly StoryWord[]
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
}

/**
 * Příběhy v pořadí nabídky. První verze má jediný (rozhodnuto 2. 10. 2026,
 * §13 bod 3); další přibudou, až se formát ověří ve třídě.
 */
export const STORIES: readonly Story[] = [POKLAD]

export const DEFAULT_STORY_ID = POKLAD.id

export function findStory(id: string): Story | undefined {
  return STORIES.find((story) => story.id === id)
}
