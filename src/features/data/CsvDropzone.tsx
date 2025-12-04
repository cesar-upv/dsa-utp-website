import { FileDown, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/lib/utils'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { useTimetableStore } from '@/store/useTimetableStore'
import type { Materia } from '@/types/models'

const headers = ['id', 'nombre', 'cuatrimestre', 'horasSemana']

function parseCsv(text: string): Materia[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const clean = lines.filter((line) => !line.toLowerCase().includes('id,'))
  return clean
    .map((line) => line.split(','))
    .map(([id, nombre, cuatrimestre, horasSemana]) => ({
      id: id?.trim(),
      nombre: nombre?.trim(),
      cuatrimestre: Number.parseInt(cuatrimestre ?? '0', 10),
      horasSemana: Number.parseInt(horasSemana ?? '0', 10),
    }))
    .filter(
      (item) =>
        item.id &&
        item.nombre &&
        Number.isFinite(item.cuatrimestre) &&
        Number.isFinite(item.horasSemana)
    )
}

export function CsvDropzone() {
  const importMaterias = useTimetableStore((state) => state.importMaterias)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    const text = await file.text()
    const materias = parseCsv(text)
    if (!materias.length) {
      toast.error('No se encontraron filas válidas en el CSV')
      return
    }
    importMaterias(materias as Materia[])
    setFileName(file.name)
    toast.success(`Importadas ${materias.length} materias desde CSV`)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  return (
    <Card
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="border-dashed border-2"
    >
      <CardTitle className="flex items-center gap-3">
        <UploadCloud className="h-5 w-5 text-primary" />
        Importar CSV
      </CardTitle>
      <CardDescription>
        Drag-and-drop o selecciona un archivo <strong>.csv</strong> con columnas{' '}
        <Badge variant="outline">{headers.join(', ')}</Badge>
      </CardDescription>
      <CardContent className="mt-4 flex flex-col gap-3">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/60 px-6 py-8 text-center transition hover:border-primary/50 hover:bg-primary/5">
          <FileDown className="h-8 w-8 text-primary" />
          <div>
            <p className="font-semibold">Suelta aquí tu CSV</p>
            <p className="text-sm text-muted-foreground">
              Validaremos los datos y añadiremos solo filas correctas.
            </p>
          </div>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
            }}
          />
        </label>
        {fileName && (
          <p className="text-sm text-muted-foreground">
            Último archivo importado: <span className="font-semibold">{fileName}</span>
          </p>
        )}
        <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          Ejemplo: <code className="font-mono">ALG1,Algoritmos I,1,4</code>
        </div>
      </CardContent>
    </Card>
  )
}
