import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, PlusSquare } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from '@/lib/utils'
import { z } from 'zod'

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
import { TURNOS_LABEL } from '@/constants/time'
import { useTimetableStore } from '@/store/useTimetableStore'
import type { Grupo } from '@/types/models'
import { suggestIdFromName } from '@/lib/utils'

const groupSchema = z.object({
  id: z.string().min(2, 'ID requerido'),
  nombre: z.string().min(3, 'Nombre requerido'),
  cuatrimestre: z.number().min(1).max(12),
  turno: z.enum(['matutino', 'vespertino']),
})

type GrupoForm = z.infer<typeof groupSchema>

export function GroupForm() {
  const grupos = useTimetableStore((state) => state.grupos)
  const addGrupo = useTimetableStore((state) => state.addGrupo)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GrupoForm>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      turno: 'matutino',
      cuatrimestre: 1,
    },
  })
  const nombreValue = watch('nombre')
  const idValue = watch('id')
  const lastSuggestion = useRef<string>('')

  useEffect(() => {
    const suggestion = suggestIdFromName(nombreValue ?? '')
    if (!suggestion) return
    const manualBeforeSuggestion = idValue && !lastSuggestion.current
    const isManualChange =
      idValue && lastSuggestion.current && idValue !== lastSuggestion.current
    if (manualBeforeSuggestion || isManualChange) return
    setValue('id', suggestion, { shouldValidate: false, shouldDirty: false })
    lastSuggestion.current = suggestion
  }, [nombreValue, idValue, setValue])

  useEffect(() => {
    if (!nombreValue?.trim()) {
      setValue('id', '', { shouldValidate: false, shouldDirty: false })
      lastSuggestion.current = ''
    }
  }, [nombreValue, setValue])

  const onSubmit = (values: GrupoForm) => {
    const normalizedId = values.id.trim()
    const normalizedName = values.nombre.trim()
    const exists = grupos.some(
      (g) => g.id.toLowerCase() === normalizedId.toLowerCase()
    )
    if (exists) {
      toast.error('Ya existe un grupo con ese ID')
      return
    }
    const nameExists = grupos.some(
      (g) => g.nombre.toLowerCase() === normalizedName.toLowerCase()
    )
    if (nameExists) {
      toast.error('Ya existe un grupo con ese nombre')
      return
    }
    addGrupo({
      ...values,
      id: normalizedId,
      nombre: normalizedName,
    } as Grupo)
    toast.success('Grupo agregado')
    reset({ turno: 'matutino', cuatrimestre: 1, nombre: '', id: '' })
  }

  return (
    <Card>
      <CardTitle className="flex items-center gap-3">
        <Building2 className="h-5 w-5 text-primary" />
        Nuevo grupo
      </CardTitle>
      <CardDescription>
        Crea grupos con cuatrimestre y turno (matutino/vespertino).
      </CardDescription>
      <CardContent className="mt-4">
        <form
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="space-y-2">
            <Label htmlFor="group-id">ID</Label>
            <Input id="group-id" placeholder="ITI-1A" {...register('id')} />
            {errors.id && (
              <p className="text-sm text-destructive">{errors.id.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-name">Nombre</Label>
            <Input id="group-name" placeholder="ITI 1A" {...register('nombre')} />
            {errors.nombre && (
              <p className="text-sm text-destructive">
                {errors.nombre.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-term">Cuatrimestre</Label>
            <Input
              id="group-term"
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
            <Label htmlFor="turno">Turno</Label>
            <Select id="turno" {...register('turno')}>
              <option value="matutino">{TURNOS_LABEL.matutino}</option>
              <option value="vespertino">{TURNOS_LABEL.vespertino}</option>
            </Select>
            {errors.turno && (
              <p className="text-sm text-destructive">{errors.turno.message}</p>
            )}
          </div>
          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <Button type="submit" className="w-full md:w-auto">
              <PlusSquare className="h-4 w-4" />
              Crear grupo
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
