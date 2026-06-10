
const EYE_COLORS = [
  { match: ['голуб'], ru: 'Голубые', en: 'Blue' },
  { match: ['зелён', 'зелен'], ru: 'Зелёные', en: 'Green' },
  { match: ['кар'], ru: 'Карие', en: 'Brown' },
  { match: ['ореш', 'орех'], ru: 'Ореховые', en: 'Hazel' },
  { match: ['сер'], ru: 'Серые', en: 'Gray' },
  { match: ['чёрн', 'черн'], ru: 'Чёрные', en: 'Black' },
  { match: ['янтар'], ru: 'Янтарные', en: 'Amber' },
]

function translate(table, value, lang) {
  if (!value || typeof value !== 'string') return value
  const v = value.trim().toLowerCase()
  const hit = table.find((e) => e.match.some((m) => v.includes(m)))
  if (!hit) return value
  return lang === 'en' ? hit.en : hit.ru
}

export const localizeEyes = (value, lang) => translate(EYE_COLORS, value, lang)
