/**
 * Generátor úloh se zlomky — zatím jediný tvar: zlomek jako část celku.
 *
 * Zápis je `3/4 z 80`, tedy lomítko a předložka `z`. Obojí je záměr:
 *
 *   • **Lomítko** je ve vygenerovaném zadání volné, protože dělení se na
 *     českém listu píše dvojtečkou (`36 : 4`). Tokenizer `/` zná jako dělení
 *     a `3/4` mu dá 0,75 — přesně tu hodnotu, kterou zlomek má. Verifikace
 *     proto zlomky umí, aniž by se jí musel psát nový druh výrazu.
 *   • **Předložka `z`** existuje kvůli procentům a váže stejně těsně jako
 *     tečka, takže `80 − 1/4 z 80` je `80 − 20`.
 *
 * Zlomek a procento jsou tu sourozenci: `25 % z 80` a `1/4 z 80` je táž úloha
 * dvěma zápisy, takže i kostra modulu je stejná jako v `tasks/percent`.
 *
 * ⚠ Výsledek je vždy CELÉ číslo, protože zlomek se tu vyskytuje jen v zadání.
 *   Zlomek jako výsledek (`1/2 + 1/4 = 3/4`) je samostatný krok: `Task.value`
 *   je číslo, `1/3` se do dvou desetinných míst nevejde, a kartička by
 *   ukázala `0,75` tam, kde má dítě párovat zlomek se zlomkem. Rozvaha je
 *   v `docs/navrh-zlomky.md` §5.
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

/**
 * Jmenovatelé, které dítě dělí z hlavy.
 *
 * Sedmina a devítina tu schválně nejsou: `3/7 z 84` je správně, ale dělení
 * sedmi je počítání na papíře a úloha o zlomcích se změní v cvičení na
 * dělení. Je to stejná úvaha, jaká u procent vybrala násobky pěti.
 */
const DENOMINATORS = [2, 3, 4, 5, 6, 8, 10]

/**
 * Strop pro základ.
 *
 * Bez něj vzniká `1/10 z 4200`: v oboru osmého ročníku, ale mimo čísla,
 * ve kterých dítě o zlomcích přemýšlí. Táž mez a týž důvod jako u procent.
 */
const MAX_BASE = 1000

/**
 * Strop pro MEZIVÝSLEDEK, tedy pro podíl `základ : jmenovatel`.
 *
 * Sám o sobě je základ špatná míra náročnosti: `9/10 z 710` je z hlavy, kdežto
 * `2/3 z 897` není, a přitom jsou obě čísla skoro stejně velká. Rozdíl je
 * v tom, co dítěti vyjde po prvním kroku — 71, nebo 299.
 *
 * ⚠ Ukázal to teprve zkušební tisk pexesa: na kartičkách stálo `2/3 z 897`
 *   a `5/6 z 966`. Do her se to dostalo proto, že jejich cíle jdou do tisíce,
 *   kdežto šifra si říká o kódy políček, tedy nejvýš dvojciferné. Strop
 *   zásobu cílů zkrátil ze 737 na 644 a **cílů šifry se nedotkl vůbec**.
 */
const MAX_QUOTIENT = 100

/** Největší společný dělitel — kvůli zlomkům v základním tvaru. */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/**
 * Zlomky, které se na listu smí objevit: pravé a v základním tvaru.
 *
 * `2/4 z 80` je pro dítě `1/2 z 80` napsané zbytečně složitě, a nepravý
 * zlomek (`5/4 z 80`) je látka až za smíšenými čísly. Pořadí je pevné —
 * losuje se z něj, takže by jeho přeházení změnilo výstup z téhož seedu.
 */
const FRACTIONS: readonly { numerator: number; denominator: number }[] = DENOMINATORS.flatMap(
  (denominator) =>
    Array.from({ length: denominator - 1 }, (_, index) => index + 1)
      .filter((numerator) => gcd(numerator, denominator) === 1)
      .map((numerator) => ({ numerator, denominator })),
)

interface Shape {
  id: string
  /** Které zlomky tvar používá. */
  fractions: readonly { numerator: number; denominator: number }[]
  skills: SkillTag[]
  effort: number
}

/**
 * Jednotkový zlomek je jeden krok (vyděl), ostatní dva (vyděl a vynásob).
 * Rozdíl je v námaze, ne v látce, takže dovednost je u obou tatáž.
 */
const SHAPES: readonly Shape[] = [
  {
    id: 'unit-fraction',
    fractions: FRACTIONS.filter((fraction) => fraction.numerator === 1),
    skills: ['zlom.cast-z-celku'],
    effort: 3,
  },
  {
    id: 'proper-fraction',
    fractions: FRACTIONS.filter((fraction) => fraction.numerator > 1),
    skills: ['zlom.cast-z-celku'],
    effort: 4,
  },
]

/**
 * Základ, ze kterého daný zlomek dá právě `target`.
 *
 * Konstrukce jde pozpátku od výsledku, stejně jako u procent: pro cíl 60
 * a zlomek `3/4` vyjde základ 80. Musí být celý — `3/4 z 79` není úloha,
 * kterou by šlo spočítat z hlavy, a hlavně by nedala celý výsledek.
 */
