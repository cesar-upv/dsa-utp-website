import type { DayId, TimeSlot } from '@/types/models'

export const DAYS: { id: DayId; label: string }[] = [
  { id: 'mon', label: 'Lunes' },
  { id: 'tue', label: 'Martes' },
  { id: 'wed', label: 'Miércoles' },
  { id: 'thu', label: 'Jueves' },
  { id: 'fri', label: 'Viernes' },
]

export const TIME_SLOTS: TimeSlot[] = [
  { id: 's1', label: '07:00 - 08:00', start: '07:00', end: '08:00' },
  { id: 's2', label: '08:00 - 09:00', start: '08:00', end: '09:00' },
  { id: 's3', label: '09:00 - 10:00', start: '09:00', end: '10:00' },
  { id: 's4', label: '10:00 - 11:00', start: '10:00', end: '11:00' },
  { id: 's5', label: '11:00 - 12:00', start: '11:00', end: '12:00' },
  { id: 's6', label: '12:00 - 13:00', start: '12:00', end: '13:00' },
  { id: 's7', label: '13:00 - 14:00', start: '13:00', end: '14:00' },
  { id: 's8', label: '14:00 - 15:00', start: '14:00', end: '15:00' },
]

export const TURNOS_LABEL: Record<string, string> = {
  matutino: 'Matutino',
  vespertino: 'Vespertino',
}
