import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { useTimetableStore } from '@/store/useTimetableStore'

export function MetricsPanel() {
  const horarios = useTimetableStore((state) => state.horarios)
  const profesores = useTimetableStore((state) => state.profesores)


  const huecosPromedio =
    horarios.reduce((acc, h) => acc + h.metricas.huecos, 0) /
    Math.max(1, horarios.length)
  const violaciones = horarios.reduce(
    (acc, h) => acc + h.metricas.violacionesDuras,
    0
  )
  const softScore =
    horarios.reduce((acc, h) => acc + h.metricas.softScore, 0) /
    Math.max(1, horarios.length)

  const loadData = profesores.map((prof) => {
    const asignadas = horarios.reduce((acc, horario) => {
      const horas = horario.bloques.filter(
        (b) => b.profesorId === prof.id
      ).length
      return acc + horas
    }, 0)
    return {
      nombre: prof.nombre,
      asignadas,
      maximas: prof.maxHoras,
    }
  })

  return (
    <Card>
      <CardTitle>Métricas y cargas</CardTitle>
      <CardDescription>
        Compacidad (huecos), violaciones duras y distribución de carga docente.
      </CardDescription>
      <CardContent className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Grupos con horario" value={horarios.length} />
            <Metric label="Huecos promedio" value={huecosPromedio.toFixed(1)} />
            <Metric label="Violaciones duras" value={violaciones} />
            <Metric label="Soft score" value={softScore.toFixed(1)} />
          </div>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <BarChart data={loadData} margin={{ top: 10, right: 10 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                dataKey="nombre"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--foreground))',
                  borderRadius: 12,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                wrapperStyle={{ outline: 'none' }}
                cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
              />
              <Legend
                wrapperStyle={{ color: 'hsl(var(--muted-foreground))' }}
                iconType="circle"
              />
              <Bar dataKey="asignadas" fill="hsl(var(--primary))" />
              <Bar dataKey="maximas" fill="hsl(var(--accent))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  )
}
