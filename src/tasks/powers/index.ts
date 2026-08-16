/**
 * Generátor úloh s mocninami a odmocninami.
 *
 * Mocniny v projektu existovaly už dřív, ale jako vedlejší varianta aritmetiky:
 * pro generátor byl `12² + 7` jen složený výraz jako každý jiný a losoval se
 * z jednoho pytle s nimi. Na listu se pak objevily dvakrát za dvanáct úloh
 * a učitel je neměl jak vyžádat. Tenhle modul z nich dělá **téma, které jde
 * zaškrtnout** — a tím pádem i pexeso složené ze samých mocnin.
 *
 * Vzorem je `percent`, ne `arithmetic`: konstrukce jde pozpátku od cílové
 * hodnoty a je DETERMINISTICKÁ. `textsFor` vrátí všechny výrazy, kterými se dá
 * daná hodnota vyjádřit, takže `reachableValues` a `generateForValue` čtou
 * z jednoho zdroje a nemůžou se rozejít. Aritmetika si tvary losuje a na null
 * naráží až po vylosování; to je pro šifru v pořádku (cíl si diktuje mřížka),
 * pro pexeso ne — tam se z dosažitelných hodnot vybírá, a slíbit hodnotu,
 * kterou generátor nevyrobí, znamená o dvojici míň.
 *
 * Meze základů sdílí se `../shapes.js`, aby se mocniny v celém projektu
 * usazovaly ve stejném oboru.
 */

import type {
  DidacticMeta,
  DifficultyProfile,
  GenContext,
  OperationTag,
  SkillTag,
  Task,
  TaskGenerator,
} from '../../core/model/index.js'
import type { Rng } from '../../core/rng/index.js'
import { evaluateExpression } from '../../core/verify/index.js'
import { MAX_CUBE_BASE, MAX_SQUARE_BASE, SYMBOL, inRange } from '../shapes.js'

interface PowerShape {
  id: string
  /**
   * Holý tvar — samotná mocnina bez druhého členu (`7²`, `√81`).
   *
   * Má přednost před vším ostatním, viz `generateForValue`.
   */
  bare?: boolean
  /**
   * Operace, které musí být zaškrtnuté.
   *
   * Prázdné pole = tvar na operacích nezávisí. To je celý smysl holých tvarů:
   * učitel, který nechá zaškrtnuté jen sčítání, má pořád dostat `7²`.
   */
  requires: OperationTag[]
  skills: SkillTag[]
  effort: number
  /** Všechny výrazy tohohle tvaru, které dají `target`. Nejvýš pár kusů. */
  textsFor(target: number, profile: DifficultyProfile): string[]
}

/** Celočíselná odmocnina, nebo `null`, když cíl není úplný čtverec. */
function exactSquareRoot(value: number): number | null {
  if (value < 0) return null
  const root = Math.round(Math.sqrt(value))
  return root * root === value ? root : null
}

/** Celočíselná třetí odmocnina, nebo `null`. */
function exactCubeRoot(value: number): number | null {
  if (value < 0) return null
  const root = Math.round(Math.cbrt(value))
  return root ** 3 === value ? root : null
}

/**
 * Nejvyšší druhý člen.
 *
 * Podstatně přísnější než aritmetika, která povoluje `MAX_POWER_REMAINDER`
 * (dnes 100) a jen u odčítání. Ukázalo se to na papíře: pexeso ze samých
 * mocnin vyšlo jako `18² + 89`, `19² + 95`, `15² + 5` — mocnina na kartičce
 * byla, ale hlavní prací bylo sčítání za ní a výsledky vycházely přes čtyři
 * sta. Tedy přesně to, kvůli čemu volba témat vznikla.
 *
 * Do dvaceti zůstává mocnina tím, co úloha procvičuje, a druhý člen jen
 * posune výsledek, aby se dvojice nedaly uhodnout od oka.
 */
const MAX_REMAINDER = 20

/**
 * Strop pro číslo, od kterého se odečítá odmocnina (`25 − √16`).
 *
 * Sto proto, že odčítání v tomhle oboru zvládne osmák zpaměti a úloha zůstane
 * o odmocnině.
 */
const MAX_FIRST_TERM = 100

/** Smí být `rest` druhým členem? */
function usableRemainder(rest: number, profile: DifficultyProfile): boolean {
  return inRange(rest, profile) && rest <= MAX_REMAINDER
}

