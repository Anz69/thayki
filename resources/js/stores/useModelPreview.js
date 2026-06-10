import { create } from 'zustand'

const useModelPreview = create((set) => ({
  model: null,
  setModel: (model) => set({ model }),
  clear: () => set({ model: null }),
}))

export default useModelPreview
