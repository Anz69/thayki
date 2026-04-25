export default function ChatLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-2" aria-hidden>
      <div className="flex justify-center gap-2 mb-4">
        <div className="h-20 w-20 rounded-full bg-[#EFEEF3]" />
      </div>
      <div className="flex justify-end">
        <div className="h-10 max-w-[65%] w-48 rounded-3xl bg-[#E8E8EA]" />
      </div>
      <div className="flex justify-start">
        <div className="h-12 max-w-[70%] w-56 rounded-3xl bg-[#F0F0F0]" />
      </div>
      <div className="flex justify-end">
        <div className="h-9 max-w-[55%] w-40 rounded-3xl bg-[#E8E8EA]" />
      </div>
      <div className="flex justify-start">
        <div className="h-10 max-w-[60%] w-44 rounded-3xl bg-[#F0F0F0]" />
      </div>
    </div>
  )
}