const SHAPES: readonly PowerShape[] = [
  // ── Holé tvary ─────────────────────────────────────────────────────────────
  // Aritmetika je nemá: `7²` je jednooperandový výraz, kdežto její složené
  // tvary mají vždycky druhý člen. Pro kartičku jsou ale nejlepší — přečtou se
  // na pohled a nezávisí na žádné zaškrtnuté operaci.
  {
    id: 'square',
    bare: true,
    requires: [],
    skills: ['moc.druha-mocnina'],
    effort: 2,
    textsFor(target, profile) {
      const base = exactSquareRoot(target)
      if (base === null || base < 2 || base > MAX_SQUARE_BASE) return []
      if (target > profile.numberRange.max) return []
      return [`${base}²`]
    },
  },
  {
    id: 'cube',
    bare: true,
    requires: [],
    skills: ['moc.treti-mocnina'],
    effort: 3,
    textsFor(target, profile) {
      const base = exactCubeRoot(target)
      if (base === null || base < 2 || base > MAX_CUBE_BASE) return []
      if (target > profile.numberRange.max) return []
      return [`${base}³`]
    },
  },
  {
    id: 'root',
    bare: true,
    requires: [],
    skills: ['moc.druha-odmocnina'],
    effort: 2,
    textsFor(target, profile) {
      if (target < 2 || target > MAX_SQUARE_BASE) return []
      if (target ** 2 > profile.numberRange.max) return []
      return [`√${target ** 2}`]
    },
  },

  // ── Tvary se druhým členem ─────────────────────────────────────────────────
  {
    id: 'square-plus',
    requires: ['add'],
    skills: ['moc.druha-mocnina'],
    effort: 3,
    textsFor(target, profile) {
      const texts: string[] = []
      for (let base = 2; base <= MAX_SQUARE_BASE; base++) {
        const rest = target - base ** 2
        if (base ** 2 > profile.numberRange.max) break
        if (usableRemainder(rest, profile)) texts.push(`${base}² ${SYMBOL.add} ${rest}`)
      }
      return texts
    },
  },
  {
    id: 'square-minus',
    requires: ['sub'],
    skills: ['moc.druha-mocnina'],
    effort: 3,
    textsFor(target, profile) {
      const texts: string[] = []
      for (let base = 2; base <= MAX_SQUARE_BASE; base++) {
        const rest = base ** 2 - target
        if (base ** 2 > profile.numberRange.max) break
        if (usableRemainder(rest, profile)) texts.push(`${base}² ${SYMBOL.sub} ${rest}`)
      }
      return texts
    },
  },
  {
    id: 'cube-plus',
    requires: ['add'],
    skills: ['moc.treti-mocnina'],
    effort: 4,
    textsFor(target, profile) {
      const texts: string[] = []
      for (let base = 2; base <= MAX_CUBE_BASE; base++) {
        const rest = target - base ** 3
        if (base ** 3 > profile.numberRange.max) break
        if (usableRemainder(rest, profile)) texts.push(`${base}³ ${SYMBOL.add} ${rest}`)
      }
      return texts
    },
  },
  {
    // Tvar, který aritmetika nemá — a přitom je to Karlův vlastní příklad
    // `2³ − 8`. Na kartičce dává i nulu, což je na papíře v pořádku; v šifře
    // by nešla použít, ale ta si nulu nikdy nevyžádá, protože kódy políček
    // začínají jedničkou.
    id: 'cube-minus',
    requires: ['sub'],
    skills: ['moc.treti-mocnina'],
    effort: 4,
    textsFor(target, profile) {
      const texts: string[] = []
      for (let base = 2; base <= MAX_CUBE_BASE; base++) {
        const rest = base ** 3 - target
        if (base ** 3 > profile.numberRange.max) break
        if (usableRemainder(rest, profile)) texts.push(`${base}³ ${SYMBOL.sub} ${rest}`)
      }
      return texts
    },
  },
  {
    id: 'root-plus',
    requires: ['add'],
    skills: ['moc.druha-odmocnina'],
    effort: 3,
    textsFor(target, profile) {
      const texts: string[] = []
      // Odmocňuje se jen z úplného čtverce, jinak vyjde iracionální číslo.
      for (let root = 2; root <= MAX_SQUARE_BASE; root++) {
        const rest = target - root
        if (root ** 2 > profile.numberRange.max) break
        if (usableRemainder(rest, profile)) texts.push(`√${root ** 2} ${SYMBOL.add} ${rest}`)
      }
      return texts
    },
  },
  {
    id: 'root-minus',
    requires: ['sub'],
    skills: ['moc.druha-odmocnina'],
    effort: 4,
    textsFor(target, profile) {
      const texts: string[] = []
      for (let root = 2; root <= MAX_SQUARE_BASE; root++) {
        const first = target + root
        if (root ** 2 > profile.numberRange.max) break
        // ⚠ Tady je „druhý člen" ten PRVNÍ: od čeho se odečítá. Bez stropu
        //   vzniká `463 − √16`, kde odmocnina je hotová za vteřinu a zbytek
        //   úlohy je odčítání čtyřciferných čísel.
        if (first <= MAX_FIRST_TERM && inRange(first, profile)) {
          texts.push(`${first} ${SYMBOL.sub} √${root ** 2}`)
        }
      }
      return texts
    },
  },
]

