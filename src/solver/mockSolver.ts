import { DAYS, TIME_SLOTS } from '@/constants/time'
import {
  type BloqueMateria,
  type DayId,
  type HorarioPorGrupo,
  type Materia,
  type Profesor,
  type SolverInput,
  type SolverOutput,
} from '@/types/models'

type BusyMap = Record<DayId, Record<string, boolean>>

const slotIndex = (slotId: string) =>
  TIME_SLOTS.findIndex((slot) => slot.id === slotId)

const createBusyMap = () =>
  DAYS.reduce<BusyMap>((acc, day) => {
    acc[day.id] = {}
    TIME_SLOTS.forEach((slot) => {
      acc[day.id][slot.id] = false
    })
    return acc
  }, {} as BusyMap)

const hasGap = (slots: string[]) => {
  const indices = slots.map(slotIndex).sort((a, b) => a - b)
  let gaps = 0
  for (let i = 1; i < indices.length; i += 1) {
    const diff = indices[i] - indices[i - 1]
    if (diff > 1) gaps += diff - 1
  }
  return gaps
}

const computeHuecos = (bloques: BloqueMateria[]) => {
  const byDay: Record<DayId, string[]> = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
  }
  bloques.forEach((b) => byDay[b.dia].push(b.slotId))
  return Object.values(byDay).reduce((acc, slots) => acc + hasGap(slots), 0)
}

const pickProfessor = (
  profesores: Profesor[],
  materia: Materia,
  load: Record<string, number>
) => {
  const sorted = [...profesores].sort(
    (a, b) => (load[a.id] ?? 0) - (load[b.id] ?? 0)
  )
  return sorted.find((prof) => prof.competencias.includes(materia.id))
}

export async function mockSolve(input: SolverInput): Promise<SolverOutput> {
  const started = performance.now()
  const horarios: HorarioPorGrupo[] = []
  const warnings: string[] = []
  const load: Record<string, number> = {}
  const busyProfesor: Record<string, BusyMap> = {}
  const busyGrupo: Record<string, BusyMap> = {}

  input.profesores.forEach((p) => {
    load[p.id] = 0
    busyProfesor[p.id] = createBusyMap()
  })
  input.grupos.forEach((g) => {
    busyGrupo[g.id] = createBusyMap()
  })

  input.grupos.forEach((grupo) => {
    const bloques: BloqueMateria[] = []
    const groupWarnings: string[] = []
    const materias = input.planDeEstudios.filter(
      (m) => m.cuatrimestre === grupo.cuatrimestre
    )

    materias.forEach((materia, materiaIdx) => {
      let horasPendientes = materia.horasSemana
      let asignado = 0
      const startIdx = materiaIdx % DAYS.length
      const dayOrder = [...DAYS.slice(startIdx), ...DAYS.slice(0, startIdx)]
      while (horasPendientes > 0) {
        let placed = false
        for (const day of dayOrder) {
          for (const slot of TIME_SLOTS) {
            if (horasPendientes <= 0) break

            const profesor = pickProfessor(input.profesores, materia, load)
            if (!profesor) {
              const mensaje = `No hay profesor con competencia para ${materia.nombre}`
              warnings.push(mensaje)
              groupWarnings.push(mensaje)
              horasPendientes = 0
              break
            }
            const disponible =
              profesor.disponibilidad[day.id as DayId]?.[slot.id] ===
                'available' &&
              !busyProfesor[profesor.id][day.id as DayId][slot.id] &&
              !busyGrupo[grupo.id][day.id as DayId][slot.id] &&
              load[profesor.id] < profesor.maxHoras

            if (disponible) {
              const bloque: BloqueMateria = {
                id: `${grupo.id}-${materia.id}-${day.id}-${slot.id}`,
                grupoId: grupo.id,
                materiaId: materia.id,
                profesorId: profesor.id,
                dia: day.id as DayId,
                slotId: slot.id,
                duracion: 1,
                huecoPrevio: false,
                esContinuo: true,
              }
              bloques.push(bloque)
              busyProfesor[profesor.id][day.id as DayId][slot.id] = true
              busyGrupo[grupo.id][day.id as DayId][slot.id] = true
              load[profesor.id] += 1
              horasPendientes -= 1
              asignado += 1
              placed = true
            }
          }
        }
        if (!placed) {
          const mensaje = `No hay slots disponibles para ${materia.nombre} en ${grupo.nombre}`
          warnings.push(mensaje)
          groupWarnings.push(mensaje)
          break
        }
      }

      if (asignado < materia.horasSemana) {
        const mensaje = `Asignadas ${asignado}/${materia.horasSemana} horas para ${materia.nombre}`
        warnings.push(mensaje)
        groupWarnings.push(mensaje)
      }

      bloques.sort((a, b) => slotIndex(a.slotId) - slotIndex(b.slotId))
      bloques.forEach((bloque, index, arr) => {
        const prev = arr[index - 1]
        if (prev?.dia === bloque.dia && slotIndex(prev.slotId) + 1 < slotIndex(bloque.slotId)) {
          bloque.huecoPrevio = true
        }
      })
    })

    const huecos = computeHuecos(bloques)
  horarios.push({
      grupoId: grupo.id,
      bloques,
      metricas: {
        huecos,
        violacionesDuras: groupWarnings.length,
        softScore: Math.max(0, 10 - huecos),
      },
    })
  })

  const status: SolverOutput['status'] =
    warnings.length > 0 ? 'infeasible' : 'ok'

  const resumen = {
    mensaje:
      status === 'ok'
        ? 'Horario generado con éxito (mock solver)'
        : 'Horario generado con advertencias',
    tiempoMs: Math.round(performance.now() - started),
    violacionesDuras: warnings.length,
    huecosPromedio:
      horarios.reduce((acc, h) => acc + h.metricas.huecos, 0) /
      Math.max(1, horarios.length),
  }

  await new Promise((resolve) => setTimeout(resolve, 450))

  return {
    status,
    horarios,
    resumen,
    advertencias: warnings,
  }
}
