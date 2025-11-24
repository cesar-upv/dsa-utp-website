import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary/10 text-primary ring-1 ring-primary/15',
        secondary:
          'border-transparent bg-secondary/15 text-secondary-foreground ring-1 ring-secondary/20',
        success:
          'border-transparent bg-success/15 text-success ring-1 ring-success/25',
        destructive:
          'border-transparent bg-destructive/15 text-destructive ring-1 ring-destructive/20',
        outline: 'text-foreground bg-transparent border-input',
        warning:
          'border-transparent bg-warning/15 text-warning ring-1 ring-warning/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
