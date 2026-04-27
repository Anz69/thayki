import { create } from 'zustand'
import api from '@/utils/api'
import useAuthStore from '@/stores/useAuthStore'

// Map backend response → frontend shape
function mapFromApi(data) {
  return {
    name:        data.display_name  ?? '',
    age:         data.age           ?? 18,
    height:      data.height_cm     ?? null,
    weight:      data.weight_kg     ?? null,
    buttSize:    data.butt_size     ?? null,
    breastSize:  data.bust_size     ?? null,
    schedule:    data.schedule      ?? 'any',
    photos:      Array.isArray(data.photos) ? data.photos : [],
  }
}

// Map frontend patch → backend body
function mapToApi(partial) {
  const body = {}
  if (partial.name        !== undefined) body.display_name  = partial.name
  if (partial.age         !== undefined) body.age           = partial.age
  if (partial.height      !== undefined) body.height_cm     = partial.height
  if (partial.weight      !== undefined) body.weight_kg     = partial.weight
  if (partial.breastSize  !== undefined) body.bust_size     = partial.breastSize
  if (partial.buttSize    !== undefined) body.butt_size     = partial.buttSize
  if (partial.schedule    !== undefined) body.schedule      = partial.schedule
  return body
}

const useProfileStore = create((set, get) => ({
  loaded:     false,
  error:      null,
  name:       '',
  age:        18,
  height:     null,
  weight:     null,
  buttSize:   null,
  breastSize: null,
  schedule:   'any',
  photos:     [],

  hydrate: async () => {
    set({ error: null })
    try {
      const res = await api.get('/me/model-profile')
      set({ ...mapFromApi(res.data.data), loaded: true })
    } catch (err) {
      set({ error: err?.response?.data?.message ?? 'Ошибка загрузки профиля', loaded: true })
    }
  },

  savePatch: async (partial) => {
    const body = mapToApi(partial)
    try {
      const res = await api.patch('/me/model-profile', body)
      set(mapFromApi(res.data.data))
    } catch (err) {
      throw err
    }
  },

  uploadAvatar: async (file) => {
    const fd = new FormData()
    fd.append('photo', file)
    try {
      // Не передаём Content-Type вручную — axios сам выставит multipart/form-data с boundary
      await api.post('/me/avatar', fd)
      await useAuthStore.getState().refreshUser()
    } catch (err) {
      throw err
    }
  },

  uploadPhoto: async (file) => {
    const fd = new FormData()
    fd.append('photo', file)
    // Не передаём Content-Type вручную — axios сам выставит multipart/form-data с boundary
    const res = await api.post('/me/model-profile/photos', fd)
    const photo = res.data.data
    set((s) => ({ photos: [...s.photos, photo] }))
    return photo
  },

  deletePhoto: async (id) => {
    await api.delete(`/me/model-profile/photos/${id}`)
    set((s) => ({ photos: s.photos.filter((p) => p.id !== id) }))
  },

  /**
   * Atomic-ish photo replacement: upload the new file first, and only then
   * remove the old photo. If the upload fails (network, validation, server
   * 5xx), the old photo stays — without this guard the previous flow
   * `delete → upload` would leave the user with NO photo if the upload
   * step failed, which is exactly the bug we hit in the wild.
   *
   * Also keeps the new photo in the SAME slot position as the old one so
   * the UI doesn't visually re-order while replacing.
   */
  replacePhoto: async (oldId, file) => {
    const oldPhotos = get().photos
    const oldIdx = oldPhotos.findIndex((p) => p.id === oldId)

    // Step 1: upload the new file. Append to the end first.
    const fd = new FormData()
    fd.append('photo', file)
    let uploaded = null
    try {
      const res = await api.post('/me/model-profile/photos', fd)
      uploaded = res.data?.data
    } catch (err) {
      throw err
    }
    if (!uploaded) {
      throw new Error('Не удалось загрузить фото')
    }

    // Step 2: insert the new photo into the old slot, mark old as pending
    // removal locally so the UI flips immediately to the new image.
    set((s) => {
      const next = s.photos.filter((p) => p.id !== uploaded.id) // new one was appended
      const idx = next.findIndex((p) => p.id === oldId)
      if (idx === -1) {
        return { photos: [...next, uploaded] }
      }
      const copy = next.slice()
      copy[idx] = uploaded
      return { photos: copy }
    })

    // Step 3: delete the old photo on the server. If THIS step fails we
    // leave the user with both photos (old + new) — that's still better
    // than losing the new upload they just made.
    try {
      await api.delete(`/me/model-profile/photos/${oldId}`)
    } catch (err) {
      // Try to surface the failure without rolling back the swap.
      throw err
    }
  },

  setMainPhoto: async (id) => {
    await api.post(`/me/model-profile/photos/${id}/main`)
    set((s) => ({
      photos: s.photos.map((p) => ({ ...p, is_main: p.id === id })),
    }))
  },

  reset: () => {
    set({
      loaded:     false,
      error:      null,
      name:       '',
      age:        18,
      height:     null,
      weight:     null,
      buttSize:   null,
      breastSize: null,
      schedule:   'any',
      photos:     [],
    })
  },
}))

export default useProfileStore
