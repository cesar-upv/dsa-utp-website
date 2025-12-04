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

const SCHED_SLOTS = TIME_SLOTS.filter((slot) => !slot.isReceso)

const slotIndex = (slotId: string) =>
    SCHED_SLOTS.findIndex((slot) => slot.id === slotId)

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

// Unit of work: A single hour of a subject for a group
type Unit = {
    id: string
    grupoId: string
    materia: Materia
    unitIndex: number // 0 to horasSemana - 1
}

export async function solveBacktracking(input: SolverInput): Promise<SolverOutput> {
    const started = performance.now()

    // 1. Flatten problem into units
    const units: Unit[] = []
    input.grupos.forEach((grupo) => {
        const materias = input.planDeEstudios.filter(
            (m) => m.cuatrimestre === grupo.cuatrimestre
        )
        materias.forEach((materia) => {
            for (let i = 0; i < materia.horasSemana; i++) {
                units.push({
                    id: `${grupo.id}-${materia.id}-${i}`,
                    grupoId: grupo.id,
                    materia,
                    unitIndex: i,
                })
            }
        })
    })

    // Sort units to prioritize harder constraints? 
    // For now, simple sort by group then subject is fine.
    // Maybe sort by professors availability (most constrained first) could be an optimization.

    // State
    const assignments: BloqueMateria[] = []
    const load: Record<string, number> = {}
    const busyProfesor: Record<string, BusyMap> = {}
    const busyGrupo: Record<string, BusyMap> = {}
    const materiaDayCount: Record<string, Record<string, Record<DayId, number>>> = {}
    // Track which professor is assigned to a (Group, Subject) pair to ensure consistency
    const profesorPorMateria: Record<string, Record<string, string>> = {}

    // Best solution tracking
    let bestAssignments: BloqueMateria[] = []
    let maxAssignedCount = -1

    // Initialize state
    input.profesores.forEach((p) => {
        load[p.id] = 0
        busyProfesor[p.id] = createBusyMap()
    })
    input.grupos.forEach((g) => {
        busyGrupo[g.id] = createBusyMap()
        materiaDayCount[g.id] = {}
        profesorPorMateria[g.id] = {}
    })

    // Helper to check constraints
    const isValid = (
        unit: Unit,
        dayId: DayId,
        slotId: string,
        profesor: Profesor
    ): boolean => {
        // 1. Professor Competence (Checked before calling this, but good to be safe)
        if (!profesor.competencias.includes(unit.materia.id)) return false

        // 2. Professor Availability
        if (profesor.disponibilidad[dayId]?.[slotId] !== 'available') return false

        // 3. Professor Not Busy
        if (busyProfesor[profesor.id][dayId][slotId]) return false

        // 4. Group Not Busy
        if (busyGrupo[unit.grupoId][dayId][slotId]) return false

        // 5. Professor Max Load
        if (load[profesor.id] >= profesor.maxHoras) return false

        // 6. Max 2 hours per day per subject
        const currentDayCount = materiaDayCount[unit.grupoId][unit.materia.id]?.[dayId] ?? 0
        if (currentDayCount >= 2) return false

        // 7. Contiguity
        // If there are already slots for this subject on this day, the new slot MUST be adjacent.
        const existingSlots = assignments.filter(
            (b) =>
                b.grupoId === unit.grupoId &&
                b.materiaId === unit.materia.id &&
                b.dia === dayId
        )
        if (existingSlots.length > 0) {
            // Should be 1 (since max is 2, and we are adding the 2nd)
            const existingSlotIndex = slotIndex(existingSlots[0].slotId)
            const currentSlotIndex = slotIndex(slotId)
            if (Math.abs(existingSlotIndex - currentSlotIndex) !== 1) return false
        }

        return true
    }

    // Recursive function
    const backtrack = async (index: number): Promise<boolean> => {
        // Allow UI to breathe every now and then (optional, but good for heavy recursion)
        if (index % 50 === 0) await new Promise(resolve => setTimeout(resolve, 0));

        // Update best solution if we've assigned more units than before
        if (index > maxAssignedCount) {
            maxAssignedCount = index
            bestAssignments = [...assignments]
        }

        if (index >= units.length) {
            return true // Solved!
        }

        const unit = units[index]

        // Determine eligible professors
        // If already assigned for this group/subject, MUST use the same one.
        let eligibleProfessors: Profesor[] = []
        const assignedProfId = profesorPorMateria[unit.grupoId]?.[unit.materia.id]

        if (assignedProfId) {
            const p = input.profesores.find(p => p.id === assignedProfId)
            if (p) eligibleProfessors = [p]
        } else {
            eligibleProfessors = input.profesores.filter(p =>
                p.competencias.includes(unit.materia.id)
            )
            // Heuristic: Sort by current load (least loaded first) to balance
            eligibleProfessors.sort((a, b) => (load[a.id] ?? 0) - (load[b.id] ?? 0))
        }

        if (eligibleProfessors.length === 0) return false // No profs available

        // Iterate Days and Slots
        // Heuristic: Try to fill days sequentially or distribute?
        // Let's iterate standard order.
        for (const day of DAYS) {
            for (const slot of SCHED_SLOTS) {

                for (const prof of eligibleProfessors) {
                    if (isValid(unit, day.id as DayId, slot.id, prof)) {
                        // Apply
                        const bloque: BloqueMateria = {
                            id: unit.id,
                            grupoId: unit.grupoId,
                            materiaId: unit.materia.id,
                            profesorId: prof.id,
                            dia: day.id as DayId,
                            slotId: slot.id,
                            duracion: 1,
                            huecoPrevio: false,
                            esContinuo: true
                        }

                        assignments.push(bloque)
                        busyProfesor[prof.id][day.id as DayId][slot.id] = true
                        busyGrupo[unit.grupoId][day.id as DayId][slot.id] = true
                        load[prof.id] = (load[prof.id] ?? 0) + 1

                        if (!materiaDayCount[unit.grupoId][unit.materia.id]) {
                            materiaDayCount[unit.grupoId][unit.materia.id] = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0 }
                        }
                        materiaDayCount[unit.grupoId][unit.materia.id][day.id as DayId]++

                        const isFirstAssignment = !profesorPorMateria[unit.grupoId][unit.materia.id]
                        if (isFirstAssignment) {
                            profesorPorMateria[unit.grupoId][unit.materia.id] = prof.id
                        }

                        // Recurse
                        if (await backtrack(index + 1)) return true

                        // Backtrack (Undo)
                        assignments.pop()
                        busyProfesor[prof.id][day.id as DayId][slot.id] = false
                        busyGrupo[unit.grupoId][day.id as DayId][slot.id] = false
                        load[prof.id]--
                        materiaDayCount[unit.grupoId][unit.materia.id][day.id as DayId]--
                        if (isFirstAssignment) {
                            delete profesorPorMateria[unit.grupoId][unit.materia.id]
                        }
                    }
                }
            }
        }

        return false
    }

    const success = await backtrack(0)

    // Use best solution if failed
    const finalAssignments = success ? assignments : bestAssignments
    console.log('Backtracking finished. Success:', success)
    console.log('Final assignments count:', finalAssignments.length)
    console.log('Best assignments count:', bestAssignments.length)

    const horarios: HorarioPorGrupo[] = []
    const warnings: string[] = []

    if (!success) {
        // Identify unassigned units
        const assignedIds = new Set(finalAssignments.map(b => b.id))
        const unassignedUnits = units.filter(u => !assignedIds.has(u.id))

        // Group unassigned by Group/Materia for cleaner warnings
        const missingSummary: Record<string, number> = {}
        unassignedUnits.forEach(u => {
            const key = `${u.grupoId}|${u.materia.nombre}`
            missingSummary[key] = (missingSummary[key] ?? 0) + 1
        })

        Object.entries(missingSummary).forEach(([key, count]) => {
            const [grpId, matName] = key.split('|')
            const grpName = input.grupos.find(g => g.id === grpId)?.nombre ?? grpId
            warnings.push(`No se pudieron asignar ${count} horas de ${matName} al grupo ${grpName}`)
        })
    }

    // Group assignments by Grupo
    input.grupos.forEach(g => {
        const bloques = finalAssignments.filter(b => b.grupoId === g.id)
        // Calculate metrics
        bloques.sort((a, b) => slotIndex(a.slotId) - slotIndex(b.slotId))
        bloques.forEach((bloque, index, arr) => {
            const prev = arr[index - 1]
            if (prev?.dia === bloque.dia && slotIndex(prev.slotId) + 1 < slotIndex(bloque.slotId)) {
                bloque.huecoPrevio = true
            }
        })

        const huecos = computeHuecos(bloques)

        horarios.push({
            grupoId: g.id,
            bloques,
            metricas: {
                huecos,
                violacionesDuras: warnings.length, // If failed, we assume worst
                softScore: Math.max(0, 10 - huecos)
            }
        })
    })

    return {
        status: success ? 'ok' : 'infeasible',
        horarios,
        resumen: {
            mensaje: success ? 'Optimizado con Backtracking' : `Backtracking incompleto (${maxAssignedCount}/${units.length} asignados)`,
            tiempoMs: Math.round(performance.now() - started),
            violacionesDuras: warnings.length,
            huecosPromedio: horarios.reduce((acc, h) => acc + h.metricas.huecos, 0) / Math.max(1, horarios.length)
        },
        advertencias: warnings
    }
}
