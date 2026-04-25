export default function StepProgress({ current, total }) {
  const isLast = current === total
  return (
    <div className="flex flex-col gap-3">
      <span
        className="text-base/[100%] font-medium whitespace-nowrap shrink-0 text-[#777779]"
      >
        {isLast ? 'Последний шаг' : `Шаг ${current}/${total}`}
      </span>
      <div className="flex gap-1.5 flex-1">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={`bar-${i}`}
            className="flex-1 rounded-full"
            style={{
              height: 3,
              background: i < current ? '#E2319B' : '#E5E5E5',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}