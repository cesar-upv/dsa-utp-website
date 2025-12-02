import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { PencilLine, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
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

export function PlanTable() {
  const materias = useTimetableStore((state) => state.materias)
  const removeMateria = useTimetableStore((state) => state.removeMateria)
  const updateMateria = useTimetableStore((state) => state.updateMateria)
  const [pendingDelete, setPendingDelete] = useState<Materia | null>(null)
  const [editingMateria, setEditingMateria] = useState<Materia | null>(null)
  const [draft, setDraft] = useState<Materia | null>(null)
  const colorInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [cuatrimestreFilter, setCuatrimestreFilter] = useState<number | 'all'>(
    'all'
  )
  const [page, setPage] = useState(1)
  const pageSize = 8
  const cuatrimestres = useMemo(
    () =>
      Array.from(new Set(materias.map((m) => m.cuatrimestre))).sort(
        (a, b) => a - b
      ),
    [materias]
  )
  const filteredMaterias = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return materias.filter((m) => {
      const matchesTerm =
        cuatrimestreFilter === 'all' || m.cuatrimestre === cuatrimestreFilter
      const matchesSearch =
        term.length === 0 ||
        m.nombre.toLowerCase().includes(term) ||
        m.id.toLowerCase().includes(term)
      return matchesTerm && matchesSearch
    })
  }, [materias, searchTerm, cuatrimestreFilter])
  const totalPages = Math.max(1, Math.ceil(filteredMaterias.length / pageSize))
  const start = filteredMaterias.length ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, filteredMaterias.length)

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [searchTerm, cuatrimestreFilter])

  useEffect(() => {
    if (editingMateria) {
      setDraft(editingMateria)
    } else {
      setDraft(null)
    }
  }, [editingMateria])

  const pageData = useMemo(
    () => filteredMaterias.slice((page - 1) * pageSize, page * pageSize),
    [filteredMaterias, page]
  )

  const openColorPicker = (id: string) => {
    const input = colorInputRefs.current[id]
    input?.click()
  }

  const columns = useMemo<ColumnDef<Materia>[]>(
    () => [
      {
        header: 'Materia',
        accessorKey: 'nombre',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-semibold">{row.original.nombre}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.id}
            </span>
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
        cell: ({ row }) => {
          const color = row.original.color || '#2563eb'
          return (
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label={`Color de ${row.original.nombre}`}
                className="hidden"
                ref={(node) => {
                  colorInputRefs.current[row.original.id] = node
                }}
                value={color}
                onChange={(event) =>
                  updateMateria(row.original.id, { color: event.target.value })
                }
              />
              <button
                type="button"
                onClick={() => openColorPicker(row.original.id)}
                className="flex items-center gap-2 rounded-full border border-border/60 bg-white px-3 py-1 text-xs shadow-sm transition hover:border-primary/50 hover:text-primary"
              >
                <span
                  className="h-4 w-4 rounded-full border"
                  style={{ backgroundColor: color }}
                />
                <code className="text-xs text-muted-foreground">{color}</code>
              </button>
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              title="Editar materia"
              onClick={() => setEditingMateria(row.original)}
            >
              <PencilLine className="h-4 w-4 text-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Eliminar materia"
              onClick={() => setPendingDelete(row.original)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [updateMateria]
  )

  const table = useReactTable({
    data: pageData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const handleSaveEdit = () => {
    if (!editingMateria || !draft) return
    const id = draft.id.trim()
    const nombre = draft.nombre.trim()
    const cuatrimestre = Number(draft.cuatrimestre)
    const horasSemana = Number(draft.horasSemana)
    if (!id || !nombre) {
      toast.error('Completa ID y nombre')
      return
    }
    if (!Number.isFinite(cuatrimestre) || cuatrimestre < 1 || cuatrimestre > 12) {
      toast.error('Cuatrimestre debe estar entre 1 y 12')
      return
    }
    if (!Number.isFinite(horasSemana) || horasSemana < 1 || horasSemana > 15) {
      toast.error('Horas por semana debe estar entre 1 y 15')
      return
    }
    const duplicateId = materias.some((m) => {
      const isSame = m.id.toLowerCase() === editingMateria.id.toLowerCase()
      return !isSame && m.id.toLowerCase() === id.toLowerCase()
    })
    if (duplicateId) {
      toast.error('Ya existe otra materia con ese ID')
      return
    }
    const duplicateName = materias.some((m) => {
      const isSame = m.id.toLowerCase() === editingMateria.id.toLowerCase()
      return !isSame && m.nombre.toLowerCase() === nombre.toLowerCase()
    })
    if (duplicateName) {
      toast.error('Ya existe otra materia con ese nombre')
      return
    }
    updateMateria(editingMateria.id, {
      ...draft,
      id,
      nombre,
      cuatrimestre,
      horasSemana,
      color: draft.color || '#2563eb',
    })
    toast.success('Materia actualizada')
    setEditingMateria(null)
  }

  return (
    <Card>
      <CardTitle>Plan de estudios</CardTitle>
      <CardDescription>
        Vista rápida de materias y sus restricciones duras.
      </CardDescription>
      <CardContent className="mt-4 space-y-4 overflow-x-auto">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Filtrar por cuatrimestre
              </p>
              <Select
                value={cuatrimestreFilter === 'all' ? 'all' : String(cuatrimestreFilter)}
                onChange={(event) =>
                  setCuatrimestreFilter(
                    event.target.value === 'all'
                      ? 'all'
                      : Number.parseInt(event.target.value, 10)
                  )
                }
                className="w-full md:w-52"
              >
                <option value="all">Todos</option>
                {cuatrimestres.map((q) => (
                  <option key={q} value={q}>
                    Q{q}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="md:w-72">
            <Label className="sr-only" htmlFor="materia-search">
              Buscar materia
            </Label>
            <Input
              id="materia-search"
              placeholder="Buscar por nombre o ID..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>
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
                  colSpan={table.getAllColumns().length}
                  className="h-20 text-center text-muted-foreground"
                >
                  Agrega materias para construir el horario.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {filteredMaterias.length ? (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {start}-{end} de {filteredMaterias.length} · Página {page} de{' '}
              {totalPages}
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
      {editingMateria && draft
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-in fade-in-0">
              <Card className="w-full max-w-xl shadow-ambient animate-in fade-in-0 zoom-in-95 duration-150">
                <CardTitle>Editar materia</CardTitle>
                <CardDescription className="mt-1">
                  Ajusta ID, nombre, cuatrimestre, horas/semana y color.
                </CardDescription>
                <CardContent className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-nombre">Nombre</Label>
                      <Input
                        id="edit-nombre"
                        value={draft.nombre}
                        onChange={(event) =>
                          setDraft((prev) =>
                            prev ? { ...prev, nombre: event.target.value } : prev
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-id">ID</Label>
                      <Input
                        id="edit-id"
                        value={draft.id}
                        onChange={(event) =>
                          setDraft((prev) =>
                            prev ? { ...prev, id: event.target.value } : prev
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-cuatrimestre">Cuatrimestre</Label>
                      <Input
                        id="edit-cuatrimestre"
                        type="number"
                        min={1}
                        max={12}
                        value={draft.cuatrimestre}
                        onChange={(event) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  cuatrimestre: Number(event.target.value) || 0,
                                }
                              : prev
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-horas">Horas por semana</Label>
                      <Input
                        id="edit-horas"
                        type="number"
                        min={1}
                        max={12}
                        value={draft.horasSemana}
                        onChange={(event) =>
                          setDraft((prev) =>
                            prev
                              ? { ...prev, horasSemana: Number(event.target.value) || 0 }
                              : prev
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="edit-color">Color</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          id="edit-color"
                          type="color"
                          className="w-20 cursor-pointer p-1"
                          value={draft.color || '#2563eb'}
                          onChange={(event) =>
                            setDraft((prev) =>
                              prev ? { ...prev, color: event.target.value } : prev
                            )
                          }
                        />
                        <code className="text-xs text-muted-foreground">
                          {draft.color || '#2563eb'}
                        </code>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => setEditingMateria(null)}
                      className="w-full md:w-auto"
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveEdit} className="w-full md:w-auto">
                      Guardar cambios
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>,
            document.body
          )
        : null}
    </Card>
  )
}
