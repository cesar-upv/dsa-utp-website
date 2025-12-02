"""
Solver en Python/Cython para el University Course Timetabling Problem (UTP).

Contrato: JSON in / JSON out (ver data/sample-input.json y data/sample-output.json)
Restricciones duras:
- Disponibilidad y unicidad de profesor/grupo por franja.
- Competencias por materia.
- Carga máxima profesor (15h).
- Cumplimiento de horas/semana por materia (con advertencias si faltan horas).

La función compute_schedule usa compute_gaps, que puede compilarse con Cython
(ver solver/core_fast.pyx). Si no está compilado, se usa la versión Python.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Literal, Optional, Tuple

try:
    from solver.core_fast import compute_gaps  # type: ignore
except ImportError:
    from solver.core import compute_gaps

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

DAYS: List[DayId] = ["mon", "tue", "wed", "thu", "fri"]
SLOT_INDEX = {slot["id"]: idx for idx, slot in enumerate(TIME_SLOTS)}


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


def profesor_disponible(
    profesor: Profesor,
    day: DayId,
    slot_id: str,
    load: Dict[str, int],
    busy_prof: Dict[str, Dict[DayId, Dict[str, bool]]],
) -> bool:
    return (
        profesor.disponibilidad.get(day, {}).get(slot_id) == "available"
        and not busy_prof[profesor.id][day].get(slot_id, False)
        and load[profesor.id] < min(profesor.maxHoras, 15)
    )


def pick_profesor(
    profesores: List[Profesor],
    materia: Materia,
    day: DayId,
    slot_id: str,
    load: Dict[str, int],
    busy_prof: Dict[str, Dict[DayId, Dict[str, bool]]],
) -> Optional[Profesor]:
    candidatos = [
        p
        for p in profesores
        if materia.id in p.competencias
        and profesor_disponible(p, day, slot_id, load, busy_prof)
    ]
    if not candidatos:
        return None
    return sorted(candidatos, key=lambda p: load[p.id])[0]


def flag_huecos(bloques: List[Dict]) -> None:
    bloques.sort(
        key=lambda b: (DAYS.index(b["dia"]), SLOT_INDEX.get(b["slotId"], 0))
    )
    for idx in range(1, len(bloques)):
        prev = bloques[idx - 1]
        current = bloques[idx]
        if prev["dia"] == current["dia"]:
            if SLOT_INDEX[current["slotId"]] - SLOT_INDEX[prev["slotId"]] > 1:
                current["huecoPrevio"] = True


def compute_schedule(data: dict) -> dict:
    start = time.perf_counter()
    materias = [Materia(**m) for m in data.get("planDeEstudios", [])]
    profesores = [
        Profesor(
            id=p["id"],
            nombre=p["nombre"],
            competencias=p.get("competencias", []),
            maxHoras=min(p.get("maxHoras", 15), 15),
            disponibilidad=p["disponibilidad"],
        )
        for p in data.get("profesores", [])
    ]
    grupos = data.get("grupos", [])

    load: Dict[str, int] = {p.id: 0 for p in profesores}
    busy_prof: Dict[str, Dict[DayId, Dict[str, bool]]] = {
        p.id: {day: {} for day in DAYS} for p in profesores
    }
    busy_group: Dict[str, Dict[DayId, Dict[str, bool]]] = {
        g["id"]: {day: {} for day in DAYS} for g in grupos
    }

    horarios = []
    warnings: List[str] = []

    for grupo in grupos:
        bloques: List[Dict] = []
        group_warnings: List[str] = []
        cuatrimestre_grupo = grupo.get("cuatrimestre", 1)
        materias_grupo = [
            m for m in materias if m.cuatrimestre == cuatrimestre_grupo
        ]

        for materia_idx, materia in enumerate(materias_grupo):
            horas_pendientes = materia.horasSemana
            intentos = 0
            start_idx = materia_idx % len(DAYS)
            day_order = DAYS[start_idx:] + DAYS[:start_idx]
            while horas_pendientes > 0 and intentos < 200:
                intentos += 1
                placed = False
                for day in day_order:
                    for slot in TIME_SLOTS:
                        slot_id = slot["id"]
                        if busy_group[grupo["id"]][day].get(slot_id):
                            continue
                        profesor = pick_profesor(
                            profesores, materia, day, slot_id, load, busy_prof
                        )
                        if profesor is None:
                            continue

                        bloque = {
                            "id": f"{grupo['id']}-{materia.id}-{day}-{slot_id}",
                            "grupoId": grupo["id"],
                            "materiaId": materia.id,
                            "profesorId": profesor.id,
                            "dia": day,
                            "slotId": slot_id,
                            "duracion": 1,
                            "huecoPrevio": False,
                            "esContinuo": True,
                        }
                        bloques.append(bloque)
                        busy_prof[profesor.id][day][slot_id] = True
                        busy_group[grupo["id"]][day][slot_id] = True
                        load[profesor.id] += 1
                        horas_pendientes -= 1
                        placed = True
                        break
                    if placed or horas_pendientes <= 0:
                        break

                if not placed:
                    mensaje = (
                        f"No hay slots disponibles para {materia.nombre} en {grupo['nombre']}"
                    )
                    warnings.append(mensaje)
                    group_warnings.append(mensaje)
                    break

            if horas_pendientes > 0:
                mensaje = (
                    f"Asignadas {materia.horasSemana - horas_pendientes}/"
                    f"{materia.horasSemana} horas para {materia.nombre}"
                )
                warnings.append(mensaje)
                group_warnings.append(mensaje)

        flag_huecos(bloques)
        huecos = compute_gaps(
            [(b["dia"], b["slotId"]) for b in bloques], TIME_SLOTS
        )

        horarios.append(
            {
                "grupoId": grupo["id"],
                "bloques": bloques,
                "metricas": {
                    "huecos": huecos,
                    "violacionesDuras": len(group_warnings),
                    "softScore": max(0, 10 - huecos - len(group_warnings)),
                },
            }
        )

    status = "infeasible" if warnings else "ok"
    resumen = {
        "mensaje": "Solver ejecutado" if status == "ok" else "Solver con advertencias",
        "tiempoMs": int((time.perf_counter() - start) * 1000),
        "violacionesDuras": len(warnings),
        "huecosPromedio": (
            sum(h["metricas"]["huecos"] for h in horarios) / max(1, len(horarios))
        ),
    }

    return {
        "status": status,
        "resumen": resumen,
        "advertencias": warnings if warnings else None,
        "horarios": horarios,
    }


def solve_timetable(input_json_path: str, output_json_path: str) -> None:
    """
    Carga el archivo de entrada JSON, ejecuta el planificador y
    escribe un archivo de salida JSON compatible con la UI.
    """
    entrada = load_input(Path(input_json_path))
    salida = compute_schedule(entrada)
    Path(output_json_path).write_text(
        json.dumps(salida, indent=2, ensure_ascii=False), encoding="utf-8"
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Solver UTP (JSON in/out)")
    parser.add_argument("--input", required=True, help="Ruta del archivo de entrada JSON")
    parser.add_argument("--output", required=True, help="Ruta de salida JSON")
    args = parser.parse_args()
    solve_timetable(args.input, args.output)
