import { useRef, useState, type ChangeEvent } from 'react'
import { Download, Files, UploadCloud, Layers } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { downloadJson, generateDisponibilidad } from '@/lib/utils'
import { useTimetableStore } from '@/store/useTimetableStore'
import {
  solverInputSchema,
  solverOutputSchema,
  type Profesor,
} from '@/types/models'

type CsvEntity = 'materias' | 'grupos' | 'profesores'
type PlanTarget = 'plan' | CsvEntity

const csvHeaders: Record<CsvEntity, string[]> = {
  materias: ['id', 'nombre', 'cuatrimestre', 'horasSemana', 'color'],
  grupos: ['id', 'nombre', 'cuatrimestre', 'turno'],
  profesores: ['id', 'nombre', 'maxHoras', 'competencias'],
}

const sanitize = (value: unknown) =>
  String(value ?? '').replace(/,/g, ';').trim()

const buildCsv = (rows: string[][]) =>
  rows.map((row) => row.map(sanitize).join(',')).join('\n')

const parseLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.toLowerCase().startsWith('id,'))

export default function DataManagerPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [importCsvTarget, setImportCsvTarget] = useState<CsvEntity>('materias')
  const [exportPlanTarget, setExportPlanTarget] = useState<PlanTarget>('plan')

  const materias = useTimetableStore((state) => state.materias)
  const grupos = useTimetableStore((state) => state.grupos)
  const profesores = useTimetableStore((state) => state.profesores)
  const horarios = useTimetableStore((state) => state.horarios)
  const importMaterias = useTimetableStore((state) => state.importMaterias)
  const importGrupos = useTimetableStore((state) => state.importGrupos)
  const importProfesores = useTimetableStore(
    (state) => state.importProfesores
  )
  const setAllData = useTimetableStore((state) => state.setAllData)
  const setHorarios = useTimetableStore((state) => state.setHorarios)
  const [importScope, setImportScope] = useState<'plan' | 'horarios'>('plan')
  const [exportScope, setExportScope] = useState<'plan' | 'horarios'>('plan')
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')

  const handleExportCsv = (kind: CsvEntity, options?: { quiet?: boolean }) => {
    let rows: string[][] = []
    if (kind === 'materias') {
      rows = materias.map((m) => [
        m.id,
        m.nombre,
        String(m.cuatrimestre),
        String(m.horasSemana),
        m.color ?? '',
      ])
    } else if (kind === 'grupos') {
      rows = grupos.map((g) => [
        g.id,
        g.nombre,
        String(g.cuatrimestre),
        g.turno,
      ])
    } else {
      rows = profesores.map((p) => [
        p.id,
        p.nombre,
        String(p.maxHoras),
        p.competencias.join(';'),
      ])
    }
    const csv = buildCsv([csvHeaders[kind], ...rows])
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${kind}.csv`
    link.click()
    URL.revokeObjectURL(url)
    if (!options?.quiet) {
      toast.success(`Exportado ${kind} a CSV`)
    }
  }

  const handleExportPlanJson = (target: PlanTarget) => {
    if (target === 'plan') {
      downloadJson('plan-completo.json', {
        planDeEstudios: materias,
        grupos,
        profesores,
      })
      return
    }
    const map: Record<CsvEntity, unknown> = {
      materias,
      grupos,
      profesores,
    }
    downloadJson(`${target}.json`, map[target])
  }

  const handleExportPlanCsv = () => {
    handleExportCsv('materias', { quiet: true })
    handleExportCsv('grupos', { quiet: true })
    handleExportCsv('profesores', { quiet: true })
    toast.success('Plan exportado en CSV (materias, grupos y profesores)')
  }

  const handleCsvImport = async (file: File) => {
    if (importScope === 'horarios') {
      toast.error('Importa horarios en formato JSON')
      return
    }
    const text = await file.text()
    const lines = parseLines(text).map((line) => line.split(','))
    if (!lines.length) {
      toast.error('No se encontraron filas válidas')
      return
    }

    if (importCsvTarget === 'materias') {
      const parsed = lines
        .map(([id, nombre, cuatrimestre, horasSemana, color]) => ({
          id: id?.trim(),
          nombre: nombre?.trim(),
          cuatrimestre: Number.parseInt(cuatrimestre ?? '0', 10),
          horasSemana: Number.parseInt(horasSemana ?? '0', 10),
          color: color?.trim() || undefined,
        }))
        .filter(
          (m) =>
            m.id &&
            m.nombre &&
            Number.isFinite(m.cuatrimestre) &&
            Number.isFinite(m.horasSemana)
        )
      importMaterias(parsed as typeof materias)
      toast.success(`Importadas ${parsed.length} materias`)
    } else if (importCsvTarget === 'grupos') {
      const parsed = lines
        .map(([id, nombre, cuatrimestre, turno]) => ({
          id: id?.trim(),
          nombre: nombre?.trim(),
          cuatrimestre: Number.parseInt(cuatrimestre ?? '0', 10),
          turno: turno?.trim() === 'vespertino' ? 'vespertino' : 'matutino',
        }))
        .filter(
          (g) =>
            g.id &&
            g.nombre &&
            Number.isFinite(g.cuatrimestre) &&
            (g.turno === 'matutino' || g.turno === 'vespertino')
        )
      importGrupos(parsed as typeof grupos)
      toast.success(`Importados ${parsed.length} grupos`)
    } else {
      const parsed = lines
        .map(([id, nombre, maxHoras, competencias]) => {
          const lista = (competencias ?? '')
            .split(';')
            .map((c) => c.trim())
            .filter(Boolean)
          const profesor: Profesor = {
            id: id?.trim() ?? '',
            nombre: nombre?.trim() ?? '',
            maxHoras: Math.min(
              Number.parseInt(maxHoras ?? '15', 10) || 15,
              15
            ),
            competencias: lista,
            disponibilidad: generateDisponibilidad(),
          }
          return profesor
        })
        .filter((p) => p.id && p.nombre)
      importProfesores(parsed)
      toast.success(`Importados ${parsed.length} profesores`)
    }
  }

  const handleJsonImport = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      let loaded = false
      if (parsed.planDeEstudios && parsed.grupos && parsed.profesores) {
        const data = solverInputSchema.parse(parsed)
        setAllData({
          materias: data.planDeEstudios,
          grupos: data.grupos,
          profesores: data.profesores,
        })
        loaded = true
      }
      if (parsed.horarios) {
        const output = solverOutputSchema.parse(parsed)
        setHorarios(output.horarios, {
          mensaje: output.resumen.mensaje,
          tiempoMs: output.resumen.tiempoMs,
          warnings: output.advertencias,
          status: output.status,
        })
        loaded = true
      }
      if (!loaded) {
        toast.error('JSON no contiene plan ni horarios válidos')
        return
      }
      toast.success('Datos cargados desde JSON')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Archivo JSON inválido'
      toast.error('Error al importar JSON', { description: message })
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.type.includes('json') || file.name.endsWith('.json')) {
      void handleJsonImport(file)
    } else {
      void handleCsvImport(file)
    }
    event.target.value = ''
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-white/70 p-6 shadow-ambient md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-primary">
            Gestor de archivos
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            Importar y exportar datos
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Centraliza las operaciones de CSV/JSON para materias, grupos,
            profesores y horarios. Se validan los datos y se muestran toasts.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">JSON in/out</Badge>
            <Badge variant="outline">CSV múltiple</Badge>
            <Badge variant="default">Validación con zod</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-xs text-muted-foreground">
          <Files className="h-4 w-4 text-primary" />
          Soporta materias, grupos, profesores y horarios.
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle className="flex items-center gap-3">
            <UploadCloud className="h-5 w-5 text-primary" />
            Importar datos
          </CardTitle>
          <CardDescription>
            Acepta .csv para materias/grupos/profesores y .json con el contrato
            completo del solver.
          </CardDescription>
          <CardContent className="mt-4 space-y-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-foreground">
                Tipo de archivo
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={importScope === 'plan' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportScope('plan')}
                >
                  Plan (CSV/JSON)
                </Button>
                <Button
                  variant={importScope === 'horarios' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportScope('horarios')}
                >
                  Horarios (JSON)
                </Button>
              </div>
              {importScope === 'plan' ? (
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImportCsvTarget('materias')}
                    className="w-full"
                  >
                    <Layers className="h-4 w-4" />
                    Plan
                  </Button>
                  {(['materias', 'grupos', 'profesores'] as CsvEntity[]).map(
                    (kind) => (
                      <Button
                        key={kind}
                        variant={
                          importCsvTarget === kind ? 'default' : 'outline'
                        }
                        size="sm"
                        onClick={() => setImportCsvTarget(kind)}
                        className="w-full"
                      >
                        {kind.charAt(0).toUpperCase() + kind.slice(1)}
                      </Button>
                    )
                  )}
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Formatos CSV: {csvHeaders[importCsvTarget].join(', ')}. Competencias se
                separan con <code className="font-mono">;</code>.
              </p>
              {importScope === 'horarios' ? (
                <p className="text-xs text-muted-foreground">
                  Horarios solo se importan en JSON (output del solver).
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border/70 bg-muted/60 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-foreground">Carga archivo</p>
              </div>
              <p className="text-muted-foreground">
                CSV para listas rápidas o JSON para snapshot completo
                (planDeEstudios, grupos, profesores). La disponibilidad en CSV se
                inicializa en blanco.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,application/json,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button size="sm" variant="outline" onClick={triggerFileSelect}>
                <UploadCloud className="h-4 w-4" />
                Elegir archivo
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardTitle className="flex items-center gap-3">
            <Download className="h-5 w-5 text-primary" />
            Exportar datos
          </CardTitle>
          <CardDescription>
            Descarga snapshots completos o CSV por entidad. Horarios solo en JSON.
          </CardDescription>
          <CardContent className="mt-4 space-y-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-foreground">
                Tipo de archivo
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={exportScope === 'plan' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setExportScope('plan')
                      setExportPlanTarget('plan')
                    }}
                  >
                    Plan
                  </Button>
                  <Button
                    variant={exportScope === 'horarios' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setExportScope('horarios')
                      setExportFormat('json')
                    }}
                  >
                    Horarios
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={exportFormat === 'json' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExportFormat('json')}
                  >
                    JSON
                  </Button>
                  <Button
                    variant={exportFormat === 'csv' ? 'default' : 'outline'}
                    size="sm"
                    disabled={exportScope === 'horarios'}
                    title={
                      exportScope === 'horarios'
                        ? 'Horarios solo se exportan en JSON'
                        : undefined
                    }
                    onClick={() => setExportFormat('csv')}
                  >
                    CSV
                  </Button>
                </div>
              </div>
              {exportScope === 'plan' ? (
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant={exportPlanTarget === 'plan' ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    onClick={() => setExportPlanTarget('plan')}
                  >
                    <Layers className="h-4 w-4" />
                    Plan
                  </Button>
                  {(['materias', 'grupos', 'profesores'] as CsvEntity[]).map(
                    (kind) => (
                      <Button
                        key={`csv-${kind}`}
                        variant={
                          exportPlanTarget === kind ? 'default' : 'outline'
                        }
                        size="sm"
                        onClick={() => setExportPlanTarget(kind)}
                        className="w-full"
                      >
                        {kind.charAt(0).toUpperCase() + kind.slice(1)}
                      </Button>
                    )
                  )}
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {exportScope === 'plan' && exportFormat === 'csv'
                  ? exportPlanTarget === 'plan'
                    ? 'Exporta el plan completo en 3 CSV (materias, grupos y profesores).'
                    : `Formatos CSV: ${csvHeaders[exportPlanTarget].join(', ')}.`
                  : exportScope === 'plan'
                    ? 'Exporta el plan completo o una entidad en JSON.'
                    : 'Exporta en JSON para snapshots completos o horarios.'}
              </p>
              {exportScope === 'horarios' && exportFormat === 'csv' ? (
                <p className="text-xs text-muted-foreground sm:whitespace-nowrap">
                  Horarios no se exportan en CSV; usa JSON.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border/70 bg-muted/60 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-foreground">Descarga archivo</p>
              </div>
              <p className="text-muted-foreground">
                Genera un archivo listo para compartir con el solver o la UI. El plan
                incluye materias, grupos y profesores; horarios incluyen bloques y métricas.
              </p>

              {exportFormat === 'json' ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    exportScope === 'plan'
                      ? handleExportPlanJson(exportPlanTarget)
                      : horarios.length
                        ? downloadJson('horarios.json', {
                            horarios,
                            resumen: { grupos: horarios.length },
                          })
                        : toast.info('No hay horarios generados aún')
                  }
                >
                  <Download className="h-4 w-4" />
                  Exportar{' '}
                  {exportScope === 'plan'
                    ? exportPlanTarget === 'plan'
                      ? 'plan'
                      : exportPlanTarget
                    : 'horarios'}{' '}
                  (JSON)
                </Button>
              ) : exportScope === 'plan' ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    exportPlanTarget === 'plan'
                      ? handleExportPlanCsv()
                      : handleExportCsv(exportPlanTarget)
                  }
                >
                  <Download className="h-4 w-4" />
                  Exportar{' '}
                  {exportPlanTarget === 'plan'
                    ? 'plan completo'
                    : exportPlanTarget}{' '}
                  (CSV)
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground sm:whitespace-nowrap">
                  Horarios no se exportan en CSV; usa JSON.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
