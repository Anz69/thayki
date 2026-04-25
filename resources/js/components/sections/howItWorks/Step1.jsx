import ModelCardCarousel from '@/components/ui/ModelCardCarousel'
import { useCompactMode } from '@/composables/useCompactMode'

export default function HowItWorksStep1({ isActive }) {
  const isCompact = useCompactMode()
  return (
    <div className={`flex flex-col items-center justify-start flex-1 ${isCompact ? 'pt-4' : 'pt-10'}`}>
      <ModelCardCarousel isActive={isActive} />
    </div>
  )
}
