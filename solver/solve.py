"""
Stub del solver en Python para el University Course Timetabling Problem (UTP).

Contrato: JSON in / JSON out
- Entrada: ver data/sample-input.json
- Salida: ver data/sample-output.json

Este archivo sirve como punto de partida para el módulo de optimización real
acelerado con Cython. La lógica actual es un generador simplificado que intenta
asignar bloques secuenciales respetando disponibilidad y competencias.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Literal

DayId = Literal["mon", "tue", "wed", "thu", "fri"]

TIME_SLOTS = [
    {"id": "s1", "label": "07:00 - 08:00"},
    {"id": "s2", "label": "08:00 - 09:00"},
    {"id": "s3", "label": "09:00 - 10:00"},
    {"id": "s4", "label": "10:00 - 11:00"},
    {"id": "s5", "label": "11:00 - 12:00"},
    {"id": "s6", "label": "12:00 - 13:00"},
    {"id": "s7", "label": "13:00 - 14:00"},
    {"id": "s8", "label": "14:00 - 15:00"},
]


@dataclass
class Materia:
    id: str
    nombre: str
    cuatrimestre: int
    horasSemana: int


@dataclass
class Profesor:
    id: str
    nombre: str
    competencias: List[str]
    maxHoras: int
    disponibilidad: Dict[DayId, Dict[str, str]]


def load_input(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def compute_schedule(data: dict) -> dict:
    start = time.perf_counter()
    materias = [Materia(**m) for m in data.get("planDeEstudios", [])]
    profesores = [Profesor(**p) for p in data.get("profesores", [])]
    grupos = data.get("grupos", [])

    horarios = []
    warnings: List[str] = []
    load: Dict[str, int] = {p.id: 0 for p in profesores}

    for grupo in grupos:
        bloques = []
        group_warnings: List[str] = []
        materias_grupo = [
          m for m in materias if m.cuatrimestre <= grupo.get("cuatrimestre", 1)
        ]

        for materia in materias_grupo:
            horas_pendientes = materia.horasSemana
            for day in ["mon", "tue", "wed", "thu", "fri"]:
                for slot in TIME_SLOTS:
                    if horas_pendientes <= 0:
                        break
                    profesor = next(
                        (p for p in profesores if materia.id in p.competencias),
                        None,
                    )
                    if not profesor:
                        mensaje = f"No hay profesor con competencia para {materia.nombre}"
                        warnings.append(mensaje)
                        group_warnings.append(mensaje)
                        horas_pendientes = 0
                        break

                    disponible = (
                        profesor.disponibilidad.get(day, {}).get(slot["id"]) == "available"
                        and load[profesor.id] < profesor.maxHoras
                    )
                    if disponible:
                        bloques.append(
                            {
                                "id": f"{grupo['id']}-{materia.id}-{day}-{slot['id']}",
                                "grupoId": grupo["id"],
                                "materiaId": materia.id,
                                "profesorId": profesor.id,
                                "dia": day,
                                "slotId": slot["id"],
                                "duracion": 1,
                                "huecoPrevio": False,
                                "esContinuo": True,
                            }
                        )
                        load[profesor.id] += 1
                        horas_pendientes -= 1
                if horas_pendientes <= 0:
                    break

            if horas_pendientes > 0:
                mensaje = f"Asigna solo {materia.horasSemana - horas_pendientes}/{materia.horasSemana} horas para {materia.nombre}"
                warnings.append(mensaje)
                group_warnings.append(mensaje)

        horarios.append(
            {
                "grupoId": grupo["id"],
                "bloques": bloques,
                "metricas": {
                    "huecos": 0,
                    "violacionesDuras": len(group_warnings),
                    "softScore": max(0, 10 - len(group_warnings)),
                },
            }
        )

    return {
        "status": "infeasible" if warnings else "ok",
        "resumen": {
            "mensaje": "Stub del solver ejecutado",
            "tiempoMs": int((time.perf_counter() - start) * 1000),
            "violacionesDuras": len(warnings),
            "huecosPromedio": 0,
        },
        "advertencias": warnings,
        "horarios": horarios,
    }


def solve_timetable(input_json_path: str, output_json_path: str) -> None:
    """
    Carga el archivo de entrada JSON, ejecuta el planificador simplificado y
    escribe un archivo de salida JSON compatible con la UI.
    """
    entrada = load_input(Path(input_json_path))
    salida = compute_schedule(entrada)
    Path(output_json_path).write_text(
        json.dumps(salida, indent=2, ensure_ascii=False), encoding="utf-8"
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Stub solver UTP (JSON in/out)")
    parser.add_argument("--input", required=True, help="Ruta del archivo de entrada JSON")
    parser.add_argument("--output", required=True, help="Ruta de salida JSON")
    args = parser.parse_args()
    solve_timetable(args.input, args.output)
