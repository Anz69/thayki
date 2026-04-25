import { useNavigate } from 'react-router-dom'
import { useCallback } from 'react'
import { transitionIn, setPageReady } from '@/utils/pageTransition'

export function useTransitionNavigate() {
  const navigate = useNavigate()

  return useCallback(
    async (to, options) => {
      setPageReady(false)
      await transitionIn()
      navigate(to, options)
    },
    [navigate],
  )
}
