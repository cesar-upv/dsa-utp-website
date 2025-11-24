import { ArrowDownToLine, Database } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { CsvDropzone } from '@/features/data/CsvDropzone'
import { CurriculumForm } from '@/features/data/CurriculumForm'
import { GroupForm } from '@/features/data/GroupForm'
import { PlanSummary } from '@/features/data/PlanSummary'
import { PlanTable } from '@/features/data/PlanTable'
import { downloadJson } from '@/lib/utils'
import { useTimetableStore } from '@/store/useTimetableStore'

export default function DataPage() {
  const materias = useTimetableStore((state) => state.materias)
  const grupos = useTimetableStore((state) => state.grupos)
  const profesores = useTimetableStore((state) => state.profesores)

  const handleExport = () => {
    downloadJson('plan-de-estudios.json', {
      planDeEstudios: materias,
      grupos,
      profesores,
    })
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-white/70 p-6 shadow-ambient md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-primary">
            Módulo 1
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            Gestión de datos base
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Carga plan de estudios, grupos y turnos. Toda la información se
            valida con esquemas <strong>zod</strong> y se persiste en localStorage.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Cuatrimestres + horas/semana</Badge>
            <Badge variant="outline">CSV import</Badge>
            <Badge variant="default">Validaciones en vivo</Badge>
          </div>
        </div>
        <Button variant="secondary" onClick={handleExport}>
          <ArrowDownToLine className="h-4 w-4" />
          Exportar JSON
        </Button>
      </header>

      <PlanSummary />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <CurriculumForm />
          <PlanTable />
        </div>
        <div className="space-y-6">
          <GroupForm />
          <CsvDropzone />
          <Card>
            <CardTitle className="flex items-center gap-3">
              <Database className="h-5 w-5 text-primary" />
              Notas rápidas
            </CardTitle>
            <CardDescription>Restricciones duras modeladas</CardDescription>
            <CardContent className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>• Unicidad de grupo/profesor por franja.</p>
              <p>• Carga máxima profesor (≤ 15 h/sem) editable.</p>
              <p>• Contigüidad de bloques por materia cuando es posible.</p>
              <p>• Competencias por materia obligatorias.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
