/**
 * Značka Šifromatiky — liška s žárovkou.
 *
 * Obrázek, ne kreslené SVG. Předloha ze složky `rozsireni_projektu` je rastr
 * z generátoru obrázků; překreslit ji do křivek by dalo buď zjednodušený tvar,
 * který se s předlohou rozchází, nebo špinavé automatické trasování.
 *
 * Původ souboru: `rozsireni_projektu/file_000000007ab481f4ad57df1d2c343ba8.png`,
 * výřez horního panelu, bílé pozadí odstraněné záplavovým vyplněním od okrajů
 * (uvnitř zůstává — bílá tlama a boltce jsou součást značky), zmenšeno na výšku
 * 420 px a kvantizováno na 64 barev. 12 kB.
 *
 * ⚠ Na pracovní list ani na řešení tahle značka NEPATŘÍ. Školní tiskárna je
 *   černobílá a barevná hlavička na 25 kopiích je náklad, který platí učitel
 *   a nechtěl ho. Značka patří do hlavičky aplikace a na diplom — tedy na
 *   jediný výtisk, který má vypadat slavnostně.
 */

/** Poměr stran zdroje (381 × 420). Drží se ho `width`, aby stránka neposkakovala. */
const ASPECT = 381 / 420

export interface MarkProps {
  /** Výška v pixelech. Šířka se dopočítá. */
  size?: number
  className?: string
}

/**
 * Bez `alt` schválně: značka stojí vždy vedle slovní značky „Šifromatika",
 * takže popis by čtečka obrazovky přečetla dvakrát.
 */
export function SifromatikaMark({ size = 40, className }: MarkProps) {
  return (
    <img
      className={className}
      src="/logo.png"
      alt=""
      width={Math.round(size * ASPECT)}
      height={size}
    />
  )
}
