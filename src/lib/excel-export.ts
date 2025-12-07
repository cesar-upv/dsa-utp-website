import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'

import { DAYS, TIME_SLOTS } from '@/constants/time'
import { colorForMateria, toast } from '@/lib/utils'
import type { Grupo, HorarioPorGrupo, Materia, Profesor } from '@/types/models'

// Lighten a hex color for Excel background
function lightenColor(hex: string, percent: number) {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const B = ((num >> 8) & 0x00ff) + amt
    const G = (num & 0x0000ff) + amt

    return (
        'FF' +
        (
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 +
            (G < 255 ? (G < 1 ? 0 : G) : 255)
        )
            .toString(16)
            .slice(1)
            .toUpperCase()
    )
}

/**
 * Generates an Excel Workbook (Buffer) containing the provided schedules.
 * If multiple are provided, it arranges them side-by-side in chunks of 2.
 */
async function generateExcelBuffer(
    horarios: HorarioPorGrupo[],
    grupos: Grupo[],
    materias: Materia[],
    profesores: Profesor[]
): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'DSA UTP Scheduler'
    workbook.created = new Date()

    const sheet = workbook.addWorksheet('Horarios', {
        properties: { tabColor: { argb: 'FF0070C0' } },
        views: [{ showGridLines: false, zoomScale: 85 }],
    })

    const COL_WIDTH = 18
    const TIME_COL_WIDTH = 14
    const GAP_WIDTH = 4

    // Set default column widths
    sheet.getColumn(1).width = TIME_COL_WIDTH
    for (let i = 2; i <= 6; i++) sheet.getColumn(i).width = COL_WIDTH
    sheet.getColumn(7).width = GAP_WIDTH
    sheet.getColumn(8).width = TIME_COL_WIDTH
    for (let i = 9; i <= 13; i++) sheet.getColumn(i).width = COL_WIDTH

    // Sort logic (same as before)
    const sortedHorarios = [...horarios].sort((a, b) => {
        const groupA = grupos.find((g) => g.id === a.grupoId)
        const groupB = grupos.find((g) => g.id === b.grupoId)
        if (!groupA || !groupB) return 0
        if (groupA.cuatrimestre !== groupB.cuatrimestre) {
            return groupA.cuatrimestre - groupB.cuatrimestre
        }
        return groupA.nombre.localeCompare(groupB.nombre)
    })

    let currentRow = 2

    for (let i = 0; i < sortedHorarios.length; i++) {
        const horario = sortedHorarios[i]
        const grupo = grupos.find((g) => g.id === horario.grupoId)
        if (!grupo) continue

        // For "Single" export mode, we might just have 1 item, so it naturally sits on left (i=0).
        const isRightSide = i % 2 !== 0
        const startCol = isRightSide ? 8 : 1

        const blockStartRow = currentRow

        // 1. Header
        const headerCell = sheet.getCell(blockStartRow, startCol)
        headerCell.value =
            `GRUPO ${grupo.nombre}`.toUpperCase() +
            `  |  Q${grupo.cuatrimestre} • ${grupo.turno === 'matutino' ? 'MATUTINO' : 'VESPERTINO'}`
        headerCell.font = {
            bold: true,
            size: 12,
            name: 'Segoe UI',
            color: { argb: 'FF334155' },
        }
        headerCell.alignment = { horizontal: 'left', vertical: 'middle' }
        sheet.mergeCells(blockStartRow, startCol, blockStartRow, startCol + 5)

        // 2. Days Header
        const daysRowIdx = blockStartRow + 1
        const timeHeader = sheet.getCell(daysRowIdx, startCol)
        timeHeader.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEAEEF2' },
        }
        timeHeader.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        }

        DAYS.forEach((day, idx) => {
            const cell = sheet.getCell(daysRowIdx, startCol + 1 + idx)
            cell.value = day.label.toUpperCase()
            cell.font = {
                bold: true,
                size: 9,
                name: 'Segoe UI',
                color: { argb: 'FF64748B' },
            }
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF1F5F9' },
            }
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            }
        })

        // 3. Grid
        let rowCursor = daysRowIdx + 1
        for (const slot of TIME_SLOTS) {
            const row = sheet.getRow(rowCursor)
            const timeCell = row.getCell(startCol)
            timeCell.value = slot.label.split(' - ').join('\n')
            timeCell.font = {
                size: 8,
                name: 'Segoe UI',
                color: { argb: 'FF64748B' },
            }
            timeCell.alignment = {
                horizontal: 'center',
                vertical: 'middle',
                wrapText: true,
            }
            timeCell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            }

            if (slot.isReceso) {
                sheet.mergeCells(rowCursor, startCol, rowCursor, startCol + 5)
                timeCell.value = 'R E C E S O'
                timeCell.font = {
                    bold: true,
                    size: 9,
                    color: { argb: 'FF94A3B8' },
                    name: 'Segoe UI',
                }
                timeCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF8FAFC' },
                }
                timeCell.alignment = { horizontal: 'center', vertical: 'middle' }
                row.height = 20
            } else {
                row.height = 45
                DAYS.forEach((day, dayIndex) => {
                    const cell = row.getCell(startCol + 1 + dayIndex)
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    }
                    cell.alignment = {
                        horizontal: 'center',
                        vertical: 'middle',
                        wrapText: true,
                    }

                    const block = horario.bloques.find(
                        (b) => b.dia === day.id && b.slotId === slot.id
                    )

                    if (block) {
                        const materia = materias.find((m) => m.id === block.materiaId)
                        const profesor = profesores.find((p) => p.id === block.profesorId)
                        const materiaIdx = materias.findIndex(
                            (m) => m.id === block.materiaId
                        )

                        if (materia) {
                            const richText = [
                                {
                                    text: materia.nombre + '\n',
                                    // REDUCED FONT SIZE
                                    font: {
                                        bold: true,
                                        size: 9, // Was 10
                                        name: 'Segoe UI',
                                        color: { argb: 'FF1E293B' },
                                    },
                                },
                                {
                                    text: profesor?.nombre || '',
                                    // REDUCED FONT SIZE
                                    font: {
                                        italic: true,
                                        size: 8, // Was 9
                                        name: 'Segoe UI',
                                        color: { argb: 'FF475569' },
                                    },
                                },
                            ]
                            cell.value = { richText }

                            const rawColor = colorForMateria(materia, materiaIdx)
                            const cleanHex = rawColor.startsWith('#') ? rawColor : '#E2E8F0'
                            const bgArgb = lightenColor(cleanHex, 40)

                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: bgArgb },
                            }
                        }
                    }
                })
            }
            rowCursor++
        }

        if (isRightSide || i === sortedHorarios.length - 1) {
            currentRow = rowCursor + 3
        }
    }

    return workbook.xlsx.writeBuffer()
}

