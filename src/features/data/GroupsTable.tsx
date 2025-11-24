import { Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TURNOS_LABEL } from '@/constants/time'
import { useTimetableStore } from '@/store/useTimetableStore'

export function GroupsTable() {
  const grupos = useTimetableStore((state) => state.grupos)

  return (
    <Card>
      <CardTitle className="flex items-center gap-3">
        <Users className="h-5 w-5 text-primary" />
        Grupos y turnos
      </CardTitle>
      <CardDescription>
        Vista rápida de grupos registrados, su cuatrimestre y turno.
      </CardDescription>
      <CardContent className="mt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{grupos.length} grupos</Badge>
        </div>
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grupo</TableHead>
                <TableHead>Cuatrimestre</TableHead>
                <TableHead>Turno</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Aún no hay grupos. Crea uno en el formulario.
                  </TableCell>
                </TableRow>
              ) : (
                grupos.map((grupo) => (
                  <TableRow key={grupo.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{grupo.nombre}</span>
                        <span className="text-xs text-muted-foreground">
                          {grupo.id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Q{grupo.cuatrimestre}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {TURNOS_LABEL[grupo.turno] ?? grupo.turno}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
