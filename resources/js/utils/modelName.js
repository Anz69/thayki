import i18n from '@/i18n'

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

function transliterate(str) {
  return str.replace(/[а-яё]/gi, (ch) => {
    const lower = ch.toLowerCase()
    const t = TRANSLIT[lower]
    if (t === undefined) return ch
    return ch === lower ? t : t.charAt(0).toUpperCase() + t.slice(1)
  })
}

const toId = (s) => s.replace(/^\s*(?:Модель|Model)\s*/i, 'ID ')

export function modelName(model) {
  if (!model) return ''
  const isEn = !(i18n.language || 'ru').toLowerCase().startsWith('ru')
  const en = model.display_name_en
  if (isEn && en) return toId(en)

  let name = toId(model.display_name || en || '')
  if (isEn && name) {
    name = transliterate(name)
  }
  return name
}
