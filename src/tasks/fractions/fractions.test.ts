import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { gradeProfile } from '../../core/constraints/index.js'
import type { Grade, OperationTag, TaskGenerator } from '../../core/model/index.js'
import { ALLOW_DECIMAL_RESULTS, REQUIRE_WHOLE_RESULTS } from '../../core/model/index.js'
import { formatValue, isWholeNumber } from '../../core/number/index.js'
import { createRng } from '../../core/rng/index.js'
import { evaluateExpression } from '../../core/verify/index.js'
import {
  fractionProductsGenerator,
  fractionQuotientsGenerator,
  fractionSumsGenerator,
  fractionsGenerator,
} from './index.js'

const ALL: Partial<Record<OperationTag, number>> = { add: 1, sub: 1, mul: 1, div: 1 }

function context(grade: Grade, mix = ALL) {
  return {
    profile: gradeProfile(grade),
    mix,
    usedExpressions: new Set<string>(),
    rules: REQUIRE_WHOLE_RESULTS,
  }
}

/** `3/4 z 80` → { numerator: 3, denominator: 4, base: 80 } */
function parts(text: string) {
  const match = /^(\d+)\/(\d+) z (\d+)$/u.exec(text)
  if (match === null) throw new Error(`neočekávaný tvar: ${text}`)
  return {
    numerator: Number(match[1]),
    denominator: Number(match[2]),
    base: Number(match[3]),
  }
}

