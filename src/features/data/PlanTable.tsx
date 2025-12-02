import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { showUndoToast } from '@/lib/utils'
import { useTimetableStore } from '@/store/useTimetableStore'
import type { Materia } from '@/types/models'

const columns: ColumnDef<Materia>[] = [
  {
    header: 'Materia',
    accessorKey: 'nombre',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-semibold">{row.original.nombre}</span>
        <span className="text-xs text-muted-foreground">{row.original.id}</span>
      </div>
    ),
  },
  {
    header: 'Cuatrimestre',
    accessorKey: 'cuatrimestre',
    cell: ({ row }) => (
      <Badge variant="outline">Q{row.original.cuatrimestre}</Badge>
    ),
  },
  {
    header: 'Horas/sem',
    accessorKey: 'horasSemana',
  },
  {
    header: 'Color',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span
          className="h-5 w-5 rounded-full border"
          style={{ backgroundColor: row.original.color }}
        />
        <code className="text-xs text-muted-foreground">
          {row.original.color}
        </code>
      </div>
    ),
  },
]

export function PlanTable() {
  const materias = useTimetableStore((state) => state.materias)
  const removeMateria = useTimetableStore((state) => state.removeMateria)
  const [pendingDelete, setPendingDelete] = useState<Materia | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 8
  const totalPages = Math.max(1, Math.ceil(materias.length / pageSize))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const pageData = useMemo(
    () => materias.slice((page - 1) * pageSize, page * pageSize),
    [materias, page]
  )

  const table = useReactTable({
    data: pageData,
    columns: useMemo(
      () => [
        ...columns,
        {
          id: 'actions',
          header: '',
          cell: ({ row }) => (
            <Button
              variant="ghost"
              size="icon"
              title="Eliminar materia"
              onClick={() => setPendingDelete(row.original)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          ),
        },
      ],
      []
    ),
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card>
      <CardTitle>Plan de estudios</CardTitle>
      <CardDescription>
        Vista rápida de materias y sus restricciones duras.
      </CardDescription>
      <CardContent className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="h-20 text-center text-muted-foreground"
                >
                  Agrega materias para construir el horario.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {materias.length > pageSize ? (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Página {page} de {totalPages}
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
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Eliminar materia"
        description={`¿Seguro que deseas eliminar ${pendingDelete?.nombre}?`}
        confirmLabel="Eliminar"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return
          const deleted = pendingDelete
          removeMateria(deleted.id)
          setPendingDelete(null)
          showUndoToast({
            title: 'Materia eliminada',
            description: `${deleted.nombre} se eliminó del plan.`,
          })
        }}
      />
    </Card>
  )
}
