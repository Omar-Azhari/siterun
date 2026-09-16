import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  error?: string
  disabled?: boolean
  /** Called once all boxes are filled. */
  onComplete?: (code: string) => void
  autoFocus?: boolean
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  error,
  disabled,
  onComplete,
  autoFocus,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus()

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length)
    onChange(clean)
    if (clean.length === length) onComplete?.(clean)
  }

  const setDigit = (i: number, d: string) => {
    const arr = [...digits]
    arr[i] = d
    // Keep the code contiguous: drop anything after the first gap.
    const joined = arr.join('')
    const firstGap = arr.findIndex((c) => c === '')
    commit(firstGap === -1 ? joined : arr.slice(0, firstGap).join(''))
  }

  const onInput = (i: number, raw: string) => {
    const incoming = raw.replace(/\D/g, '')
    if (!incoming) return
    if (incoming.length > 1) {
      // Autofill / fast typing: spread from this box.
      commit((value.slice(0, i) + incoming).slice(0, length))
      focus(i + incoming.length)
      return
    }
    setDigit(i, incoming)
    focus(i + 1)
  }

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[i]) {
        commit(value.slice(0, i))
      } else if (i > 0) {
        commit(value.slice(0, i - 1))
        focus(i - 1)
      }
    } else if (e.key === 'ArrowLeft') focus(i - 1)
    else if (e.key === 'ArrowRight') focus(i + 1)
  }

  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!text) return
    commit(text)
    focus(text.length)
  }

  return (
    <div>
      <div role="group" aria-label="Verification code" className="flex justify-between gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            value={d}
            onChange={(e) => onInput(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            autoFocus={autoFocus && i === 0}
            disabled={disabled}
            aria-label={`Digit ${i + 1} of ${length}`}
            aria-invalid={error ? true : undefined}
            className={cn(
              'h-14 w-full min-w-0 rounded-[10px] border bg-input text-center font-display text-2xl font-semibold text-fg transition-colors outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50',
              error ? 'border-danger' : d ? 'border-[#4a6480]' : 'border-line-input',
            )}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-center text-xs text-[#f87171]">
          {error}
        </p>
      )}
    </div>
  )
}
