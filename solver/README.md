# Solver (Python + Cython stub)

Este directorio contiene un stub del solver para el **University Course Timetabling Problem (UTP)**.  
La versión actual es intencionalmente simple y sirve como contrato inicial para la UI:

- **Entrada**: archivo JSON siguiendo los esquemas `PlanDeEstudios`, `Grupo`, `Profesor` y `Disponibilidad` (ver `data/sample-input.json`).
- **Salida**: archivo JSON con `HorarioPorGrupo`, `BloqueMateria` y métricas (ver `data/sample-output.json`).
- **Interfaz**: función `solve_timetable(input_json_path, output_json_path)` en `solve.py`.

## Próximos pasos (solver-architect)

1. Migrar la lógica de búsqueda a Python + Cython, acelerando las evaluaciones de factibilidad y compacidad.
2. Modelar explícitamente:
   - Disponibilidad por franja.
   - Unicidad profesor/grupo.
   - Contigüidad de bloques de materia.
   - Carga máxima profesor (≤ 15 h/sem).
   - Competencias por materia y cumplimiento exacto de horas/semana.
3. Implementar heurísticas/metaheurísticas (simulated annealing, tabu, GA, etc.) y exponer métricas de calidad.
4. Mantener el contrato **JSON in / JSON out** y la compatibilidad con la UI React.

Ejecutar stub:

```bash
python solver/solve.py --input data/sample-input.json --output data/sample-output.json
```
