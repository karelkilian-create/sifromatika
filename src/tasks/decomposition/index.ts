/**
 * Generátor rozkladu na desítky a jednotky.
 *
 * `3 · 10 + 7 = ?`, a schválně tímhle směrem. Učebnice píše rozklad obráceně
 * (`37 = 3 · 10 + 7`), jenže taková úloha má dva výsledky — desítky *a*
 * jednotky — a šifra potřebuje jediné kladné celé číslo, protože výsledek je
 * kód políčka v mřížce. Obrácený zápis má výsledek jeden a je to rovnou to
 * hledané číslo, takže projde všude: šifrou, řadami i kartičkami.
 * Rozhodl Karel 29. 8. 2026, viz docs/navrh-druha-trida.md §5.
 *
 * Samostatný modul, ne tvar aritmetiky — vzorem jsou `powers`. Důvod je tady
 * ale silnější než u mocnin: **druhá třída nemá v malé násobilce desítku**
 * (`multiplicationTables: [2, 3, 4, 5]`). Kdyby se rozklad hlásil k násobení,
 * vypnul by ho učitel, který si násobení odškrtne, přestože `· 10` tu není
 * násobilka, ale zápis desítek.
 *
 * Konstrukce je DETERMINISTICKÁ a jednoznačná: každé číslo má právě jeden
 * rozklad. `reachableValues` i `generateForValue` proto čtou z jedné funkce
 * a nemají se jak rozejít.
 */

import { ALL_OPERATIONS } from '../../core/model/index.js'
import type {
  DifficultyProfile,
  GenContext,
  OperationTag,
  Task,
  TaskGenerator,
} from '../../core/model/index.js'
import type { Rng } from '../../core/rng/index.js'
import { evaluateExpression } from '../../core/verify/index.js'
import { SYMBOL } from '../shapes.js'

/**
 * Nejnižší a nejvyšší rozložitelné číslo.
 *
 * Od deseti proto, že jednociferné číslo žádné desítky nemá a `0 · 10 + 7`
 * je hádanka o zápisu, ne o rozkladu. Do devadesáti devíti proto, že rozklad
 * na stovky je látka třetí třídy a jiný zápis (`2 · 100 + 3 · 10 + 5`).
 */
const MIN_TARGET = 10
const MAX_TARGET = 99

/**
 * Do kterého ročníku se téma nabízí.
 *
 * Dvojka ho má jako látku, trojka jako opakování. Od čtvrté třídy je rozklad
 * čtení čísla, ne úloha — a zaškrtávátko by tam bylo šum.
 */
const MAX_GRADE = 3

/**
 * Vytištěná podoba rozkladu.
 *
 * `40` je `4 · 10`, ne `4 · 10 + 0`: nula na konci není počítání, jen šum
 * v zadání. Souřadnicová šifra si o násobky desíti stejně neřekne (kód
 * políčka nikdy nekončí nulou), ale lineární šifra a hry ano.
 */
function textFor(target: number): string | null {
  if (!Number.isInteger(target) || target < MIN_TARGET || target > MAX_TARGET) return null
  const tens = Math.floor(target / 10)
  const units = target % 10
  const head = `${tens} ${SYMBOL.mul} 10`
  return units === 0 ? head : `${head} ${SYMBOL.add} ${units}`
}

/**
 * Umí tenhle ročník rozklad?
 *
 * Samostatná funkce, ne metoda volaná přes `this`: generátor se leckde
 * předává jako hodnota a vazba by se při prvním rozbalení ztratila.
 */
function supportsGrade(profile: DifficultyProfile): boolean {
  return profile.grade <= MAX_GRADE
}

/**
 * Hlásí se rozklad k některé ze zaškrtnutých operací?
 *
 * Stačí JEDNA z dvojice násobení/sčítání, ne obě. Učitel, který v září
 * odškrtne násobení, protože se malá násobilka ještě nebrala, musí rozklad
 * dostat dál — `· 10` tu není násobilka, ale zápis desítek. To je celý důvod,
 * proč je rozklad samostatné zaškrtávátko.
 *
 * ⚠ Úplně bez ohledu na operace to ale být nesmí. `reachableValues` se ptá
 *   i po JEDNÉ operaci zvlášť — šifra si tak zjišťuje, kam smí rozprostřít
 *   písmena, a `mixShortfall` z toho pozná, na kterou operaci má smysl
 *   nadávat. Kdyby rozklad na dotaz „co umíš dělením?" odpověděl „všechno",
 *   šifra by na dělení čekala tam, kde nemá jak vzniknout.
 */
function matchesMix(mix: Partial<Record<OperationTag, number>>): boolean {
  const chosen = ALL_OPERATIONS.filter((operation) => (mix[operation] ?? 0) > 0)
  // Prázdný mix znamená „všechny operace", stejně jako u aritmetiky.
  return chosen.length === 0 || chosen.includes('mul') || chosen.includes('add')
}

/** Vejde se rozklad do oboru ročníku? */
function fits(target: number, profile: DifficultyProfile): boolean {
  return target <= profile.numberRange.max && textFor(target) !== null
}

export const decompositionGenerator: TaskGenerator = {
  id: 'decomposition',

  supports: supportsGrade,

  reachableValues(
    profile: DifficultyProfile,
    mix: Partial<Record<OperationTag, number>>,
  ): Set<number> {
    const values = new Set<number>()
    if (!supportsGrade(profile) || !matchesMix(mix)) return values
    for (let target = MIN_TARGET; target <= Math.min(MAX_TARGET, profile.numberRange.max); target++) {
      values.add(target)
    }
    return values
  },

  generateForValue(target: number, ctx: GenContext, _rng: Rng): Task | null {
    if (!supportsGrade(ctx.profile) || !matchesMix(ctx.mix)) return null
    if (!fits(target, ctx.profile)) return null

    const text = textFor(target)
    if (text === null) return null
    // Každé číslo má jediný rozklad, takže „už použito" znamená „tuhle
    // hodnotu neumím podruhé" — ne že by pomohlo zkusit to znovu. Losování
    // tu proto není vůbec; `rng` zůstává v podpisu kvůli kontraktu.
    if (ctx.usedExpressions.has(text)) return null

    // Přepočet z hotového textu — tímtéž kódem, který ho bude verifikovat.
    let computed: number
    try {
      computed = evaluateExpression(text)
    } catch {
      return null
    }
    if (computed !== target) return null

    ctx.usedExpressions.add(text)

    // Násobení i sčítání: `(24 − 8) · 2` se do obou počítá taky a rozklad je
    // týž případ. Násobek desíti sčítání nemá, tam zůstane jen násobení.
    const operations: OperationTag[] = target % 10 === 0 ? ['mul'] : ['mul', 'add']

    return {
      id: `decomposition:${text}`,
      generatorId: 'decomposition',
      value: target,
      prompt: { kind: 'expr', text },
      solutionSteps: [{ kind: 'expr', text: `${text} = ${target}` }],
      didactic: {
        grade: ctx.profile.grade,
        difficulty: 2,
        effort: 2,
        operations,
        skills: ['arit.desitky-jednotky'],
      },
    }
  },
}
