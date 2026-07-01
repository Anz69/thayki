if (typeof document !== 'undefined' && !document.getElementById('gb-styles')) {
  const s = document.createElement('style')
  s.id = 'gb-styles'
  // Rotate the CONIC GRADIENT'S ANGLE, not a child element. This way the border is
  // just a rounded background (border-radius rounds it on every device) and there's
  // no animated/transformed child for buggy WebViews to fail clipping — so the RGB
  // border is never square. Where @property is unsupported (very old WebView) the
  // gradient is static but STILL rounded.
  s.textContent = `
    @property --gb-angle {
      syntax: '<angle>';
      initial-value: 0deg;
      inherits: false;
    }
    @keyframes gb-rotate {
      to { --gb-angle: 360deg; }
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
      className={`relative ${className}`}
      style={{ borderRadius: radius, padding: borderWidth }}
    >
      <div
        aria-hidden
        style={{
          position:     'absolute',
          inset:        0,
          borderRadius: radius,
          background:   'conic-gradient(from var(--gb-angle, 0deg) at 50% 50%, #E2319B 0deg, #B331E2 90deg, #E2314C 200deg, #E2319B 360deg)',
          animation:    `gb-rotate ${speed}s linear infinite`,
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
