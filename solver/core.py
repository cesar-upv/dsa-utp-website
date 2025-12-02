"""
Funciones críticas del solver pensadas para compilarse opcionalmente con Cython.

Si se copia/renombra a `core_fast.pyx` y se compila, el solver las importará
automáticamente. En modo puro Python funcionan igual.
"""

from __future__ import annotations

from typing import Dict, Iterable, List, Literal, Tuple

DayId = Literal["mon", "tue", "wed", "thu", "fri"]


def _slot_index(slots: List[Dict[str, str]]) -> Dict[str, int]:
  return {slot["id"]: idx for idx, slot in enumerate(slots)}


def compute_gaps(
    bloques: Iterable[Tuple[DayId, str]], time_slots: List[Dict[str, str]]
) -> int:
  """
  Calcula huecos por día. Recibe pares (day, slotId) y la lista de slots ordenada.
  """
  slot_idx = _slot_index(time_slots)
  by_day: Dict[DayId, List[int]] = {  # type: ignore
      "mon": [],
      "tue": [],
      "wed": [],
      "thu": [],
      "fri": [],
  }
  for dia, slot in bloques:
    idx = slot_idx.get(slot)
    if idx is None:
      continue
    by_day[dia].append(idx)

  total_gaps = 0
  for indices in by_day.values():
    if len(indices) < 2:
      continue
    indices.sort()
    for i in range(1, len(indices)):
      diff = indices[i] - indices[i - 1]
      if diff > 1:
        total_gaps += diff - 1
  return total_gaps
