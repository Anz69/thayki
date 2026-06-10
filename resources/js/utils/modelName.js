import i18n from '@/i18n'

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

/** Transliterate a Cyrillic name to Latin, preserving capitalisation. */
function transliterate(str) {
  return str.replace(/[а-яё]/gi, (ch) => {
    const lower = ch.toLowerCase()
    const t = TRANSLIT[lower]
    if (t === undefined) return ch
    return ch === lower ? t : t.charAt(0).toUpperCase() + t.slice(1)
  })
}

/**
 * Returns the model's name in the current UI language. For English: use the
 * explicit English name if set, otherwise transliterate the Russian one
 * (Яна → Yana) so nothing shows in Cyrillic to English clients.
 */
export function modelName(model) {
  if (!model) return ''
  // Any non-Russian UI (English, Chinese, …) gets the Latin name — there's no
  // Chinese name field, so fall back to English / transliteration instead of
  // showing Cyrillic.
  const isEn = !(i18n.language || 'ru').toLowerCase().startsWith('ru')
  const en = model.display_name_en
  if (isEn && en) return en

  let name = model.display_name || en || ''
  if (isEn && name) {
    // Localize the generic "Модель №123" fallback, then transliterate the rest.
    name = name.replace(/^Модель\s*№?\s*/i, 'Model №')
    name = transliterate(name)
  }
  return name
}
