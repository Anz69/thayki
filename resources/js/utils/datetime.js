
import i18n from '@/i18n'

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

function pad2(n) {
  return String(n).padStart(2, '0')
}

function pluralRu(n, [one, few, many]) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function isSameDay(aIso, bIso) {
  if (!aIso || !bIso) return false
  const a = new Date(aIso); const b = new Date(bIso)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate()
}

export function formatRussianRelative(iso, { feminine = true } = {}) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  const now = new Date()
  const diffMs = Math.max(0, now.getTime() - d.getTime())
  const diffSec = Math.round(diffMs / 1000)
  const verb = feminine ? 'была' : 'был'

  if (diffSec < 60) return `${verb} в сети только что`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) {
    return `${verb} в сети: ${diffMin} ${pluralRu(diffMin, ['минуту', 'минуты', 'минут'])} назад`
  }
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) {
    return `${verb} в сети: ${diffH} ${pluralRu(diffH, ['час', 'часа', 'часов'])} назад`
  }
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000)
  if (diffDays === 1) return `${verb} в сети вчера`
  if (diffDays < 7) {
    return `${verb} в сети: ${diffDays} ${pluralRu(diffDays, ['день', 'дня', 'дней'])} назад`
  }
  const day = d.getDate()
  const month = MONTHS_GENITIVE[d.getMonth()]
  const sameYear = d.getFullYear() === now.getFullYear()
  return sameYear
    ? `${verb} в сети ${day} ${month}`
    : `${verb} в сети ${day} ${month} ${d.getFullYear()}`
}

export function formatRussianDaySeparator(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  const now = new Date()
  const today = startOfDay(now)
  const yesterday = new Date(today.getTime() - 86400000)
  const that = startOfDay(d)
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`

  if (that.getTime() === today.getTime())     return `Сегодня, ${time}`
  if (that.getTime() === yesterday.getTime()) return `Вчера, ${time}`

  const day   = d.getDate()
  const month = MONTHS_GENITIVE[d.getMonth()]
  const year  = d.getFullYear()
  const sameYear = year === now.getFullYear()
  return sameYear
    ? `${day} ${month}, ${time}`
    : `${day} ${month} ${year}, ${time}`
}

export function declAge(n) {
  if (!n) return '—'
  let lang = 'ru'
  try { lang = (i18n.language || 'ru').slice(0, 2) } catch {}
  if (lang === 'en') return `${n} y.o.`
  if (lang === 'zh') return `${n} 岁`
  return `${n} ${pluralRu(n, ['год', 'года', 'лет'])}`
}

export function isOnlineNow(isoDate, thresholdMs = 5 * 60 * 1000) {
  if (!isoDate) return false
  return Date.now() - new Date(isoDate).getTime() < thresholdMs
}
