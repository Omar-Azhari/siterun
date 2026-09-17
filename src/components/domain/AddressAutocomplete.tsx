import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { cn } from '@/lib/cn'
import { searchAddress, type Place } from '@/lib/geo'
import { Input } from '@/components/ui'

interface AddressAutocompleteProps {
  label?: string
  hideLabel?: boolean
  value: string
  onChange: (text: string) => void
  onSelect: (place: Place) => void
  placeholder?: string
  error?: string
  leftIcon?: ReactNode
  className?: string
  near?: { lat: number; lng: number }
}

/** Combobox with debounced Photon lookups (falls back to a local suburb list offline). */
export function AddressAutocomplete({
  label = 'Address',
  hideLabel,
  value,
  onChange,
  onSelect,
  placeholder,
  error,
  leftIcon,
  className,
  near,
}: AddressAutocompleteProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Place[]>([])
  const [active, setActive] = useState(-1)
  const [loading, setLoading] = useState(false)
  const typed = useRef(false)

  useEffect(() => {
    if (!typed.current || value.trim().length < 2) {
      setItems([])
      return
    }
    const ctrl = new AbortController()
    const t = window.setTimeout(async () => {
      setLoading(true)
      try {
        const res = await searchAddress(value, near, ctrl.signal)
        setItems(res)
        setActive(-1)
        setOpen(true)
      } catch {
        // aborted
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      window.clearTimeout(t)
      ctrl.abort()
    }
  }, [value, near])

  const choose = (p: Place) => {
    typed.current = false
    onSelect(p)
    setOpen(false)
    setItems([])
  }

  return (
    <div className={cn('relative', className)}>
      <Input
        label={label}
        hideLabel={hideLabel}
        value={value}
        placeholder={placeholder}
        error={error}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        leftIcon={leftIcon ?? <MapPin strokeWidth={1.75} />}
        rightSlot={
          loading ? <Loader2 className="size-4 animate-spin text-muted" aria-hidden /> : undefined
        }
        onChange={(e) => {
          typed.current = true
          onChange(e.target.value)
        }}
        onFocus={() => items.length && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || !items.length) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => (a + 1) % items.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => (a <= 0 ? items.length - 1 : a - 1))
          } else if (e.key === 'Enter' && active >= 0) {
            e.preventDefault()
            const p = items[active]
            if (p) choose(p)
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%-10px)] z-30 max-h-64 overflow-auto rounded-xl border border-line-input bg-card py-1 shadow-2xl shadow-black/50"
        >
          {items.map((p, i) => (
            <li
              key={`${p.label}-${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(p)
              }}
              className={cn(
                'flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-sm',
                i === active ? 'bg-primary/20' : 'hover:bg-white/5',
              )}
            >
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>{p.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
