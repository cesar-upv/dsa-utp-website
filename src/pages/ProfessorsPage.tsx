import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, UsersRound, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { AvailabilityGrid } from '@/features/professors/AvailabilityGrid'
import { ProfessorForm } from '@/features/professors/ProfessorForm'
import { ProfessorList } from '@/features/professors/ProfessorList'
import { useTimetableStore } from '@/store/useTimetableStore'
import type { DayId } from '@/types/models'
import { Input } from '@/components/ui/input'

export default function ProfessorsPage() {
  const profesores = useTimetableStore((state) => state.profesores)
  const materias = useTimetableStore((state) => state.materias)
  const toggleDisponibilidad = useTimetableStore(
    (state) => state.toggleDisponibilidad
  )
  const [selectedId, setSelectedId] = useState<string | undefined>(
    profesores[0]?.id
  )
  const [searchProfesor, setSearchProfesor] = useState('')
  const [selectedMateriaFiltro, setSelectedMateriaFiltro] = useState('')
  const profesoresFiltrados = useMemo(() => {
    const term = searchProfesor.trim().toLowerCase()
    if (!term) return profesores
    return profesores.filter(
      (p) =>
        p.nombre.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term)
    )
  }, [profesores, searchProfesor])

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
  useEffect(() => {
    if (!profesoresFiltrados.length) {
      setSelectedId(undefined)
      return
    }
    if (!selectedId || !profesoresFiltrados.some((p) => p.id === selectedId)) {
      setSelectedId(profesoresFiltrados[0].id)
    }
  }, [profesoresFiltrados, selectedId])

  const handleToggle = (day: DayId, slotId: string) => {
    if (!selectedId) return
    toggleDisponibilidad(selectedId, day, slotId)
  }

  const profesoresPorMateria = useMemo(() => {
    if (!selectedMateriaFiltro) return []
    return profesores.filter((p) =>
      p.competencias.includes(selectedMateriaFiltro)
    )
  }, [profesores, selectedMateriaFiltro])

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
          <Card>
            <CardTitle>Filtrar profesores por materia</CardTitle>
            <CardDescription>
              Selecciona una materia para listar quién puede impartirla.
            </CardDescription>
            <CardContent className="mt-4 space-y-3">
              <Label htmlFor="filtro-materia">Materia</Label>
              <Select
                id="filtro-materia"
                value={selectedMateriaFiltro}
                onChange={(e) => setSelectedMateriaFiltro(e.target.value)}
              >
                <option value="">Elige una materia</option>
                {materias.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} ({m.id})
                  </option>
                ))}
              </Select>
              {selectedMateriaFiltro ? (
                <div className="flex flex-wrap gap-2">
                  {profesoresPorMateria.length ? (
                    profesoresPorMateria.map((p) => (
                      <Badge
                        key={`${selectedMateriaFiltro}-${p.id}`}
                        variant="outline"
                        className="px-3 py-1"
                      >
                        {p.nombre} ({p.id})
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Ningún profesor imparte esta materia aún.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Selecciona una materia para ver quién la imparte.
                </p>
              )}
            </CardContent>
          </Card>
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
              <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Search className="h-4 w-4 text-muted-foreground" />
                Buscar profesor
              </Label>
              <Input
                placeholder="Buscar por nombre o ID..."
                value={searchProfesor}
                onChange={(e) => setSearchProfesor(e.target.value)}
              />
              <Label htmlFor="prof-selector">Profesor</Label>
              <Select
                id="prof-selector"
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={profesoresFiltrados.length === 0}
              >
                {profesoresFiltrados.length === 0 ? (
                  <option value="">Agrega un profesor</option>
                ) : (
                  profesoresFiltrados.map((prof) => (
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