function baseFor(target: number, numerator: number, denominator: number): number | null {
  const base = (target * denominator) / numerator
  if (!Number.isInteger(base)) return null
  if (base <= 0 || base > MAX_BASE) return null
  // Co dítěti vyjde po prvním kroku, tedy po dělení jmenovatelem.
  if (base / denominator > MAX_QUOTIENT) return null
  return base
}


/**
 * Zlomek z celku je dělení i násobení dohromady: `1/4 z 80` je dělení čtyřmi,
 * `3/4 z 80` k tomu ještě násobení třemi. Stačí proto, aby byla povolená
 * jedna z těch dvou operací.
 *
 * Procenta mají přísnější pravidlo (jen násobení) a zůstávají na něm — jejich
 * zápis dělení nikde neukazuje, kdežto zlomková čára je dělení napsané.
 * Prázdný mix znamená „všechny operace", stejně jako u aritmetiky.
 */
function multiplicationOrDivisionAllowed(mix: Partial<Record<OperationTag, number>>): boolean {
  const chosen = (['add', 'sub', 'mul', 'div'] as OperationTag[]).filter(
    (operation) => (mix[operation] ?? 0) > 0,
  )
  return chosen.length === 0 || chosen.includes('mul') || chosen.includes('div')
}

/**
 * Základy, ze kterých daný cíl vyjde — každý zlomek nejvýš jeden, protože
 * `base` je z cíle a zlomku určený jednoznačně.
 *
 * ⚠ Procenta na tomhle místě dávají přednost základům dělitelným deseti
 *   (`25 % z 80`, ne `25 % z 84`). Zlomky ji mít NESMÍ, i když to vypadá jako
 *   totéž: základ desetiny je `cíl · 10`, tedy kulatý VŽDY, takže by desetina
 *   vyhrála skoro každé losování. Naměřeno na cílech šifry: s preferencí
 *   vyšlo 51 desetin a 22 pětin z 88 úloh, ale jen tři poloviny a jedna
 *   čtvrtina — a to jsou zlomky, o které v sedmé třídě jde nejvíc. Bez ní
 *   je rozdělení rovnoměrné (7 až 17 na jmenovatele).
 *
 *   Nic se tím neztratí: `1/3 z 66` je hezká úloha, i když 66 kulaté není.
 *   Dělitelnost je zaručená konstrukcí, takže dítě dělí vždycky beze zbytku.
 */
function optionsFor(
  target: number,
  shape: Shape,
  profile: DifficultyProfile,
): { numerator: number; denominator: number; base: number }[] {
  const options: { numerator: number; denominator: number; base: number }[] = []
  for (const { numerator, denominator } of shape.fractions) {
    const base = baseFor(target, numerator, denominator)
    if (base === null || base > profile.numberRange.max) continue
    options.push({ numerator, denominator, base })
  }
  return options
}

export const fractionsGenerator: TaskGenerator = {
  id: 'fractions',

  supports: (profile: DifficultyProfile) => profile.fractions,

  reachableValues(
    profile: DifficultyProfile,
    mix: Partial<Record<OperationTag, number>>,
  ): Set<number> {
    const values = new Set<number>()
    if (!profile.fractions || !multiplicationOrDivisionAllowed(mix)) return values

    const ceiling = Math.min(profile.numberRange.max, MAX_BASE)
    for (let target = 1; target <= ceiling; target++) {
      for (const shape of SHAPES) {
        if (optionsFor(target, shape, profile).length > 0) {
          values.add(target)
          break
        }
      }
    }
    return values
  },

  generateForValue(target: number, ctx: GenContext, rng: Rng): Task | null {
    if (!ctx.profile.fractions || !multiplicationOrDivisionAllowed(ctx.mix)) return null

    for (let attempt = 0; attempt < 8; attempt++) {
      const shape = rng.pick(SHAPES)
      const options = optionsFor(target, shape, ctx.profile)
      if (options.length === 0) continue

      const { numerator, denominator, base } = rng.pick(options)
      const text = `${numerator}/${denominator} z ${base}`
      if (ctx.usedExpressions.has(text)) continue

      // Přepočet z hotového textu — tímtéž kódem, který ho bude verifikovat.
      // Hodnota vznikla konstrukcí ze základu, tady se čte z toho, co bude
      // na papíře; rozejít se ty dvě cesty nesmí.
      let computed: number
      try {
        computed = evaluateExpression(text)
      } catch {
        continue
      }
      if (Math.abs(computed - target) > 1e-9) continue

      ctx.usedExpressions.add(text)
      return {
        id: `fractions:${text}`,
        generatorId: 'fractions',
        value: target,
        prompt: { kind: 'expr', text },
        solutionSteps: [{ kind: 'expr', text: `${text} = ${target}` }],
        didactic: {
          grade: ctx.profile.grade,
          difficulty: Math.min(5, Math.max(1, shape.effort)) as DidacticMeta['difficulty'],
          effort: shape.effort,
          // Dělení i násobení: dítě dělí jmenovatelem a násobí čitatelem.
          // U jednotkového zlomku je ten druhý krok násobení jedničkou, tedy
          // žádný — ale rozlišovat to v metadatech by znamenalo, že se `1/4`
          // a `3/4` chovají v poměru operací jinak, aniž by to učitel čekal.
          operations: ['mul', 'div'],
          skills: shape.skills,
        },
      }
    }
    return null
  },
}
