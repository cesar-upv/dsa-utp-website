import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
// toast import removed to avoid conflict with exported wrapper


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
  '#0ea5e9', // sky-500
  '#22c55e', // green-500
  '#f59e0b', // amber-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
  '#ef4444', // red-500
  '#14b8a6', // teal-500
  '#6366f1', // indigo-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
  '#d946ef', // fuchsia-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f43f5e', // rose-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#eab308', // yellow-500
  '#78716c', // stone-500 (neutral option)
  '#64748b', // slate-500
  '#c026d3', // fuchsia-600
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

import { toast as sonnerToast, type ExternalToast } from 'sonner'
import { playSound } from './sound'

export const toast = {
  ...sonnerToast,
  success: (message: string | React.ReactNode, data?: ExternalToast) => {
    playSound('success')
    return sonnerToast.success(message, data)
  },
  error: (message: string | React.ReactNode, data?: ExternalToast) => {
    playSound('error')
    return sonnerToast.error(message, data)
  },
  info: (message: string | React.ReactNode, data?: ExternalToast) => {
    playSound('info')
    return sonnerToast.info(message, data)
  },
  warning: (message: string | React.ReactNode, data?: ExternalToast) => {
    playSound('info')
    return sonnerToast.warning(message, data)
  },
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
