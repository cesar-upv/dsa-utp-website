import { Clock3, Sparkles, Trash } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { useTimetableStore } from '@/store/useTimetableStore'

export function ProfessorList() {
  const profesores = useTimetableStore((state) => state.profesores)
  const materias = useTimetableStore((state) => state.materias)
  const setCompetencias = useTimetableStore((state) => state.setCompetencias)
  const removeProfesor = useTimetableStore((state) => state.removeProfesor)

  const toggleCompetencia = (profId: string, materiaId: string) => {
    const prof = profesores.find((p) => p.id === profId)
    if (!prof) return
    const has = prof.competencias.includes(materiaId)
    const updated = has
      ? prof.competencias.filter((c) => c !== materiaId)
      : [...prof.competencias, materiaId]
    setCompetencias(profId, updated)
  }

  return (
    <Card>
      <CardTitle className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-primary" />
        Profesores creados
      </CardTitle>
      <CardDescription>
        Asigna o retira competencias con un clic. La disponibilidad se edita en
        la tabla inferior.
      </CardDescription>
      <CardContent className="mt-4 space-y-3">
        {profesores.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aún no tienes profesores registrados.
          </p>
        )}
        {profesores.map((prof) => (
          <div
            key={prof.id}
            className="rounded-xl border border-border/80 bg-white/70 p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold leading-tight">
                  {prof.nombre}
                </p>
                <p className="text-xs text-muted-foreground">{prof.id}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                Max {prof.maxHoras} h/sem
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Competencias
              </p>
              <div className="flex flex-wrap gap-2">
                {materias.map((materia) => {
                  const active = prof.competencias.includes(materia.id)
                  return (
                    <Badge
                      key={`${prof.id}-${materia.id}`}
                      variant={active ? 'success' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleCompetencia(prof.id, materia.id)}
                    >
                      {materia.nombre}
                    </Badge>
                  )
                })}
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeProfesor(prof.id)}
              >
                <Trash className="h-4 w-4 text-destructive" />
                Eliminar
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
