import { useState, useEffect } from 'react'
import ModalSheet from '@/layout/ModalSheet'
import CustomSelect from '@/components/ui/CustomSelect'
const SIZES = ['Маленькая', 'Средняя', 'Большая', 'Очень большая']
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[#ABABAB] text-[10px]/[100%] font-semibold uppercase tracking-widest px-1">
        {label}
      </p>
      <div className="bg-[#F5F5F7] rounded-2xl px-4 py-3.5">
        {children}
      </div>
    </div>
  )
}
function NumberInput({ value, onChange, placeholder, unit }) {
  return (
    <div className="flex items-center justify-between">
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent text-black text-sm/[100%] font-medium outline-none w-full"
      />
    </div>
  )
}
function validateHeight(v) {
  const n = parseInt(v)
  if (!v) return null
  if (isNaN(n) || n < 100 || n > 250) return 'От 100 до 250 см'
  return null
}
function validateWeight(v) {
  const n = parseInt(v)
  if (!v) return null
  if (isNaN(n) || n < 30 || n > 200) return 'От 30 до 200 кг'
  return null
}
export default function MetricsModal({ isOpen, onClose, profile = {}, onSave }) {
  const [height, setHeight] = useState(String(profile.height ?? ''))
  const [weight, setWeight] = useState(String(profile.weight ?? ''))
  const [breast, setBreast] = useState(profile.breastSize ?? SIZES[0])
  const [butt,   setButt]   = useState(profile.buttSize   ?? SIZES[0])
  useEffect(() => {
    if (isOpen) {
      setHeight(String(profile.height ?? ''))
      setWeight(String(profile.weight ?? ''))
      setBreast(profile.breastSize ?? SIZES[0])
      setButt(profile.buttSize   ?? SIZES[0])
    }
  }, [isOpen])
  const heightErr = validateHeight(height)
  const weightErr = validateWeight(weight)
  const canSave = !heightErr && !weightErr
  const handleSave = () => {
    if (!canSave) return
    onSave({
      height:     parseInt(height)  || profile.height,
      weight:     parseInt(weight)  || profile.weight,
      breastSize: breast,
      buttSize:   butt,
    })
    onClose()
  }
  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} height="95dvh">
      <div className="flex items-center justify-between px-5 py-4 shrink-0">
        <button
          onClick={onClose}
          className="px-3.5 py-2.5 bg-[#EFEEF3] text-black text-sm/[100%] font-medium rounded-full active:bg-[#E4E4E4] transition-colors"
        >
          Отмена
        </button>
        <h2 className="text-base/[100%] font-[500] text-black">Доп. информация</h2>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`px-3.5 py-2.5 bg-[#EFEEF3] text-sm/[100%] font-medium rounded-full transition-colors ${canSave ? 'text-black active:bg-[#E4E4E4]' : 'text-[#ABABAB]'}`}
        >
          Готово
        </button>
      </div>
      <div className="flex flex-col gap-3 px-5 pb-10">
        <div className="flex flex-col gap-1">
          <Field label="Рост">
            <NumberInput value={height} onChange={setHeight} placeholder="165" unit="см" />
          </Field>
          {heightErr && <p className="text-[#E2319B] text-xs/[100%] font-medium px-1">{heightErr}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <Field label="Вес">
            <NumberInput value={weight} onChange={setWeight} placeholder="45" unit="кг" />
          </Field>
          {weightErr && <p className="text-[#E2319B] text-xs/[100%] font-medium px-1">{weightErr}</p>}
        </div>
        <Field label="Размер груди">
          <CustomSelect value={breast} onChange={setBreast} options={SIZES} />
        </Field>
        <Field label="Размер попы">
          <CustomSelect value={butt} onChange={setButt} options={SIZES} />
        </Field>
        <p className="text-[#ABABAB] text-xs/[140%] font-normal px-1">
          Не знаете точных данных? Введите примерные значения, соответствующие вашему телосложению.
        </p>
      </div>
    </ModalSheet>
  )
}