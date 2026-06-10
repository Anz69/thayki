
import i18n from '@/i18n'

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

const MONTHS_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function lang() {
  try { return (i18n.language || 'ru').slice(0, 2) } catch { return 'ru' }
}

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
  const diffMin = Math.round(diffSec / 60)
  const diffH = Math.round(diffMin / 60)
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000)
  const day = d.getDate()
  const sameYear = d.getFullYear() === now.getFullYear()
  const l = lang()

  if (l === 'en') {
    if (diffSec < 60) return 'last seen just now'
    if (diffMin < 60) return `last seen ${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`
    if (diffH < 24) return `last seen ${diffH} ${diffH === 1 ? 'hour' : 'hours'} ago`
    if (diffDays === 1) return 'last seen yesterday'
    if (diffDays < 7) return `last seen ${diffDays} days ago`
    return sameYear
      ? `last seen ${MONTHS_EN[d.getMonth()]} ${day}`
      : `last seen ${MONTHS_EN[d.getMonth()]} ${day}, ${d.getFullYear()}`
  }

  if (l === 'zh') {
    if (diffSec < 60) return '刚刚在线'
    if (diffMin < 60) return `${diffMin} 分钟前在线`
    if (diffH < 24) return `${diffH} 小时前在线`
    if (diffDays === 1) return '昨天在线'
    if (diffDays < 7) return `${diffDays} 天前在线`
    return sameYear
      ? `${d.getMonth() + 1}月${day}日在线`
      : `${d.getFullYear()}年${d.getMonth() + 1}月${day}日在线`
  }

  const verb = feminine ? 'была' : 'был'
  if (diffSec < 60) return `${verb} в сети только что`
  if (diffMin < 60) {
    return `${verb} в сети: ${diffMin} ${pluralRu(diffMin, ['минуту', 'минуты', 'минут'])} назад`
  }
  if (diffH < 24) {
    return `${verb} в сети: ${diffH} ${pluralRu(diffH, ['час', 'часа', 'часов'])} назад`
  }
  if (diffDays === 1) return `${verb} в сети вчера`
  if (diffDays < 7) {
    return `${verb} в сети: ${diffDays} ${pluralRu(diffDays, ['день', 'дня', 'дней'])} назад`
  }
  const month = MONTHS_GENITIVE[d.getMonth()]
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
  const day = d.getDate()
  const year = d.getFullYear()
  const sameYear = year === now.getFullYear()
  const isToday = that.getTime() === today.getTime()
  const isYesterday = that.getTime() === yesterday.getTime()
  const l = lang()

  if (l === 'en') {
    if (isToday) return `Today, ${time}`
    if (isYesterday) return `Yesterday, ${time}`
    return sameYear
      ? `${MONTHS_EN[d.getMonth()]} ${day}, ${time}`
      : `${MONTHS_EN[d.getMonth()]} ${day} ${year}, ${time}`
  }

  if (l === 'zh') {
    if (isToday) return `今天 ${time}`
    if (isYesterday) return `昨天 ${time}`
    return sameYear
      ? `${d.getMonth() + 1}月${day}日 ${time}`
      : `${year}年${d.getMonth() + 1}月${day}日 ${time}`
  }

  if (isToday) return `Сегодня, ${time}`
  if (isYesterday) return `Вчера, ${time}`
  const month = MONTHS_GENITIVE[d.getMonth()]
  return sameYear
    ? `${day} ${month}, ${time}`
    : `${day} ${month} ${year}, ${time}`
}

export function declAge(n) {
  if (!n) return '—'
  const l = lang()
  if (l === 'en') return `${n} y.o.`
  if (l === 'zh') return `${n} 岁`
  return `${n} ${pluralRu(n, ['год', 'года', 'лет'])}`
}

export function isOnlineNow(isoDate, thresholdMs = 5 * 60 * 1000) {
  if (!isoDate) return false
  return Date.now() - new Date(isoDate).getTime() < thresholdMs
}
