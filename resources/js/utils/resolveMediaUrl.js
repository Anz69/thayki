export function resolveMediaUrl(url) {
  if (url == null || typeof url !== 'string') return null
  const u = url.trim()
  if (u === '') return null
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  if (u.startsWith('/')) return `${window.location.origin}${u}`
  return u
}
