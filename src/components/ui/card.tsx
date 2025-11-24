import * as React from 'react'

import { cn } from '@/lib/utils'

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'glass-card rounded-2xl border p-6 shadow-ambient transition-transform duration-200 hover:translate-y-[-2px]',
      className
    )}
    {...props}
  />
))
Card.displayName = 'Card'

const CardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-2 mb-4', className)}
    {...props}
  />
)

const CardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn('text-lg font-semibold tracking-tight', className)}
    {...props}
  />
)

const CardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-muted-foreground', className)} {...props} />
)

const CardContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('space-y-3', className)} {...props} />
)

const CardFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('pt-4', className)} {...props} />
)

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
