import { useState, useRef, useCallback, useEffect } from 'react'
import gsap from 'gsap'
import ModalMiddle from '@/layout/ModalMiddle'
import api from '@/utils/api'

/**
 * Withdrawal modal.
 *
 * Three precheck states: loading → ok (form) | pending (already submitted).
 * A single <ModalMiddle> instance holds all states so React never unmounts it.
 * When precheck resolves, GSAP animates the container height from spinner to
 * the actual content height before rendering the new view.
 */
export default function WithdrawModal({ isOpen, onClose, balance = 0 }) {
  const [amount, setAmount]       = useState('')
  const [error, setError]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [precheck, setPrecheck]   = useState(/** @type {'idle'|'loading'|'ok'|'pending'} */('idle'))
  const [pendingData, setPendingData] = useState(/** @type {object|null} */(null))
  // Rendered view — lags behind `precheck` by one animated transition
  const [displayedPrecheck, setDisplayedPrecheck] = useState('loading')

  const precheckContainerRef = useRef(null)
  const viewRefs        = useRef({})
  const contentWrapRef  = useRef(null)
  const currentViewRef  = useRef('amount')
  const amountBtnsRef   = useRef(null)
  const isClosingRef    = useRef(false)

  const numAmount  = Number(amount || 0)
  const amountMinor = Math.round(numAmount * 100)
  const hasAmount  = numAmount > 0
  const amountOver = numAmount > balance

  // ─── precheck fetch ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      isClosingRef.current = true
      return
    }
    isClosingRef.current = false
    setPrecheck('loading')
    setDisplayedPrecheck('loading')
    setPendingData(null)
    api.get('/withdrawals/status')
      .then((res) => {
        const data   = res?.data?.data
        const status = data?.status
        if (status === 'pending' || status === 'approved') {
          setPendingData(data)
          setPrecheck('pending')
        } else {
          setPrecheck('ok')
        }
      })
      .catch(() => setPrecheck('ok'))
  }, [isOpen])

  // ─── Animated height transition when precheck resolves ───────────────────
  useEffect(() => {
    // 'idle' and 'loading' → no outgoing transition needed
    if (precheck === 'idle' || precheck === 'loading') return

    const container = precheckContainerRef.current
    if (!container) {
      setDisplayedPrecheck(precheck)
      return
    }

    // Capture current height (spinner / old content)
    const fromH = container.offsetHeight
    gsap.killTweensOf(container)
    gsap.set(container, { height: fromH, overflow: 'hidden' })

    // Fade out old content
    gsap.to(container, {
      opacity: 0,
      duration: 0.14,
      ease: 'power2.in',
      onComplete: () => {
        // Switch rendered content
        setDisplayedPrecheck(precheck)

        // Double-rAF: wait for React to paint new layout before measuring
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const c = precheckContainerRef.current
            if (!c) return
            gsap.fromTo(c,
              { opacity: 0 },
              {
                height: c.scrollHeight,
                opacity: 1,
                duration: 0.42,
                ease: 'power3.out',
                onComplete: () => gsap.set(c, { clearProps: 'height,overflow,opacity' }),
              },
            )
          })
        })
      },
    })
  }, [precheck]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Amount buttons GSAP (slide-in / slide-out) ──────────────────────────
  useEffect(() => {
    const el = amountBtnsRef.current
    if (!el) return
    gsap.killTweensOf(el)
    gsap.killTweensOf(el.children)
    if (isClosingRef.current) return

    if (!hasAmount) {
      if (!isOpen || el.offsetHeight <= 0) {
        gsap.set(el, { display: 'none', height: 0, opacity: 0, marginTop: -12 })
        return
      }
      gsap.set(el, { display: 'flex', overflow: 'hidden' })
      gsap.to(el, {
        height: 0, opacity: 0, marginTop: -12, duration: 0.22, ease: 'power2.in',
        onComplete: () => gsap.set(el, { display: 'none' }),
      })
      return
    }

    gsap.set(el, { display: 'flex', overflow: 'hidden', height: 'auto' })
    const h = el.scrollHeight
    gsap.fromTo(el,
      { height: 0, opacity: 0, marginTop: -12 },
      { height: h, opacity: 1, marginTop: 0, duration: 0.4, ease: 'power3.out',
        onComplete: () => gsap.set(el, { clearProps: 'height,overflow,opacity,marginTop' }) },
    )
    gsap.fromTo(el.children,
      { y: 14, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.32, stagger: 0.06, ease: 'power3.out' },
    )
  }, [hasAmount, isOpen])

  // ─── Form view switcher (amount → done) ──────────────────────────────────
  const switchView = useCallback((next) => {
    if (isClosingRef.current) return
    const prev  = currentViewRef.current
    if (prev === next) return
    const prevEl = viewRefs.current[prev]
    const currEl = viewRefs.current[next]
    const wrapEl = contentWrapRef.current
    if (!prevEl || !currEl || !wrapEl) return

    currentViewRef.current = next
    const forward = next === 'done'

    gsap.killTweensOf([prevEl, currEl, wrapEl])
    gsap.set(wrapEl, { height: wrapEl.offsetHeight })

    const prevElLeft  = prevEl.offsetLeft
    const prevElWidth = prevEl.offsetWidth
    gsap.set(currEl, {
      position: 'absolute', top: 0, left: prevElLeft, width: prevElWidth,
      visibility: 'visible', opacity: 0, pointerEvents: 'none', zIndex: -1,
      y: forward ? -28 : 28, scale: 0.97,
    })
    gsap.to(wrapEl, {
      height: currEl.offsetHeight, duration: 0.44, ease: 'power3.inOut',
      onComplete: () => gsap.set(wrapEl, { clearProps: 'height' }),
    })
    gsap.set(prevEl, { position: 'absolute', top: 0, left: prevElLeft, width: prevElWidth, zIndex: 0, pointerEvents: 'none' })
    gsap.to(prevEl, {
      opacity: 0, y: forward ? 22 : -22, scale: 0.988, duration: 0.26, ease: 'power2.in',
      onComplete: () => gsap.set(prevEl, {
        visibility: 'hidden', opacity: 0, x: 0, y: 0, scale: 1,
        pointerEvents: 'none', zIndex: 0, position: 'absolute', top: 0, left: 0, right: 0,
        clearProps: 'width',
      }),
    })
    gsap.set(currEl, { position: 'relative', visibility: 'visible', zIndex: 1, opacity: 1, pointerEvents: 'none', clearProps: 'width,left' })
    gsap.to(currEl, {
      y: 0, scale: 1, duration: 0.34, ease: 'power3.out',
      onComplete: () => gsap.set(currEl, { clearProps: 'y,scale,zIndex', pointerEvents: 'auto' }),
    })
  }, [])

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!hasAmount || amountOver || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await api.post('/withdrawals', { amount_minor: amountMinor }, {
        headers: { 'Idempotency-Key': `withdraw-${Date.now()}-${amountMinor}` },
      })
      switchView('done')
    } catch (err) {
      const code = err?.response?.data?.error?.code
      const raw  = err?.response?.data?.error?.message
      if (code === 'PENDING_WITHDRAWAL_EXISTS') {
        api.get('/withdrawals/status')
          .then((res) => { const d = res?.data?.data; if (d) setPendingData(d) })
          .catch(() => {})
        setPrecheck('pending')
        return
      }
      setError(
        code === 'INSUFFICIENT_FUNDS'    ? 'Недостаточно средств на балансе'
        : code === 'WITHDRAWAL_MIN_AMOUNT' ? 'Сумма меньше минимально допустимой'
        : code === 'WITHDRAWAL_FORBIDDEN'  ? 'Вывод доступен только для моделей'
        : raw || 'Не удалось создать заявку. Попробуйте ещё раз.',
      )
    } finally {
      setSubmitting(false)
    }
  }, [hasAmount, amountOver, submitting, amountMinor, switchView])

  // ─── After-close reset ────────────────────────────────────────────────────
  const handleAfterClose = useCallback(() => {
    const { amount: amountEl, done: doneEl } = viewRefs.current
    gsap.killTweensOf([amountBtnsRef.current, contentWrapRef.current, amountEl, doneEl, precheckContainerRef.current])
    if (amountBtnsRef.current?.children?.length) gsap.killTweensOf(Array.from(amountBtnsRef.current.children))

    const resetView = (el, visible) => {
      if (!el) return
      gsap.set(el, visible
        ? { position: 'relative', visibility: 'visible', opacity: 1, x: 0, y: 0, scale: 1, pointerEvents: 'auto', clearProps: 'width,left,zIndex' }
        : { position: 'absolute', top: 0, left: 0, right: 0, visibility: 'hidden', opacity: 0, x: 0, y: 0, scale: 1, pointerEvents: 'none', clearProps: 'width,zIndex' },
      )
    }
    resetView(amountEl, true)
    resetView(doneEl, false)
    if (contentWrapRef.current)  gsap.set(contentWrapRef.current,  { clearProps: 'height' })
    if (amountBtnsRef.current)   gsap.set(amountBtnsRef.current,   { display: 'none', height: 0, opacity: 0, marginTop: -12 })
    if (precheckContainerRef.current) gsap.set(precheckContainerRef.current, { clearProps: 'height,overflow,opacity' })

    currentViewRef.current = 'amount'
    setAmount('')
    setError('')
    setSubmitting(false)
    setPrecheck('idle')
    setDisplayedPrecheck('loading')
    setPendingData(null)
    isClosingRef.current = false
  }, [])

  // ─── Render ───────────────────────────────────────────────────────────────
  const displayAmount    = amount ? `฿ ${amount}` : ''
  const pendingAmountThb = pendingData?.amount_minor != null
    ? Math.floor(pendingData.amount_minor / 100)
    : null

  return (
    <ModalMiddle isOpen={isOpen} onClose={onClose} onAfterClose={handleAfterClose}>
      <div ref={precheckContainerRef}>

        {/* ── Loading ─────────────────────────────────────────────────────── */}
        {displayedPrecheck === 'loading' && (
          <div className="flex justify-center px-5 py-9">
            <div className="w-8 h-8 rounded-full border-[3px] border-[#FDE8F5] border-t-[#E2319B] animate-spin" />
          </div>
        )}

        {/* ── Pending (existing withdrawal) ────────────────────────────────── */}
        {displayedPrecheck === 'pending' && (
          <div className="flex flex-col gap-5 px-5 py-6">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-black text-xl/[100%] font-semibold">Заявка уже подана</h2>
              <p className="text-[#7F7F7F] text-sm/[150%] font-medium">
                Ваша заявка на вывод находится в обработке. Дождитесь её завершения — мы свяжемся с вами в чате поддержки.
              </p>
            </div>
            {pendingAmountThb != null && (
              <div className="bg-[#F5F5F7] rounded-2xl px-5 py-4 flex items-center justify-between">
                <span className="text-[#7F7F7F] text-sm/[100%] font-medium">Сумма к выплате</span>
                <span className="text-black text-sm/[100%] font-semibold">
                  ฿ {pendingAmountThb.toLocaleString()}
                </span>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full py-4 rounded-full bg-[#1C1C1E] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity"
            >
              Понятно
            </button>
          </div>
        )}

        {/* ── Form (ok state) ──────────────────────────────────────────────── */}
        {displayedPrecheck === 'ok' && (
          <div ref={contentWrapRef} style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Amount view */}
            <div ref={(el) => { viewRefs.current.amount = el }} style={{ position: 'relative' }}>
              <div className="flex flex-col gap-5 px-5 pt-2 pb-6">
                <div className="flex flex-col items-center gap-1.5 text-center pt-1">
                  <h2 className="text-black text-xl/[100%] font-semibold">Заявка на вывод</h2>
                  <p className="text-[#7F7F7F] text-sm/[140%] font-medium">
                    Укажите сумму. Реквизиты обсудим в чате поддержки после подачи заявки.
                  </p>
                </div>

                <div className="bg-[#F5F5F7] rounded-2xl px-5 py-5">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Укажите сумму вывода"
                    value={displayAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/^฿\s*/, '').replace(/[^0-9]/g, '')
                      setAmount(raw)
                    }}
                    className="w-full bg-transparent text-black text-lg/[100%] font-semibold outline-none placeholder:text-[#ABABAB] placeholder:font-medium"
                  />
                </div>

                {amountOver && (
                  <p className="text-[#E2319B] text-sm/[130%] font-medium text-center">
                    Недостаточно средств на балансе
                  </p>
                )}
                {!!error && (
                  <p className="text-[#E2319B] text-sm/[130%] font-medium text-center">{error}</p>
                )}

                <div
                  ref={amountBtnsRef}
                  className="flex flex-col gap-3"
                  style={{ display: 'none', height: 0, opacity: 0, marginTop: -12 }}
                >
                  <button
                    onClick={handleSubmit}
                    disabled={!hasAmount || amountOver || submitting}
                    className={[
                      'w-full py-4 rounded-full text-base/[100%] font-semibold transition-opacity',
                      (!hasAmount || amountOver || submitting)
                        ? 'bg-[#F0F0F0] text-[#BDBDBD] cursor-not-allowed'
                        : 'bg-[#E2319B] text-white active:opacity-80',
                    ].join(' ')}
                  >
                    {submitting ? 'Отправляем...' : 'Подать заявку'}
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-4 rounded-full bg-[#1C1C1E] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity"
                  >
                    Вернуться назад
                  </button>
                </div>
              </div>
            </div>

            {/* Done view */}
            <div
              ref={(el) => { viewRefs.current.done = el }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, visibility: 'hidden', opacity: 0, pointerEvents: 'none' }}
            >
              <div className="flex flex-col items-center gap-5 px-5 py-6 text-center">
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-black text-xl/[100%] font-semibold">Заявка создана</h2>
                  <p className="text-[#7F7F7F] text-sm/[150%] font-medium">
                    Скоро поддержка свяжется с вами в чате, чтобы обсудить реквизиты и обработать вывод.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-4 rounded-full bg-[#1C1C1E] text-white text-base/[100%] font-semibold active:opacity-80 transition-opacity"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </ModalMiddle>
  )
}
