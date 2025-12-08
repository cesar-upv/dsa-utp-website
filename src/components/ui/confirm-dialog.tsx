
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-in fade-in-0">
      <Card className="w-full max-w-md shadow-ambient animate-in fade-in-0 zoom-in-95 duration-150">
        <div className="p-6 pb-0">
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-2 text-base">
            {description}
          </CardDescription>
        </div>
        <CardContent className="mt-4 flex flex-wrap items-center justify-end gap-3 pt-2 space-y-0">
          <Button
            variant="secondary"
            className="min-w-[140px] h-11 justify-center bg-muted text-foreground hover:bg-muted/80 leading-none"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            className="min-w-[140px] h-11 justify-center leading-none"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </CardContent>
      </Card>
    </div>,
    document.body
  )
}
