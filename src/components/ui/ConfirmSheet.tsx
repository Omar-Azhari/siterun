import type { ReactNode } from 'react'
import { BottomSheet } from './BottomSheet'
import { Button } from './Button'

interface ConfirmSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  confirmLabel: string
  onConfirm: () => void
  loading?: boolean
  /** Destructive actions get the red button. */
  danger?: boolean
}

/** In-app replacement for window.confirm. */
export function ConfirmSheet({
  open,
  onClose,
  title,
  children,
  confirmLabel,
  onConfirm,
  loading,
  danger = true,
}: ConfirmSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="md" block onClick={onClose}>
            Keep
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            size="md"
            block
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {children && <div className="text-[15px] text-[#dae4ef]">{children}</div>}
    </BottomSheet>
  )
}
