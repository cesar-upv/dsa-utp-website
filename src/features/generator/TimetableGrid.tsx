import { CalendarRange } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { DAYS, TIME_SLOTS } from '@/constants/time'
import { cn, colorForMateria } from '@/lib/utils'
import { useTimetableStore } from '@/store/useTimetableStore'

export function TimetableGrid({ groupId }: { groupId: string }) {
  const horarios = useTimetableStore((state) => state.horarios)
  const materias = useTimetableStore((state) => state.materias)
  const profesores = useTimetableStore((state) => state.profesores)

  const horario = horarios.find((h) => h.grupoId === groupId)
  const materiaIdsEnHorario = new Set(
    horario?.bloques.map((b) => b.materiaId) ?? []
  )
  const materiasDelGrupo = materias.filter((m) =>
    materiaIdsEnHorario.has(m.id)
  )
  const profesoresPorMateria: Record<string, string[]> = {}
  horario?.bloques.forEach((b) => {
    if (profesoresPorMateria[b.materiaId]?.length) return
    const profName = profesores.find((p) => p.id === b.profesorId)?.nombre
    if (profName) {
      profesoresPorMateria[b.materiaId] = [profName]
    }
  })
  const blockIndex =
    horario?.bloques.reduce<Record<string, typeof horario.bloques[0]>>(
      (acc, bloque) => {
        acc[`${bloque.dia}-${bloque.slotId}`] = bloque
        return acc
      },
      {}
    ) ?? {}

  return (
    <Card>
      <CardTitle className="flex items-center gap-3">
        <CalendarRange className="h-5 w-5 text-primary" />
        Horario semanal
      </CardTitle>
      <CardDescription>
        Visualización tipo “tetris” con bloques coloreados por materia.
      </CardDescription>
      <CardContent className="mt-4 space-y-4">
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-6 gap-[1px] rounded-xl border border-border/70 bg-border/60 p-[1px]">
              <div className="rounded-lg bg-muted/60 p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Hora
              </div>
              {DAYS.map((day) => (
                <div
                  key={day.id}
                  className="rounded-lg bg-muted/60 p-3 text-sm font-semibold"
                >
                  {day.label}
                </div>
              ))}
              {TIME_SLOTS.map((slot) =>
                slot.isReceso ? (
                  <div
                    key={slot.id}
                    className="col-span-6 flex items-center justify-center rounded-lg bg-warning/10 p-3 text-xs font-semibold uppercase tracking-wide text-warning"
                  >
                    {slot.label} • RECESO
                  </div>
                ) : (
                  <div key={slot.id} className="contents">
                    <div className="flex items-center rounded-lg bg-muted/40 px-3 text-sm font-medium">
                      {slot.label}
                    </div>
                    {DAYS.map((day) => {
                      const block = blockIndex[`${day.id}-${slot.id}`]
                      const materia = materias.find(
                        (m) => m.id === block?.materiaId
                      )
                      const profesor = profesores.find(
                        (p) => p.id === block?.profesorId
                      )
                      const color = materia
                        ? colorForMateria(
                            materia,
                            materias.findIndex((m) => m.id === materia.id)
                          )
                        : undefined
                      const tooltip =
                        materia && profesor
                          ? `${materia.nombre} • ${profesor.nombre}`
                          : undefined
                      return (
                        <div
                          key={`${day.id}-${slot.id}`}
                        className={cn(
                          'relative h-16 rounded-lg border border-border/60 bg-card p-2 text-xs',
                          block
                            ? 'shadow-ambient'
                            : 'text-muted-foreground/70'
                        )}
                          style={
                            block && color
                              ? { backgroundColor: `${color}22` }
                              : undefined
                          }
                          title={tooltip}
                        >
                          {block && materia && profesor ? (
                            <div className="flex h-full flex-col justify-between rounded-lg bg-background/70 p-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold leading-tight line-clamp-2">
                                  {materia.nombre}
                                </span>
                                <span
                                  className="h-3 w-3 rounded-full border"
                                  style={{ backgroundColor: color }}
                                  title={materia.nombre}
                                />
                              </div>
                              <div
                                className="text-[11px] text-muted-foreground leading-tight line-clamp-1"
                                title={profesor.nombre}
                              >
                                {profesor.nombre}
                              </div>
                            </div>
                          ) : (
                            <span>Libre</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {materiasDelGrupo.length ? (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {materiasDelGrupo.map((materia, idx) => (
              <Badge
                key={materia.id}
                variant="outline"
                className="flex items-center gap-2"
                style={{
                  borderColor: colorForMateria(materia, idx),
                  color: colorForMateria(materia, idx),
                }}
                title={
                  profesoresPorMateria[materia.id]?.length
                    ? `Profesor(es): ${profesoresPorMateria[materia.id].join(', ')}`
                    : undefined
                }
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: colorForMateria(materia, idx) }}
                />
                <span className="flex flex-col items-start gap-0 leading-tight">
                  <span>{materia.nombre}</span>
                  {profesoresPorMateria[materia.id]?.length ? (
                    <span className="text-[11px] text-muted-foreground">
                      {profesoresPorMateria[materia.id].join(', ')}
                    </span>
                  ) : null}
                </span>
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
