import { create } from 'zustand'

// Holds an inline (e.g. chat-sent / parsed) model so ModelPage can render it
// in view-only "preview" mode without fetching from the catalog.
const useModelPreview = create((set) => ({
  model: null,
  setModel: (model) => set({ model }),
  clear: () => set({ model: null }),
}))

export default useModelPreview
