
const EYE_COLORS = [
  { match: ['голуб'], ru: 'Голубые', en: 'Blue', zh: '蓝色' },
  { match: ['зелён', 'зелен'], ru: 'Зелёные', en: 'Green', zh: '绿色' },
  { match: ['кар'], ru: 'Карие', en: 'Brown', zh: '棕色' },
  { match: ['ореш', 'орех'], ru: 'Ореховые', en: 'Hazel', zh: '榛色' },
  { match: ['сер'], ru: 'Серые', en: 'Gray', zh: '灰色' },
  { match: ['чёрн', 'черн'], ru: 'Чёрные', en: 'Black', zh: '黑色' },
  { match: ['янтар'], ru: 'Янтарные', en: 'Amber', zh: '琥珀色' },
]

function translate(table, value, lang) {
  if (!value || typeof value !== 'string') return value
  const v = value.trim().toLowerCase()
  const hit = table.find((e) => e.match.some((m) => v.includes(m)))
  if (!hit) return value
  const code = String(lang || 'ru').slice(0, 2)
  if (code === 'en') return hit.en
  if (code === 'zh') return hit.zh ?? hit.en
  return hit.ru
}

export const localizeEyes = (value, lang) => translate(EYE_COLORS, value, lang)
