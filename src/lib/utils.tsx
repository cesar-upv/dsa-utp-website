import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { toast } from 'sonner'

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
        slots[slot.id] = slot.isReceso ? 'blocked' : 'blank'
        return slots
      },
      {}
    )
    return acc
  }, {} as Disponibilidad)
}

export function suggestIdFromName(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return ''
  const tokens = trimmed
    .split(/[\s_]+/)
    .map((w) => w.replace(/[^A-Za-z0-9]+/g, ''))
    .filter(Boolean)
  const numbers =
    (
      tokens
        .map((t) => t.match(/\d+/g)?.[0])
        .filter((n): n is string => Boolean(n))[0] ?? ''
    )
  const letterTokens = tokens
    .map((t) => t.replace(/\d+/g, ''))
    .filter(Boolean)
  if (!letterTokens.length) return numbers.toUpperCase()
  const base =
    letterTokens.length === 1
      ? letterTokens[0].slice(0, 3)
      : letterTokens.map((w) => w[0]).join('')
  const combined = numbers ? `${base}${numbers}` : base
  return combined.toUpperCase()
}

export function normalizeForSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
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

export function showUndoToast({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  toast.success(title, { description, duration: 3500 })
}
