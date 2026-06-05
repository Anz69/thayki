import i18n from '@/i18n'

/**
 * Returns the model's name in the current UI language, falling back to the
 * Russian default when an English variant is missing.
 */
export function modelName(model) {
  if (!model) return ''
  const en = model.display_name_en
  if ((i18n.language || 'ru').startsWith('en') && en) return en
  return model.display_name || en || ''
}
