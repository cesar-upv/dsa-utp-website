import { createPortal } from 'react-dom'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { ProfessorForm } from './ProfessorForm'
import type { Profesor } from '@/types/models'

type EditProfessorDialogProps = {
    open: boolean
    professor: Profesor | null
    onClose: () => void
}

export function EditProfessorDialog({
    open,
    professor,
    onClose,
}: EditProfessorDialogProps) {
    if (!open || !professor) return null

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-in fade-in-0">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-ambient animate-in fade-in-0 zoom-in-95 duration-150">
                <CardContent className="p-6">
                    <CardTitle>Editar profesor</CardTitle>
                    <CardDescription className="mt-1">
                        Modifica los datos del profesor. El ID no se puede cambiar para mantener la integridad de los horarios.
                    </CardDescription>
                    <div className="mt-6">
                        <ProfessorForm
                            professorToEdit={professor}
                            onSuccess={onClose}
                            onCancel={onClose}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>,
        document.body
    )
}
