# cython: boundscheck=False, wraparound=False, cdivision=True
"""
Versión acelerada con Cython de las funciones críticas.
Compilar con:
  python -m pip install cython
  cythonize -i core_fast.pyx
"""

ctypedef enum DayEnum:
    mon = 0
    tue = 1
    wed = 2
    thu = 3
    fri = 4

cpdef int compute_gaps(list bloques, list time_slots):
    cdef int slot_count = len(time_slots)
    # gaps por día (5 días)
    cdef int day_slots[5][64]
    cdef int day_sizes[5]
    cdef int i = 0
    for i in range(5):
        day_sizes[i] = 0

    cdef int day_idx, idx
    cdef int j, diff
    for dia, slot_id in bloques:
        day_idx = -1
        if dia == "mon":
            day_idx = 0
        elif dia == "tue":
            day_idx = 1
        elif dia == "wed":
            day_idx = 2
        elif dia == "thu":
            day_idx = 3
        elif dia == "fri":
            day_idx = 4

        idx = -1
        for i in range(slot_count):
            if time_slots[i]["id"] == slot_id:
                idx = i
                break

        if idx >= 0 and 0 <= day_idx < 5 and day_sizes[day_idx] < 64:
            day_slots[day_idx][day_sizes[day_idx]] = idx
            day_sizes[day_idx] += 1

    cdef int total = 0
    for i in range(5):
        if day_sizes[i] < 2:
            continue
        for j in range(1, day_sizes[i]):
            diff = day_slots[i][j] - day_slots[i][j-1]
            if diff > 1:
                total += diff - 1
    return total
