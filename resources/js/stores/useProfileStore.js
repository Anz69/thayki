import { create } from 'zustand'
import api from '@/utils/api'
import useAuthStore from '@/stores/useAuthStore'

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
      await api.post('/me/avatar', fd)
      await useAuthStore.getState().refreshUser()
    } catch (err) {
      throw err
    }
  },

  uploadPhoto: async (file) => {
    const fd = new FormData()
    fd.append('photo', file)
    const res = await api.post('/me/model-profile/photos', fd)
    const photo = res.data.data
    set((s) => ({ photos: [...s.photos, photo] }))
    return photo
  },

  deletePhoto: async (id) => {
    await api.delete(`/me/model-profile/photos/${id}`)
    set((s) => ({ photos: s.photos.filter((p) => p.id !== id) }))
  },

  replacePhoto: async (oldId, file) => {
    const oldPhotos = get().photos
    const oldIdx = oldPhotos.findIndex((p) => p.id === oldId)

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

    set((s) => {
      const next = s.photos.filter((p) => p.id !== uploaded.id)
      const idx = next.findIndex((p) => p.id === oldId)
      if (idx === -1) {
        return { photos: [...next, uploaded] }
      }
      const copy = next.slice()
      copy[idx] = uploaded
      return { photos: copy }
    })

    try {
      await api.delete(`/me/model-profile/photos/${oldId}`)
    } catch (err) {
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
