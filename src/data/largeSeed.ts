import { DAYS, TIME_SLOTS } from '@/constants/time'
import { generateDisponibilidad } from '@/lib/utils'
import type { Grupo, Materia, Profesor } from '@/types/models'

export type SeedData = {
  materias: Materia[]
  grupos: Grupo[]
  profesores: Profesor[]
}

const materiaNames = [
  'Algoritmos',
  'Bases de Datos',
  'Redes',
  'Sistemas Operativos',
  'Ingeniería de Software',
  'Cómputo en la Nube',
  'Seguridad',
  'IA Aplicada',
  'Análisis de Datos',
  'UX/UI',
  'Compiladores',
  'Optimización',
  'Arquitectura de Software',
  'Probabilidad',
  'Modelado de Datos',
  'Ingeniería de Requisitos',
]

const palette = [
  '#2563eb',
  '#0ea5e9',
  '#22c55e',
  '#f59e0b',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
  '#ef4444',
  '#0f766e',
]

const createDisponibilidadAmplia = () => {
  const disp = generateDisponibilidad()
  DAYS.forEach((day) => {
    TIME_SLOTS.forEach((slot) => {
      disp[day.id][slot.id] = 'available'
    })
  })
  return disp
}

export function buildLargeSeed(): SeedData {
  const materias: Materia[] = []
  const grupos: Grupo[] = []

  for (let cuatrimestre = 1; cuatrimestre <= 10; cuatrimestre += 1) {
    for (let groupIdx = 0; groupIdx < 2; groupIdx += 1) {
      grupos.push({
        id: `ITI-${cuatrimestre}${groupIdx === 0 ? 'A' : 'B'}`,
        nombre: `ITI ${cuatrimestre}${groupIdx === 0 ? 'A' : 'B'}`,
        cuatrimestre,
        turno: groupIdx === 0 ? 'matutino' : 'vespertino',
      })
    }

    const materiasPorCuatri = 7
    for (let mIdx = 0; mIdx < materiasPorCuatri; mIdx += 1) {
      const baseName = materiaNames[(cuatrimestre + mIdx) % materiaNames.length]
      materias.push({
        id: `Q${cuatrimestre}-M${mIdx + 1}`,
        nombre: `${baseName} Q${cuatrimestre}`,
        cuatrimestre,
        horasSemana: 2 + (mIdx % 2), // 2 o 3 horas
        color: palette[(materias.length + mIdx) % palette.length],
      })
    }
  }

  const profesores: Profesor[] = Array.from({ length: 28 }).map(
    (_item, idx) => ({
      id: `PR-${String(idx + 1).padStart(2, '0')}`,
      nombre: `Profesor ${idx + 1}`,
      competencias: [],
      maxHoras: 15,
      disponibilidad: createDisponibilidadAmplia(),
    })
  )

  materias.forEach((materia, idx) => {
    const profIndices = [
      idx % profesores.length,
      (idx + 5) % profesores.length,
      (idx + 10) % profesores.length,
    ]
    profIndices.forEach((profIdx) => {
      const competencias = new Set(profesores[profIdx].competencias)
      competencias.add(materia.id)
      profesores[profIdx].competencias = Array.from(competencias)
    })
  })

  return { materias, grupos, profesores }
}

export const largeSeed: SeedData = buildLargeSeed()
