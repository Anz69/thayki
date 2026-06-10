import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { useTranslation } from 'react-i18next'
import ModalSheet from '@/layout/ModalSheet'
import useProfileStore from '@/stores/useProfileStore'
const ITEM_H         = 88
const SNAP_DELAY     = 110
const SMOOTH_SYNC_MS = 220
const AGES           = Array.from({ length: 53 }, (_, i) => 18 + i)
function clamp(v, min, max) { return Math.min(Math.max(v, min), max) }
function getIdx(scrollTop) {
  return clamp(Math.round(scrollTop / ITEM_H), 0, AGES.length - 1)
}
function scrollTo(el, idx, behavior = 'smooth') {
  el?.scrollTo({ top: idx * ITEM_H, behavior })
}
function AgeDrum({ value, onChange }) {
  const wrapRef     = useRef(null)
  const colRef      = useRef(null)
  const timer       = useRef(null)
  const syncing     = useRef(false)
  const dragStartY  = useRef(0)
  const dragStartSc = useRef(0)
  const dragMoved   = useRef(false)
  function releaseSync(behavior) {
    window.setTimeout(
      () => { syncing.current = false },
      behavior === 'smooth' ? SMOOTH_SYNC_MS : 0,
    )
  }
  function scheduleSnap() {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      if (!colRef.current) return
      const idx = getIdx(colRef.current.scrollTop)
      syncing.current = true
      scrollTo(colRef.current, idx)
      releaseSync('smooth')
      onChange(AGES[idx])
    }, SNAP_DELAY)
  }
  function onScroll() {
    if (!colRef.current || syncing.current) return
    onChange(AGES[getIdx(colRef.current.scrollTop)])
    scheduleSnap()
  }
  function selectAge(age) {
    if (dragMoved.current) return
    const idx = AGES.indexOf(age)
    syncing.current = true
    scrollTo(colRef.current, idx)
    releaseSync('smooth')
    onChange(age)
  }
  function startDrag(e) {
    dragStartY.current  = e.clientY
    dragStartSc.current = colRef.current?.scrollTop ?? 0
    dragMoved.current   = false
    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup',   stopDrag)
  }
  function onDragMove(e) {
    if (!colRef.current) return
    const dy = e.clientY - dragStartY.current
    if (Math.abs(dy) > 2) dragMoved.current = true
    colRef.current.scrollTop = dragStartSc.current - dy
  }
  function stopDrag() {
    scheduleSnap()
    window.setTimeout(() => { dragMoved.current = false }, 0)
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup',   stopDrag)
  }
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const col  = colRef.current
    if (!wrap || !col) return
    const pad = Math.max(ITEM_H, Math.floor((wrap.clientHeight - ITEM_H) / 2))
    col.style.paddingTop    = `${pad}px`
    col.style.paddingBottom = `${pad}px`
    syncing.current = true
    const idx = AGES.indexOf(value)
    scrollTo(col, idx >= 0 ? idx : 0, 'auto')
    releaseSync('auto')
    return () => {
      window.clearTimeout(timer.current)
      document.removeEventListener('mousemove', onDragMove)
      document.removeEventListener('mouseup',   stopDrag)
    }
  }, [])
  useEffect(() => {
    if (!colRef.current || syncing.current) return
    const cur = getIdx(colRef.current.scrollTop)
    const idx = AGES.indexOf(value)
    if (idx >= 0 && cur !== idx) {
      syncing.current = true
      scrollTo(colRef.current, idx)
      releaseSync('smooth')
    }
  }, [value])
  return (
    <div ref={wrapRef} className="relative flex-1 min-h-0 w-full overflow-hidden">
      <div className="absolute inset-x-0 top-0 z-10 pointer-events-none"
           style={{ height: '38%', background: 'linear-gradient(to bottom, rgba(255,255,255,1) 30%, rgba(255,255,255,0))' }} />
      <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
           style={{ height: '38%', background: 'linear-gradient(to top, rgba(255,255,255,1) 30%, rgba(255,255,255,0))' }} />
      <style>{`
        .age-col { height:100%; overflow-y:scroll; overflow-x:hidden; scrollbar-width:none;
                   -webkit-overflow-scrolling:touch; overscroll-behavior:contain;
                   scroll-snap-type:y mandatory; cursor:ns-resize; }
        .age-col::-webkit-scrollbar { display:none; }
        .age-item { height:${ITEM_H}px; width:100%; display:flex; align-items:center; justify-content:center;
                    background:transparent; border:0; cursor:ns-resize; user-select:none;
                    scroll-snap-align:center; scroll-snap-stop:always;
                    font-size:26px; font-weight:700; color:#d4d4d4;
                    transition:color 0.15s ease, font-size 0.15s ease; }
        .age-item--active { font-size:44px; color:#111; }
      `}</style>
      <div
        ref={colRef}
        className="age-col"
        onScroll={onScroll}
        onWheel={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onMouseDown={(e) => { if (e.button === 0) { e.preventDefault(); startDrag(e) } }}
      >
        {AGES.map((age) => (
          <button
            key={age}
            type="button"
            className={`age-item${age === value ? ' age-item--active' : ''}`}
            onClick={() => selectAge(age)}
          >
            {age}
          </button>
        ))}
      </div>
    </div>
  )
}
export default function AgeModal({ isOpen, onClose, onSavePatch }) {
  const { t } = useTranslation()
  const profile = useProfileStore()
  const [draft, setDraft] = useState(profile.age ?? 18)
  useEffect(() => {
    if (isOpen) setDraft(profile.age ?? 18)
  }, [isOpen, profile.age])
  const handleDone = () => {
    onSavePatch?.(draft)
    onClose()
  }
  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} height="95dvh">
      <div className="flex items-center justify-between px-5 py-4 shrink-0">
        <button
          onClick={onClose}
          className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleDone}
          className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
        >
          {t('common.done')}
        </button>
      </div>
      <div className="flex flex-col flex-1 min-h-0 pb-8">
        <AgeDrum value={draft} onChange={setDraft} />
      </div>
    </ModalSheet>
  )
}