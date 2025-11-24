import { useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, Download, Play } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from '@/components/ui/card'
import { downloadJson } from '@/lib/utils'
import { mockSolve } from '@/solver/mockSolver'
import { useTimetableStore } from '@/store/useTimetableStore'
import { solverInputSchema, type SolverInput } from '@/types/models'

export function SolverPanel() {
  const materias = useTimetableStore((state) => state.materias)
  const grupos = useTimetableStore((state) => state.grupos)
  const profesores = useTimetableStore((state) => state.profesores)
  const setHorarios = useTimetableStore((state) => state.setHorarios)
  const ultimaEjecucion = useTimetableStore((state) => state.ultimaEjecucion)
  const horarios = useTimetableStore((state) => state.horarios)
  const resetDatos = useTimetableStore((state) => state.resetDatos)

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
        warnings: output.advertencias,
        status: output.status,
      })
      return output
    },
    onSuccess: (data) => {
      if (data.status === 'infeasible') {
        toast.warning('Horario generado con advertencias', {
          description: data.advertencias?.join('\n'),
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

  const statusBadge =
    ultimaEjecucion?.status === 'ok'
      ? { label: 'Factible', variant: 'success' as const }
      : ultimaEjecucion?.status === 'infeasible'
        ? { label: 'Con advertencias', variant: 'warning' as const }
        : ultimaEjecucion?.status === 'error'
          ? { label: 'Error', variant: 'destructive' as const }
          : undefined

  return (
    <Card>
      <CardTitle className="flex items-center gap-3">
        <Play className="h-5 w-5 text-primary" />
        Generar horarios
      </CardTitle>
      <CardDescription>
        Módulo 3 — ejecuta el solver (mock en TS) con contrato JSON in/out. Usa
        TanStack Query para orquestar el proceso.
      </CardDescription>
      <CardContent className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Materias: {materias.length} | Grupos: {grupos.length} | Profesores:{' '}
            {profesores.length}
          </p>
          {ultimaEjecucion ? (
            <p className="text-sm text-muted-foreground">
              Última ejecución: {ultimaEjecucion.mensaje} —{' '}
              {ultimaEjecucion.tiempoMs} ms
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aún no se ejecuta el solver.
            </p>
          )}
          {statusBadge ? (
            <div className="space-y-2">
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              {ultimaEjecucion?.warnings?.length ? (
                <div className="rounded-lg bg-warning/10 p-3 text-xs text-warning">
                  <p className="font-semibold">Advertencias</p>
                  <ul className="ml-4 list-disc space-y-1 text-warning/90">
                    {ultimaEjecucion.warnings.slice(0, 4).map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => downloadJson('entrada-solver.json', input)}
          >
            <Download className="h-4 w-4" />
            Input JSON
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              horarios.length
                ? downloadJson('salida-solver.json', { horarios })
                : toast.info('Primero ejecuta el solver')
            }
          >
            <Download className="h-4 w-4" />
            Output JSON
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || materias.length === 0}
          >
            {mutation.isPending ? 'Generando...' : 'Generar horarios'}
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
            onClick={() => resetDatos()}
          >
            Restaurar datos de ejemplo
          </button>
        </div>
      </CardFooter>
    </Card>
  )
}
