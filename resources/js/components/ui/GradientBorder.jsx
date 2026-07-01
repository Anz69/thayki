if (typeof document !== 'undefined' && !document.getElementById('gb-styles')) {
  const s = document.createElement('style')
  s.id = 'gb-styles'
  s.textContent = `
    @keyframes gb-spin {
      from { transform: translate(-50%, -50%) rotate(0deg); }
      to   { transform: translate(-50%, -50%) rotate(360deg); }
    }
  `
  document.head.appendChild(s)
}
export default function GradientBorder({
  children,
  radius       = 20,
  borderWidth  = 2,
  speed        = 4,
  className    = '',
  innerClass   = '',
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        borderRadius: radius,
        padding: borderWidth,
        // Force the rounded clip on iOS / older Android WebView. Without its own
        // paint/compositing context, overflow:hidden + border-radius fails to clip the
        // ANIMATED gradient child there, so its square corners poke out and the border
        // looks square. These are non-destructive (no visual fade).
        isolation: 'isolate',
        contain: 'paint',
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
      }}
    >
      <div
        style={{
          position:   'absolute',
          top:        '50%',
          left:       '50%',
          width:      '220%',
          aspectRatio:'1',
          background: 'conic-gradient(from 180deg at 50% 50%, #E2319B 0deg, #B331E2 68.4deg, #E2314C 360deg)',
          animation:  `gb-spin ${speed}s linear infinite`,
          willChange: 'transform',
        }}
      />
      <div
        className={`relative ${innerClass}`}
        style={{ background: '#F5F5F7', borderRadius: Math.max(0, radius - borderWidth) }}
      >
        {children}
      </div>
    </div>
  )
}