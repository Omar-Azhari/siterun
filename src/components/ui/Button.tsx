import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
export type ButtonSize = 'lg' | 'md' | 'sm'

const base =
  'relative inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors select-none disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-hover',
  // Dark fill with blue outline (board 04 "Schedule Return", board 09 "Plan Dispatch").
  secondary: 'border border-primary bg-card text-white hover:bg-selected',
  // Neutral outline (board 01 "Continue with Google").
  outline: 'border border-line-input bg-card text-white hover:bg-input',
  danger: 'border border-danger bg-transparent text-danger hover:bg-danger/10',
  ghost: 'text-primary hover:bg-primary/10',
}

const sizes: Record<ButtonSize, string> = {
  lg: 'h-[54px] px-5 text-base',
  md: 'h-12 px-4 text-[15px]',
  sm: 'h-10 px-3 text-sm',
}

interface CommonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Stretches to full width (default for `lg`). */
  block?: boolean
  /** Right-edge arrow, as on every primary action in the mockups. */
  arrow?: boolean
  leftIcon?: ReactNode
  loading?: boolean
  children: ReactNode
}

function Inner({ arrow, leftIcon, loading, children }: CommonProps) {
  return (
    <>
      {loading ? <Loader2 aria-hidden className="size-5 animate-spin" /> : leftIcon}
      <span>{children}</span>
      {arrow && <ArrowRight aria-hidden className="absolute right-4 size-5" strokeWidth={1.75} />}
    </>
  )
}

const classesFor = ({ variant = 'primary', size = 'lg', block, arrow }: CommonProps) =>
  cn(base, variants[variant], sizes[size], (block ?? size === 'lg') && 'w-full', arrow && 'px-12')

export type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    size,
    block,
    arrow,
    leftIcon,
    loading,
    children,
    className,
    type = 'button',
    disabled,
    ...rest
  },
  ref,
) {
  const common = { variant, size, block, arrow, leftIcon, loading, children }
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(classesFor(common), className)}
      {...rest}
    >
      <Inner {...common} />
    </button>
  )
})

export type ButtonLinkProps = CommonProps & Omit<LinkProps, 'children'> & { disabled?: boolean }

export function ButtonLink({
  variant,
  size,
  block,
  arrow,
  leftIcon,
  loading,
  children,
  className,
  disabled,
  ...rest
}: ButtonLinkProps) {
  const common = { variant, size, block, arrow, leftIcon, loading, children }
  return (
    <Link
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      className={cn(classesFor(common), className)}
      {...rest}
    >
      <Inner {...common} />
    </Link>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
}

/** 44×44 tap target around a small icon. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/5 disabled:opacity-45',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})
