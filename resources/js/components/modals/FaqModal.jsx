import { useState, useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'
import ModalSheet from '@/layout/ModalSheet'
import api from '@/utils/api'
import { useTranslation } from 'react-i18next'

function AccordionItem({ item, isOpen, onToggle }) {
  const bodyRef    = useRef(null)
  const chevronRef = useRef(null)
  const toggle = useCallback(() => {
    const el = bodyRef.current
    if (!el) return

    gsap.killTweensOf(el)
    const ch = chevronRef.current
    if (ch) gsap.killTweensOf(ch)

    if (isOpen) {
      const currentH = parseFloat(gsap.getProperty(el, 'height')) || el.offsetHeight
      gsap.fromTo(el,
        { height: currentH },
        { height: 0, duration: 0.26, ease: 'power2.inOut' },
      )
      if (ch) gsap.to(ch, { rotation: 0, duration: 0.2, ease: 'power2.inOut' })
    } else {
      gsap.set(el, { height: 'auto' })
      const h = el.scrollHeight
      gsap.fromTo(el,
        { height: 0 },
        { height: h, duration: 0.32, ease: 'power3.out', onComplete: () => gsap.set(el, { height: 'auto' }) },
      )
      if (ch) gsap.to(ch, { rotation: 180, duration: 0.2, ease: 'power2.inOut' })
    }
    onToggle(item.id)
  }, [isOpen, item.id, onToggle])
  useEffect(() => {
    if (chevronRef.current) gsap.set(chevronRef.current, { rotation: isOpen ? 180 : 0 })
    if (bodyRef.current)    gsap.set(bodyRef.current,    { height: isOpen ? 'auto' : 0 })
  }, [])
  return (
    <div className="bg-[#F5F5F7] rounded-2xl overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 gap-3 text-left active:bg-[#ECEAEC] transition-colors"
      >
        <span className="text-black text-[15px]/[130%] font-medium flex-1">{item.question}</span>
        <div ref={chevronRef} className="shrink-0" style={{ display: 'flex' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="#7F7F7F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>
      <div ref={bodyRef} style={{ height: 0, overflow: 'hidden' }}>
        <p className="px-5 pb-5 text-[#7F7F7F] text-sm/[150%] font-normal">
          {item.answer}
        </p>
      </div>
    </div>
  )
}

export default function FaqModal({ isOpen, onClose }) {
  const { t, i18n } = useTranslation()
  const [openId, setOpenId] = useState(null)
  const [items, setItems]   = useState([])
  const fetchedRef          = useRef(null)
  // Request the FAQ in the UI language; the API falls back zh → en → ru per item.
  const lang = (() => {
    const l = (i18n.language || 'ru').toLowerCase()
    if (l.startsWith('zh')) return 'zh'
    if (l.startsWith('ru')) return 'ru'
    return 'en'
  })()

  const toggle = useCallback((id) => {
    setOpenId((prev) => (prev === id ? null : id))
  }, [])

  useEffect(() => {
    if (!isOpen) { setOpenId(null); return }
    if (fetchedRef.current === lang) return
    fetchedRef.current = lang
    api.get('/faq', { params: { lang } }).then(r => setItems(r.data.data ?? [])).catch(() => {})
  }, [isOpen, lang])

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} height="95dvh">
      <div className="flex items-center justify-between px-5 py-4 shrink-0">
        <button
          onClick={onClose}
          className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
        >
          {t('common.back')}
        </button>
        <h2 className="text-base/[100%] font-[500] text-black">{t('faqModal.title')}</h2>
        <button
          onClick={onClose}
          className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
        >
          {t('faqModal.done')}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-8 pt-1">
        {items.length === 0 ? (
          <p className="text-[#7F7F7F] text-sm text-center py-8">{t('faqModal.loading')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <AccordionItem
                key={item.id}
                item={item}
                isOpen={openId === item.id}
                onToggle={toggle}
              />
            ))}
          </div>
        )}
      </div>
    </ModalSheet>
  )
}
