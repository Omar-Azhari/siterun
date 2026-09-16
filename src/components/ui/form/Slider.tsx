import { useId } from 'react'

interface SliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  /** Formats the value shown beside the label. */
  format?: (value: number) => string
}

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = String,
}: SliderProps) {
  const id = useId()
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="mb-3.5">
      <div className="mb-2 flex items-center justify-between text-[13px]">
        <label htmlFor={id} className="text-[#dae4ef]">
          {label}
        </label>
        <output htmlFor={id} className="font-semibold text-fg">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={format(value)}
        style={{
          background: `linear-gradient(to right, var(--color-primary) ${pct}%, #34445a ${pct}%)`,
        }}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
      />
    </div>
  )
}
