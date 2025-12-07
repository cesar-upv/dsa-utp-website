import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Download, PlayCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { MetricsPanel } from '@/features/generator/MetricsPanel'
import { SolverPanel } from '@/features/generator/SolverPanel'
import { TimetableGrid } from '@/features/generator/TimetableGrid'
import { exportHorarios, type ExportMode } from '@/lib/excel-export'
import { useTimetableStore } from '@/store/useTimetableStore'

export default function GeneratorPage() {
  const grupos = useTimetableStore((state) => state.grupos)
  const horarios = useTimetableStore((state) => state.horarios)
  const materias = useTimetableStore((state) => state.materias)
  const profesores = useTimetableStore((state) => state.profesores)

  // Groups state
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>(
    grupos[0]?.id
  )
  // Export mode state: 'single' (current group), 'all-one-file', 'zip'
  const [exportMode, setExportMode] = useState<ExportMode>('all-one-file')

  useEffect(() => {
    if (grupos.length && !selectedGroup) {
      setSelectedGroup(grupos[0].id)
    }
  }, [grupos, selectedGroup])

  const selected = useMemo(
    () => grupos.find((g) => g.id === selectedGroup),
    [grupos, selectedGroup]
  )

  const handleExport = async () => {
    if (!horarios.length) return
    await exportHorarios(
      exportMode,
      horarios,
      grupos,
      materias,
      profesores,
      selectedGroup // Pass current group ID for 'single' mode
    )
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-white/70 p-6 shadow-ambient md:flex-row md:items-center md:justify-between dark:bg-card/90">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-primary">
            Módulo 3
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            Generador de horarios
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Orquesta el solver JSON in/out y visualiza el “tetris” de horarios por
            grupo. Incluye métricas de compacidad e información de advertencias.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">JSON in/out</Badge>
            <Badge variant="outline">Métricas visuales</Badge>
            <Badge variant="default">Local</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
          <PlayCircle className="h-5 w-5 text-primary" />
          Ejecución acelerada vía Cython (Backend local).
        </div>
      </header>

      <SolverPanel />
      <MetricsPanel />

      <Card>
        <CardTitle className="flex items-center gap-3">
          <CalendarClock className="h-5 w-5 text-primary" />
          Vista por grupo
        </CardTitle>
        <CardDescription>Calendario semanal tipo tablero.</CardDescription>
        <CardContent className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <Label htmlFor="group-select">Selecciona grupo</Label>
              <Select
                id="group-select"
                value={selectedGroup ?? ''}
                onChange={(e) => setSelectedGroup(e.target.value)}
                disabled={grupos.length === 0}
              >
                {grupos.length === 0 ? (
                  <option value="">Agrega un grupo</option>
                ) : (
                  grupos.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nombre} (Q{g.cuatrimestre} • {g.turno})
                    </option>
                  ))
                )}
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {horarios.length
                  ? `Se generaron ${horarios.length} horarios`
                  : 'Ejecuta el solver para ver el tablero'}
              </div>
              {horarios.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select
                    value={exportMode}
                    onChange={(e) => setExportMode(e.target.value as ExportMode)}
                    className="h-9 text-xs"
                  >
                    <option value="all-one-file">Todos (1 archivo)</option>
                    <option value="zip">Todos (ZIP)</option>
                    <option value="single">Solo actual (Excel)</option>
                  </Select>
                  <Button
                    onClick={handleExport}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              )}
            </div>
          </div>

          {selected ? (
            <TimetableGrid groupId={selected.id} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay grupo seleccionado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
