export default function FacetedDiamond({ size = 168 }) {
  const id = 'fd'
  return (
    <svg width={size} height={size * (210 / 200)} viewBox="0 0 200 210" fill="none" aria-hidden>
      <defs>
        <linearGradient id={`${id}-table`} x1="100" y1="46" x2="100" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE7F3" />
          <stop offset="1" stopColor="#F6A9D2" />
        </linearGradient>
        <linearGradient id={`${id}-crown`} x1="100" y1="46" x2="100" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F584C0" />
          <stop offset="1" stopColor="#D7479A" />
        </linearGradient>
        <linearGradient id={`${id}-pavMid`} x1="100" y1="92" x2="100" y2="196" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D23A93" />
          <stop offset="1" stopColor="#9C1F70" />
        </linearGradient>
        <linearGradient id={`${id}-pavDark`} x1="100" y1="92" x2="100" y2="196" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9E2272" />
          <stop offset="1" stopColor="#5C1146" />
        </linearGradient>
      </defs>

      <g stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" strokeLinejoin="round">
        
        <polygon points="72,46 128,46 140,92 60,92" fill={`url(#${id}-table)`} />
        <polygon points="72,46 60,92 28,92" fill={`url(#${id}-crown)`} />
        <polygon points="128,46 140,92 172,92" fill={`url(#${id}-crown)`} />
        
        <polygon points="28,92 60,92 100,196" fill={`url(#${id}-pavDark)`} />
        <polygon points="60,92 100,92 100,196" fill={`url(#${id}-pavMid)`} />
        <polygon points="100,92 140,92 100,196" fill={`url(#${id}-pavMid)`} />
        <polygon points="140,92 172,92 100,196" fill={`url(#${id}-pavDark)`} />
      </g>

      
      <line x1="28" y1="92" x2="172" y2="92" stroke="rgba(255,255,255,0.5)" strokeWidth="1.3" strokeLinecap="round" />
      
      <polygon points="80,52 98,52 93,70 76,70" fill="#fff" opacity="0.55" />
      <polygon points="103,52 120,52 124,70 108,70" fill="#fff" opacity="0.22" />
    </svg>
  )
}
