import { AmexLogo, MastercardLogo, VisaLogo } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { PaymentMethod } from '@/data/types'

export function BrandMark({
  brand,
  className,
}: {
  brand: PaymentMethod['brand']
  className?: string
}) {
  const Logo = brand === 'visa' ? VisaLogo : brand === 'mastercard' ? MastercardLogo : AmexLogo
  return (
    <span
      className={cn(
        'flex h-10 w-14 items-center justify-center rounded-md',
        brand === 'visa' ? 'bg-[#1a4fd6]' : 'bg-white',
        className,
      )}
    >
      <Logo
        className={
          brand === 'visa' ? 'h-6 w-12 [&_rect]:fill-transparent [&_text]:fill-white' : 'h-6 w-10'
        }
      />
    </span>
  )
}
