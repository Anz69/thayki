import { useState, useEffect } from 'react'
import ModalSheet from '@/layout/ModalSheet'
import CustomSelect from '@/components/ui/CustomSelect'
import { scrollInputWithNext } from '@/utils/isTouchUi'

const SIZES = ['Маленькая', 'Средняя', 'Большая', 'Очень большая']

const PRICE_DURATIONS = [
  { hours: 1, label: '1 час' },
  { hours: 3, label: '3 часа' },
  { hours: 8, label: 'Ночь (8 ч)' },
  { hours: 24, label: 'Сутки (24 ч)' },
]

function Field({ label, children, boxClassName = '' }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[#ABABAB] text-[10px]/[100%] font-semibold uppercase tracking-widest px-1">
        {label}
      </p>
      <div className={`bg-[#F5F5F7] rounded-2xl px-4 ${boxClassName}`}>
        {children}
      </div>
    </div>
  )
}

function NumberInput({ value, onChange, placeholder }) {
  return (
    <div className="flex items-center justify-between">
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => scrollInputWithNext(e.target)}
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

function validatePrice(v) {
  if (!v) return null
  const n = parseInt(v)
  if (isNaN(n) || n < 100) return 'Минимальная цена — 100 ฿'
  return null
}

export default function MetricsModal({ isOpen, onClose, profile = {}, onSave }) {
  const [height, setHeight] = useState(String(profile.height ?? ''))
  const [weight, setWeight] = useState(String(profile.weight ?? ''))
  const [breast, setBreast] = useState(profile.breastSize ?? SIZES[0])
  const [butt, setButt] = useState(profile.buttSize ?? SIZES[0])
  const [prices, setPrices] = useState({})

  useEffect(() => {
    if (isOpen) {
      setHeight(String(profile.height ?? ''))
      setWeight(String(profile.weight ?? ''))
      setBreast(profile.breastSize ?? SIZES[0])
      setButt(profile.buttSize ?? SIZES[0])
      const init = {}
      PRICE_DURATIONS.forEach(({ hours }) => {
        const opt = (profile.priceOptions ?? []).find((p) => p.hours === hours)
        init[hours] = opt ? String(opt.price_thb) : ''
      })
      setPrices(init)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const heightErr = validateHeight(height)
  const weightErr = validateWeight(weight)
  const priceErrMessage = PRICE_DURATIONS
    .map(({ hours }) => validatePrice(prices[hours]))
    .find(Boolean)
  const hasPriceErr = Boolean(priceErrMessage)
  const canSave = !heightErr && !weightErr && !hasPriceErr

  const handleSave = () => {
    if (!canSave) return
    const priceOptions = PRICE_DURATIONS
      .filter(({ hours }) => prices[hours])
      .map(({ hours, label }) => ({
        hours,
        price_thb: parseInt(prices[hours]),
        label,
      }))
    onSave({
      height: parseInt(height) || profile.height,
      weight: parseInt(weight) || profile.weight,
      breastSize: breast,
      buttSize: butt,
      priceOptions,
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

      <div className="flex flex-col gap-3 px-5 pb-10 overflow-y-auto">
        <div className="flex flex-col gap-1">
          <Field label="Рост" boxClassName="py-2.5">
            <NumberInput
              value={height}
              onChange={setHeight}
              placeholder="165"
            />
          </Field>
          {heightErr && <p className="text-[#E2319B] text-xs/[100%] font-medium px-1">{heightErr}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <Field label="Вес" boxClassName="py-2.5">
            <NumberInput
              value={weight}
              onChange={setWeight}
              placeholder="45"
            />
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

        <div className="flex flex-col gap-2 pt-1">
          <p className="text-[#ABABAB] text-[10px]/[100%] font-semibold uppercase tracking-widest px-1">
            Цены
          </p>
          <div className="bg-[#F5F5F7] rounded-2xl overflow-hidden">
            {PRICE_DURATIONS.map(({ hours, label }, idx) => {
              const val = prices[hours] ?? ''
              const hasVal = val.length > 0
              return (
                <div
                  key={hours}
                  className={`flex items-center justify-between px-4 py-3.5 ${idx < PRICE_DURATIONS.length - 1 ? 'border-b border-[#EBEBEB]' : ''}`}
                >
                  <span className="text-[#7F7F7F] text-sm/[100%] font-medium shrink-0 w-28">{label}</span>
                  <div className="flex items-center shrink-0 gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="—"
                      value={val}
                      onChange={(e) =>
                        setPrices((p) => ({ ...p, [hours]: e.target.value.replace(/[^0-9]/g, '') }))
                      }
                      onFocus={(e) => scrollInputWithNext(e.target)}
                      className="bg-transparent text-black text-sm/[100%] font-medium outline-none text-right placeholder:text-[#C0C0C0]"
                      style={{ width: hasVal ? `${val.length + 0.5}ch` : '2ch' }}
                    />
                    <span className="text-[#ABABAB] text-sm font-medium">฿</span>
                  </div>
                </div>
              )
            })}
          </div>
          {hasPriceErr && <p className="text-[#E2319B] text-xs/[100%] font-medium px-1">{priceErrMessage}</p>}
          <p className="text-[#ABABAB] text-xs/[140%] font-normal px-1">
            Оставьте поле пустым, если не предлагаете этот пакет.
          </p>
        </div>
      </div>
    </ModalSheet>
  )
}
