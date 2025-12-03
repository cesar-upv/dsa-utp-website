import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import { sampleGrupos, sampleMaterias, sampleProfesores } from '@/data/sampleData'
import { DAYS } from '@/constants/time'
import {
  type AvailabilityState,
  type DayId,
  type Grupo,
  type HorarioPorGrupo,
  type Materia,
  type Profesor,
  type Disponibilidad,
} from '@/types/models'
import { generateDisponibilidad } from '@/lib/utils'

type RunMetadata = {
  mensaje: string
  tiempoMs: number
  warnings?: string[]
  status: 'ok' | 'infeasible' | 'error'
}

type TimetableStore = {
  materias: Materia[]
  grupos: Grupo[]
  profesores: Profesor[]
  horarios: HorarioPorGrupo[]
  warningsLog: string[]
  ultimaEjecucion?: RunMetadata
  addMateria: (materia: Materia) => void
  updateMateria: (id: string, data: Partial<Materia>) => void
  removeMateria: (id: string) => void
  addGrupo: (grupo: Grupo) => void
  updateGrupo: (id: string, data: Partial<Grupo>) => void
  removeGrupo: (id: string) => void
  addProfesor: (profesor: Profesor) => void
  updateProfesor: (id: string, data: Partial<Profesor>) => void
  removeProfesor: (id: string) => void
  toggleDisponibilidad: (id: string, day: DayId, slotId: string) => void
  setDisponibilidad: (
    id: string,
    day: DayId,
    slotId: string,
    value: AvailabilityState
  ) => void
  setCompetencias: (id: string, competencias: string[]) => void
  setHorarios: (horarios: HorarioPorGrupo[], meta: RunMetadata) => void
  resetDatos: () => void
  importMaterias: (materias: Materia[]) => void
  importGrupos: (grupos: Grupo[]) => void
  importProfesores: (profesores: Profesor[]) => void
  setAllData: (data: {
    materias: Materia[]
    grupos: Grupo[]
    profesores: Profesor[]
  }) => void
  setWarnings: (warnings: string[]) => void
  appendWarnings: (warnings: string[]) => void
}

const nextState = (current: AvailabilityState): AvailabilityState => {
  if (current === 'blank') return 'available'
  if (current === 'available') return 'blocked'
  return 'blank'
}

const palette = ['#2563eb', '#0ea5e9', '#22c55e', '#f59e0b', '#a855f7']

