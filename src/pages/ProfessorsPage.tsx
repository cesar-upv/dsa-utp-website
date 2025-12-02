import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, UsersRound } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { AvailabilityGrid } from '@/features/professors/AvailabilityGrid'
import { ProfessorForm } from '@/features/professors/ProfessorForm'
import { ProfessorList } from '@/features/professors/ProfessorList'
import { useTimetableStore } from '@/store/useTimetableStore'
import type { DayId } from '@/types/models'

export default function ProfessorsPage() {
  const profesores = useTimetableStore((state) => state.profesores)
  const toggleDisponibilidad = useTimetableStore(
    (state) => state.toggleDisponibilidad
  )
  const [selectedId, setSelectedId] = useState<string | undefined>(
    profesores[0]?.id
  )

  useEffect(() => {
    if (profesores.length && !selectedId) {
      setSelectedId(profesores[0].id)
    }
    if (selectedId && !profesores.some((p) => p.id === selectedId)) {
      setSelectedId(profesores[0]?.id)
    }
  }, [profesores, selectedId])

  const selectedProfesor = useMemo(
    () => profesores.find((p) => p.id === selectedId),
    [profesores, selectedId]
  )

  const handleToggle = (day: DayId, slotId: string) => {
    if (!selectedId) return
    toggleDisponibilidad(selectedId, day, slotId)
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-white/70 p-6 shadow-ambient md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-primary">
            Módulo 2
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            Profesores y disponibilidad
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            CRUD de profesores, asignación de competencias y matriz de
            disponibilidad día/hora con tres estados.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Contigüidad de bloques</Badge>
            <Badge variant="outline">Carga máxima 15h</Badge>
            <Badge variant="default">Disponibilidad 3 estados</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 text-success" />
          Los cambios se guardan en localStorage.
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <ProfessorForm />
        </div>
        <div className="space-y-4">
          <Card>
            <CardTitle className="flex items-center gap-3">
              <UsersRound className="h-5 w-5 text-primary" />
              Selecciona profesor
            </CardTitle>
            <CardDescription>
              El grid interactivo alterna blanco → verde → rojo en cada click.
            </CardDescription>
            <CardContent className="mt-4 space-y-3">
              <Label htmlFor="prof-selector">Profesor</Label>
              <Select
                id="prof-selector"
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={profesores.length === 0}
              >
                {profesores.length === 0 ? (
                  <option value="">Agrega un profesor</option>
                ) : (
                  profesores.map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.nombre} ({prof.id})
                    </option>
                  ))
                )}
              </Select>
              <p className="text-xs text-muted-foreground">
                Edita disponibilidad y compártela con el solver en formato JSON.
              </p>
            </CardContent>
          </Card>

          <AvailabilityGrid profesor={selectedProfesor} onToggle={handleToggle} />
        </div>
      </div>

      <ProfessorList />
    </div>
  )
}
