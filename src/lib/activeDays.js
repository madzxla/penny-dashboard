export const DEFAULT_ACTIVE_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function flattenDayValues(value, acc = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => flattenDayValues(entry, acc))
    return acc
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return acc

    try {
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const parsed = JSON.parse(trimmed)
        return flattenDayValues(parsed, acc)
      }
    } catch {
      // Ignore malformed JSON and keep processing the raw string below.
    }

    const tokens = trimmed.split(',')
    tokens.forEach((token) => {
      const cleaned = token.trim().replace(/^[\[\]"'\s]+|[\[\]"'\s]+$/g, '').toLowerCase()
      if (cleaned && DEFAULT_ACTIVE_DAYS.includes(cleaned)) {
        acc.push(cleaned)
      }
    })
    return acc
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, enabled]) => {
      if (enabled && DEFAULT_ACTIVE_DAYS.includes(String(key).trim().toLowerCase())) {
        acc.push(String(key).trim().toLowerCase())
      }
    })
  }

  return acc
}

export function normalizeActiveDays(value) {
  const normalized = Array.from(new Set(flattenDayValues(value)))
  return normalized.length > 0 ? normalized : [...DEFAULT_ACTIVE_DAYS]
}
