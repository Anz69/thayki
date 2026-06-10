import { forwardRef } from 'react'

/**
 * Static decorative layer over the globe: the centre icon. The orbit text is a
 * tilted 3D ring rendered per-character inside <Globe> (it fades behind the
 * sphere). pointer-events-none so the globe underneath stays draggable.
 *
 * Animated by the parent via data-attributes:
 *   [data-wordmark]  — centre icon (fade/scale)
 */
const GlobeOverlay = forwardRef(function GlobeOverlay(_props, ref) {
  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none select-none">
      {/* Centre icon */}
      <div data-wordmark className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0 }}>
        <img
          src="/img/rus-model-logo.png"
          alt="RUS-MODEL"
          draggable={false}
          className="object-contain"
          style={{
            width: 'clamp(96px, 32%, 178px)',
            filter: 'drop-shadow(0 6px 26px rgba(226,49,155,0.28))',
          }}
        />
      </div>
    </div>
  )
})

export default GlobeOverlay
