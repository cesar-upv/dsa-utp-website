import React from 'react'
import { Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  const [page, setPage] = React.useState(1)
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(grupos.length / pageSize))
  const start = grupos.length ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, grupos.length)

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const pageData = React.useMemo(
    () => grupos.slice((page - 1) * pageSize, page * pageSize),
    [grupos, page]
  )

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
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Aún no hay grupos. Crea uno en el formulario.
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((grupo) => (
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
        {grupos.length ? (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {start}-{end} de {grupos.length} · Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
