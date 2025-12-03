import { zodResolver } from '@hookform/resolvers/zod'
import { PaintBucket, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTimetableStore } from '@/store/useTimetableStore'
import type { Materia } from '@/types/models'
import { suggestIdFromName } from '@/lib/utils'

const materiaSchema = z.object({
  id: z.string().min(2, 'ID requerido'),
  nombre: z.string().min(3, 'Nombre requerido'),
  cuatrimestre: z.number().min(1).max(12),
  horasSemana: z.number().min(1).max(15),
  color: z.string().optional(),
})

type MateriaForm = z.infer<typeof materiaSchema>

const colorCandidates = ['#2563eb', '#0ea5e9', '#22c55e', '#f97316', '#a855f7']

export function CurriculumForm() {
  const addMateria = useTimetableStore((state) => state.addMateria)
  const materias = useTimetableStore((state) => state.materias)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MateriaForm>({
    resolver: zodResolver(materiaSchema),
    defaultValues: {
      cuatrimestre: 1,
      horasSemana: 4,
      color: colorCandidates[Math.floor(Math.random() * colorCandidates.length)],
    },
  })

  const nombreValue = watch('nombre')
  const idValue = watch('id')
  const lastSuggestion = useRef<string>('')
  const suggestedId = useMemo(() => suggestIdFromName(nombreValue ?? ''), [nombreValue])

  useEffect(() => {
    if (!suggestedId) return
    const manualBeforeSuggestion = idValue && !lastSuggestion.current
    const isManualChange =
      idValue && lastSuggestion.current && idValue !== lastSuggestion.current
    if (manualBeforeSuggestion || isManualChange) return
    setValue('id', suggestedId, { shouldValidate: false, shouldDirty: false })
    lastSuggestion.current = suggestedId
  }, [suggestedId, setValue, idValue])

  useEffect(() => {
    if (!nombreValue?.trim()) {
      setValue('id', '', { shouldValidate: false, shouldDirty: false })
      lastSuggestion.current = ''
    }
  }, [nombreValue, setValue])

  const onSubmit = (values: MateriaForm) => {
    const normalizedId = values.id.trim()
    const normalizedName = values.nombre.trim()
    const idExists = materias.some(
      (m) => m.id.toLowerCase() === normalizedId.toLowerCase()
    )
    const nameExists = materias.some(
      (m) => m.nombre.toLowerCase() === normalizedName.toLowerCase()
    )
    if (idExists) {
      toast.error('Ya existe una materia con ese ID')
      return
    }
    if (nameExists) {
      toast.error('Ya existe una materia con ese nombre')
      return
    }
    const nueva: Materia = {
      ...values,
      id: normalizedId,
      nombre: normalizedName,
      color: values.color || colorCandidates[0],
    }
    addMateria(nueva)
    toast.success('Materia agregada al plan de estudios')
  }

  return (
    <Card>
      <CardTitle className="flex items-center gap-3">
        <Plus className="h-5 w-5 text-primary" />
        Nueva materia
      </CardTitle>
      <CardDescription>
        Define materias con su carga semanal. Las validaciones se ejecutan en la
        UI antes de guardar.
      </CardDescription>
      <CardContent className="mt-4">
        <form
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              placeholder="Algoritmos I"
              {...register('nombre')}
            />
            {errors.nombre && (
              <p className="text-sm text-destructive">
                {errors.nombre.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="id">ID</Label>
            <Input id="id" placeholder="ALG1" {...register('id')} />
            {errors.id && (
              <p className="text-sm text-destructive">{errors.id.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cuatrimestre">Cuatrimestre</Label>
            <Input
              id="cuatrimestre"
              type="number"
              min={1}
              max={12}
              {...register('cuatrimestre', { valueAsNumber: true })}
            />
            {errors.cuatrimestre && (
              <p className="text-sm text-destructive">
                {errors.cuatrimestre.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="horasSemana">Horas por semana</Label>
            <Input
              id="horasSemana"
              type="number"
              min={1}
              max={15}
              {...register('horasSemana', { valueAsNumber: true })}
            />
            {errors.horasSemana && (
              <p className="text-sm text-destructive">
                {errors.horasSemana.message}
              </p>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="color" className="flex items-center gap-2">
              <PaintBucket className="h-4 w-4 text-muted-foreground" />
              Color
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="color"
                type="color"
                className="w-20 cursor-pointer p-1"
                {...register('color')}
              />
              <p className="text-sm text-muted-foreground">
                Se utiliza en el tablero tipo “tetris” para distinguir materias.
              </p>
            </div>
          </div>
          <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
            <Button type="submit" className="w-full md:w-auto">
              Guardar materia
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