/**
 * Nejvyšší VÝSLEDEK, který má smysl nabízet.
 *
 * Mocninné výrazy dosáhnou na obor celého profilu (`root-minus` uměl `9998 −
 * √4`), jenže takový výraz o mocninách nic neučí — je to odčítání s ozdobou.
 *
 * Sto je Karlova volba po prvním zkušebním listu (16. 8. 2026). Bez stropu se
 * cíle losovaly z celého oboru do 420 a vycházelo `19² − 8 = 353`, `17² + 17 =
 * 306` — mocnina na kartičce byla, ale hlavní prací bylo počítání s velkými
 * čísly. Se stropem zůstane zásoba 101 hodnot (dost na plný počet dvojic),
 * výsledky se vejdou do hlavy a **holá mocnina vyjde zhruba na každou čtvrtou
 * kartičku**, protože do sta je přesných mocnin hustě.
 *
 * ⚠ Netýká se ZÁKLADŮ, jen výsledku: `√289 = 17` projde, protože výsledek je
 *   sedmnáct. Odmocňuje se dál z čísel, která by jako výsledek neprošla.
 */
const MAX_TARGET = 100

function shapesFor(mix: Partial<Record<OperationTag, number>>): readonly PowerShape[] {
  const chosen = (['add', 'sub', 'mul', 'div'] as OperationTag[]).filter(
    (operation) => (mix[operation] ?? 0) > 0,
  )
  // Prázdný výběr znamená „všechny operace", stejně jako u aritmetiky.
  const allowed = chosen.length === 0 ? (['add', 'sub', 'mul', 'div'] as OperationTag[]) : chosen
  return SHAPES.filter((shape) => shape.requires.every((operation) => allowed.includes(operation)))
}

export const powersGenerator: TaskGenerator = {
  id: 'powers',

  supports: (profile: DifficultyProfile) => profile.powers,

  reachableValues(
    profile: DifficultyProfile,
    mix: Partial<Record<OperationTag, number>>,
  ): Set<number> {
    const values = new Set<number>()
    if (!profile.powers) return values

    const shapes = shapesFor(mix)
    const ceiling = Math.min(profile.numberRange.max, MAX_TARGET)
    // Od nuly, ne od jedničky: `2³ − 8` je poctivá kartička. Šifra si nulu
    // nevyžádá, protože kódy políček začínají jedničkou.
    for (let target = 0; target <= ceiling; target++) {
      for (const shape of shapes) {
        if (shape.textsFor(target, profile).length > 0) {
          values.add(target)
          break
        }
      }
    }
    return values
  },

  generateForValue(target: number, ctx: GenContext, rng: Rng): Task | null {
    if (!ctx.profile.powers) return null
    // Tentýž strop jako v `reachableValues`. Bez něj by `root-minus` vyrobil
    // i `503 − √4`, tedy hodnotu, kterou generátor nikomu neslíbil — a slib
    // se se skutečností rozejít nesmí.
    if (target < 0 || target > Math.min(ctx.profile.numberRange.max, MAX_TARGET)) return null

    const shapes = shapesFor(ctx.mix).filter(
      (shape) => shape.textsFor(target, ctx.profile).length > 0,
    )
    if (shapes.length === 0) return null

    // ⚠ Holý tvar má přednost, kdykoli existuje. Bez toho se `49` vylosuje
    //   jako `6² + 13` stejně často jako `7²`, protože tvarů se druhým členem
    //   je šest a holých tři — a na kartičce ze samých mocnin je pak mocnina
    //   všude, ale nikde není vidět samotná.
    const bare = shapes.filter((shape) => shape.bare === true)
    const usable = bare.length > 0 ? bare : shapes

    for (let attempt = 0; attempt < 8; attempt++) {
      const shape = rng.pick(usable)
      const text = rng.pick(shape.textsFor(target, ctx.profile))
      if (ctx.usedExpressions.has(text)) continue

      // Přepočet z hotového textu — tímtéž kódem, který ho bude verifikovat.
      // Hodnota vznikla konstrukcí, tady se čte z toho, co bude na papíře.
      let computed: number
      try {
        computed = evaluateExpression(text)
      } catch {
        continue
      }
      if (computed !== target) continue

      ctx.usedExpressions.add(text)
      return {
        id: `powers:${text}`,
        generatorId: 'powers',
        value: target,
        prompt: { kind: 'expr', text },
        solutionSteps: [{ kind: 'expr', text: `${text} = ${target}` }],
        didactic: {
          grade: ctx.profile.grade,
          difficulty: Math.min(5, Math.max(1, shape.effort)) as DidacticMeta['difficulty'],
          effort: shape.effort,
          // Mocnina je opakované násobení, odmocnina jeho inverze — proto `mul`
          // i u holých tvarů, které žádnou zaškrtnutou operaci nevyžadují.
          operations: shape.requires.length > 0 ? shape.requires : ['mul'],
          skills: shape.skills,
        },
      }
    }
    return null
  },
}
