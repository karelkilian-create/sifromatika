/**
 * Sesadí čáru na hrot znaku `√` a výsledek uloží do `--radical-vinculum-top`.
 *
 * Čáru kreslí CSS od horní hrany řádku, jenže hrot `√` je pod ní — a o kolik,
 * to je věc fontu: v Segoe UI (Windows) jsou to setiny em, v Noto Sans (Linux)
 * čtvrtina. Napevno zvolená hodnota by tedy jinde než na vývojářském stroji
 * nechala mezi hrotem a čarou skulinu, nebo čáru zaryla do číslic. Proto se
 * měří to, co se opravdu vykreslilo:
 *
 *   1. výška řádku nad účařím — svislý rozdíl mezi horní hranou řádkového
 *      boxu (od ní počítá CSS) a účařím (na němž stojí sonda nulové výšky),
 *   2. výška hrotu `√` nad účařím — z `measureText` na plátně, protože přesné
 *      obrysy glyfu z DOM vyčíst nejde.
 *
 * Měří se jednou; systémové fonty se za běhu nemění a webfont projekt žádný
 * nemá, takže není na co čekat ani co přeměřovat.
 */
let measured = false

export function alignVinculum() {
  if (measured || typeof document === 'undefined' || document.body === null) return
  measured = true

  const probe = document.createElement('span')
  probe.className = 'sheet'
  probe.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:0'
  probe.innerHTML =
    '<span data-top>0</span><span data-baseline style="display:inline-block;width:0;height:0"></span>'
  document.body.appendChild(probe)

  try {
    const style = getComputedStyle(probe)
    const fontSize = parseFloat(style.fontSize)
    const lineTop = probe.querySelector('[data-top]')?.getBoundingClientRect().top
    // Prázdný inline-block nulové výšky stojí spodní hranou přesně na účaří.
    const baseline = probe.querySelector('[data-baseline]')?.getBoundingClientRect().bottom
    const context = document.createElement('canvas').getContext('2d')
    if (lineTop === undefined || baseline === undefined || context === null) return

    context.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`
    const rootTip = context.measureText('√').actualBoundingBoxAscent
    if (!Number.isFinite(rootTip) || fontSize <= 0) return

    const offset = (baseline - lineTop - rootTip) / fontSize
    if (!Number.isFinite(offset)) return

    document.documentElement.style.setProperty(
      '--radical-vinculum-top',
      `${Math.max(0, offset).toFixed(3)}em`,
    )
  } finally {
    probe.remove()
  }
}
