/**
 * Katalog aktivit — to, co Šifromatika nabízí.
 *
 * Existuje kvůli učiteli, ne kvůli kódu. Nástroj, u kterého není na první
 * pohled vidět, co všechno umí, se použije jednou a pak už ne. Proto jsou
 * v katalogu i aktivity, které ještě nejsou hotové — ale poctivě označené.
 *
 * ⚠ `available: false` znamená „ještě to neexistuje“, ne „je to skryté“.
 *   Zapnout aktivitu, která nejde vygenerovat, je horší než ji neukázat:
 *   učitel by klikl, nic by nedostal a podruhé už nepřijde.
 */

import type { ActivityId } from '../core/model/index.js'

/** Aktivity v katalogu — hotové i připravované. */
export type CatalogId = ActivityId | 'bingo' | 'pexeso'

export interface ActivityInfo {
  id: CatalogId
  label: string
  /** Jedna věta, co učitel dostane. Zobrazuje se pod názvem. */
  tagline: string
  /** `false` = v katalogu je vidět, ale vybrat ji nejde. */
  available: boolean
}

export const activityCatalog: readonly ActivityInfo[] = [
  {
    id: 'cipher-grid',
    label: 'Šifra',
    tagline: 'Tajenka schovaná v tabulce',
    available: true,
  },
  {
    id: 'sequence-sheet',
    label: 'Číselné řady',
    tagline: 'Co bude následovat?',
    available: true,
  },
  {
    id: 'bingo',
    label: 'Bingo',
    tagline: 'Připravujeme',
    available: false,
  },
  {
    id: 'pexeso',
    label: 'Pexeso',
    tagline: 'Připravujeme',
    available: false,
  },
]

export function isAvailableActivity(id: CatalogId): id is ActivityId {
  return activityCatalog.some((activity) => activity.id === id && activity.available)
}
