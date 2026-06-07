import i18n from '@/i18n'

/**
 * Returns the model's name in the current UI language, falling back to the
 * Russian default when an English variant is missing.
 */
export function modelName(model) {
  if (!model) return ''
  const isEn = (i18n.language || 'ru').startsWith('en')
  const en = model.display_name_en
  if (isEn && en) return en
  let name = model.display_name || en || ''
  // Localize the generic "Модель №123" fallback name for English clients.
  if (isEn && name) name = name.replace(/^Модель\s*№?\s*/i, 'Model №')
  return name
}
