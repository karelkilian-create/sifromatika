/**
 * Zámek na vadu, kterou ukázal až fyzický tisk: `9/10z 340` na dominovém
 * kameni. Mezera v textu úlohy byla, ale sazba ji zahodila — půlka kamene je
 * flex kontejner a fragment do něj pustil text jako samostatnou položku,
 * které prohlížeč ořízne krajní mezery.
 *
 * Layout se v `node` prostředí měřit nedá, takže se hlídá příčina: `MathText`
 * musí vracet jediný kořenový element a text kolem zlomku i odmocniny nechat
 * včetně mezer.
 */

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MathText } from './math.js'

function markup(text: string): string {
  return renderToStaticMarkup(<MathText text={text} />)
}

describe('MathText', () => {
  it('má jediný kořenový element, aby v flexu nevznikly anonymní položky', () => {
    // Kdyby se vrátil fragment, začínal by výstup rovnou `<span class="fraction">`
    // a zbytek by stál vedle něj — právě ta „vedle sebe" stojící část
    // v dominu přišla o mezeru.
    expect(markup('3/4 z 80')).toMatch(/^<span class="math">.*<\/span>$/su)
  })

  it('zachová mezeru mezi zlomkem a předložkou', () => {
    expect(markup('3/4 z 80')).toContain('</span> z 80')
  })

  it('zachová mezeru mezi odmocninou a operátorem', () => {
    // `√225 + 232` na kameni vyšlo jako `√225+ 232` z téhož důvodu.
    expect(markup('√225 + 232')).toContain('</span> + 232')
  })

  it('zlomek sází vodorovnou čarou, ne lomítkem', () => {
    const html = markup('3/4 z 80')
    expect(html).toContain('fraction__numerator')
    expect(html).toContain('fraction__denominator')
    expect(html).not.toContain('3/4')
  })

  it('text bez matematiky projde beze změny', () => {
    expect(markup('7 · 8')).toBe('<span class="math">7 · 8</span>')
  })
})
