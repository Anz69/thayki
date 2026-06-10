/**
 * Lightweight spinner for inline loading states inside a page (the
 * page-level AppLoader covers initial app boot only). Pure CSS — no GSAP
 * subscription, so it can be mounted/unmounted freely without leaks.
 *
 *   <InlineSpinner />            // 24px, brand pink
 *   <InlineSpinner size={32} />
 *   <InlineSpinner color="#fff" />
 *   <InlineSpinner label="Загружаем…" />
 */
export default function InlineSpinner({
  size = 24,
  color = '#E2319B',
  label = null,
  className = '',
}) {
  const stroke = Math.max(2, Math.round(size / 12))

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center justify-center gap-2 ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: 'inlineSpinnerSpin 0.85s linear infinite' }}
      >
        <circle
          cx="12" cy="12" r="9"
          stroke={color}
          strokeOpacity="0.18"
          strokeWidth={stroke}
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      </svg>
      {label && (
        <span className="text-[#7F7F7F] text-sm font-medium">{label}</span>
      )}
      <style>{`
        @keyframes inlineSpinnerSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
