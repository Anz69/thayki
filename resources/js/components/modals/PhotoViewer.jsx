import { useEffect, useRef } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Keyboard } from 'swiper/modules'
import 'swiper/css'
import ModalSheet from '@/layout/ModalSheet'
import usePhotoViewerStore from '@/stores/usePhotoViewerStore'
export default function PhotoViewer() {
  const store = usePhotoViewerStore()
  const swiperRef = useRef(null)
  const scrollToIndex = (index) => {
    swiperRef.current?.slideTo(index)
  }
  const onGallerySwiper = (swiper) => {
    swiperRef.current = swiper
    swiper.slideTo(store.currentIndex, 0)
  }
  const onGallerySlideChange = (swiper) => {
    store.setIndex(swiper.activeIndex)
  }
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!store.isOpen) return
      if (e.key === 'Escape') store.close()
      if (e.key === 'ArrowLeft') scrollToIndex(Math.max(0, store.currentIndex - 1))
      if (e.key === 'ArrowRight')
        scrollToIndex(Math.min(store.photos.length - 1, store.currentIndex + 1))
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [store.isOpen, store.currentIndex, store.photos.length])
  useEffect(() => {
    if (store.isOpen) {
      if (swiperRef.current) {
        swiperRef.current.slideTo(store.currentIndex, 0)
      }
    }
  }, [store.isOpen])
  return (
    <ModalSheet isOpen={store.isOpen} onClose={store.close}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0 relative">
        <button
          onClick={store.close}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/6 active:bg-black/10 transition-colors duration-150"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 13L5 8L10 3"
              stroke="#111"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-sm font-medium text-[#111]">Назад</span>
        </button>
        <span className="text-sm font-[500] text-[#111] tabular-nums absolute left-1/2 -translate-x-1/2">
          Фото {store.currentIndex + 1} из {store.photos.length}
        </span>
        <button
          onClick={store.close}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-black/6 active:bg-black/10 transition-colors duration-150"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1L11 11M11 1L1 11" stroke="#111" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <Swiper
        modules={[Keyboard]}
        className="flex-1 w-full"
        slidesPerView={1}
        spaceBetween={0}
        speed={360}
        initialSlide={store.currentIndex}
        keyboard={{ enabled: false }}
        onSwiper={onGallerySwiper}
        onSlideChange={onGallerySlideChange}
        style={{ display: 'flex', alignItems: 'center' }}
      >
        {store.photos.map((photo) => (
          <SwiperSlide key={photo.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div className="flex w-full items-center justify-center px-4">
              <img
                src={photo.src}
                alt={photo.alt ?? ''}
                className="w-full object-contain rounded-[3.5rem]"
                style={{
                  maxHeight: 'calc(100dvh - 220px)',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
                draggable={false}
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="flex justify-center items-center gap-2 py-5 shrink-0">
        {store.photos.map((_, i) => (
          <button
            key={`dot-${i}`}
            onClick={() => scrollToIndex(i)}
            className="rounded-full transition-all duration-300 ease-out"
            style={{
              width: i === store.currentIndex ? '20px' : '8px',
              height: '8px',
              background: i === store.currentIndex ? '#111' : 'rgba(0,0,0,0.2)',
            }}
          />
        ))}
      </div>
    </ModalSheet>
  )
}