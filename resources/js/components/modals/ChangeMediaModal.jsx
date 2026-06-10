import { useState, useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'
import ModalSheet from '@/layout/ModalSheet'
import useProfileStore from '@/stores/useProfileStore'
import { logError } from '@/utils/logger'

const MAX_PHOTOS = 6
const MIN_REQUIRED = 3

const StarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function EmptySlot({ onAdd }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      await onAdd(file)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className="relative rounded-2xl flex items-end justify-end p-2"
      style={{ aspectRatio: '2/3', background: '#FDE8F5', border: '2.5px dashed #E2319B' }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="w-10 h-10 absolute -bottom-2 -right-1 rounded-full border-2 border-[white] bg-[#E2319B] flex items-center justify-center shadow-lg active:scale-90 transition-transform disabled:opacity-60"
      >
        {uploading ? (
          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  )
}

function FilledSlot({ photo, onRemove, onSetMain, onReplace, canRemove }) {
  const slotRef  = useRef(null)
  const inputRef = useRef(null)
  const [replacing, setReplacing] = useState(false)

  useEffect(() => {
    if (slotRef.current) {
      gsap.fromTo(slotRef.current,
        { scale: 0.75, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.38, ease: 'back.out(1.6)' },
      )
    }
  }, [])

  const handleReplaceFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setReplacing(true)
    try {
      await onReplace(photo.id, file)
    } finally {
      setReplacing(false)
    }
  }

  return (
    <div
      ref={slotRef}
      className="relative rounded-2xl"
      style={{ aspectRatio: '2/3' }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReplaceFile}
      />
      {/* Clicking the image replaces it */}
      <button
        type="button"
        className="w-full h-full block rounded-2xl overflow-hidden focus:outline-none active:brightness-90 transition-[filter]"
        onClick={() => inputRef.current?.click()}
        title="Нажмите чтобы заменить фото"
      >
        {replacing ? (
          <div className="w-full h-full flex items-center justify-center bg-black/20 rounded-2xl">
            <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
          </div>
        ) : (
          <img
            src={photo.url ?? photo.preview}
            alt=""
            className="w-full h-full object-cover rounded-2xl"
            draggable={false}
          />
        )}
      </button>

      {/* Main badge */}
      {photo.is_main && (
        <button
          type="button"
          onClick={() => onSetMain(photo.id)}
          className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-[#E2319B]/70 flex items-center justify-center active:scale-90 transition-transform text-white"
          title="Сделать главной"
        >
          <StarIcon />
        </button>
      )}

      {/* Make main button (only for real photos with id, not the main one already) */}
      {photo.id && !photo.is_main && (
        <button
          type="button"
          onClick={() => onSetMain(photo.id)}
          className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center active:scale-90 transition-transform text-[#7F7F7F] hover:text-[#E2319B]"
          title="Сделать главной"
        >
          <StarIcon />
        </button>
      )}

      {/* Remove button — disabled when at minimum (3 photos) */}
      <button
        type="button"
        disabled={!canRemove}
        onClick={() => canRemove && onRemove(photo.id)}
        className={`absolute -bottom-2 -right-1 w-9 h-9 rounded-full flex items-center justify-center border transition-transform ${canRemove
            ? 'bg-[#EFEEF3] border-[#D0C2C2] active:scale-90'
            : 'bg-[#F5F5F7] border-[#E5E5E5] opacity-40 cursor-not-allowed'
          }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L8 8M8 8L12 12M8 8L12 4M8 8L4 12" stroke="#777779" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

export default function ChangeMediaModal({ isOpen, onClose }) {
  const profile = useProfileStore()

  const photos = profile.photos ?? []
  const slots = [
    ...photos,
    ...Array(Math.max(0, MAX_PHOTOS - photos.length)).fill(null),
  ].slice(0, MAX_PHOTOS)

  const filledCount = photos.length

  const titleRef = useRef(null)
  const gridRef = useRef(null)
  const counterRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const titleEl = titleRef.current
    const counterEl = counterRef.current
    const gridItems = gridRef.current?.children
      ? Array.from(gridRef.current.children).filter(Boolean)
      : []

    const tl = gsap.timeline({ delay: 0.1 })
    if (titleEl) {
      tl.fromTo(titleEl, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' })
    }
    if (gridItems.length) {
      tl.fromTo(
        gridItems,
        { y: 28, opacity: 0, scale: 0.92 },
        { y: 0, opacity: 1, scale: 1, duration: 0.42, ease: 'back.out(1.3)', stagger: 0.055 },
        titleEl ? 0.1 : 0,
      )
    }
    if (counterEl) {
      tl.fromTo(counterEl, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }, 0.5)
    }
    return () => tl.kill()
  }, [isOpen])

  const handleAdd = useCallback(async (file) => {
    await profile.uploadPhoto(file)
  }, [profile])

  const handleRemove = useCallback(async (id) => {
    if (!id) return
    try {
      await profile.deletePhoto(id)
    } catch (err) {
      logError('Delete photo failed', err)
    }
  }, [profile])

  const handleReplace = useCallback(async (id, file) => {
    if (!id) return
    try {
      await profile.replacePhoto(id, file)
    } catch (err) {
      logError('Replace photo failed', err)
    }
  }, [profile])

  const handleSetMain = useCallback(async (id) => {
    try {
      await profile.setMainPhoto(id)
    } catch (err) {
      logError('Set main photo failed', err)
    }
  }, [profile])

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} height="95dvh">
      <div className="flex items-center justify-between px-5 py-4 shrink-0">
        <button
          onClick={onClose}
          className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
        >
          Назад
        </button>
        <h2 className="text-base/[100%] font-[500] text-black">Изменение медиа</h2>
        <button
          onClick={onClose}
          className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
        >
          Готово
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-10">
        <div ref={titleRef} className="flex flex-col gap-2.5 mb-7 mt-2">
          <h3 className="text-[26px]/[120%] font-[500] text-black text-center">
            Измените фото в вашем профиле
          </h3>
          <p className="text-[#ABABAB] text-sm/[155%] font-normal text-center">
            Ваши последние медиафайлы помогут пользователям быстрее сделать выбор в пользу вас.
          </p>
        </div>
        <div ref={gridRef} className="grid grid-cols-3 gap-3 mb-6">
          {slots.map((slot, i) =>
            slot ? (
              <FilledSlot
                key={`photo-${slot.id ?? `tmp-${i}`}`}
                photo={slot}
                onRemove={handleRemove}
                onSetMain={handleSetMain}
                onReplace={handleReplace}
                canRemove={filledCount > MIN_REQUIRED}
              />
            ) : (
              <EmptySlot key={`empty-${i}`} onAdd={handleAdd} />
            ),
          )}
        </div>
        <div ref={counterRef} className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-[#EFEEF3] flex items-center justify-center">
            <span className="text-sm/[100%] font-medium text-black">{filledCount}/{MAX_PHOTOS}</span>
          </div>
          <p className="text-sm/[105%] font-normal text-[#7F7F7F] pt-1">
            <span className="text-[#E2319B] font-medium">Давайте начнем с {MIN_REQUIRED} фото.</span>
            {' '}Рекомендуем добавлять фото с лицом.
          </p>
        </div>
      </div>
    </ModalSheet>
  )
}
