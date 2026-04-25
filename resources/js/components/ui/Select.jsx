const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 9l6 6 6-6" stroke="#7F7F7F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
export default function Select({ value, onChange, options = [], className = '' }) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-black text-sm/[100%] font-medium outline-none w-full appearance-none cursor-pointer"
      >
        {options.map((opt) => {
          const val   = typeof opt === 'object' ? opt.value : opt
          const label = typeof opt === 'object' ? opt.label : opt
          return (
            <option key={val} value={val}>{label}</option>
          )
        })}
      </select>
      <ChevronDownIcon />
    </div>
  )
}