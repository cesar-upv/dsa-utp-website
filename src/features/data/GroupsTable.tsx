import React from 'react'
import { PencilLine, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { createPortal } from 'react-dom'

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
import { TURNOS_LABEL } from '@/constants/time'
import { useTimetableStore } from '@/store/useTimetableStore'
import type { Grupo } from '@/types/models'

export function GroupsTable() {
  const grupos = useTimetableStore((state) => state.grupos)
  const removeGrupo = useTimetableStore((state) => state.removeGrupo)
  const updateGrupo = useTimetableStore((state) => state.updateGrupo)
  const [pendingDelete, setPendingDelete] = React.useState<Grupo | null>(null)
  const [editingGrupo, setEditingGrupo] = React.useState<Grupo | null>(null)
  const [draft, setDraft] = React.useState<Grupo | null>(null)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [page, setPage] = React.useState(1)
  const pageSize = 10
  const filteredGrupos = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return grupos.filter(
      (g) =>
        term.length === 0 ||
        g.nombre.toLowerCase().includes(term) ||
        g.id.toLowerCase().includes(term)
    )
  }, [grupos, searchTerm])
  const totalPages = Math.max(1, Math.ceil(filteredGrupos.length / pageSize))
  const start = filteredGrupos.length ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, filteredGrupos.length)

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  React.useEffect(() => {
    setPage(1)
  }, [searchTerm])

  React.useEffect(() => {
    if (editingGrupo) {
      setDraft(editingGrupo)
    } else {
      setDraft(null)
    }
  }, [editingGrupo])

  const pageData = React.useMemo(
    () => filteredGrupos.slice((page - 1) * pageSize, page * pageSize),
    [filteredGrupos, page]
  )

  const handleSaveEdit = () => {
    if (!editingGrupo || !draft) return
    const id = draft.id.trim()
    const nombre = draft.nombre.trim()
    const cuatrimestre = Number(draft.cuatrimestre)
    const turno = draft.turno
    if (!id || !nombre) {
      toast.error('Completa ID y nombre del grupo')
      return
    }
    if (!Number.isFinite(cuatrimestre) || cuatrimestre < 1 || cuatrimestre > 12) {
      toast.error('Cuatrimestre debe estar entre 1 y 12')
      return
    }
    const duplicateId = grupos.some(
      (g) => g.id.toLowerCase() === id.toLowerCase() && g.id !== editingGrupo.id
    )
    if (duplicateId) {
      toast.error('Ya existe otro grupo con ese ID')
      return
    }
    const duplicateName = grupos.some(
      (g) =>
        g.nombre.toLowerCase() === nombre.toLowerCase() && g.id !== editingGrupo.id
    )
    if (duplicateName) {
      toast.error('Ya existe otro grupo con ese nombre')
      return
    }
    updateGrupo(editingGrupo.id, {
      ...draft,
      id,
      nombre,
      cuatrimestre,
      turno,
    })
    toast.success('Grupo actualizado')
    setEditingGrupo(null)
  }

  return (
    <Card>
      <CardTitle className="flex items-center gap-3">
        <Users className="h-5 w-5 text-primary" />
        Grupos y turnos
      </CardTitle>
      <CardDescription>
        Vista rápida de grupos registrados, su cuatrimestre y turno.
      </CardDescription>
      <CardContent className="mt-4 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="md:w-72">
            <Label className="sr-only" htmlFor="grupos-search">
              Buscar grupo
            </Label>
            <Input
              id="grupos-search"
              placeholder="Buscar por nombre o ID..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grupo</TableHead>
                <TableHead>Cuatrimestre</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
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
                      <Badge
                        variant="default"
                        className={
                          grupo.turno === 'vespertino'
                            ? 'bg-orange-100 text-orange-700 ring-orange-300/25 dark:bg-orange-400/30 dark:text-orange-100 dark:ring-orange-300/35'
                            : undefined
                        }
                      >
                        {TURNOS_LABEL[grupo.turno] ?? grupo.turno}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar grupo"
                          onClick={() => setEditingGrupo(grupo)}
                        >
                          <PencilLine className="h-4 w-4 text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Eliminar grupo"
                          onClick={() => setPendingDelete(grupo)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {filteredGrupos.length ? (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {start}-{end} de {filteredGrupos.length} · Página {page} de{' '}
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
        title="Eliminar grupo"
        description={`¿Seguro que deseas eliminar ${pendingDelete?.nombre}?`}
        confirmLabel="Eliminar"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return
          const deleted = pendingDelete
          removeGrupo(deleted.id)
          setPendingDelete(null)
          toast.success('Grupo eliminado')
        }}
      />
      {editingGrupo && draft
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-in fade-in-0">
              <Card className="w-full max-w-xl shadow-ambient animate-in fade-in-0 zoom-in-95 duration-150">
                <CardTitle>Editar grupo</CardTitle>
                <CardDescription className="mt-1">
                  Actualiza ID, nombre, cuatrimestre y turno.
                </CardDescription>
                <CardContent className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-group-nombre">Nombre</Label>
                      <Input
                        id="edit-group-nombre"
                        value={draft.nombre}
                        onChange={(event) =>
                          setDraft((prev) =>
                            prev ? { ...prev, nombre: event.target.value } : prev
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-group-id">ID</Label>
                      <Input
                        id="edit-group-id"
                        value={draft.id}
                        onChange={(event) =>
                          setDraft((prev) =>
                            prev ? { ...prev, id: event.target.value } : prev
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-group-cuatrimestre">Cuatrimestre</Label>
                      <Input
                        id="edit-group-cuatrimestre"
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
                      <Label htmlFor="edit-group-turno">Turno</Label>
                      <Select
                        id="edit-group-turno"
                        value={draft.turno}
                        onChange={(event) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  turno:
                                    event.target.value === 'vespertino'
                                      ? 'vespertino'
                                      : 'matutino',
                                }
                              : prev
                          )
                        }
                      >
                        <option value="matutino">{TURNOS_LABEL.matutino}</option>
                        <option value="vespertino">{TURNOS_LABEL.vespertino}</option>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => setEditingGrupo(null)}
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
