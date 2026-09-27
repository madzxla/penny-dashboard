export const DAY_LABELS = {
  mon: 'Pirmdiena',
  tue: 'Otrdiena',
  wed: 'Trešdiena',
  thu: 'Ceturtdiena',
  fri: 'Piektdiena',
  sat: 'Sestdiena',
  sun: 'Svētdiena',
}

export function createDefaultOpeningHours() {
  return Object.fromEntries(
    Object.keys(DAY_LABELS).map((day) => [
      day,
      { open: '09:00', close: '21:00', closed: false },
    ])
  )
}

export function normalizeOpeningHours(rawHours = {}) {
  const normalised = createDefaultOpeningHours()

  for (const day of Object.keys(DAY_LABELS)) {
    const value = rawHours?.[day]
    if (value && typeof value === 'object') {
      normalised[day] = {
        ...normalised[day],
        ...value,
      }
    }
  }

  return normalised
}
