# Solver (Python + Cython ready)

Solver para el **University Course Timetabling Problem (UTP)** con contrato
**JSON in / JSON out**. La lógica actual asigna bloques respetando
disponibilidad, competencias, unicidad de profesor/grupo y carga máxima (15h).
Calcula huecos/softScore y marca advertencias si faltan horas por materia.

- **Entrada**: `planDeEstudios[]`, `grupos[]`, `profesores[]` (ver `data/sample-input.json`).
- **Salida**: `horarios[]`, `resumen`, `advertencias` (ver `data/sample-output.json`).
- **Interfaz**: `solve_timetable(input_json_path, output_json_path)` en `solve.py`.

## Cython opcional
- Núcleo acelerable en `core_fast.pyx` (misma firma que `core.py`).
- Compilar (opcional):
  ```bash
  python -m pip install cython
  cythonize -i solver/core_fast.pyx
  ```
  Si `core_fast` está disponible, el solver lo usará automáticamente.

## Ejecución
```bash
python solver/solve.py --input data/sample-input.json --output data/sample-output.json
```