describe('fractionsGenerator', () => {
  it('nabízí se od sedmé třídy, dřív ne', () => {
    // Šestá třída zlomky zavádí, ale počítá s nimi až sedmá — rozhodnuto
    // 22. 8. 2026. Je to týž ročník jako u procent.
    expect(fractionsGenerator.supports(gradeProfile(5))).toBe(false)
    expect(fractionsGenerator.supports(gradeProfile(6))).toBe(false)
    expect(fractionsGenerator.supports(gradeProfile(7))).toBe(true)
    expect(fractionsGenerator.supports(gradeProfile(8))).toBe(true)
  })

  it('vyrobí úlohu, jejíž text dává právě zadaný cíl', () => {
    const rng = createRng('zlomky-cil')
    for (const target of [6, 12, 15, 20, 24, 45, 60]) {
      const task = fractionsGenerator.generateForValue(target, context(7), rng)
      expect(task, `cíl ${target}`).not.toBeNull()
      if (task === null) continue
      expect(evaluateExpression(task.prompt.text)).toBeCloseTo(target, 9)
      expect(task.value).toBe(target)
    }
  })

  it('základ je vždy dělitelný jmenovatelem — jinak nevyjde celý výsledek', () => {
    const ctx = context(7)
    const rng = createRng('zlomky-delitelnost')
    for (let target = 1; target <= 120; target++) {
      const task = fractionsGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      const { denominator, base } = parts(task.prompt.text)
      expect(base % denominator, task.prompt.text).toBe(0)
    }
  })

  it('zlomek je pravý a v základním tvaru', () => {
    // `2/4 z 80` je `1/2 z 80` napsané zbytečně složitě a `5/4 z 80` je
    // látka až za smíšenými čísly.
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
    const ctx = context(7)
    const rng = createRng('zlomky-tvar')

    for (let target = 1; target <= 120; target++) {
      const task = fractionsGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      const { numerator, denominator } = parts(task.prompt.text)
      expect(numerator, task.prompt.text).toBeLessThan(denominator)
      expect(gcd(numerator, denominator), task.prompt.text).toBe(1)
    }
  })

  it('jmenovatel je ten, kterým dítě dělí z hlavy', () => {
    // Sedmina ani devítina ne: `3/7 z 84` je správně, ale dělení sedmi je
    // počítání na papíře a z úlohy o zlomcích se stane úloha o dělení.
    const ctx = context(8)
    const rng = createRng('zlomky-jmenovatele')
    for (let target = 1; target <= 200; target++) {
      const task = fractionsGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      expect([2, 3, 4, 5, 6, 8, 10], task.prompt.text).toContain(parts(task.prompt.text).denominator)
    }
  })

  it('mezivýsledek dělení je číslo, které dítě udrží v hlavě', () => {
    // `2/3 z 897` a `5/6 z 966` stály na vytištěných kartičkách, než tohle
    // pravidlo vzniklo: základ v mezích, ale po vydělení třemi vyjde 299.
    // Šifry se to nedotklo — její cíle jsou kódy políček, tedy dvojciferné.
    const ctx = context(8)
    const rng = createRng('zlomky-mezivysledek')
    for (let target = 1; target <= 400; target++) {
      const task = fractionsGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      const { denominator, base } = parts(task.prompt.text)
      expect(base / denominator, task.prompt.text).toBeLessThanOrEqual(100)
    }
  })

  it('základ zůstává v oboru, ve kterém se o zlomcích přemýšlí', () => {
    // Bez stropu vzniká `1/10 z 4200`: v oboru osmého ročníku, ale mimo
    // čísla, se kterými dítě zachází zpaměti.
    const ctx = context(8)
    const rng = createRng('zlomky-obor')
    for (let target = 1; target <= 200; target++) {
      const task = fractionsGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      expect(parts(task.prompt.text).base, task.prompt.text).toBeLessThanOrEqual(1000)
    }
  })

  it('výsledek je vždy kladné celé číslo — je to kód políčka', () => {
    // ⚠ `isWholeNumber`, ne `Number.isInteger`: `7/10 z 710` vyjde v plovoucí
    //   čárce jako 496.99999999999994. Není to vada generátoru ani důvod
    //   počítat zlomky celočíselně — `Task.value` nese poctivých 497 a na list
    //   se tiskne ono, kdežto tady se počítá znovu z textu. Verifikace na to
    //   má tutéž toleranci (viz `EPSILON` v `core/verify`) a ze stejného
    //   důvodu: `0,07 · 300` dá 21.000000000000004.
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 500 }), fc.string({ minLength: 1 }), (target, seed) => {
        const task = fractionsGenerator.generateForValue(target, context(7), createRng(seed))
        if (task === null) return true
        const computed = evaluateExpression(task.prompt.text)
        return isWholeNumber(computed) && Math.abs(computed - target) < 1e-9
      }),
      { numRuns: 200 },
    )
  })

  it('slibuje jen hodnoty, které opravdu vyrobí', () => {
    const profile = gradeProfile(7)
    const reachable = fractionsGenerator.reachableValues(profile, ALL, REQUIRE_WHOLE_RESULTS)
    expect(reachable.size).toBeGreaterThan(100)

    for (const target of [...reachable].slice(0, 80)) {
      const ctx = context(7)
      expect(
        fractionsGenerator.generateForValue(target, ctx, createRng(`slib-${target}`)),
        `slíbená hodnota ${target}`,
      ).not.toBeNull()
    }
  })

  it('zlomek z celku je dělení i násobení, takže stačí jedna z těch operací', () => {
    // Procenta vyžadují násobení; u zlomku je dělení napsané ve zlomkové
    // čáře, takže by odškrtnuté násobení nemělo zlomky zabít.
    const onlyDiv = context(7, { div: 1 })
    const onlyMul = context(7, { mul: 1 })
    const onlyAdd = context(7, { add: 1 })

    expect(fractionsGenerator.generateForValue(20, onlyDiv, createRng('jen-deleni'))).not.toBeNull()
    expect(fractionsGenerator.generateForValue(20, onlyMul, createRng('jen-nasobeni'))).not.toBeNull()
    expect(fractionsGenerator.generateForValue(20, onlyAdd, createRng('jen-scitani'))).toBeNull()
  })

  it('neopakuje tentýž výraz', () => {
    const ctx = context(7)
    const rng = createRng('zlomky-opakovani')
    const texts = new Set<string>()
    for (let target = 1; target <= 100; target++) {
      const task = fractionsGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      expect(texts.has(task.prompt.text)).toBe(false)
      texts.add(task.prompt.text)
    }
  })

  it('žádný jmenovatel nepohltí list', () => {
    // Zámek proti preferenci kulatého základu, kterou má generátor procent:
    // základ desetiny je `cíl · 10`, tedy kulatý vždycky, takže by ta
    // preference vyrobila list ze samých desetin a pětin. Naměřeno: 51 desetin
    // a 22 pětin z 88 úloh, poloviny tři a čtvrtina jedna.
    const ctx = context(7)
    const rng = createRng('zlomky-rozdeleni')
    const counts = new Map<number, number>()
    let total = 0

    // Rozsah cílů šifry — tam se to projevilo nejsilněji, protože kódy
    // políček jsou nejvýš dvojciferné.
    for (let target = 1; target <= 88; target++) {
      const task = fractionsGenerator.generateForValue(target, ctx, rng)
      if (task === null) continue
      total++
      const { denominator } = parts(task.prompt.text)
      counts.set(denominator, (counts.get(denominator) ?? 0) + 1)
    }

    expect(counts.size, 'na listu mají být zastoupené všechny jmenovatele').toBe(7)
    for (const [denominator, count] of counts) {
      expect(count / total, `jmenovatel ${denominator}`).toBeLessThan(0.35)
    }
    // Polovina a čtvrtina jsou zlomky, o které v sedmé třídě jde nejvíc.
    expect((counts.get(2) ?? 0) + (counts.get(4) ?? 0)).toBeGreaterThan(10)
  })
})

