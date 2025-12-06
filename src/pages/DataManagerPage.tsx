import { useRef, useState, type ChangeEvent } from 'react'
import { Download, UploadCloud, Layers, Trash2 } from 'lucide-react'
import { toast } from '@/lib/utils'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { downloadJson, generateDisponibilidad } from '@/lib/utils'
import { useTimetableStore } from '@/store/useTimetableStore'
import {
  solverInputSchema,
  solverOutputSchema,
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
  const [exportPlanTarget, setExportPlanTarget] = useState<PlanTarget>('plan')
  const [importTarget, setImportTarget] = useState<PlanTarget>('plan')

  const materias = useTimetableStore((state) => state.materias)
  const grupos = useTimetableStore((state) => state.grupos)
  const profesores = useTimetableStore((state) => state.profesores)
  const horarios = useTimetableStore((state) => state.horarios)
  const importMaterias = useTimetableStore((state) => state.importMaterias)
  const importGrupos = useTimetableStore((state) => state.importGrupos)
  const importProfesores = useTimetableStore((state) => state.importProfesores)
  const setAllData = useTimetableStore((state) => state.setAllData)
  const setHorarios = useTimetableStore((state) => state.setHorarios)
  const [importScope, setImportScope] = useState<'plan' | 'horarios'>('plan')
  const [exportScope, setExportScope] = useState<'plan' | 'horarios'>('plan')
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)

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
      toast.success(`Exportado ${kind} a CSV`, {
        description: `${rows.length} registros`,
      })
    }
  }

  const handleExportPlanJson = (target: PlanTarget) => {
    if (target === 'plan') {
      downloadJson('plan-completo.json', {
        planDeEstudios: materias,
        grupos,
        profesores,
      })
      toast.success('Exportado plan completo (JSON)', {
        description: `${materias.length} materias · ${grupos.length} grupos · ${profesores.length} profesores`,
      })
      return
    }
    const map: Record<CsvEntity, unknown> = {
      materias,
      grupos,
      profesores,
    }
    downloadJson(`${target}.json`, map[target])
    const counts: Record<CsvEntity, number> = {
      materias: materias.length,
      grupos: grupos.length,
      profesores: profesores.length,
    }
    toast.success(`Exportado ${target} (JSON)`, {
      description: `${counts[target]} registros`,
    })
  }

  const handleExportPlanCsv = () => {
    handleExportCsv('materias', { quiet: true })
    handleExportCsv('grupos', { quiet: true })
    handleExportCsv('profesores', { quiet: true })
    toast.success('Plan exportado en CSV', {
      description: `${materias.length} materias · ${grupos.length} grupos · ${profesores.length} profesores`,
    })
  }

  const handleCsvImport = async (file: File, target: PlanTarget) => {
    const text = await file.text()
    const rawLines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const detectedHeader = rawLines[0]?.toLowerCase() ?? ''
    const lines = parseLines(text).map((line) => line.split(','))
    if (!lines.length) {
      toast.error('No se encontraron filas válidas')
      return
    }
    const inferred: PlanTarget | null = detectedHeader.includes('competencias')
      ? 'profesores'
      : detectedHeader.includes('turno')
        ? 'grupos'
        : detectedHeader ? 'materias' : null
    const resolvedTarget: PlanTarget = inferred ?? target
    if (resolvedTarget === 'materias') {
      const parsed = lines
        .map(([id, nombre, cuatrimestre, turno, color]) => ({
          id: id?.trim(),
          nombre: nombre?.trim(),
          cuatrimestre: Number.parseInt(cuatrimestre ?? '0', 10),
          horasSemana: Number.parseInt(turno ?? '0', 10), // Fix mapping: csvHeaders says index 3 is horasSemana
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
      toast.success(
        `Importadas ${parsed.length} materias (CSV${target === 'plan' ? ' detectado como plan' : ''
        })`
      )
    } else if (resolvedTarget === 'grupos') {
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
      toast.success(
        `Importados ${parsed.length} grupos (CSV${target === 'plan' ? ' detectado como plan' : ''
        })`
      )
    } else {
      const parsed = lines
        .map(([id, nombre, maxHoras, competencias]) => {
          const lista = (competencias ?? '')
            .split(';')
            .map((c) => c.trim())
            .filter(Boolean)
          const profesor = {
            id: id?.trim() ?? '',
            nombre: nombre?.trim() ?? '',
            maxHoras: Math.min(Number.parseInt(maxHoras ?? '15', 10) || 15, 15),
            competencias: lista,
            disponibilidad: generateDisponibilidad(),
          }
          return profesor
        })
        .filter((p) => p.id && p.nombre)
      importProfesores(parsed)
      toast.success(
        `Importados ${parsed.length} profesores (CSV${target === 'plan' ? ' detectado como plan' : ''
        })`
      )
    }
  }

  const detectJsonTarget = (parsed: unknown): PlanTarget | 'horarios' | 'snapshot' | null => {
    if (typeof parsed === 'object' && parsed !== null) {
      const obj = parsed as Record<string, unknown>
      // Snapshot: has both schedules and plan definitions
      if (obj.horarios && obj.planDeEstudios) return 'snapshot'
      if (obj.planDeEstudios && obj.grupos && obj.profesores) return 'plan'
      if (obj.horarios) return 'horarios'
    }
    if (Array.isArray(parsed)) {
      const sample = parsed[0] as Record<string, unknown> | undefined
      if (!sample) return null
      if ('turno' in sample) return 'grupos'
      if ('competencias' in sample) return 'profesores'
      if ('horasSemana' in sample) return 'materias'
    }
    return null
  }

  const handleJsonImport = async (file: File, target: PlanTarget | 'horarios') => {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const detected = detectJsonTarget(parsed)
      // Allow 'snapshot' to override 'horarios' target or be treated as 'horarios'
      const resolvedTarget = detected === 'snapshot' ? 'snapshot' : (detected ?? target)

      let loaded = false

      if (resolvedTarget === 'snapshot') {
        // Validate Plan
        const planData = solverInputSchema.parse(parsed)
        // Validate Schedules
        const output = solverOutputSchema.parse(parsed)

        setAllData({
          materias: planData.planDeEstudios,
          grupos: planData.grupos,
          profesores: planData.profesores,
        })
        setHorarios(output.horarios, {
          mensaje: output.resumen.mensaje,
          tiempoMs: output.resumen.tiempoMs,
          warnings: output.advertencias,
          status: output.status,
        })
        loaded = true
        toast.success('Restaurado snapshot completo', {
          description: `${output.horarios.length} horarios y datos base.`,
        })
      }
      else if (resolvedTarget === 'plan' && parsed.planDeEstudios && parsed.grupos && parsed.profesores) {
        const data = solverInputSchema.parse(parsed)
        setAllData({
          materias: data.planDeEstudios,
          grupos: data.grupos,
          profesores: data.profesores,
        })
        loaded = true
        toast.success('Importado plan completo (JSON)', {
          description: `${data.planDeEstudios.length} materias · ${data.grupos.length} grupos · ${data.profesores.length} profesores`,
        })
      }
      else if (resolvedTarget === 'materias' && Array.isArray(parsed)) {
        importMaterias(parsed as typeof materias)
        loaded = true
        toast.success(`Importadas ${parsed.length} materias (JSON)`)
      }
      else if (resolvedTarget === 'grupos' && Array.isArray(parsed)) {
        importGrupos(parsed as typeof grupos)
        loaded = true
        toast.success(`Importados ${parsed.length} grupos (JSON)`)
      }
      else if (resolvedTarget === 'profesores' && Array.isArray(parsed)) {
        importProfesores(
          parsed.map((p) => ({
            ...p,
            maxHoras: Math.min(p.maxHoras ?? 15, 15),
            disponibilidad: p.disponibilidad ?? generateDisponibilidad(),
          }))
        )
        loaded = true
        toast.success(`Importados ${parsed.length} profesores (JSON)`)
      }
      else if (resolvedTarget === 'horarios' && parsed.horarios) {
        const output = solverOutputSchema.parse(parsed)

        if (materias.length === 0 || profesores.length === 0) {
          toast.warning('Horarios importados sin Plan de Estudios', {
            description: 'Faltan materias/profesores. Es posible que los bloques se vean vacíos (Libre) y las cargas no aparezcan. Importa el Plan primero.',
            duration: 6000,
          })
        }

        setHorarios(output.horarios, {
          mensaje: output.resumen.mensaje,
          tiempoMs: output.resumen.tiempoMs,
          warnings: output.advertencias,
          status: output.status,
        })
        loaded = true
        toast.success('Importados horarios (JSON)', {
          description: `${output.horarios.length} grupos`,
        })
      }

      if (!loaded) {
        toast.error('JSON no contiene plan ni horarios válidos')
        return
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Archivo JSON inválido'
      toast.error('Error al importar JSON', { description: message })
      console.error(error)
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const isJson =
      file.type.includes('json') || file.name.toLowerCase().endsWith('.json')
    const isCsv =
      file.type.includes('csv') || file.name.toLowerCase().endsWith('.csv')

    // Auto-detect is easier for snapshots, but keep scope check
    if (importScope === 'horarios') {
      if (!isJson) {
        toast.error('Importa horarios en formato JSON')
      } else {
        void handleJsonImport(file, 'horarios')
      }
      event.target.value = ''
      return
    }

    if (importTarget === 'plan') {
      if (!isJson) {
        toast.error('El plan completo se importa en JSON. Para CSV elige una entidad.')
      } else {
        void handleJsonImport(file, 'plan')
      }
      event.target.value = ''
      return
    }

    if (!isJson && !isCsv) {
      toast.error('Formato no soportado. Usa CSV o JSON.')
      event.target.value = ''
      return
    }
    if (isJson) {
      void handleJsonImport(file, importTarget)
    } else if (isCsv) {
      void handleCsvImport(file, importTarget)
    }
    event.target.value = ''
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-white/70 p-6 shadow-ambient md:flex-row md:items-center md:justify-between dark:bg-card/90">
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
        <div className="flex flex-col gap-2 md:items-end">
          <Button
            variant="destructive"
            size="sm"
            className="self-end"
            onClick={() => setConfirmClearOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Limpiar datos
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle className="flex items-center gap-3">
            <UploadCloud className="h-5 w-5 text-primary" />
            Importar datos
          </CardTitle>
          <CardDescription>
            Importa snapshots completos o entidades sueltas en CSV/JSON. Horarios
            solo en JSON.
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
                  Plan / Entidades
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
                    variant={importTarget === 'plan' ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    onClick={() => setImportTarget('plan')}
                  >
                    <Layers className="h-4 w-4" />
                    Plan
                  </Button>
                  {(['materias', 'grupos', 'profesores'] as CsvEntity[]).map(
                    (kind) => (
                      <Button
                        key={kind}
                        variant={importTarget === kind ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setImportTarget(kind)}
                        className="w-full"
                      >
                        {kind.charAt(0).toUpperCase() + kind.slice(1)}
                      </Button>
                    )
                  )}
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {importScope === 'plan'
                  ? importTarget === 'plan'
                    ? 'Plan completo: JSON (planDeEstudios, grupos, profesores). Para CSV selecciona una entidad y súbela por separado.'
                    : `Entidades: acepta CSV o JSON. CSV usa columnas ${csvHeaders[importTarget].join(', ')}.`
                  : 'Horarios solo se importan en JSON (output del solver).'}
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border/70 bg-muted/60 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-foreground">Carga archivo</p>
              </div>
              <p className="text-muted-foreground">
                Usa JSON para snapshots completos del plan o los horarios. También
                puedes importar materias, grupos o profesores en CSV.
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
                    Plan / Entidades
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
                        ? (() => {
                          downloadJson('horarios.json', {
                            // Embed full plan data
                            planDeEstudios: materias,
                            grupos,
                            profesores,
                            // Standard Solver Output
                            status: 'ok',
                            horarios,
                            resumen: {
                              mensaje: 'Exportado manualmente desde UI',
                              tiempoMs: 0,
                              violacionesDuras: 0,
                              huecosPromedio: 0,
                              grupos: horarios.length,
                            },
                          })
                          toast.success('Exportados horarios + plan (JSON)', {
                            description: `${horarios.length} grupos y datos base.`,
                          })
                        })()
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
      <ConfirmDialog
        open={confirmClearOpen}
        title="Limpiar todos los datos"
        description="Se borrarán materias, grupos, profesores y horarios almacenados en la app."
        confirmLabel="Limpiar"
        variant="destructive"
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={() => {
          setAllData({ materias: [], grupos: [], profesores: [] })
          setConfirmClearOpen(false)
          toast.success('Datos limpiados')
        }}
      />
    </div>
  )
}
