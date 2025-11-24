import { TIME_SLOTS } from '@/constants/time'
import { generateDisponibilidad } from '@/lib/utils'
import type { Grupo, Materia, Profesor } from '@/types/models'

export const sampleMaterias: Materia[] = [
  {
    id: 'ALG1',
    nombre: 'Algoritmos I',
    cuatrimestre: 1,
    horasSemana: 4,
    color: '#2563eb',
  },
  {
    id: 'MATD',
    nombre: 'Matemáticas Discretas',
    cuatrimestre: 1,
    horasSemana: 3,
    color: '#f59e0b',
  },
  {
    id: 'PE',
    nombre: 'Programación Estructurada',
    cuatrimestre: 2,
    horasSemana: 4,
    color: '#0ea5e9',
  },
  {
    id: 'BD',
    nombre: 'Bases de Datos',
    cuatrimestre: 3,
    horasSemana: 4,
    color: '#22c55e',
  },
  {
    id: 'FIS',
    nombre: 'Física Aplicada',
    cuatrimestre: 3,
    horasSemana: 3,
    color: '#ec4899',
  },
]

export const sampleGrupos: Grupo[] = [
  { id: 'ITI-1A', nombre: 'ITI 1A', cuatrimestre: 1, turno: 'matutino' },
  { id: 'ITI-2B', nombre: 'ITI 2B', cuatrimestre: 2, turno: 'vespertino' },
  { id: 'ITI-3A', nombre: 'ITI 3A', cuatrimestre: 3, turno: 'matutino' },
]

const baseDisponibilidad = () => generateDisponibilidad()

const disponibilidadVerde = (dias: string[], slotIds: string[]) => {
  const dispo = baseDisponibilidad()
  dias.forEach((dia) => {
    slotIds.forEach((slot) => {
      dispo[dia as keyof typeof dispo][slot] = 'available'
    })
  })
  return dispo
}

export const sampleProfesores: Profesor[] = [
  {
    id: 'PZ-01',
    nombre: 'Dra. Paola Zamora',
    competencias: ['ALG1', 'MATD'],
    maxHoras: 12,
    disponibilidad: disponibilidadVerde(
      ['mon', 'tue', 'wed'],
      [TIME_SLOTS[0].id, TIME_SLOTS[1].id, TIME_SLOTS[2].id]
    ),
  },
  {
    id: 'LM-04',
    nombre: 'Ing. Luis Montiel',
    competencias: ['PE', 'BD', 'ALG1'],
    maxHoras: 15,
    disponibilidad: disponibilidadVerde(
      ['wed', 'thu', 'fri'],
      [TIME_SLOTS[3].id, TIME_SLOTS[4].id, TIME_SLOTS[5].id]
    ),
  },
  {
    id: 'AR-02',
    nombre: 'Mtra. Ana Ríos',
    competencias: ['BD', 'FIS', 'MATD'],
    maxHoras: 10,
    disponibilidad: disponibilidadVerde(
      ['mon', 'tue', 'thu', 'wed'],
      [TIME_SLOTS[1].id, TIME_SLOTS[2].id, TIME_SLOTS[3].id]
    ),
  },
  {
    id: 'CJ-03',
    nombre: 'Dr. Carlos Juárez',
    competencias: ['ALG1', 'MATD', 'PE', 'BD', 'FIS'],
    maxHoras: 12,
    disponibilidad: disponibilidadVerde(
      ['mon', 'tue', 'wed', 'thu', 'fri'],
      [TIME_SLOTS[5].id, TIME_SLOTS[6].id, TIME_SLOTS[7].id]
    ),
  },
]
