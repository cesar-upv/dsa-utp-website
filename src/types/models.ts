import { z } from 'zod'

export const DAY_IDS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const
export type DayId = (typeof DAY_IDS)[number]

export const TURNOS = ['matutino', 'vespertino'] as const
export type Turno = (typeof TURNOS)[number]

export const availabilityStateSchema = z.enum(['blank', 'available', 'blocked'])
export type AvailabilityState = z.infer<typeof availabilityStateSchema>

export const timeSlotSchema = z.object({
  id: z.string(),
  label: z.string(),
  start: z.string(),
  end: z.string(),
})
export type TimeSlot = z.infer<typeof timeSlotSchema>

export const materiaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  cuatrimestre: z.number().int().min(1),
  horasSemana: z.number().int().min(1).max(12),
  color: z.string().optional(),
})
export type Materia = z.infer<typeof materiaSchema>

export const grupoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  cuatrimestre: z.number().int().min(1),
  turno: z.enum(TURNOS),
})
export type Grupo = z.infer<typeof grupoSchema>

export const disponibilidadSchema = z.record(
  z.enum(DAY_IDS),
  z.record(z.string(), availabilityStateSchema)
)
export type Disponibilidad = z.infer<typeof disponibilidadSchema>

export const profesorSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  competencias: z.array(z.string()).default([]),
  maxHoras: z.number().int().min(1).max(15).default(15),
  disponibilidad: disponibilidadSchema,
})
export type Profesor = z.infer<typeof profesorSchema>

export const bloqueMateriaSchema = z.object({
  id: z.string(),
  grupoId: z.string(),
  materiaId: z.string(),
  profesorId: z.string(),
  dia: z.enum(DAY_IDS),
  slotId: z.string(),
  duracion: z.number().int().min(1),
  huecoPrevio: z.boolean().default(false),
  esContinuo: z.boolean().default(true),
})
export type BloqueMateria = z.infer<typeof bloqueMateriaSchema>

export const horarioPorGrupoSchema = z.object({
  grupoId: z.string(),
  bloques: z.array(bloqueMateriaSchema),
  metricas: z.object({
    huecos: z.number().int(),
    violacionesDuras: z.number().int(),
    softScore: z.number(),
  }),
})
export type HorarioPorGrupo = z.infer<typeof horarioPorGrupoSchema>

export const solverInputSchema = z.object({
  planDeEstudios: z.array(materiaSchema),
  grupos: z.array(grupoSchema),
  profesores: z.array(profesorSchema),
  meta: z
    .object({
      creadoEn: z.string().optional(),
      fuente: z.string().optional(),
    })
    .optional(),
})
export type SolverInput = z.infer<typeof solverInputSchema>

export const solverOutputSchema = z.object({
  status: z.enum(['ok', 'infeasible', 'error']),
  horarios: z.array(horarioPorGrupoSchema),
  resumen: z.object({
    mensaje: z.string(),
    tiempoMs: z.number(),
    violacionesDuras: z.number().int(),
    huecosPromedio: z.number(),
  }),
  advertencias: z.array(z.string()).optional(),
})
export type SolverOutput = z.infer<typeof solverOutputSchema>
