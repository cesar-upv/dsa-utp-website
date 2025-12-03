import { Badge } from '@/components/ui/badge'
import { CurriculumForm } from '@/features/data/CurriculumForm'
import { GroupForm } from '@/features/data/GroupForm'
import { GroupsTable } from '@/features/data/GroupsTable'
import { PlanSummary } from '@/features/data/PlanSummary'
import { PlanTable } from '@/features/data/PlanTable'

export default function DataPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-white/70 p-6 shadow-ambient md:flex-row md:items-center md:justify-between dark:bg-card/90">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-primary">
            Módulo 1
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            Gestión de datos base
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Carga plan de estudios, grupos y turnos. Toda la información se
            valida en la UI y se persiste en localStorage.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Cuatrimestres + horas/semana</Badge>
            <Badge variant="outline">CSV import</Badge>
            <Badge variant="default">Validaciones en vivo</Badge>
          </div>
        </div>
      </header>

      <PlanSummary />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <CurriculumForm />
          <PlanTable />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <GroupForm />
          <GroupsTable />
        </div>
      </div>
    </div>
  )
}
