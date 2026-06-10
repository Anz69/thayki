import { create } from 'zustand'

const useRequestBar = create(() => ({
  active: false,
  canSubmit: false,
  submitting: false,
  submit: null,
}))

export default useRequestBar
