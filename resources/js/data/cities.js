// Major RU/CIS cities for the city autocomplete. `ru`/`en` are display names;
// matching is done against both so the user can type in either language.
const CITIES = [
  { ru: 'Москва', en: 'Moscow' },
  { ru: 'Санкт-Петербург', en: 'Saint Petersburg' },
  { ru: 'Новосибирск', en: 'Novosibirsk' },
  { ru: 'Екатеринбург', en: 'Yekaterinburg' },
  { ru: 'Казань', en: 'Kazan' },
  { ru: 'Нижний Новгород', en: 'Nizhny Novgorod' },
  { ru: 'Челябинск', en: 'Chelyabinsk' },
  { ru: 'Самара', en: 'Samara' },
  { ru: 'Омск', en: 'Omsk' },
  { ru: 'Ростов-на-Дону', en: 'Rostov-on-Don' },
  { ru: 'Уфа', en: 'Ufa' },
  { ru: 'Красноярск', en: 'Krasnoyarsk' },
  { ru: 'Воронеж', en: 'Voronezh' },
  { ru: 'Пермь', en: 'Perm' },
  { ru: 'Волгоград', en: 'Volgograd' },
  { ru: 'Краснодар', en: 'Krasnodar' },
  { ru: 'Сочи', en: 'Sochi' },
  { ru: 'Саратов', en: 'Saratov' },
  { ru: 'Тюмень', en: 'Tyumen' },
  { ru: 'Ижевск', en: 'Izhevsk' },
  { ru: 'Барнаул', en: 'Barnaul' },
  { ru: 'Иркутск', en: 'Irkutsk' },
  { ru: 'Ульяновск', en: 'Ulyanovsk' },
  { ru: 'Владивосток', en: 'Vladivostok' },
  { ru: 'Хабаровск', en: 'Khabarovsk' },
  { ru: 'Ярославль', en: 'Yaroslavl' },
  { ru: 'Томск', en: 'Tomsk' },
  { ru: 'Оренбург', en: 'Orenburg' },
  { ru: 'Кемерово', en: 'Kemerovo' },
  { ru: 'Рязань', en: 'Ryazan' },
  { ru: 'Пенза', en: 'Penza' },
  { ru: 'Калининград', en: 'Kaliningrad' },
  { ru: 'Тула', en: 'Tula' },
  { ru: 'Ставрополь', en: 'Stavropol' },
  { ru: 'Курск', en: 'Kursk' },
  { ru: 'Минск', en: 'Minsk' },
  { ru: 'Алматы', en: 'Almaty' },
  { ru: 'Ташкент', en: 'Tashkent' },
  { ru: 'Баку', en: 'Baku' },
  { ru: 'Ереван', en: 'Yerevan' },
  { ru: 'Дубай', en: 'Dubai' },
]

export function searchCities(query, lang = 'ru', limit = 6) {
  const q = (query || '').trim().toLowerCase()
  const name = (c) => (lang === 'en' ? c.en : c.ru)
  if (!q) return CITIES.slice(0, limit).map(name)
  const starts = []
  const contains = []
  for (const c of CITIES) {
    const ru = c.ru.toLowerCase()
    const en = c.en.toLowerCase()
    if (ru.startsWith(q) || en.startsWith(q)) starts.push(name(c))
    else if (ru.includes(q) || en.includes(q)) contains.push(name(c))
  }
  return [...starts, ...contains].slice(0, limit)
}

export default CITIES
