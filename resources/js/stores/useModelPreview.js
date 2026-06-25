import { create } from 'zustand'

const useModelPreview = create((set) => ({
  model: null,
  chatId: null,
  setModel: (model, chatId = null) => set({ model, chatId }),
  clear: () => set({ model: null, chatId: null }),
}))

export default useModelPreview
