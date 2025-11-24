import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import { sampleGrupos, sampleMaterias, sampleProfesores } from '@/data/sampleData'
import {
  type AvailabilityState,
  type DayId,
  type Grupo,
  type HorarioPorGrupo,
  type Materia,
  type Profesor,
} from '@/types/models'

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
      ultimaEjecucion: undefined,
      addMateria: (materia) =>
        set((state) => ({
          materias: [...state.materias, materia],
        })),
      updateMateria: (id, data) =>
        set((state) => ({
          materias: state.materias.map((m) =>
            m.id === id ? { ...m, ...data } : m
          ),
        })),
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
        set((state) => ({
          grupos: state.grupos.map((g) =>
            g.id === id ? { ...g, ...data } : g
          ),
        })),
      removeGrupo: (id) =>
        set((state) => ({
          grupos: state.grupos.filter((g) => g.id !== id),
          horarios: state.horarios.filter((h) => h.grupoId !== id),
        })),
      addProfesor: (profesor) =>
        set((state) => ({
          profesores: [...state.profesores, profesor],
        })),
      updateProfesor: (id, data) =>
        set((state) => ({
          profesores: state.profesores.map((p) =>
            p.id === id ? { ...p, ...data } : p
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
          ultimaEjecucion: meta,
        })),
      resetDatos: () =>
        set(() => ({
          materias: sampleMaterias,
          grupos: sampleGrupos,
          profesores: sampleProfesores,
          horarios: [],
          ultimaEjecucion: undefined,
        })),
      importMaterias: (materias) =>
        set((state) => {
          const materiasFiltradas = materias.filter(
            (materia) => materia.id && materia.nombre
          )
          const ids = new Set(state.materias.map((m) => m.id))
          const nuevas = materiasFiltradas
            .filter((m) => !ids.has(m.id))
            .map((m, idx) => ({
              ...m,
              color: m.color ?? palette[(state.materias.length + idx) % palette.length],
            }))
          return {
            materias: [...state.materias, ...nuevas],
          }
        }),
    }),
    {
      name: 'utp-timetable-store',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
)