describe('fractionsGenerator — verifikace zlomek přečte', () => {
  it('lomítko je pro tokenizer dělení, takže hodnota sedí', () => {
    // Tohle je celý důvod, proč zlomky nepotřebovaly nový druh výrazu:
    // dělení se na listu píše dvojtečkou, takže `/` zbylo volné.
    expect(evaluateExpression('3/4 z 80')).toBeCloseTo(60, 9)
    expect(evaluateExpression('80 − 1/4 z 80')).toBeCloseTo(60, 9)
  })

  it('předložka `z` váže těsně jako tečka', () => {
    // Kdyby vázala volně, bylo by `1/2 z 80 + 10` rovno `1/2 z 90`.
    expect(evaluateExpression('1/2 z 80 + 10')).toBeCloseTo(50, 9)
  })

  it('dělení zlomků dá podíl, ne řetěz dělení', () => {
    // ⚠ Do verze 10 byla zlomková čára pro tokenizer obyčejné dělení
    //   a `1/2 : 1/4` se počítalo zleva doprava jako 1:2:1:4, tedy 0,125.
    //   U sčítání i násobení vychází obojí nastejno (`a/b · c/d` je opravdu
    //   `a·c/(b·d)`), takže se to nemělo kde ukázat — a generátor by dělení
    //   zlomků nevyrobil, protože by mu ho verifikace po právu zamítla.
    expect(evaluateExpression('1/2 : 1/4')).toBeCloseTo(2, 9)
    expect(evaluateExpression('1/2 : 3/4')).toBeCloseTo(2 / 3, 9)
    expect(evaluateExpression('2/3 · 3/5')).toBeCloseTo(0.4, 9)
  })
})

