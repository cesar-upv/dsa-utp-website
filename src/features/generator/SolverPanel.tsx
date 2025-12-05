import { useMemo, useRef, useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, Play, Loader2 } from 'lucide-react'
import { toast } from '@/lib/utils'
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
import { extendedData } from '@/data/extendedData'

export function SolverPanel() {
  const materias = useTimetableStore((state) => state.materias)
  const grupos = useTimetableStore((state) => state.grupos)
  const profesores = useTimetableStore((state) => state.profesores)
  const setHorarios = useTimetableStore((state) => state.setHorarios)
  const ultimaEjecucion = useTimetableStore((state) => state.ultimaEjecucion)
  const setAllData = useTimetableStore((state) => state.setAllData)
  const appendWarnings = useTimetableStore((state) => state.appendWarnings)
  const [timeLimit, setTimeLimit] = useState(300)
  const [elapsed, setElapsed] = useState(0)



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

  const cythonMutation = useMutation({
    mutationFn: async ({ algorithm = 'backtracking', timeLimit = 300 }: { algorithm?: 'backtracking' | 'greedy', timeLimit?: number } = {}) => {
      const parsed = solverInputSchema.parse(input)
      const response = await fetch('http://localhost:5000/api/solve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...parsed, algorithm, timeLimit }),
      })
      if (!response.ok) {
        throw new Error('Error en el backend')
      }
      const output = await response.json()
      setHorarios(output.horarios, {
        mensaje: output.resumen.mensaje,
        tiempoMs: output.resumen.tiempoMs,
        warnings: output.advertencias ?? [],
        status: output.status,
      })
      return output
    },
    onSuccess: (data) => {
      const hasWarnings = data.advertencias && data.advertencias.length > 0

      if (data.status === 'infeasible') {
        toast.warning('No se encontró solución perfecta (Cython)', {
          description: hasWarnings ? (
            <div className="whitespace-pre-line">
              {data.advertencias.join('\n')}
            </div>
          ) : undefined,
        })
      } else if (hasWarnings) {
        toast.warning('Horario generado con advertencias (Cython)', {
          description: (
            <div className="whitespace-pre-line">
              {data.advertencias.join('\n')}
            </div>
          ),
        })
      } else {
        toast.success('Horario generado con Cython')
      }
    },
    onError: (err) => {
      toast.error('Error al conectar con Backend', {
        description: 'Asegúrate de correr el servidor en el puerto 5000.',
      })
    },
  })

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (cythonMutation.isPending) {
      interval = setInterval(() => {
        setElapsed((prev) => prev + 1)
      }, 1000)
    } else {
      setElapsed(0)
    }
    return () => clearInterval(interval)
  }, [cythonMutation.isPending])

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
          {/* Frontend Solvers (Hidden by request)
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
          */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Límite:</span>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
            >
              <option value={60}>1 min</option>
              <option value={300}>5 min</option>
              <option value={600}>10 min</option>
            </select>
          </div>
          <Button
            variant="default"
            onClick={() => {
              cythonMutation.mutate({ algorithm: 'backtracking', timeLimit })
            }}
            disabled={mutation.isPending || backtrackingMutation.isPending || cythonMutation.isPending || materias.length === 0}
          >
            {cythonMutation.isPending && cythonMutation.variables?.algorithm === 'backtracking' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculando... ({elapsed}s)
              </>
            ) : (
              'Backtrack'
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              cythonMutation.mutate({ algorithm: 'greedy', timeLimit })
            }}
            disabled={mutation.isPending || backtrackingMutation.isPending || cythonMutation.isPending || materias.length === 0}
          >
            {cythonMutation.isPending && cythonMutation.variables?.algorithm === 'greedy' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculando... ({elapsed}s)
              </>
            ) : (
              'Greedy'
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
              setAllData({
                materias: extendedData.planDeEstudios,
                grupos: extendedData.grupos,
                profesores: extendedData.profesores,
              } as any)
              resetHorarios()
              toast.success('Datos base cargados (Plan Q1 Extended)')
            }}
          >
            Restaurar datos de ejemplo
          </button>

        </div>
      </CardFooter>
    </Card>
  )
}
