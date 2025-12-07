import { AlertCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { DAYS, TIME_SLOTS } from '@/constants/time'
import { cn } from '@/lib/utils'
import type { DayId, Profesor } from '@/types/models'

const stateStyles = {
  blank:
    'bg-muted/60 text-muted-foreground border border-dashed border-border/70 hover:border-primary/60',
  available:
    'bg-success/20 text-success border border-success/30 hover:border-success',
  blocked:
    'bg-destructive/15 text-destructive border border-destructive/30 hover:border-destructive',
}

export function AvailabilityGrid({
  profesor,
  onToggle,
}: {
  profesor?: Profesor
  onToggle: (day: DayId, slotId: string) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{
    dayIdx: number
    slotIdx: number
  } | null>(null)
  const [currentHover, setCurrentHover] = useState<{
    dayIdx: number
    slotIdx: number
  } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  // Listen for mouseup globally to handle release outside the grid
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging && selectionStart && currentHover) {
        // Apply changes
        applySelection(selectionStart, currentHover)
      }
      setIsDragging(false)
      setSelectionStart(null)
      setCurrentHover(null)
    }

    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp)
    }
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, selectionStart, currentHover])

  const applySelection = (
    start: { dayIdx: number; slotIdx: number },
    end: { dayIdx: number; slotIdx: number }
  ) => {
    if (!profesor) return

    const minDay = Math.min(start.dayIdx, end.dayIdx)
    const maxDay = Math.max(start.dayIdx, end.dayIdx)
    const minSlot = Math.min(start.slotIdx, end.slotIdx)
    const maxSlot = Math.max(start.slotIdx, end.slotIdx)

    for (let d = minDay; d <= maxDay; d++) {
      for (let s = minSlot; s <= maxSlot; s++) {
        const slot = TIME_SLOTS[s]
        if (slot.isReceso) continue
        const day = DAYS[d]
        onToggle(day.id, slot.id)
      }
    }
  }

  const handleMouseDown = (dayIdx: number, slotIdx: number) => {
    setIsDragging(true)
    setSelectionStart({ dayIdx, slotIdx })
    setCurrentHover({ dayIdx, slotIdx })
  }

  const handleMouseEnter = (dayIdx: number, slotIdx: number) => {
    if (isDragging) {
      setCurrentHover({ dayIdx, slotIdx })
    }
  }

  const isSelected = (dayIdx: number, slotIdx: number) => {
    if (!isDragging || !selectionStart || !currentHover) return false
    const minDay = Math.min(selectionStart.dayIdx, currentHover.dayIdx)
    const maxDay = Math.max(selectionStart.dayIdx, currentHover.dayIdx)
    const minSlot = Math.min(selectionStart.slotIdx, currentHover.slotIdx)
    const maxSlot = Math.max(selectionStart.slotIdx, currentHover.slotIdx)

    return (
      dayIdx >= minDay &&
      dayIdx <= maxDay &&
      slotIdx >= minSlot &&
      slotIdx <= maxSlot
    )
  }

  if (!profesor) {
    return (
      <Card>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          Disponibilidad
        </CardTitle>
        <CardDescription>
          Selecciona un profesor para editar la matriz día/hora.
        </CardDescription>
        <CardContent className="mt-4 text-sm text-muted-foreground">
          El tablero soporta 3 estados: blanco (sin disponibilidad), verde
          (disponible) y rojo (bloqueado).
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardTitle>Disponibilidad de {profesor.nombre}</CardTitle>
      <CardDescription>
        Arrastra para seleccionar múltiples celdas. Click para alternar.
      </CardDescription>
      <CardContent className="mt-4 space-y-4">
        {/* Prevent text selection during drag */}
        <div
          ref={containerRef}
          className={cn('overflow-x-auto', isDragging && 'select-none')}
        >
          <div className="min-w-[640px]">
            <div
              className="grid grid-cols-6 gap-[1px] rounded-xl border border-border/70 bg-border/70 p-[1px]"
              onMouseLeave={() => {
                // Optional: handle mouse leave if needed, but window 'mouseup' is robust enough
              }}
            >
              <div className="rounded-lg bg-muted/60 p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Horario
              </div>
              {DAYS.map((day) => (
                <div
                  key={day.id}
                  className="rounded-lg bg-muted/60 p-3 text-sm font-semibold"
                >
                  {day.label}
                </div>
              ))}
              {TIME_SLOTS.map((slot, sIdx) =>
                slot.isReceso ? (
                  <div
                    key={slot.id}
                    className="col-span-6 flex items-center justify-center rounded-lg bg-warning/10 p-3 text-xs font-semibold uppercase tracking-wide text-warning"
                  >
                    {slot.label} • RECESO
                  </div>
                ) : (
                  <div key={slot.id} className="contents">
                    <div className="flex items-center rounded-lg bg-muted/40 px-3 text-xs font-medium">
                      {slot.label}
                    </div>
                    {DAYS.map((day, dIdx) => {
                      const state =
                        profesor.disponibilidad[day.id]?.[slot.id] ?? 'blank'
                      const selected = isSelected(dIdx, sIdx)

                      return (
                        <div
                          key={`${day.id}-${slot.id}`}
                          onMouseDown={(e) => {
                            if (e.button !== 0) return
                            handleMouseDown(dIdx, sIdx)
                          }}
                          onMouseEnter={() => handleMouseEnter(dIdx, sIdx)}
                          className={cn(
                            'relative h-12 w-full cursor-pointer rounded-lg text-xs font-semibold transition-all duration-75 flex items-center justify-center',
                            stateStyles[state],
                            selected && 'z-10'
                          )}
                        >
                          {/* Selection Overlay */}
                          {selected && (
                            <div className="absolute inset-0 rounded-lg bg-primary/20 ring-2 ring-primary ring-inset" />
                          )}
                          <span className="relative z-20">
                            {state === 'blank'
                              ? '—'
                              : state === 'available'
                                ? 'Disponible'
                                : 'Bloqueado'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">Blanco = sin disponibilidad</Badge>
          <Badge variant="success">Verde = disponible</Badge>
          <Badge variant="warning">Rojo = bloqueado</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
