import * as React from 'react'

import { cn } from '@/lib/utils'

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => (
    <label className="inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        ref={ref}
        {...props}
      />
      <span
        className={cn(
          'relative h-6 w-11 rounded-full bg-muted transition peer-checked:bg-primary',
          className
        )}
      >
        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  )
)
Switch.displayName = 'Switch'
