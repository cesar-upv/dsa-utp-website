import { AlertCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { DAYS, TIME_SLOTS } from '@/constants/time'
import { cn } from '@/lib/utils'
import type { DayId, Profesor } from '@/types/models'

const stateStyles = {
  blank:
    'bg-white text-muted-foreground border border-dashed border-border/70 hover:border-primary/60',
  available:
    'bg-success/15 text-success border border-success/20 hover:border-success',
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
        Click para alternar entre blanco → verde → rojo por franja.
      </CardDescription>
      <CardContent className="mt-4 space-y-4">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-6 gap-[1px] rounded-xl border border-border/70 bg-border/70 p-[1px]">
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
              {TIME_SLOTS.map((slot) => (
                <div key={slot.id} className="contents">
                  <div className="flex items-center rounded-lg bg-muted/40 px-3 text-sm font-medium">
                    {slot.label}
                  </div>
                  {DAYS.map((day) => {
                    const state =
                      profesor.disponibilidad[day.id]?.[slot.id] ?? 'blank'
                    return (
                      <button
                        key={`${day.id}-${slot.id}`}
                        type="button"
                        onClick={() => onToggle(day.id as DayId, slot.id)}
                        className={cn(
                          'h-12 w-full rounded-lg text-xs font-semibold transition',
                          stateStyles[state]
                        )}
                      >
                        {state === 'blank'
                          ? '—'
                          : state === 'available'
                            ? 'Disponible'
                            : 'Bloqueado'}
                      </button>
                    )
                  })}
                </div>
              ))}
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