export const useTimetableStore = create<TimetableStore>()(
  persist(
    (set, _get) => ({
      materias: sampleMaterias,
      grupos: sampleGrupos,
      profesores: sampleProfesores,
      horarios: [],
      warningsLog: [],
      ultimaEjecucion: undefined,
      addMateria: (materia) =>
        set((state) => ({
          materias: [...state.materias, materia],
        })),
      updateMateria: (id, data) =>
        set((state) => {
          const nextId = data.id ?? id
          const materias = state.materias.map((m) =>
            m.id === id ? { ...m, ...data } : m
          )
          const profesores =
            nextId === id
              ? state.profesores
              : state.profesores.map((prof) => ({
                  ...prof,
                  competencias: prof.competencias.map((c) =>
                    c === id ? nextId : c
                  ),
                }))
          const horarios =
            nextId === id
              ? state.horarios
              : state.horarios.map((h) => ({
                  ...h,
                  bloques: h.bloques.map((b) =>
                    b.materiaId === id ? { ...b, materiaId: nextId } : b
                  ),
                }))
          return { materias, profesores, horarios }
        }),
      removeMateria: (id) =>
        set((state) => ({
          materias: state.materias.filter((m) => m.id !== id),
          profesores: state.profesores.map((prof) => ({
            ...prof,
            competencias: prof.competencias.filter((c) => c !== id),
          })),
        })),
      addGrupo: (grupo) =>
        set((state) => ({
          grupos: [...state.grupos, grupo],
        })),
      updateGrupo: (id, data) =>
        set((state) => {
          const nextId = data.id ?? id
          const grupos = state.grupos.map((g) =>
            g.id === id ? { ...g, ...data } : g
          )
          const horarios =
            nextId === id
              ? state.horarios
              : state.horarios.map((h) => {
                  const sameGroup = h.grupoId === id
                  return {
                    ...h,
                    grupoId: sameGroup ? nextId : h.grupoId,
                    bloques: h.bloques.map((b) =>
                      b.grupoId === id ? { ...b, grupoId: nextId } : b
                    ),
                  }
                })
          return { grupos, horarios }
        }),
      removeGrupo: (id) =>
        set((state) => ({
          grupos: state.grupos.filter((g) => g.id !== id),
          horarios: state.horarios.filter((h) => h.grupoId !== id),
        })),
      addProfesor: (profesor) =>
        set((state) => ({
          profesores: [
            ...state.profesores,
            { ...profesor, maxHoras: Math.min(profesor.maxHoras, 15) },
          ],
        })),
      updateProfesor: (id, data) =>
        set((state) => ({
          profesores: state.profesores.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...data,
                  maxHoras:
                    data.maxHoras !== undefined
                      ? Math.min(data.maxHoras, 15)
                      : p.maxHoras,
                }
              : p
          ),
        })),
      removeProfesor: (id) =>
        set((state) => ({
          profesores: state.profesores.filter((p) => p.id !== id),
          horarios: state.horarios.map((h) => ({
            ...h,
            bloques: h.bloques.filter((b) => b.profesorId !== id),
          })),
        })),
      toggleDisponibilidad: (id, day, slotId) =>
        set((state) => ({
          profesores: state.profesores.map((p) =>
            p.id === id
              ? {
                  ...p,
                  disponibilidad: {
                    ...p.disponibilidad,
                    [day]: {
                      ...p.disponibilidad[day],
                      [slotId]: nextState(p.disponibilidad[day][slotId]),
                    },
                  },
                }
              : p
          ),
        })),
      setDisponibilidad: (id, day, slotId, value) =>
        set((state) => ({
          profesores: state.profesores.map((p) =>
            p.id === id
              ? {
                  ...p,
                  disponibilidad: {
                    ...p.disponibilidad,
                    [day]: {
                      ...p.disponibilidad[day],
                      [slotId]: value,
                    },
                  },
                }
              : p
          ),
        })),
      setCompetencias: (id, competencias) =>
        set((state) => ({
          profesores: state.profesores.map((p) =>
            p.id === id ? { ...p, competencias } : p
          ),
        })),
      setHorarios: (horarios, meta) =>
        set(() => ({
          horarios,
          warningsLog: meta.warnings ?? [],
          ultimaEjecucion: meta,
        })),
      resetDatos: () =>
        set(() => ({
          materias: sampleMaterias,
          grupos: sampleGrupos,
          profesores: sampleProfesores,
          horarios: [],
          warningsLog: [],
          ultimaEjecucion: undefined,
        })),
      importMaterias: (materias) =>
        set(() => {
          const materiasFiltradas = materias
            .filter((materia) => materia.id && materia.nombre)
            .map((m, idx) => ({
              ...m,
              color: m.color ?? palette[idx % palette.length],
            }))
          return {
            materias: materiasFiltradas,
            horarios: [],
            warningsLog: [],
            ultimaEjecucion: undefined,
          }
        }),
      importGrupos: (grupos) =>
        set(() => {
          const nuevos = grupos.filter((g) => g.id && g.nombre)
          return {
            grupos: nuevos,
            horarios: [],
            warningsLog: [],
            ultimaEjecucion: undefined,
          }
        }),
      importProfesores: (profesores) =>
        set(() => {
          const disponibles = profesores
            .filter((p) => p.id && p.nombre && p.disponibilidad)
            .map((p) => {
              const base = generateDisponibilidad()
              const disponibilidadNormalizada = DAYS.reduce((acc, day) => {
                acc[day.id] = {
                  ...base[day.id],
                  ...(p.disponibilidad?.[day.id] ?? {}),
                }
                return acc
              }, {} as Disponibilidad)
              return {
                ...p,
                maxHoras: Math.min(p.maxHoras ?? 15, 15),
                disponibilidad: disponibilidadNormalizada,
              }
            })
          return {
            profesores: disponibles,
            horarios: [],
            warningsLog: [],
            ultimaEjecucion: undefined,
          }
        }),
      setAllData: (data) =>
        set(() => ({
          materias: data.materias,
          grupos: data.grupos,
          profesores: data.profesores.map((p) => ({
            ...p,
            maxHoras: Math.min(p.maxHoras ?? 15, 15),
          })),
          horarios: [],
          warningsLog: [],
          ultimaEjecucion: undefined,
        })),
      setWarnings: (warnings) =>
        set(() => ({
          warningsLog: [...warnings],
        })),
      appendWarnings: (warnings) =>
        set((state) => {
          const merged = [
            ...state.warningsLog,
            ...warnings.filter((w) => !state.warningsLog.includes(w)),
          ]
          return { warningsLog: merged }
        }),
    }),
    {
      name: 'utp-timetable-store',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
)
