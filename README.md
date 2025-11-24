# UTP Timetabling — ITI

Aplicación web local para generar horarios de la carrera **ITI**. Todo corre en el navegador, sin backend, siguiendo `AGENTS.md`.

## Dependencias clave
- React 18 + TypeScript + Vite + Tailwind + shadcn/ui  
- Estado: Zustand; Formularios: react-hook-form + zod  
- Tablas: @tanstack/react-table; Datos/async: @tanstack/react-query  
- Iconos: lucide-react; Gráficas: recharts  
- Tests: Vitest + React Testing Library  
- Solver stub: Python 3 (JSON in/out) en `solver/solve.py`

## Quick start
```bash
npm install
npm start        # Vite + BrowserSync en http://localhost:3000 (proxy a 5173)
# Alternativa: npm run dev (solo Vite en 5173)
# Comandos de soporte:
npm run lint     # ESLint
npm run test     # Vitest (jsdom)
npm run build    # tsc -b + vite build
```

## Qué incluye la UI
- Módulo 1: materias/grupos/turnos con import CSV y export JSON.  
- Módulo 2: profesores, competencias y matriz de disponibilidad 3 estados.  
- Módulo 3: generador con solver mock (TanStack Query), tablero “tetris” por grupo y métricas de compacidad/advertencias.

## Contrato JSON
- **Entrada**: `planDeEstudios[]`, `grupos[]`, `profesores[]` (disponibilidad, competencias, maxHoras).  
- **Salida**: `horarios[]` con bloques por grupo y métricas (`huecos`, `violacionesDuras`, `softScore`, `resumen`).  
- Ejemplos: `data/sample-input.json`, `data/sample-output.json`.

## Solver (stub)
`python solver/solve.py --input data/sample-input.json --output data/sample-output.json`  
Diseñado para evolucionar a Python + Cython manteniendo el contrato JSON.
