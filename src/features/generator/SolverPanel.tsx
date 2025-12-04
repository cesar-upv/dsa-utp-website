import { useMemo, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, Play, Layers, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from '@/components/ui/card'
import { mockSolve } from '@/solver/mockSolver'
import { solveBacktracking } from '@/solver/backtrackingSolver'
import { useTimetableStore } from '@/store/useTimetableStore'
import { solverInputSchema, type SolverInput } from '@/types/models'
import { largeSeed } from '@/data/largeSeed'

export function SolverPanel() {
  const materias = useTimetableStore((state) => state.materias)
  const grupos = useTimetableStore((state) => state.grupos)
  const profesores = useTimetableStore((state) => state.profesores)
  const setHorarios = useTimetableStore((state) => state.setHorarios)
  const ultimaEjecucion = useTimetableStore((state) => state.ultimaEjecucion)
  const resetDatos = useTimetableStore((state) => state.resetDatos)
  const setAllData = useTimetableStore((state) => state.setAllData)
  const appendWarnings = useTimetableStore((state) => state.appendWarnings)
  const resetHorarios = () =>
    setHorarios([], {
      mensaje: '',
      tiempoMs: 0,
      status: 'ok',
      warnings: [],
    })

  const input: SolverInput = useMemo(
    () => ({
      planDeEstudios: materias,
      grupos,
      profesores,
      meta: {
        creadoEn: new Date().toISOString(),
        fuente: 'UI local',
      },
    }),
    [materias, grupos, profesores]
  )

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = solverInputSchema.parse(input)
      const output = await mockSolve(parsed)
      setHorarios(output.horarios, {
        mensaje: output.resumen.mensaje,
        tiempoMs: output.resumen.tiempoMs,
        warnings: [...preWarningsRef.current, ...(output.advertencias ?? [])],
        status: output.status,
      })
      return output
    },
    onSuccess: (data) => {
      if (data.status === 'infeasible') {
        toast.warning('Horario generado con advertencias', {
          description: data.advertencias?.length ? (
            <div className="whitespace-pre-line">
              {data.advertencias.join('\n')}
            </div>
          ) : undefined,
        })
      } else {
        toast.success('Horario generado')
      }
    },
    onError: (err) => {
      toast.error('Error al ejecutar solver', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      })
    },
  })

  const backtrackingMutation = useMutation({
    mutationFn: async () => {
      const parsed = solverInputSchema.parse(input)
      const output = await solveBacktracking(parsed)
      setHorarios(output.horarios, {
        mensaje: output.resumen.mensaje,
        tiempoMs: output.resumen.tiempoMs,
        warnings: [...preWarningsRef.current, ...(output.advertencias ?? [])],
        status: output.status,
      })
      return output
    },
    onSuccess: (data) => {
      if (data.status === 'infeasible') {
        toast.warning('No se encontró solución perfecta', {
          description: data.advertencias?.length ? (
            <div className="whitespace-pre-line">
              {data.advertencias.join('\n')}
            </div>
          ) : undefined,
        })
      } else {
        toast.success('Horario generado con Backtracking')
      }
    },
    onError: (err) => {
      toast.error('Error al ejecutar Backtracking', {
        description: err instanceof Error ? err.message : 'Error desconocido',
      })
    },
  })

  const materiasSinProfesor = useMemo(
    () =>
      materias.filter(
        (m) =>
          !profesores.some((p) => p.competencias.includes(m.id))
      ),
    [materias, profesores]
  )
  const preWarningsRef = useRef<string[]>([])

  const gruposFueraDeRango = useMemo(() => {
    return grupos.filter((g) => {
      const materiasDelGrupo = materias.filter(
        (m) => m.cuatrimestre === g.cuatrimestre
      )
      return materiasDelGrupo.length < 6 || materiasDelGrupo.length > 7
    })
  }, [grupos, materias])

  return (
    <Card>
      <CardTitle className="flex items-center gap-3">
        <Play className="h-5 w-5 text-primary" />
        Generar horarios
      </CardTitle>
      <CardDescription>
        Ejecuta el solver local y muestra advertencias si alguna restricción no se cumple.
      </CardDescription>
      <CardContent className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Materias: {materias.length} • Grupos: {grupos.length} • Profesores:{' '}
            {profesores.length}
          </p>
          <p className="text-sm text-muted-foreground">
            {ultimaEjecucion
              ? `Última ejecución: ${ultimaEjecucion.mensaje} — ${ultimaEjecucion.tiempoMs} ms`
              : 'Listo para generar con los datos cargados.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              preWarningsRef.current = []
              if (gruposFueraDeRango.length) {
                const warn = gruposFueraDeRango
                  .map(
                    (g) =>
                      `${g.nombre}: ${materias.filter((m) => m.cuatrimestre === g.cuatrimestre)
                        .length
                      } materias`
                  )
                  .join('\n')
                toast.warning('Verifica materias por grupo', {
                  description: <div className="whitespace-pre-line">{warn}</div>,
                })
                preWarningsRef.current.push(`Verifica materias por grupo\n${warn}`)
                appendWarnings([
                  `Verifica materias por grupo\n${warn}`,
                ])
              }
              if (materiasSinProfesor.length) {
                const warn = materiasSinProfesor
                  .map((m) => `${m.nombre} (${m.id})`)
                  .join('\n')
                toast.warning('Hay materias sin profesor asignado', {
                  description: <div className="whitespace-pre-line">{warn}</div>,
                })
                preWarningsRef.current.push(
                  `Hay materias sin profesor asignado\n${warn}`
                )
                appendWarnings([
                  `Hay materias sin profesor asignado\n${warn}`,
                ])
              }
              mutation.mutate()
            }}
            disabled={mutation.isPending || materias.length === 0}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              'Generar horarios (Greedy)'
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              preWarningsRef.current = []
              // Basic checks same as Greedy
              if (gruposFueraDeRango.length) {
                const warn = gruposFueraDeRango
                  .map(
                    (g) =>
                      `${g.nombre}: ${materias.filter((m) => m.cuatrimestre === g.cuatrimestre)
                        .length
                      } materias`
                  )
                  .join('\n')
                toast.warning('Verifica materias por grupo', {
                  description: <div className="whitespace-pre-line">{warn}</div>,
                })
                preWarningsRef.current.push(`Verifica materias por grupo\n${warn}`)
                appendWarnings([
                  `Verifica materias por grupo\n${warn}`,
                ])
              }
              if (materiasSinProfesor.length) {
                const warn = materiasSinProfesor
                  .map((m) => `${m.nombre} (${m.id})`)
                  .join('\n')
                toast.warning('Hay materias sin profesor asignado', {
                  description: <div className="whitespace-pre-line">{warn}</div>,
                })
                preWarningsRef.current.push(
                  `Hay materias sin profesor asignado\n${warn}`
                )
                appendWarnings([
                  `Hay materias sin profesor asignado\n${warn}`,
                ])
              }
              backtrackingMutation.mutate()
            }}
            disabled={mutation.isPending || backtrackingMutation.isPending || materias.length === 0}
          >
            {backtrackingMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculando...
              </>
            ) : (
              'Generar (Backtracking)'
            )}
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Restricciones duras: disponibilidad, unicidad profesor/grupo, carga
          máxima, competencias, contigüidad de bloques.
        </span>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <button
            type="button"
            className="text-muted-foreground underline underline-offset-2"
            onClick={() => {
              resetDatos()
              resetHorarios()
            }}
          >
            Restaurar datos de ejemplo
          </button>
          <span className="text-muted-foreground">•</span>
          <button
            type="button"
            className="text-muted-foreground underline underline-offset-2 flex items-center gap-1"
            onClick={() => {
              setAllData(largeSeed)
              resetHorarios()
              toast.success(
                'Seed grande aplicada (10 cuatrimestres, 2 grupos, 7 materias por grupo, disponibilidad completa)'
              )
            }}
          >
            <Layers className="h-4 w-4" />
            Cargar seed grande
          </button>
        </div>
      </CardFooter>
    </Card>
  )
}
