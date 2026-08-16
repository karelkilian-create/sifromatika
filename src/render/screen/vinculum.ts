/**
 * Vypočítá polohu čáry nad odmocninou a o kolik se k ní musí protáhnout `√`.
 * Výsledek předá CSS v proměnných `--radical-vinculum-top` a
 * `--radical-sign-scale`.
 *
 * Kde má čára být, řeknou dvě míry, a obě jsou věc fontu:
 *
 *   • Hrot znaku `√`. Kdyby čára ležela jinde než na něm, rozpadne se znak na
 *     háček a nesouvisející linku. Jak vysoko hrot sahá, se liší font od fontu
 *     (Segoe UI na Windows, Noto Sans na Linuxu), takže napevno zvolená
 *     hodnota by mimo vývojářský stroj nesedla.
 *   • Horní hrana číslic. Mezi ně a čáru patří vzduch. Sám hrot `√` ho
 *     nezaručí — v Noto Sans je nad číslicemi sotva o vlas — a na papíře pak
 *     čára o číslice dře, i když na obrazovce vypadala v pořádku, protože ji
 *     tam prohlížeč odskočil na celý pixel.
 *
 * Čára jde tedy výš z obou důvodů a znak `√` se k ní natáhne. Protažení je to
 * mírné (jednotky procent) a dělá totéž, co dělá matematická sazba odjakživa:
 * odmocnina roste podle toho, co je pod ní.
 *
 * Měří se jednou; systémové fonty se za běhu nemění a webfont projekt žádný
 * nemá, takže není na co čekat ani co přeměřovat.
 */

/** Nejmenší vzduch mezi čarou a horní hranou číslic. */
const MIN_CLEARANCE_EM = 0.12

/** Strop protažení `√`. Výš už by znak byl nápadně vytáhlý. */
const MAX_SIGN_SCALE = 1.3

/**
 * Zdvih navíc, o který `√` zajede pod čáru.
 *
 * Změřená výška hrotu vychází z obrysu glyfu a je o vlásek vyšší než to, co
 * se opravdu vybarví. Sesadit obojí přesně na sebe proto znamená nechat mezi
 * nimi světlý šev — na obrazovce ho není vidět, v tisku ano. Kus navíc šev
 * zavře a nikde nevykoukne: čára se kreslí přes znak a je desetkrát silnější.
 */
const OVERSHOOT_EM = 0.01

/**
 * Stupeň, na kterém se měří. Sonda je neviditelná, takže na velikosti nezáleží
 * — a záměrně je obrovská: obrysy glyfů se totiž zaokrouhlují na celé pixely.
 * Při skutečných 11 pt (necelých 15 px) je to zaokrouhlení tak hrubé, že se
 * v něm rozdíl mezi hrotem `√` a horní hranou číslic úplně ztratí.
 */
const PROBE_FONT_SIZE_PX = 200

let measured = false

export function alignVinculum() {
  if (measured || typeof document === 'undefined' || document.body === null) return
  measured = true

  const probe = document.createElement('span')
  probe.className = 'sheet'
  probe.style.cssText = `position:absolute;visibility:hidden;left:-9999px;top:0;font-size:${PROBE_FONT_SIZE_PX}px`
  probe.innerHTML =
    '<span class="radical"><span class="radical__sign">√</span>' +
    '<span class="radical__radicand">0</span></span>' +
    '<span data-baseline style="display:inline-block;width:0;height:0"></span>'
  document.body.appendChild(probe)

  try {
    const style = getComputedStyle(probe)
    const fontSize = parseFloat(style.fontSize)
    const sign = probe.querySelector('.radical__sign')?.getBoundingClientRect()
    // Vodorovné odsazení výšku nemění, takže horní hrana číslice je zároveň
    // horní hrana řádkového boxu — a od té CSS počítá `top`.
    const lineTop = probe.querySelector('.radical__radicand')?.getBoundingClientRect().top
    // Prázdný inline-block nulové výšky stojí spodní hranou přesně na účaří.
    const baseline = probe.querySelector('[data-baseline]')?.getBoundingClientRect().bottom
    const context = document.createElement('canvas').getContext('2d')
    if (sign === undefined || lineTop === undefined || baseline === undefined) return
    if (context === null || !(fontSize > 0)) return

    // Obrysy glyfu z DOM vyčíst nejde, na to je plátno.
    context.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`
    const rootTip = context.measureText('√').actualBoundingBoxAscent / fontSize
    const digitTop = context.measureText('0').actualBoundingBoxAscent / fontSize
    if (!Number.isFinite(rootTip) || !Number.isFinite(digitTop) || rootTip <= 0) return

    const lineHeight = (baseline - lineTop) / fontSize
    const vinculum = Math.max(rootTip, digitTop + MIN_CLEARANCE_EM)
    // `√` se protahuje kolem spodní hrany svého boxu (`transform-origin`),
    // a ta leží kousek pod účařím — do poměru proto patří obojí.
    const pivot = (sign.bottom - baseline) / fontSize
    const scale = (vinculum + OVERSHOOT_EM + pivot) / (rootTip + pivot)

    const root = document.documentElement.style
    root.setProperty('--radical-vinculum-top', `${Math.max(0, lineHeight - vinculum).toFixed(3)}em`)
    root.setProperty('--radical-sign-scale', Math.min(MAX_SIGN_SCALE, Math.max(1, scale)).toFixed(3))
  } finally {
    probe.remove()
  }
}

