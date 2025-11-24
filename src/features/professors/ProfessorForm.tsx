import { zodResolver } from '@hookform/resolvers/zod'
import { BadgePlus, ClipboardList, Timer } from 'lucide-react'
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
import { generateDisponibilidad } from '@/lib/utils'
import { useTimetableStore } from '@/store/useTimetableStore'
import type { Profesor } from '@/types/models'

const professorSchema = z.object({
  id: z.string().min(2, 'ID requerido'),
  nombre: z.string().min(3, 'Nombre requerido'),
  maxHoras: z.number().min(4).max(20),
  competencias: z.array(z.string()),
})

type ProfesorForm = z.infer<typeof professorSchema>

export function ProfessorForm() {
  const materias = useTimetableStore((state) => state.materias)
  const profesores = useTimetableStore((state) => state.profesores)
  const addProfesor = useTimetableStore((state) => state.addProfesor)

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
      maxHoras: 12,
    },
  })

  const selected = watch('competencias')

  const onSubmit = (values: ProfesorForm) => {
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
    reset({ competencias: [], maxHoras: 12, id: '', nombre: '' })
  }

  const toggleCompetencia = (materiaId: string) => {
    const has = selected?.includes(materiaId)
    const updated = has
      ? selected.filter((id) => id !== materiaId)
      : [...(selected ?? []), materiaId]
    setValue('competencias', updated)
  }

  return (
    <Card>
      <CardTitle className="flex items-center gap-3">
        <BadgePlus className="h-5 w-5 text-primary" />
        Profesores y competencias
      </CardTitle>
      <CardDescription>
        Define profesores, su carga máxima y materias que puede impartir.
      </CardDescription>
      <CardContent className="mt-4">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prof-id">ID</Label>
              <Input id="prof-id" placeholder="PZ-01" {...register('id')} />
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
                Horas máx/semana
              </Label>
              <Input
                id="max-horas"
                type="number"
                min={4}
                max={20}
                {...register('maxHoras', { valueAsNumber: true })}
              />
              {errors.maxHoras && (
                <p className="text-sm text-destructive">
                  {errors.maxHoras.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Competencias por materia
            </Label>
            <div className="flex flex-wrap gap-2">
              {materias.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Primero agrega materias en el módulo de datos.
                </p>
              )}
              {materias.map((materia) => {
                const isActive = selected?.includes(materia.id)
                return (
                  <Badge
                    key={materia.id}
                    variant={isActive ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleCompetencia(materia.id)}
                  >
                    {materia.nombre}
                  </Badge>
                )
              })}
            </div>
            {errors.competencias && (
              <p className="text-sm text-destructive">
                {errors.competencias.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end">
            <Button type="submit">Guardar profesor</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
