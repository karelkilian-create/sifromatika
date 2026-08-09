/**
 * Volba typu aktivity.
 *
 * Je nahoře a vidět hned, bez rozklikávání. Důvod je produktový, ne estetický:
 * učitelka, která na první obrazovce uvidí jen políčko na tajenku, si odnese,
 * že Šifromatika dělá šifry — a k ničemu jinému se už nedostane.
 *
 * Připravované aktivity jsou v seznamu taky, ale nejdou vybrat. Ukázat je je
 * poctivější než je skrývat, a zároveň to není slib, který by aplikace hned
 * porušila kliknutím do prázdna.
 */

import { activityCatalog } from '../../activities/registry.js'
import type { ActivityId } from '../../core/model/index.js'

export interface ActivityNavProps {
  value: ActivityId
  onChange: (next: ActivityId) => void
}

export function ActivityNav({ value, onChange }: ActivityNavProps) {
  return (
    <nav className="activity-nav no-print" aria-label="Typ aktivity">
      <ul className="activity-nav__list">
        {activityCatalog.map((activity) => {
          const selected = activity.available && activity.id === value
          return (
            <li key={activity.id}>
              <button
                type="button"
                className={`activity-nav__item${selected ? ' activity-nav__item--selected' : ''}${
                  activity.available ? '' : ' activity-nav__item--planned'
                }`}
                aria-current={selected ? 'page' : undefined}
                disabled={!activity.available}
                onClick={() => {
                  if (activity.available) onChange(activity.id as ActivityId)
                }}
              >
                <span className="activity-nav__label">{activity.label}</span>
                <span className="activity-nav__tagline">{activity.tagline}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
