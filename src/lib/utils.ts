import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { DAYS, TIME_SLOTS } from '@/constants/time'
import {
  type AvailabilityState,
  type Disponibilidad,
  type DayId,
  type Materia,
} from '@/types/models'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const palette = [
  '#0ea5e9',
  '#22c55e',
  '#f59e0b',
  '#a855f7',
  '#ec4899',
  '#ef4444',
  '#14b8a6',
  '#6366f1',
]

export function colorForMateria(materia: Materia, index: number) {
  if (materia.color) return materia.color
  return palette[index % palette.length]
}

export function generateDisponibilidad(): Disponibilidad {
  return DAYS.reduce<Disponibilidad>((acc, day) => {
    acc[day.id as DayId] = TIME_SLOTS.reduce<Record<string, AvailabilityState>>(
      (slots, slot) => {
        slots[slot.id] = 'blank'
        return slots
      },
      {}
    )
    return acc
  }, {} as Disponibilidad)
}

export function humanizeDay(day: DayId) {
  switch (day) {
    case 'mon':
      return 'Lunes'
    case 'tue':
      return 'Martes'
    case 'wed':
      return 'Miércoles'
    case 'thu':
      return 'Jueves'
    case 'fri':
      return 'Viernes'
    default:
      return day
  }
}

export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}
