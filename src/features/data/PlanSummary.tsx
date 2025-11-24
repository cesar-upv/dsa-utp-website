import type { ReactNode } from 'react'
import { BookCopy, Layers, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useTimetableStore } from '@/store/useTimetableStore'

const Stat = ({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode
  label: string
  value: ReactNode
  helper?: string
}) => (
  <Card className="glass-card border border-border/70 shadow-sm">
    <CardContent className="flex items-start gap-3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
        {helper ? (
          <p className="text-xs text-muted-foreground">{helper}</p>
        ) : null}
      </div>
    </CardContent>
  </Card>
)

export function PlanSummary() {
  const materias = useTimetableStore((state) => state.materias)
  const grupos = useTimetableStore((state) => state.grupos)
  const profesores = useTimetableStore((state) => state.profesores)

  const horas = materias.reduce((acc, m) => acc + m.horasSemana, 0)

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Stat
        icon={<BookCopy className="h-5 w-5" />}
        label="Materias"
        value={materias.length}
        helper={`Total ${horas} horas/semana`}
      />
      <Stat
        icon={<Layers className="h-5 w-5" />}
        label="Grupos activos"
        value={grupos.length}
        helper="Cuatrimestres y turnos listos"
      />
      <Stat
        icon={<Users className="h-5 w-5" />}
        label="Profesores"
        value={
          <div className="flex items-center gap-2">
            {profesores.length}
            <Badge variant="outline">
              {profesores.reduce((acc, p) => acc + p.competencias.length, 0)}{' '}
              competencias
            </Badge>
          </div>
        }
      />
    </div>
  )
}
