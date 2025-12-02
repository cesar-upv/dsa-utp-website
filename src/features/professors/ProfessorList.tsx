import { Clock3, Sparkles, Trash } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { showUndoToast } from '@/lib/utils'
import { useTimetableStore } from '@/store/useTimetableStore'
import type { Profesor } from '@/types/models'

export function ProfessorList() {
  const profesores = useTimetableStore((state) => state.profesores)
  const materias = useTimetableStore((state) => state.materias)
  const setCompetencias = useTimetableStore((state) => state.setCompetencias)
  const removeProfesor = useTimetableStore((state) => state.removeProfesor)
  const [pendingDelete, setPendingDelete] = useState<Profesor | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 6
  const [searchByProf, setSearchByProf] = useState<Record<string, string>>({})

  const pageData = useMemo(
    () => profesores.slice((page - 1) * pageSize, page * pageSize),
    [page, profesores]
  )
  const totalPages = Math.max(1, Math.ceil(profesores.length / pageSize))
  const start = profesores.length ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, profesores.length)

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

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
        <div className="grid gap-3 md:grid-cols-2">
          {pageData.map((prof) => (
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
                  Max {Math.min(prof.maxHoras, 15)} h/sem
                </div>
              </div>

              <div className="mt-3 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Asignadas
                  </p>
                  <div className="flex flex-wrap gap-2 items-center">
                    {prof.competencias.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Aún no asignas materias a este profesor.
                      </p>
                    ) : (
                      materias
                        .filter((m) => prof.competencias.includes(m.id))
                        .map((materia) => (
                          <Badge
                            key={`${prof.id}-${materia.id}`}
                            variant="success"
                            className="cursor-pointer"
                            onClick={() => toggleCompetencia(prof.id, materia.id)}
                          >
                            {materia.nombre}
                          </Badge>
                        ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Agregar materias
                  </p>
                  <Input
                    placeholder="Busca por nombre o ID..."
                    value={searchByProf[prof.id] ?? ''}
                    onChange={(e) =>
                      setSearchByProf((prev) => ({
                        ...prev,
                        [prof.id]: e.target.value,
                      }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const disponibles = materias.filter(
                        (m) => !prof.competencias.includes(m.id)
                      )
                      const termRaw = searchByProf[prof.id] ?? ''
                      const term = termRaw.trim().toLowerCase()
                      if (!disponibles.length) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            Todas las materias ya están asignadas.
                          </p>
                        )
                      }
                      if (!term) return null
                      const filtradas = disponibles.filter(
                        (m) =>
                          m.nombre.toLowerCase().includes(term) ||
                          m.id.toLowerCase().includes(term)
                      )
                      if (!filtradas.length) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            Sin resultados para “{termRaw.trim()}”.
                          </p>
                        )
                      }
                      return filtradas.slice(0, 8).map((materia) => (
                        <Badge
                          key={`${prof.id}-add-${materia.id}`}
                          variant="outline"
                          className="cursor-pointer px-3 py-1"
                          onClick={() => toggleCompetencia(prof.id, materia.id)}
                        >
                          {materia.nombre}
                        </Badge>
                      ))
                    })()}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingDelete(prof)}
                >
                  <Trash className="h-4 w-4 text-destructive" />
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
        {profesores.length ? (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {start}-{end} de {profesores.length} · Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        ) : null}
        <ConfirmDialog
          open={Boolean(pendingDelete)}
          title="Eliminar profesor"
          description={`¿Seguro que deseas eliminar ${pendingDelete?.nombre}?`}
          confirmLabel="Eliminar"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            if (!pendingDelete) return
            const deleted = pendingDelete
            removeProfesor(deleted.id)
            setPendingDelete(null)
            showUndoToast({
              title: 'Profesor eliminado',
              description: `${deleted.nombre} se eliminó.`,
            })
          }}
        />
      </CardContent>
    </Card>
  )
}
