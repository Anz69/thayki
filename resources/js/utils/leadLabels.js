import i18n from '@/i18n'
import ru from '@/locales/ru.json'

function reverseKey(group, ruValue) {
  const table = ru.request?.[group]
  if (!table) return null
  const target = String(ruValue).trim()
  for (const [key, label] of Object.entries(table)) {
    if (String(label).trim() === target) return key
  }
  return null
}

export function localizeLeadValue(group, value) {
  if (!value || typeof value !== 'string') return value
  if (group === 'goals' && /v\.?\s*i\.?\s*p/i.test(value)) {
    return i18n.t('request.vipGoal', value)
  }
  const key = reverseKey(group, value)
  if (!key) return value
  return i18n.t(`request.${group}.${key}`, value)
}