export type ExportMode = 'all-one-file' | 'zip' | 'single'

export async function exportHorarios(
    mode: ExportMode,
    horarios: HorarioPorGrupo[],
    grupos: Grupo[],
    materias: Materia[],
    profesores: Profesor[],
    singleGroupId?: string
) {
    try {
        const today = new Date().toISOString().slice(0, 10)

        if (mode === 'single' && singleGroupId) {
            const schedule = horarios.find((h) => h.grupoId === singleGroupId)
            const group = grupos.find((g) => g.id === singleGroupId)
            if (!schedule || !group) {
                toast.error('No se encontró el horario seleccionado')
                return
            }

            const buffer = await generateExcelBuffer(
                [schedule],
                grupos,
                materias,
                profesores
            )
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            })
            saveAs(blob, `Horario_${group.nombre}_${today}.xlsx`)
            toast.success(`Horario de ${group.nombre} exportado`)
        } else if (mode === 'zip') {
            const zip = new JSZip()
            const folder = zip.folder(`Horarios_UTP_${today}`)

            const sorted = [...horarios].sort((a, b) => {
                const ga = grupos.find((g) => g.id === a.grupoId)
                const gb = grupos.find((g) => g.id === b.grupoId)
                if (!ga || !gb) return 0
                return ga.nombre.localeCompare(gb.nombre)
            })

            for (const h of sorted) {
                const g = grupos.find((x) => x.id === h.grupoId)
                if (!g) continue
                const buffer = await generateExcelBuffer([h], grupos, materias, profesores)
                // Use group name for filename
                const safeName = g.nombre.replace(/[^a-z0-9]/gi, '_').toUpperCase()
                folder?.file(`${safeName}.xlsx`, buffer)
            }

            const zipContent = await zip.generateAsync({ type: 'blob' })
            saveAs(zipContent, `Horarios_UTP_${today}.zip`)
            toast.success(`ZIP generado con ${horarios.length} archivos`)
        } else {
            // Default: All in one file
            const buffer = await generateExcelBuffer(
                horarios,
                grupos,
                materias,
                profesores
            )
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            })
            saveAs(blob, `Horarios_Completo_${today}.xlsx`)
            toast.success('Horario completo exportado')
        }
    } catch (error) {
        console.error(error)
        toast.error('Error al exportar')
    }
}
