import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

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

function CopyToast({ label }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      className="fixed left-1/2 bottom-[96px] z-[9999] pointer-events-none flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1C1C1E] text-white text-[13px] font-semibold shadow-lg"
      style={{ animation: 'copyToastPop 1.3s ease forwards' }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 12.5l4.2 4.2L19 7" stroke="#3FD27A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </div>,
    document.body,
  )
}

function CopyableToken({ raw }) {
  const { t } = useTranslation()
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
    <>
      <span
        onClick={onCopy}
        role="button"
        className={`cursor-pointer select-text font-semibold underline underline-offset-2 [text-decoration-thickness:1.5px] transition-colors ${copied ? 'text-[#1E9E4E] decoration-[#1E9E4E]/55' : 'text-[#E2319B] decoration-[#E2319B]/55 active:text-[#C01A7E]'}`}
      >
        {raw}
      </span>
      {copied && <CopyToast label={t('common.copied')} />}
    </>
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
