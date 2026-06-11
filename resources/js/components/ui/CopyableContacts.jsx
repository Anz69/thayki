import { useState, useRef, useEffect, useCallback } from 'react'

const NUM_RE = /[+(]?\d[\d\s().\-]{8,}\d/g

function digitsCount(s) {
  return (s.match(/\d/g) || []).length
}

function copyValue(value) {
  try {
    const tg = window.Telegram?.WebApp
    if (tg?.copyTextToClipboard) { tg.copyTextToClipboard(value); return }
  } catch {}
  try {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value).catch(() => {})
  } catch {}
}

function CopyableToken({ raw }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const onCopy = useCallback((e) => {
    e.stopPropagation()
    copyValue(raw.replace(/[^\d+]/g, ''))
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1300)
  }, [raw])
  return (
    <span
      onClick={onCopy}
      role="button"
      className={`cursor-pointer select-text font-semibold underline underline-offset-[3px] decoration-2 transition-colors ${copied ? 'text-[#1E9E4E] decoration-[#1E9E4E]/50' : 'text-[#E2319B] decoration-[#E2319B]/45 active:text-[#C01A7E]'}`}
    >
      {raw}
    </span>
  )
}

export default function CopyableContacts({ text, className, style }) {
  if (text == null || text === '') return null
  const str = String(text)
  const parts = []
  let last = 0
  let m
  NUM_RE.lastIndex = 0
  while ((m = NUM_RE.exec(str)) !== null) {
    const matched = m[0]
    if (digitsCount(matched) < 10) continue
    if (m.index > last) parts.push(str.slice(last, m.index))
    parts.push({ num: matched })
    last = m.index + matched.length
  }
  if (last < str.length) parts.push(str.slice(last))

  return (
    <span className={className} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...style }}>
      {parts.map((p, i) => (typeof p === 'string' ? p : <CopyableToken key={i} raw={p.num} />))}
    </span>
  )
}
