import type { DayId, TimeSlot } from '@/types/models'

export const DAYS: { id: DayId; label: string }[] = [
  { id: 'mon', label: 'Lunes' },
  { id: 'tue', label: 'Martes' },
  { id: 'wed', label: 'Miércoles' },
  { id: 'thu', label: 'Jueves' },
  { id: 'fri', label: 'Viernes' },
]

export const TIME_SLOTS: TimeSlot[] = [
  { id: 's1', label: '07:00 - 07:55', start: '07:00', end: '07:55' },
  { id: 's2', label: '07:55 - 08:50', start: '07:55', end: '08:50' },
  { id: 's3', label: '08:50 - 09:45', start: '08:50', end: '09:45' },
  { id: 's4', label: '09:45 - 10:40', start: '09:45', end: '10:40' },
  { id: 'receso', label: '10:40 - 11:10', start: '10:40', end: '11:10', isReceso: true },
  { id: 's5', label: '11:10 - 12:05', start: '11:10', end: '12:05' },
  { id: 's6', label: '12:05 - 13:00', start: '12:05', end: '13:00' },
  { id: 's7', label: '13:00 - 13:55', start: '13:00', end: '13:55' },
  { id: 's8', label: '14:00 - 14:55', start: '14:00', end: '14:55' },
  { id: 's9', label: '14:55 - 15:50', start: '14:55', end: '15:50' },
]

export const TURNOS_LABEL: Record<string, string> = {
  matutino: 'Matutino',
  vespertino: 'Vespertino',
}