/** `1/2 + 1/4`, `2/3 · 3/5`, `1/2 : 1/4` → operandy a operace. */
function sumParts(text: string) {
  const match = /^(\d+)\/(\d+) ([+−·:]) (\d+)\/(\d+)$/u.exec(text)
  if (match === null) throw new Error(`neočekávaný tvar: ${text}`)
  return {
    left: { numerator: Number(match[1]), denominator: Number(match[2]) },
    operator: match[3]!,
    right: { numerator: Number(match[4]), denominator: Number(match[5]) },
  }
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/** Všechny úlohy, které daný generátor pro ročník a mix umí vyrobit. */
function everyTask(generator: TaskGenerator, grade: Grade, mix = ALL) {
  const rng = createRng('zlomkovy-vysledek')
  const ctx = {
    profile: gradeProfile(grade),
    mix,
    usedExpressions: new Set<string>(),
    rules: ALLOW_DECIMAL_RESULTS,
  }
  const tasks = []
  for (const target of generator.reachableValues(gradeProfile(grade), mix, ALLOW_DECIMAL_RESULTS)) {
    // Bez sdílené `usedExpressions`: každý cíl se zkouší nezávisle, jinak by
    // pozdější cíle padaly jen proto, že se dřívější úloha už použila.
    const task = generator.generateForValue(target, { ...ctx, usedExpressions: new Set() }, rng)
    if (task !== null) tasks.push(task)
  }
  return tasks
}

const everySum = (grade: Grade, mix = ALL) => everyTask(fractionSumsGenerator, grade, mix)

describe('fractionSumsGenerator', () => {
  it('nabízí se od sedmé třídy, stejně jako část z celku', () => {
    expect(fractionSumsGenerator.supports(gradeProfile(6))).toBe(false)
    expect(fractionSumsGenerator.supports(gradeProfile(7))).toBe(true)
  })

  it('na list se zlomkovým výsledkem nesmí, když si o něj neřekl', () => {
    // Šifra: výsledek je kód políčka v mřížce. `supports` na pravidla listu
    // nevidí, takže zákaz musí padnout tady.
    const profile = gradeProfile(7)
    expect(fractionSumsGenerator.reachableValues(profile, ALL, REQUIRE_WHOLE_RESULTS).size).toBe(0)
    expect(
      fractionSumsGenerator.generateForValue(0.75, { ...context(7), rules: REQUIRE_WHOLE_RESULTS }, createRng('sifra')),
    ).toBeNull()
  })

  it('výsledek je pravý zlomek v základním tvaru, nikdy celé číslo', () => {
    const tasks = everySum(7)
    expect(tasks.length).toBeGreaterThan(10)
    for (const task of tasks) {
      const printed = task.printedValue
      expect(printed, task.prompt.text).toBeDefined()
      const [numerator, denominator] = printed!.split('/').map(Number) as [number, number]
      expect(gcd(numerator, denominator), `${task.prompt.text} = ${printed}`).toBe(1)
      expect(numerator, `${task.prompt.text} = ${printed}`).toBeLessThan(denominator)
      expect(isWholeNumber(task.value)).toBe(false)
    }
  })

  it('vytištěná podoba souhlasí s hodnotou i se zadáním', () => {
    for (const task of everySum(7)) {
      expect(evaluateExpression(task.prompt.text)).toBeCloseTo(task.value, 9)
      expect(evaluateExpression(task.printedValue!)).toBeCloseTo(task.value, 9)
    }
  })

  it('operandy jsou pravé zlomky ze seznamu jmenovatelů', () => {
    const allowed = [2, 3, 4, 5, 6, 8, 10]
    for (const task of everySum(7)) {
      const { left, right } = sumParts(task.prompt.text)
      for (const operand of [left, right]) {
        expect(allowed, task.prompt.text).toContain(operand.denominator)
        expect(operand.numerator, task.prompt.text).toBeLessThan(operand.denominator)
      }
    }
  })

  it('ctí zaškrtnuté operace — samotné sčítání nedá odčítání', () => {
    for (const task of everySum(7, { add: 1 })) {
      expect(sumParts(task.prompt.text).operator, task.prompt.text).toBe('+')
      expect(task.didactic.operations).toEqual(['add'])
    }
  })

  it('zásoba pokrývá oba tvary — stejný i násobný jmenovatel', () => {
    const texts = everySum(7).map((task) => task.prompt.text)
    const sameDenominator = texts.filter((text) => {
      const { left, right } = sumParts(text)
      return left.denominator === right.denominator
    })
    expect(sameDenominator.length).toBeGreaterThan(0)
    expect(texts.length - sameDenominator.length).toBeGreaterThan(0)
  })
})

/** `1/2 : 1/4 = 2` → vytištěný výsledek, ať je to zlomek nebo číslo. */
function printed(task: { value: number; printedValue?: string }): string {
  return task.printedValue ?? formatValue(task.value)
}

describe('fractionProductsGenerator a fractionQuotientsGenerator', () => {
  it('nabízí se od sedmé třídy, stejně jako ostatní zlomky', () => {
    // Karel rozhodl 24. 8. 2026: násobení a dělení jde do sedmé třídy, protože
    // se tam zlomky počítají. Vlastní brána v profilu tedy není.
    for (const generator of [fractionProductsGenerator, fractionQuotientsGenerator]) {
      expect(generator.supports(gradeProfile(6)), generator.id).toBe(false)
      expect(generator.supports(gradeProfile(7)), generator.id).toBe(true)
    }
  })

  it('na šifru nesmí — ani dělení, které dá celé číslo', () => {
    // `1/2 : 1/4 = 2` by kódem políčka být mohlo, a přesto se do mřížky
    // nedostane: rodina je vpuštěná celá, nebo vůbec. Osm celých hodnot (2 až 9)
    // šifře nepřinese nic — kódy souřadnicové mřížky jsou dvojciferné — a dělit
    // rodinu podle výsledku by znamenalo dvě cesty k témuž pravidlu.
    const profile = gradeProfile(7)
    for (const generator of [fractionProductsGenerator, fractionQuotientsGenerator]) {
      expect(generator.reachableValues(profile, ALL, REQUIRE_WHOLE_RESULTS).size, generator.id).toBe(0)
    }
    expect(
      fractionQuotientsGenerator.generateForValue(
        2,
        { ...context(7), rules: REQUIRE_WHOLE_RESULTS },
        createRng('sifra-deleni'),
      ),
    ).toBeNull()
  })

  it('operandy jsou pravé zlomky v základním tvaru ze seznamu jmenovatelů', () => {
    // Tady základní tvar operandů vyžadovaný JE, na rozdíl od společného
    // jmenovatele: `2/4 · 1/3` by dítě zkrátilo a řešilo jinou úlohu, než
    // která je napsaná.
    for (const generator of [fractionProductsGenerator, fractionQuotientsGenerator]) {
      for (const task of everyTask(generator, 7)) {
        const { left, right } = sumParts(task.prompt.text)
        for (const operand of [left, right]) {
          expect([2, 3, 4, 5, 6, 8, 10], task.prompt.text).toContain(operand.denominator)
          expect(operand.numerator, task.prompt.text).toBeLessThan(operand.denominator)
          expect(gcd(operand.numerator, operand.denominator), task.prompt.text).toBe(1)
        }
      }
    }
  })

  it('součin je vždycky pravý zlomek se jmenovatelem ze seznamu', () => {
    // Bez toho pravidla vzniká `7/8 · 9/10 = 63/80`: správně spočítaný nesmysl.
    const tasks = everyTask(fractionProductsGenerator, 7)
    expect(tasks.length).toBeGreaterThan(10)
    for (const task of tasks) {
      expect(sumParts(task.prompt.text).operator, task.prompt.text).toBe('·')
      const [numerator, denominator] = task.printedValue!.split('/').map(Number) as [number, number]
      expect(numerator, `${task.prompt.text} = ${task.printedValue}`).toBeLessThan(denominator)
      expect(gcd(numerator, denominator), `${task.prompt.text} = ${task.printedValue}`).toBe(1)
      expect([2, 3, 4, 5, 6, 8, 10], `${task.prompt.text} = ${task.printedValue}`).toContain(denominator)
      expect(isWholeNumber(task.value)).toBe(false)
    }
  })

  it('podíl je pravý zlomek, nebo celé číslo od dvou — nikdy nepravý zlomek', () => {
    // `3/4 : 1/2` je `3/2`, tedy smíšené číslo. To projekt neumí ani vytisknout
    // (tokenizer nezná `2 1/2`), takže takové dvojice musí vypadnout.
    const tasks = everyTask(fractionQuotientsGenerator, 7)
    expect(tasks.length).toBeGreaterThan(10)
    for (const task of tasks) {
      expect(sumParts(task.prompt.text).operator, task.prompt.text).toBe(':')
      const label = `${task.prompt.text} = ${printed(task)}`
      if (isWholeNumber(task.value)) {
        expect(task.value, label).toBeGreaterThanOrEqual(2)
        // Celé číslo se tiskne jako číslo, ne jako `2/1`.
        expect(task.printedValue, label).toBeUndefined()
        expect(printed(task), label).toBe(String(task.value))
      } else {
        const [numerator, denominator] = task.printedValue!.split('/').map(Number) as [number, number]
        expect(numerator, label).toBeLessThan(denominator)
        expect(gcd(numerator, denominator), label).toBe(1)
        expect([2, 3, 4, 5, 6, 8, 10], label).toContain(denominator)
      }
    }
  })

  it('umí kanonickou úlohu na dělení zlomků', () => {
    // „Kolik čtvrtin se vejde do poloviny." Bez ní by dělení zlomků ztratilo
    // tvar, kterým se v učebnici zavádí. Hledá se přes seedy, protože cíl 2
    // umí i `1/3 : 1/6` nebo `2/5 : 1/5` a jeden seed vybere jednu z nich.
    expect(
      fractionQuotientsGenerator.reachableValues(gradeProfile(7), ALL, ALLOW_DECIMAL_RESULTS).has(2),
    ).toBe(true)
    const texts = new Set<string>()
    for (let seed = 0; seed < 50; seed++) {
      const task = fractionQuotientsGenerator.generateForValue(
        2,
        { ...context(7), rules: ALLOW_DECIMAL_RESULTS },
        createRng(`kanon-${seed}`),
      )
      if (task !== null) texts.add(task.prompt.text)
    }
    expect([...texts]).toContain('1/2 : 1/4')
  })

  it('vytištěná podoba souhlasí s hodnotou i se zadáním', () => {
    // Nezávislý přepočet z papíru — u dělení je to jediná kontrola, která by
    // odhalila, že tokenizer čte `1/2 : 1/4` jako 0,125.
    for (const generator of [fractionProductsGenerator, fractionQuotientsGenerator]) {
      for (const task of everyTask(generator, 7)) {
        expect(evaluateExpression(task.prompt.text), task.prompt.text).toBeCloseTo(task.value, 9)
        expect(evaluateExpression(printed(task)), printed(task)).toBeCloseTo(task.value, 9)
      }
    }
  })

  it('řešení pro učitele nese vytištěnou podobu, ne desetinné číslo', () => {
    for (const task of everyTask(fractionQuotientsGenerator, 7)) {
      expect(task.solutionSteps[0]!.text).toBe(`${task.prompt.text} = ${printed(task)}`)
    }
  })

  it('ctí zaškrtnuté operace — samotné násobení dělení nedá', () => {
    expect(everyTask(fractionProductsGenerator, 7, { mul: 1 }).length).toBeGreaterThan(0)
    expect(fractionQuotientsGenerator.reachableValues(gradeProfile(7), { mul: 1 }, ALLOW_DECIMAL_RESULTS).size).toBe(0)
    expect(everyTask(fractionQuotientsGenerator, 7, { div: 1 }).length).toBeGreaterThan(0)
    expect(fractionProductsGenerator.reachableValues(gradeProfile(7), { div: 1 }, ALLOW_DECIMAL_RESULTS).size).toBe(0)
    // Zlomek jako výsledek není část z celku: tam stačí jedna z těch dvou
    // operací, protože zlomková čára je dělení napsané. Tady se násobí a dělí
    // doopravdy, takže platí ta operace, která ve výrazu stojí.
    expect(fractionProductsGenerator.reachableValues(gradeProfile(7), { add: 1 }, ALLOW_DECIMAL_RESULTS).size).toBe(0)
  })

  it('slibuje jen hodnoty, které opravdu vyrobí', () => {
    // Zámek na výběr tvaru PŘED losováním. Kdyby se tvary losovaly poslepu
    // a zkoušelo se osmkrát, část hodnot by se nenašla — a u dělení, kde
    // většina cílů patří jedinému tvaru, by to byly celé úlohy.
    for (const generator of [fractionProductsGenerator, fractionQuotientsGenerator]) {
      const reachable = generator.reachableValues(gradeProfile(7), ALL, ALLOW_DECIMAL_RESULTS)
      expect(reachable.size, generator.id).toBeGreaterThan(10)
      for (const target of reachable) {
        expect(
          generator.generateForValue(target, { ...context(7), rules: ALLOW_DECIMAL_RESULTS }, createRng(`slib-${target}`)),
          `${generator.id}: slíbená hodnota ${target}`,
        ).not.toBeNull()
      }
    }
  })

  it('žádné dva různé výsledky celé rodiny nesplynou na dvě desetinná místa', () => {
    // ⚠ Zámek na `verifyDistinctValues`: ta porovnává výsledky jako čísla
    //   zaokrouhlená na dvě místa, takže dva RŮZNÉ zlomky na téže hodnotě by
    //   znamenaly zamítnutý, a přitom správný list. Drží to seznam jmenovatelů
    //   — nejtěsnější dvojice (`1/10` a `1/8`) se liší o 0,025. Volnější
    //   jmenovatel to boří: `1/8` a `2/15` se obě tisknou jako 0,13.
    const byPrinted = new Map<string, string>()
    for (const generator of [fractionSumsGenerator, fractionProductsGenerator, fractionQuotientsGenerator]) {
      for (const task of everyTask(generator, 7)) {
        const key = formatValue(task.value)
        const existing = byPrinted.get(key)
        if (existing !== undefined) {
          expect(existing, `${key} je zároveň ${existing} i ${printed(task)}`).toBe(printed(task))
        }
        byPrinted.set(key, printed(task))
      }
    }
  })
})
