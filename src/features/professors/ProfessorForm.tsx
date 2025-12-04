import { zodResolver } from '@hookform/resolvers/zod'
import { BadgePlus, ClipboardList, Timer } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { generateDisponibilidad, normalizeForSearch, suggestIdFromName } from '@/lib/utils'
import { useTimetableStore } from '@/store/useTimetableStore'
import type { Profesor } from '@/types/models'

const professorSchema = z.object({
  id: z.string().min(2, 'ID requerido'),
  nombre: z.string().min(3, 'Nombre requerido'),
  maxHoras: z.number().min(4).max(15),
  competencias: z.array(z.string()),
})

type ProfesorForm = z.infer<typeof professorSchema>

export function ProfessorForm({
  professorToEdit,
  onSuccess,
  onCancel,
}: {
  professorToEdit?: Profesor
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const materias = useTimetableStore((state) => state.materias)
  const profesores = useTimetableStore((state) => state.profesores)
  const addProfesor = useTimetableStore((state) => state.addProfesor)
  const updateProfesor = useTimetableStore((state) => state.updateProfesor)
  const [search, setSearch] = useState('')
  const [selectValue, setSelectValue] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfesorForm>({
    resolver: zodResolver(professorSchema),
    defaultValues: {
      competencias: [],
      maxHoras: 15,
      id: '',
      nombre: '',
    },
  })

  // Reset form when professorToEdit changes
  useEffect(() => {
    if (professorToEdit) {
      reset({
        id: professorToEdit.id,
        nombre: professorToEdit.nombre,
        maxHoras: professorToEdit.maxHoras,
        competencias: professorToEdit.competencias,
      })
    } else {
      reset({
        id: '',
        nombre: '',
        maxHoras: 15,
        competencias: [],
      })
    }
  }, [professorToEdit, reset])

  const selected = watch('competencias')
  const nombreValue = watch('nombre')
  const idValue = watch('id')
  const lastSuggestion = useRef<string>('')
  const disponibles = useMemo(
    () => materias.filter((m) => !(selected ?? []).includes(m.id)),
    [materias, selected]
  )
  const filtradas = useMemo(() => {
    const term = normalizeForSearch(search)
    if (!term) return []
    return disponibles.filter(
      (m) =>
        normalizeForSearch(m.nombre).includes(term) ||
        normalizeForSearch(m.id).includes(term)
    )
  }, [disponibles, search])

  const onSubmit = (values: ProfesorForm) => {
    if (professorToEdit) {
      // Edit mode
      if (values.id !== professorToEdit.id && profesores.some((p) => p.id === values.id)) {
        toast.error('Ya existe otro profesor con ese ID')
        return
      }
      updateProfesor(professorToEdit.id, values)
      toast.success('Profesor actualizado')
      onSuccess?.()
    } else {
      // Create mode
      if (profesores.some((p) => p.id === values.id)) {
        toast.error('Ya existe un profesor con ese ID')
        return
      }
      const profesor: Profesor = {
        ...values,
        disponibilidad: generateDisponibilidad(),
      }
      addProfesor(profesor)
      toast.success('Profesor creado')
      reset({ competencias: [], maxHoras: 15, id: '', nombre: '' })
    }
    setSearch('')
    setSelectValue('')
  }

  useEffect(() => {
    if (professorToEdit) return // Don't auto-generate ID in edit mode
    const suggestion = suggestIdFromName(nombreValue ?? '')
    if (!suggestion) return
    const manualBeforeSuggestion = idValue && !lastSuggestion.current
    const isManualChange =
      idValue && lastSuggestion.current && idValue !== lastSuggestion.current
    if (manualBeforeSuggestion || isManualChange) return
    setValue('id', suggestion, { shouldValidate: false, shouldDirty: false })
    lastSuggestion.current = suggestion
  }, [nombreValue, idValue, setValue, professorToEdit])

  useEffect(() => {
    if (professorToEdit) return
    if (!nombreValue?.trim()) {
      setValue('id', '', { shouldValidate: false, shouldDirty: false })
      lastSuggestion.current = ''
    }
  }, [nombreValue, setValue, professorToEdit])

  const toggleCompetencia = (materiaId: string) => {
    const has = selected?.includes(materiaId)
    const updated = has
      ? selected.filter((id) => id !== materiaId)
      : [...(selected ?? []), materiaId]
    setValue('competencias', updated)
  }

  return (
    <Card className={professorToEdit ? 'border-0 shadow-none' : ''}>
      {!professorToEdit && (
        <>
          <CardTitle className="flex items-center gap-3">
            <BadgePlus className="h-5 w-5 text-primary" />
            Registrar profesores
          </CardTitle>
          <CardDescription>
            Define profesores, su carga máxima y materias que puede impartir.
          </CardDescription>
        </>
      )}
      <CardContent className={professorToEdit ? 'p-0' : 'mt-4'}>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prof-id">ID</Label>
              <Input
                id="prof-id"
                placeholder="PZ-01"
                {...register('id')}
                // Disable ID editing if it's risky, or allow it if store handles it.
                // For now, let's allow it but user must be careful.
                // Actually, let's disable it for safety as requested by my thought process.
                disabled={!!professorToEdit}
              />
              {errors.id && (
                <p className="text-sm text-destructive">{errors.id.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="prof-name">Nombre</Label>
              <Input
                id="prof-name"
                placeholder="Dra. Paola Zamora"
                {...register('nombre')}
              />
              {errors.nombre && (
                <p className="text-sm text-destructive">
                  {errors.nombre.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-horas" className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                Horas máx/semana (tope 15h)
              </Label>
              <Input
                id="max-horas"
                type="number"
                min={4}
                max={15}
                {...register('maxHoras', { valueAsNumber: true })}
              />
              {errors.maxHoras && (
                <p className="text-sm text-destructive">
                  {errors.maxHoras.message}
                </p>
              )}
            </div>
          </div>

          {!professorToEdit && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                Competencias por materia
              </Label>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Asignadas
                </p>
                <div className="flex flex-wrap gap-2">
                  {selected?.length ? (
                    materias
                      .filter((m) => selected?.includes(m.id))
                      .map((materia) => (
                        <Badge
                          key={materia.id}
                          variant="success"
                          className="cursor-pointer"
                          onClick={() => toggleCompetencia(materia.id)}
                        >
                          {materia.nombre}
                        </Badge>
                      ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aún no asignas materias a este profesor.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Buscar y agregar
                </p>
                <Input
                  placeholder="Busca por nombre o ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {filtradas.length === 0 && search.trim() ? (
                    <p className="text-sm text-muted-foreground">
                      Sin resultados para “{search.trim()}”.
                    </p>
                  ) : (
                    filtradas.slice(0, 8).map((materia) => (
                      <Badge
                        key={`buscar-${materia.id}`}
                        variant="outline"
                        className="cursor-pointer px-3 py-1"
                        onClick={() => {
                          toggleCompetencia(materia.id)
                          setSearch('')
                        }}
                      >
                        {materia.nombre}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Selección rápida
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    value={selectValue}
                    onChange={(e) => {
                      const value = e.target.value
                      setSelectValue(value)
                      if (value) {
                        toggleCompetencia(value)
                        setSelectValue('')
                      }
                    }}
                    disabled={disponibles.length === 0}
                  >
                    <option value="">Elige una materia</option>
                    {disponibles.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} ({m.id})
                      </option>
                    ))}
                  </Select>
                </div>
                {disponibles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Todas las materias ya están asignadas.
                  </p>
                ) : null}
              </div>

              {errors.competencias && (
                <p className="text-sm text-destructive">
                  {errors.competencias.message}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit">
              {professorToEdit ? 'Guardar cambios' : 'Guardar profesor'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
