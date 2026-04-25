import { create } from 'zustand'
const usePhotoViewerStore = create((set) => ({
  isOpen: false,
  photos: [],
  currentIndex: 0,
  open(photos, index = 0) {
    set({ isOpen: true, photos, currentIndex: index })
  },
  close() {
    set({ isOpen: false })
  },
  setIndex(index) {
    set({ currentIndex: index })
  },
  reset() {
    set({ isOpen: false, photos: [], currentIndex: 0 })
  },
}))
export default usePhotoViewerStore