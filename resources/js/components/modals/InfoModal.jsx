import ModalMiddle from '@/layout/ModalMiddle'
const IconInfo = () => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
    <path d="M8.31536 11.25V7.875M8.31536 5.24998H8.30786M15.75 8.25C15.75 12.3921 12.3921 15.75 8.25 15.75C4.10786 15.75 0.75 12.3921 0.75 8.25C0.75 4.10786 4.10786 0.75 8.25 0.75C12.3921 0.75 15.75 4.10786 15.75 8.25Z" stroke="#777779" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const INFO_ITEMS = [
  { id: 1, text: 'Баланс обновляется тыры пыры чик пырык' },
]
export default function InfoModal({ isOpen, onClose }) {
  return (
    <ModalMiddle isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-5 p-6 pt-2">
        <h2 className="text-black text-xl/[100%] font-semibold text-center pt-1">Информация</h2>
        <div className="flex flex-col gap-2">
          {INFO_ITEMS.map(item => (
            <div key={item.id} className="flex items-start gap-3 bg-[#F5F5F7] rounded-2xl px-4 py-4">
              <IconInfo />
              <p className="text-[#7F7F7F] text-base/[100%] font-medium flex-1">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </ModalMiddle>
  )
}